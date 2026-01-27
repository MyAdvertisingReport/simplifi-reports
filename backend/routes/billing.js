/**
 * billing.js - Invoice/Billing Management Routes
 * 
 * Endpoints for:
 * - Invoice CRUD operations
 * - Invoice approval workflow
 * - Payment tracking and reminders
 * - Auto-charge after grace period
 * - Aging reports
 * - Auto-generate invoices from active orders
 * 
 * Updated: January 27, 2026
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

let pool = null;
let emailService = null;
let stripeService = null;

// Initialize pool
const initPool = (connectionString) => {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Billing routes pool initialized');
};

// Initialize email service
const initEmailService = (service) => {
  emailService = service;
  console.log('Billing routes email service initialized');
};

// Initialize stripe service  
const initStripeService = (service) => {
  stripeService = service;
  console.log('Billing routes stripe service initialized');
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const generateInvoiceNumber = async () => {
  const result = await pool.query("SELECT generate_invoice_number() as invoice_number");
  return result.rows[0].invoice_number;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

const calculateDaysOverdue = (dueDate) => {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = now - due;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Get the last business day of a given month
 */
const getLastBusinessDay = (year, month) => {
  // Start from the last day of the month
  const lastDay = new Date(year, month + 1, 0);
  let day = lastDay.getDate();
  
  while (day > 0) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      return day;
    }
    day--;
  }
  return lastDay.getDate(); // Fallback
};

/**
 * Determine billing period and due date based on product categories
 * 
 * Billing Rules:
 * - Radio/Broadcast/Podcast: Bill for PREVIOUS month (services rendered), due at month start
 * - Print: Bill on 15th of month BEFORE the service month (e.g., March issue billed Feb 15)
 * - Programmatic/Events/Web: Bill for FOLLOWING month (in advance), due at month start
 * - Mixed orders: Bill at beginning of month since at least one product needs advance billing
 */
const determineBillingPeriod = (categoryCode, billingMonth, billingYear) => {
  const cat = categoryCode?.toLowerCase();
  const previousMonthCategories = ['broadcast', 'podcast'];
  const isPreviousMonth = previousMonthCategories.includes(cat);
  const isPrint = cat === 'print';
  
  if (isPreviousMonth) {
    // Radio/Broadcast/Podcast: Bill for PREVIOUS month (services already rendered)
    let periodMonth = billingMonth - 1;
    let periodYear = billingYear;
    if (periodMonth < 0) {
      periodMonth = 11;
      periodYear--;
    }
    return {
      start: new Date(periodYear, periodMonth, 1),
      end: new Date(periodYear, periodMonth + 1, 0), // Last day of month
      dueDay: null // Will use default logic (1st or last business day)
    };
  } else if (isPrint) {
    // Print: Service month is the FOLLOWING month, bill on 15th of current month
    // e.g., If billing in February, the ad runs in March issue
    let serviceMonth = billingMonth + 1;
    let serviceYear = billingYear;
    if (serviceMonth > 11) {
      serviceMonth = 0;
      serviceYear++;
    }
    return {
      start: new Date(serviceYear, serviceMonth, 1),
      end: new Date(serviceYear, serviceMonth + 1, 0),
      dueDay: 15 // Print always due on 15th
    };
  } else {
    // Programmatic/Events/Web: Bill for FOLLOWING month (in advance)
    return {
      start: new Date(billingYear, billingMonth, 1),
      end: new Date(billingYear, billingMonth + 1, 0),
      dueDay: null
    };
  }
};

/**
 * Check if an order has a mix of billing category types
 * Categories have different billing timing:
 * - "previous": broadcast, podcast (bill for previous month)
 * - "print": print (bill on 15th for next month's issue)
 * - "advance": programmatic, events, web_social (bill in advance for current month)
 */
const hasMixedBillingCategories = (items) => {
  const previousMonthCategories = ['broadcast', 'podcast'];
  let hasPrevious = false;
  let hasPrint = false;
  let hasAdvance = false;
  
  for (const item of items) {
    const cat = item.category_code?.toLowerCase();
    if (previousMonthCategories.includes(cat)) {
      hasPrevious = true;
    } else if (cat === 'print') {
      hasPrint = true;
    } else {
      hasAdvance = true;
    }
  }
  
  // Mixed if more than one type
  const types = [hasPrevious, hasPrint, hasAdvance].filter(Boolean).length;
  return types > 1;
};

// ============================================================
// GET /api/billing/invoices - List all invoices with filters
// ============================================================
router.get('/invoices', async (req, res) => {
  try {
    const { 
      status, 
      client_id, 
      overdue_only,
      start_date,
      end_date,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereConditions.push(`i.status = $${paramCount}`);
      params.push(status);
    }

    if (client_id) {
      paramCount++;
      whereConditions.push(`i.client_id = $${paramCount}`);
      params.push(client_id);
    }

    if (overdue_only === 'true') {
      whereConditions.push(`i.status = 'sent' AND i.due_date < CURRENT_DATE`);
    }

    if (start_date) {
      paramCount++;
      whereConditions.push(`i.created_at >= $${paramCount}`);
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`i.created_at <= $${paramCount}`);
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Validate sort column
    const allowedSortColumns = ['created_at', 'due_date', 'total', 'status', 'invoice_number'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    paramCount++;
    const limitParam = paramCount;
    params.push(parseInt(limit));
    
    paramCount++;
    const offsetParam = paramCount;
    params.push(parseInt(offset));

    const query = `
      SELECT 
        i.*,
        c.business_name as client_name,
        c.slug as client_slug,
        o.order_number,
        u_sales.name as sales_rep_name,
        CASE 
          WHEN i.status = 'sent' AND i.due_date::date < CURRENT_DATE 
          THEN (CURRENT_DATE - i.due_date::date)
          ELSE 0
        END as days_overdue
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users u_sales ON o.sales_associate_id = u_sales.id
      ${whereClause}
      ORDER BY i.${sortColumn} ${sortDirection}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM invoices i
      ${whereClause}
    `;

    const [invoicesResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)) // Remove limit/offset params
    ]);

    res.json({
      invoices: invoicesResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ============================================================
// GET /api/billing/invoices/:id - Get single invoice with items
// ============================================================
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceQuery = `
      SELECT 
        i.*,
        c.business_name as client_name,
        c.slug as client_slug,
        o.order_number, o.term_months, o.contract_start_date, o.contract_end_date,
        o.billing_preference as order_billing_preference,
        o.payment_type,
        o.payment_method_id as order_payment_method_id,
        -- Get primary contact info from contacts table
        ct.first_name || ' ' || ct.last_name as contact_name,
        ct.email as contact_email,
        ct.phone as contact_phone
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN contacts ct ON c.id = ct.client_id AND ct.is_primary = true
      WHERE i.id = $1
    `;

    const itemsQuery = `
      SELECT 
        ii.*,
        p.name as product_name
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = $1
      ORDER BY ii.sort_order, ii.created_at
    `;

    const [invoiceResult, itemsResult] = await Promise.all([
      pool.query(invoiceQuery, [id]),
      pool.query(itemsQuery, [id])
    ]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Try to get payment method details if available
    const invoice = invoiceResult.rows[0];
    let paymentDetails = {};
    
    if (invoice.order_payment_method_id || invoice.payment_method_id) {
      try {
        // Get last 4 digits from Stripe if we have a payment method
        const pmId = invoice.order_payment_method_id || invoice.payment_method_id;
        const entityCode = invoice.stripe_entity_code || 'wsic';
        if (pmId && stripeService) {
          const pm = await stripeService.getPaymentMethod(entityCode, pmId);
          if (pm) {
            if (pm.type === 'card' && pm.card) {
              paymentDetails.card_last4 = pm.card.last4;
              paymentDetails.card_brand = pm.card.brand;
            } else if (pm.type === 'us_bank_account' && pm.us_bank_account) {
              paymentDetails.bank_last4 = pm.us_bank_account.last4;
              paymentDetails.bank_name = pm.us_bank_account.bank_name;
            }
          }
        }
      } catch (pmErr) {
        console.log('Could not fetch payment method details:', pmErr.message);
      }
    }

    res.json({
      ...invoice,
      ...paymentDetails,
      items: itemsResult.rows
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// ============================================================
// POST /api/billing/invoices - Create new invoice
// ============================================================
router.post('/invoices', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      client_id,
      order_id,
      billing_period_start,
      billing_period_end,
      due_date,
      billing_preference,
      items = [],
      notes,
      add_processing_fee = false
    } = req.body;

    // Generate invoice number
    const invoice_number = await generateInvoiceNumber();

    // Calculate subtotal from items
    let subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_price) * (item.quantity || 1));
    }, 0);

    // Calculate processing fee if card payment
    let processing_fee = 0;
    if (add_processing_fee && billing_preference === 'card') {
      processing_fee = Math.round(subtotal * 0.035 * 100) / 100; // 3.5% CC fee
    }

    const total = subtotal + processing_fee;
    const balance_due = total;

    // Get client's Stripe info
    const clientResult = await client.query(
      `SELECT stripe_customer_id FROM advertising_clients WHERE id = $1`,
      [client_id]
    );

    // Get entity code from order if exists
    let stripe_entity_code = 'wsic';
    if (order_id) {
      const orderResult = await client.query(
        `SELECT stripe_entity_code FROM orders WHERE id = $1`,
        [order_id]
      );
      if (orderResult.rows.length > 0 && orderResult.rows[0].stripe_entity_code) {
        stripe_entity_code = orderResult.rows[0].stripe_entity_code;
      }
    }

    // Insert invoice
    // Note: Not using created_by to avoid FK constraint issues
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, client_id, order_id, status,
        subtotal, processing_fee, total, balance_due,
        billing_period_start, billing_period_end,
        issue_date, due_date,
        billing_preference, stripe_entity_code, stripe_customer_id,
        grace_period_ends_at, notes
      ) VALUES (
        $1, $2, $3, 'draft',
        $4, $5, $6, $7,
        $8, $9,
        CURRENT_DATE, $10::date,
        $11, $12, $13,
        $10::date + INTERVAL '30 days', $14
      )
      RETURNING *
    `, [
      invoice_number, client_id, order_id,
      subtotal, processing_fee, total, balance_due,
      billing_period_start, billing_period_end,
      due_date,
      billing_preference, stripe_entity_code, clientResult.rows[0]?.stripe_customer_id,
      notes
    ]);

    const invoice = invoiceResult.rows[0];

    // Insert invoice items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(`
        INSERT INTO invoice_items (
          invoice_id, description, quantity, unit_price, amount,
          order_item_id, product_id, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        invoice.id,
        item.description,
        item.quantity || 1,
        item.unit_price,
        parseFloat(item.unit_price) * (item.quantity || 1),
        item.order_item_id || null,
        item.product_id || null,
        i
      ]);
    }

    await client.query('COMMIT');

    // Fetch complete invoice with items
    const fullInvoice = await pool.query(`
      SELECT i.*, c.business_name as client_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [invoice.id]);

    res.status(201).json(fullInvoice.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /api/billing/invoices/:id - Update invoice
// ============================================================
router.put('/invoices/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    // Check if invoice can be edited
    const checkResult = await client.query(
      `SELECT status FROM invoices WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (checkResult.rows[0].status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be edited' });
    }

    await client.query('BEGIN');

    const {
      billing_period_start,
      billing_period_end,
      due_date,
      billing_preference,
      items = [],
      notes,
      add_processing_fee = false
    } = req.body;

    // Calculate subtotal from items
    let subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_price) * (item.quantity || 1));
    }, 0);

    // Calculate processing fee if card payment
    let processing_fee = 0;
    if (add_processing_fee && billing_preference === 'card') {
      processing_fee = Math.round(subtotal * 0.035 * 100) / 100;
    }

    const total = subtotal + processing_fee;

    // Update invoice
    const invoiceResult = await client.query(`
      UPDATE invoices SET
        subtotal = $1,
        processing_fee = $2,
        total = $3,
        balance_due = $3,
        billing_period_start = $4,
        billing_period_end = $5,
        due_date = $6::date,
        billing_preference = $7,
        grace_period_ends_at = $6::date + INTERVAL '30 days',
        notes = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      subtotal, processing_fee, total,
      billing_period_start, billing_period_end,
      due_date, billing_preference, notes, id
    ]);

    // Delete existing items
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

    // Insert new items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(`
        INSERT INTO invoice_items (
          invoice_id, description, quantity, unit_price, amount,
          order_item_id, product_id, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        id,
        item.description,
        item.quantity || 1,
        item.unit_price,
        parseFloat(item.unit_price) * (item.quantity || 1),
        item.order_item_id || null,
        item.product_id || null,
        i
      ]);
    }

    await client.query('COMMIT');

    // Fetch complete invoice
    const fullInvoice = await pool.query(`
      SELECT i.*, c.business_name as client_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    res.json(fullInvoice.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /api/billing/invoices/:id/approve - Approve invoice
// ============================================================
router.put('/invoices/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE invoices SET
        status = 'approved',
        approved_by = $1,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND status = 'draft'
      RETURNING *
    `, [req.user?.id, id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invoice not found or not in draft status' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error approving invoice:', error);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
});

// ============================================================
// POST /api/billing/invoices/:id/send - Send invoice to client
// ============================================================
router.post('/invoices/:id/send', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice with client info
    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        c.business_name as client_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    if (!['draft', 'approved'].includes(invoice.status)) {
      return res.status(400).json({ error: 'Invoice has already been sent' });
    }

    // Get contact for client
    const contactResult = await pool.query(`
      SELECT * FROM contacts 
      WHERE client_id = $1 AND is_primary = true
      LIMIT 1
    `, [invoice.client_id]);

    if (contactResult.rows.length === 0) {
      return res.status(400).json({ error: 'No primary contact found for client' });
    }

    const contact = contactResult.rows[0];

    // Get invoice items
    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order
    `, [id]);

    // Create Stripe invoice if stripe service available
    let stripeInvoiceId = null;
    let stripeInvoiceUrl = null;

    if (stripeService && invoice.stripe_customer_id) {
      try {
        const stripeInvoice = await stripeService.createInvoice(
          invoice.stripe_entity_code || 'wsic',
          {
            stripeCustomerId: invoice.stripe_customer_id,
            invoiceId: invoice.id,
            orderId: invoice.order_id,
            autoCharge: invoice.billing_preference === 'card' || invoice.billing_preference === 'ach',
            daysUntilDue: Math.max(1, Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24))),
            lineItems: itemsResult.rows.map(item => ({
              amount: parseFloat(item.amount),
              description: item.description,
              orderItemId: item.order_item_id
            })),
            addProcessingFee: invoice.processing_fee > 0,
            processingFee: parseFloat(invoice.processing_fee),
            totalAmount: parseFloat(invoice.total)
          }
        );

        // Finalize and send
        const finalizedInvoice = await stripeService.finalizeInvoice(
          invoice.stripe_entity_code || 'wsic',
          stripeInvoice.id,
          false // We'll send our own email
        );

        stripeInvoiceId = stripeInvoice.id;
        stripeInvoiceUrl = finalizedInvoice.hosted_invoice_url;
      } catch (stripeError) {
        console.error('Stripe invoice creation failed:', stripeError);
        // Continue without Stripe - we'll send email with manual payment instructions
      }
    }

    // Update invoice status
    await pool.query(`
      UPDATE invoices SET
        status = 'sent',
        sent_at = NOW(),
        stripe_invoice_id = $2,
        stripe_invoice_url = $3,
        updated_at = NOW()
      WHERE id = $1
    `, [id, stripeInvoiceId, stripeInvoiceUrl]);

    // Send email notification
    if (emailService && emailService.sendInvoiceToClient) {
      try {
        await emailService.sendInvoiceToClient({
          invoice: {
            ...invoice,
            stripe_invoice_url: stripeInvoiceUrl
          },
          contact,
          items: itemsResult.rows
        });
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError);
        // Don't fail the request - invoice is sent even if email fails
      }
    }

    res.json({ 
      success: true, 
      message: 'Invoice sent successfully',
      stripe_invoice_url: stripeInvoiceUrl
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

// ============================================================
// POST /api/billing/invoices/:id/record-payment - Record manual payment
// ============================================================
router.post('/invoices/:id/record-payment', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { amount, payment_method, reference, notes } = req.body;

    await client.query('BEGIN');

    // Get current invoice
    const invoiceResult = await client.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];
    const paymentAmount = parseFloat(amount);
    const newBalance = parseFloat(invoice.balance_due) - paymentAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    const amountPaid = parseFloat(invoice.amount_paid || 0) + paymentAmount;

    // Insert payment record
    await client.query(`
      INSERT INTO invoice_payments (
        invoice_id, amount, payment_method, reference, notes, recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, paymentAmount, payment_method, reference, notes, req.user?.id]);

    // Update invoice
    const updateResult = await client.query(`
      UPDATE invoices SET
        status = $1,
        balance_due = $2,
        amount_paid = $3,
        paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [newStatus, Math.max(0, newBalance), amountPaid, id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      invoice: updateResult.rows[0],
      payment: { amount: paymentAmount, method: payment_method, reference }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/billing/invoices/:id/charge - Charge payment method on file
// ============================================================
router.post('/invoices/:id/charge', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice with order details
    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        o.payment_method_id as order_payment_method_id,
        o.stripe_customer_id as order_stripe_customer_id,
        c.stripe_customer_id as client_stripe_customer_id
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    const paymentMethodId = invoice.payment_method_id || invoice.order_payment_method_id;
    const customerId = invoice.stripe_customer_id || invoice.order_stripe_customer_id || invoice.client_stripe_customer_id;

    if (!paymentMethodId || !customerId) {
      return res.status(400).json({ error: 'No payment method on file' });
    }

    if (!stripeService) {
      return res.status(503).json({ error: 'Payment service not available' });
    }

    // Create payment intent and charge
    const paymentResult = await stripeService.chargePaymentMethod(
      invoice.stripe_entity_code || 'wsic',
      {
        customerId,
        paymentMethodId,
        amount: Math.round(parseFloat(invoice.balance_due) * 100), // Convert to cents
        description: `Invoice ${invoice.invoice_number}`,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number
        }
      }
    );

    if (paymentResult.status === 'succeeded') {
      // Update invoice as paid
      await pool.query(`
        UPDATE invoices SET
          status = 'paid',
          balance_due = 0,
          amount_paid = total,
          paid_at = NOW(),
          stripe_payment_intent_id = $2,
          updated_at = NOW()
        WHERE id = $1
      `, [id, paymentResult.id]);

      // Record the payment
      await pool.query(`
        INSERT INTO invoice_payments (
          invoice_id, amount, payment_method, stripe_payment_intent_id, recorded_by
        ) VALUES ($1, $2, 'card', $3, $4)
      `, [id, invoice.balance_due, paymentResult.id, req.user?.id]);

      res.json({ success: true, message: 'Payment processed successfully' });
    } else {
      res.status(400).json({ error: 'Payment failed', status: paymentResult.status });
    }

  } catch (error) {
    console.error('Error charging payment method:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// ============================================================
// POST /api/billing/invoices/:id/send-reminder - Send payment reminder
// ============================================================
router.post('/invoices/:id/send-reminder', async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice
    const invoiceResult = await pool.query(`
      SELECT i.*, c.business_name as client_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get contact
    const contactResult = await pool.query(`
      SELECT * FROM contacts 
      WHERE client_id = $1 AND is_primary = true
      LIMIT 1
    `, [invoice.client_id]);

    if (contactResult.rows.length === 0) {
      return res.status(400).json({ error: 'No primary contact found' });
    }

    // Send reminder email
    if (emailService && emailService.sendInvoiceReminder) {
      await emailService.sendInvoiceReminder({
        invoice,
        contact: contactResult.rows[0]
      });
    }

    // Update last reminder sent timestamp
    await pool.query(`
      UPDATE invoices SET last_reminder_at = NOW(), updated_at = NOW() WHERE id = $1
    `, [id]);

    res.json({ success: true, message: 'Reminder sent' });

  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// ============================================================
// PUT /api/billing/invoices/:id/void - Void invoice
// ============================================================
router.put('/invoices/:id/void', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE invoices SET
        status = 'void',
        voided_by = $1,
        voided_at = NOW(),
        void_reason = $2,
        updated_at = NOW()
      WHERE id = $3 AND status NOT IN ('paid', 'void')
      RETURNING *
    `, [req.user?.id, reason, id]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invoice not found or cannot be voided' });
    }

    // Void Stripe invoice if exists
    if (stripeService && result.rows[0].stripe_invoice_id) {
      try {
        await stripeService.voidInvoice(
          result.rows[0].stripe_entity_code || 'wsic',
          result.rows[0].stripe_invoice_id
        );
      } catch (stripeError) {
        console.error('Failed to void Stripe invoice:', stripeError);
      }
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error voiding invoice:', error);
    res.status(500).json({ error: 'Failed to void invoice' });
  }
});

// ============================================================
// GET /api/billing/stats - Dashboard statistics
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        -- Outstanding invoices
        COUNT(*) FILTER (WHERE status = 'sent') as outstanding_count,
        COALESCE(SUM(balance_due) FILTER (WHERE status = 'sent'), 0) as outstanding_total,
        
        -- Overdue invoices
        COUNT(*) FILTER (WHERE status = 'sent' AND due_date < CURRENT_DATE) as overdue_count,
        COALESCE(SUM(balance_due) FILTER (WHERE status = 'sent' AND due_date < CURRENT_DATE), 0) as overdue_total,
        
        -- Paid this month
        COUNT(*) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)) as paid_this_month_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as paid_this_month_total,
        
        -- Pending approval
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count
      FROM invoices
    `;

    const agingQuery = `
      SELECT
        COALESCE(SUM(balance_due) FILTER (WHERE due_date::date >= CURRENT_DATE), 0) as current,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date::date < CURRENT_DATE AND due_date::date >= CURRENT_DATE - INTERVAL '30 days'), 0) as days_1_30,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date::date < CURRENT_DATE - INTERVAL '30 days' AND due_date::date >= CURRENT_DATE - INTERVAL '60 days'), 0) as days_31_60,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date::date < CURRENT_DATE - INTERVAL '60 days' AND due_date::date >= CURRENT_DATE - INTERVAL '90 days'), 0) as days_61_90,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date::date < CURRENT_DATE - INTERVAL '90 days'), 0) as days_over_90
      FROM invoices
      WHERE status = 'sent'
    `;

    const [statsResult, agingResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(agingQuery)
    ]);

    res.json({
      ...statsResult.rows[0],
      aging: agingResult.rows[0]
    });

  } catch (error) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({ error: 'Failed to fetch billing statistics' });
  }
});

// ============================================================
// GET /api/billing/aging-report - Detailed aging report
// ============================================================
router.get('/aging-report', async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id, i.invoice_number, i.due_date, i.total, i.balance_due, i.status,
        i.billing_preference, i.payment_method_id,
        c.id as client_id, c.business_name as client_name, c.slug as client_slug,
        CASE 
          WHEN i.due_date::date >= CURRENT_DATE THEN 'current'
          WHEN i.due_date::date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
          WHEN i.due_date::date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
          WHEN i.due_date::date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
          ELSE 'over-90'
        END as aging_bucket,
        (CURRENT_DATE - i.due_date::date) as days_overdue
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.status = 'sent' AND i.balance_due > 0
      ORDER BY i.due_date ASC
    `;

    const result = await pool.query(query);

    // Group by aging bucket
    const grouped = {
      current: [],
      '1-30': [],
      '31-60': [],
      '61-90': [],
      'over-90': []
    };

    result.rows.forEach(row => {
      grouped[row.aging_bucket].push(row);
    });

    res.json({
      invoices: result.rows,
      grouped,
      totals: {
        current: grouped.current.reduce((sum, i) => sum + parseFloat(i.balance_due), 0),
        '1-30': grouped['1-30'].reduce((sum, i) => sum + parseFloat(i.balance_due), 0),
        '31-60': grouped['31-60'].reduce((sum, i) => sum + parseFloat(i.balance_due), 0),
        '61-90': grouped['61-90'].reduce((sum, i) => sum + parseFloat(i.balance_due), 0),
        'over-90': grouped['over-90'].reduce((sum, i) => sum + parseFloat(i.balance_due), 0)
      }
    });

  } catch (error) {
    console.error('Error fetching aging report:', error);
    res.status(500).json({ error: 'Failed to fetch aging report' });
  }
});

// ============================================================
// GET /api/billing/billable-orders - Preview orders ready for invoicing
// ============================================================
router.get('/billable-orders', async (req, res) => {
  try {
    const { billing_month, billing_year } = req.query;
    
    // Default to current month
    const now = new Date();
    const month = billing_month !== undefined ? parseInt(billing_month) : now.getMonth();
    const year = billing_year !== undefined ? parseInt(billing_year) : now.getFullYear();

    // Get all signed orders (signed = active and billable)
    const ordersQuery = `
      SELECT 
        o.id, o.order_number, o.client_id, o.monthly_total, o.billing_preference,
        o.contract_start_date, o.contract_end_date, o.stripe_entity_code,
        o.stripe_customer_id, o.payment_method_id,
        c.business_name as client_name,
        u.name as sales_rep_name,
        EXTRACT(DAY FROM o.contract_start_date) as start_day
      FROM orders o
      JOIN advertising_clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.sales_associate_id = u.id
      WHERE o.status = 'signed'
        AND o.contract_start_date <= $1::date
        AND (o.contract_end_date IS NULL OR o.contract_end_date >= $2::date)
      ORDER BY c.business_name
    `;

    // First day of billing month and last day
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0);

    const ordersResult = await pool.query(ordersQuery, [
      periodEnd.toISOString().split('T')[0],
      periodStart.toISOString().split('T')[0]
    ]);

    // Get order items with category info for each order
    const orderIds = ordersResult.rows.map(o => o.id);
    
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const itemsQuery = `
        SELECT 
          oi.order_id, oi.id as item_id, oi.quantity, oi.unit_price, oi.line_total,
          oi.product_id, oi.product_name,
          pc.code as category_code, pc.name as category_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE oi.order_id = ANY($1)
      `;
      const itemsResult = await pool.query(itemsQuery, [orderIds]);
      
      itemsResult.rows.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
    }

    // Check for existing invoices this period
    const existingQuery = `
      SELECT DISTINCT order_id 
      FROM invoices 
      WHERE billing_period_start = $1 
        AND billing_period_end = $2
        AND status != 'void'
    `;
    const existingResult = await pool.query(existingQuery, [
      periodStart.toISOString().split('T')[0],
      periodEnd.toISOString().split('T')[0]
    ]);
    const existingOrderIds = new Set(existingResult.rows.map(r => r.order_id));

    // Build billable orders list
    const billableOrders = [];
    const skippedOrders = [];

    for (const order of ordersResult.rows) {
      const items = itemsByOrder[order.id] || [];
      const isMixed = hasMixedBillingCategories(items);
      
      // Determine billing period based on categories
      let billingPeriod;
      if (isMixed) {
        // Mixed = bill at beginning of month for current month
        billingPeriod = {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0),
          dueDay: null
        };
      } else if (items.length > 0) {
        // Use first item's category to determine period
        billingPeriod = determineBillingPeriod(items[0].category_code, month, year);
      } else {
        // Default to current month
        billingPeriod = {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0),
          dueDay: null
        };
      }

      // Determine due date
      // If billingPeriod specifies a dueDay (like Print = 15th), use it
      // Otherwise, use campaign start date logic (15th if started mid-month, last business day otherwise)
      let dueDay;
      if (billingPeriod.dueDay) {
        dueDay = billingPeriod.dueDay;
      } else {
        const startDay = parseInt(order.start_day) || 1;
        const billOn15th = startDay >= 10 && startDay <= 20;
        dueDay = billOn15th ? 15 : getLastBusinessDay(year, month);
      }
      const dueDate = new Date(year, month, dueDay);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        const price = parseFloat(item.unit_price) || 0;
        return sum + (price * (item.quantity || 1));
      }, 0);

      const processingFee = order.billing_preference === 'card' 
        ? Math.round(subtotal * 0.035 * 100) / 100 
        : 0;

      const orderData = {
        ...order,
        items,
        is_mixed: isMixed,
        billing_period: billingPeriod,
        due_date: dueDate,
        subtotal,
        processing_fee: processingFee,
        total: subtotal + processingFee,
        already_invoiced: existingOrderIds.has(order.id)
      };

      if (existingOrderIds.has(order.id)) {
        skippedOrders.push(orderData);
      } else {
        billableOrders.push(orderData);
      }
    }

    res.json({
      billing_month: month,
      billing_year: year,
      period_label: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      billable_orders: billableOrders,
      skipped_orders: skippedOrders,
      summary: {
        total_orders: billableOrders.length,
        total_amount: billableOrders.reduce((sum, o) => sum + o.total, 0),
        skipped_count: skippedOrders.length
      }
    });

  } catch (error) {
    console.error('Error fetching billable orders:', error);
    res.status(500).json({ error: 'Failed to fetch billable orders' });
  }
});

// ============================================================
// POST /api/billing/generate-monthly - Generate invoices for billing period
// ============================================================
router.post('/generate-monthly', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { billing_month, billing_year, order_ids } = req.body;
    
    // Default to current month
    const now = new Date();
    const month = billing_month !== undefined ? parseInt(billing_month) : now.getMonth();
    const year = billing_year !== undefined ? parseInt(billing_year) : now.getFullYear();

    // Get billable orders (either specified or all signed)
    let ordersQuery = `
      SELECT 
        o.id, o.order_number, o.client_id, o.monthly_total, o.billing_preference,
        o.contract_start_date, o.contract_end_date, o.stripe_entity_code,
        o.stripe_customer_id, o.payment_method_id,
        c.business_name as client_name,
        EXTRACT(DAY FROM o.contract_start_date) as start_day
      FROM orders o
      JOIN advertising_clients c ON o.client_id = c.id
      WHERE o.status = 'signed'
    `;

    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0);
    let queryParams = [];

    if (order_ids && order_ids.length > 0) {
      ordersQuery += ` AND o.id = ANY($1)`;
      queryParams.push(order_ids);
    } else {
      ordersQuery += ` AND o.contract_start_date <= $1::date AND (o.contract_end_date IS NULL OR o.contract_end_date >= $2::date)`;
      queryParams.push(periodEnd.toISOString().split('T')[0], periodStart.toISOString().split('T')[0]);
    }

    const ordersResult = await client.query(ordersQuery, queryParams);

    // Get order items
    const orderIds = ordersResult.rows.map(o => o.id);
    let itemsByOrder = {};
    
    if (orderIds.length > 0) {
      const itemsQuery = `
        SELECT 
          oi.order_id, oi.id as item_id, oi.quantity, oi.unit_price, oi.line_total,
          oi.product_id, oi.product_name,
          pc.code as category_code
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE oi.order_id = ANY($1)
      `;
      const itemsResult = await client.query(itemsQuery, [orderIds]);
      
      itemsResult.rows.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });
    }

    // Check for existing invoices
    const existingQuery = `
      SELECT DISTINCT order_id 
      FROM invoices 
      WHERE billing_period_start = $1 
        AND billing_period_end = $2
        AND status != 'void'
    `;
    const existingResult = await client.query(existingQuery, [
      periodStart.toISOString().split('T')[0],
      periodEnd.toISOString().split('T')[0]
    ]);
    const existingOrderIds = new Set(existingResult.rows.map(r => r.order_id));

    await client.query('BEGIN');

    const createdInvoices = [];
    const errors = [];

    for (const order of ordersResult.rows) {
      // Skip if already invoiced
      if (existingOrderIds.has(order.id)) {
        errors.push({ order_id: order.id, order_number: order.order_number, error: 'Already invoiced for this period' });
        continue;
      }

      try {
        const items = itemsByOrder[order.id] || [];
        const isMixed = hasMixedBillingCategories(items);
        
        // Determine billing period
        let billingPeriod;
        if (isMixed || items.length === 0) {
          billingPeriod = { start: periodStart, end: periodEnd, dueDay: null };
        } else {
          billingPeriod = determineBillingPeriod(items[0].category_code, month, year);
        }

        // Determine due date
        // If billingPeriod specifies a dueDay (like Print = 15th), use it
        // Otherwise, use campaign start date logic
        let dueDay;
        if (billingPeriod.dueDay) {
          dueDay = billingPeriod.dueDay;
        } else {
          const startDay = parseInt(order.start_day) || 1;
          const billOn15th = startDay >= 10 && startDay <= 20;
          dueDay = billOn15th ? 15 : getLastBusinessDay(year, month);
        }
        const dueDate = new Date(year, month, dueDay);

        // Calculate totals
        const subtotal = items.reduce((sum, item) => {
          const price = parseFloat(item.unit_price) || 0;
          return sum + (price * (item.quantity || 1));
        }, 0);

        const processingFee = order.billing_preference === 'card' 
          ? Math.round(subtotal * 0.035 * 100) / 100 
          : 0;

        const total = subtotal + processingFee;

        // Generate invoice number
        const invoice_number = await generateInvoiceNumber();

        // Create invoice
        const invoiceResult = await client.query(`
          INSERT INTO invoices (
            invoice_number, client_id, order_id, status,
            subtotal, processing_fee, total, balance_due,
            billing_period_start, billing_period_end,
            issue_date, due_date,
            billing_preference, stripe_entity_code, stripe_customer_id,
            payment_method_id, grace_period_ends_at
          ) VALUES (
            $1, $2, $3, 'draft',
            $4, $5, $6, $6,
            $7, $8,
            CURRENT_DATE, $9::date,
            $10, $11, $12,
            $13, $9::date + INTERVAL '30 days'
          )
          RETURNING *
        `, [
          invoice_number, order.client_id, order.id,
          subtotal, processingFee, total,
          billingPeriod.start.toISOString().split('T')[0],
          billingPeriod.end.toISOString().split('T')[0],
          dueDate.toISOString().split('T')[0],
          order.billing_preference, order.stripe_entity_code || 'wsic', order.stripe_customer_id,
          order.payment_method_id
        ]);

        const invoice = invoiceResult.rows[0];

        // Add line items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const price = parseFloat(item.unit_price) || 0;
          await client.query(`
            INSERT INTO invoice_items (
              invoice_id, description, quantity, unit_price, amount,
              order_item_id, product_id, sort_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            invoice.id,
            item.product_name || 'Advertising Service',
            item.quantity || 1,
            price,
            price * (item.quantity || 1),
            item.item_id,
            item.product_id,
            i
          ]);
        }

        createdInvoices.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          client_name: order.client_name,
          order_number: order.order_number,
          total: invoice.total
        });

      } catch (orderError) {
        console.error(`Error creating invoice for order ${order.order_number}:`, orderError);
        errors.push({ order_id: order.id, order_number: order.order_number, error: orderError.message });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      created: createdInvoices,
      errors,
      summary: {
        created_count: createdInvoices.length,
        error_count: errors.length,
        total_amount: createdInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating monthly invoices:', error);
    res.status(500).json({ error: 'Failed to generate invoices' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/billing/generate-from-order/:orderId - Generate invoice from order
// ============================================================
router.post('/generate-from-order/:orderId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { orderId } = req.params;
    const { billing_period_start, billing_period_end } = req.body;

    await client.query('BEGIN');

    // Get order details
    const orderResult = await client.query(`
      SELECT o.*, c.business_name as client_name, c.stripe_customer_id
      FROM orders o
      JOIN advertising_clients c ON o.client_id = c.id
      WHERE o.id = $1 AND o.status IN ('signed', 'active')
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not in billable status' });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await client.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    // Generate invoice number
    const invoice_number = await generateInvoiceNumber();

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Calculate processing fee if card
    let processing_fee = 0;
    if (order.billing_preference === 'card') {
      processing_fee = Math.round(parseFloat(order.monthly_total) * 0.035 * 100) / 100;
    }

    const total = parseFloat(order.monthly_total) + processing_fee;

    // Create invoice
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, client_id, order_id, status,
        subtotal, processing_fee, total, balance_due,
        billing_period_start, billing_period_end,
        issue_date, due_date,
        billing_preference, stripe_entity_code, stripe_customer_id,
        payment_method_id, grace_period_ends_at
      ) VALUES (
        $1, $2, $3, 'draft',
        $4, $5, $6, $6,
        $7, $8,
        CURRENT_DATE, $9::date,
        $10, $11, $12,
        $13, $9::date + INTERVAL '30 days'
      )
      RETURNING *
    `, [
      invoice_number, order.client_id, orderId,
      order.monthly_total, processing_fee, total,
      billing_period_start || order.contract_start_date,
      billing_period_end,
      dueDate.toISOString().split('T')[0],
      order.billing_preference, order.stripe_entity_code || 'wsic', order.stripe_customer_id,
      order.payment_method_id
    ]);

    const invoice = invoiceResult.rows[0];

    // Add line items from order
    for (let i = 0; i < itemsResult.rows.length; i++) {
      const item = itemsResult.rows[i];
      await client.query(`
        INSERT INTO invoice_items (
          invoice_id, description, quantity, unit_price, amount,
          order_item_id, product_id, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        invoice.id,
        item.product_name || item.description || 'Advertising Service',
        item.quantity || 1,
        item.unit_price,
        parseFloat(item.unit_price) * (item.quantity || 1),
        item.id,
        item.product_id,
        i
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...invoice,
      client_name: order.client_name
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice from order:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  } finally {
    client.release();
  }
});

// ============================================================
// POST /api/billing/send-reminder/:id - Send payment reminder
// ============================================================
router.post('/send-reminder/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reminder_type } = req.body; // 'friendly', '15_day', '25_day', '30_day'

    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        c.business_name as client_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get contact
    const contactResult = await pool.query(`
      SELECT * FROM contacts 
      WHERE client_id = $1 AND is_primary = true
      LIMIT 1
    `, [invoice.client_id]);

    if (contactResult.rows.length === 0) {
      return res.status(400).json({ error: 'No primary contact found' });
    }

    // Send reminder email
    if (emailService && emailService.sendPaymentReminder) {
      await emailService.sendPaymentReminder({
        invoice,
        contact: contactResult.rows[0],
        reminder_type
      });
    }

    // Update reminder tracking
    const updateField = {
      '15_day': 'reminder_sent_15_days',
      '25_day': 'reminder_sent_25_days',
      '30_day': 'reminder_sent_30_days'
    }[reminder_type];

    if (updateField) {
      await pool.query(`
        UPDATE invoices SET ${updateField} = true, updated_at = NOW()
        WHERE id = $1
      `, [id]);
    }

    res.json({ success: true, message: 'Reminder sent successfully' });

  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

module.exports = router;
module.exports.initPool = initPool;
module.exports.initEmailService = initEmailService;
module.exports.initStripeService = initStripeService;
