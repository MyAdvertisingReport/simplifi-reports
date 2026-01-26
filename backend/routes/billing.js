/**
 * billing.js - Invoice/Billing Management Routes
 * 
 * Endpoints for:
 * - Invoice CRUD operations
 * - Invoice approval workflow
 * - Payment tracking and reminders
 * - Auto-charge after grace period
 * - Aging reports
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
        u.name as created_by_name,
        CASE 
          WHEN i.status = 'sent' AND i.due_date < CURRENT_DATE 
          THEN EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::int
          ELSE 0
        END as days_overdue
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users u ON i.created_by = u.id
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
        c.address_street, c.address_city, c.address_state, c.address_zip,
        o.order_number, o.term_months, o.contract_start_date, o.contract_end_date,
        u.name as created_by_name,
        ua.name as approved_by_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users ua ON i.approved_by = ua.id
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

    res.json({
      ...invoiceResult.rows[0],
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
    const invoiceResult = await client.query(`
      INSERT INTO invoices (
        invoice_number, client_id, order_id, status,
        subtotal, processing_fee, total, balance_due,
        billing_period_start, billing_period_end,
        issue_date, due_date,
        billing_preference, stripe_entity_code, stripe_customer_id,
        grace_period_ends_at, notes, created_by
      ) VALUES (
        $1, $2, $3, 'draft',
        $4, $5, $6, $7,
        $8, $9,
        CURRENT_DATE, $10,
        $11, $12, $13,
        $10 + INTERVAL '30 days', $14, $15
      )
      RETURNING *
    `, [
      invoice_number, client_id, order_id,
      subtotal, processing_fee, total, balance_due,
      billing_period_start, billing_period_end,
      due_date,
      billing_preference, stripe_entity_code, clientResult.rows[0]?.stripe_customer_id,
      notes, req.user?.id
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

    if (!['draft', 'approved'].includes(checkResult.rows[0].status)) {
      return res.status(400).json({ error: 'Cannot edit invoice that has been sent' });
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

    // Recalculate totals
    let subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_price) * (item.quantity || 1));
    }, 0);

    let processing_fee = 0;
    if (add_processing_fee && billing_preference === 'card') {
      processing_fee = Math.round(subtotal * 0.035 * 100) / 100;
    }

    const total = subtotal + processing_fee;

    // Update invoice
    await client.query(`
      UPDATE invoices SET
        billing_period_start = $1,
        billing_period_end = $2,
        due_date = $3,
        billing_preference = $4,
        subtotal = $5,
        processing_fee = $6,
        total = $7,
        balance_due = $7 - COALESCE(amount_paid, 0),
        grace_period_ends_at = $3 + INTERVAL '30 days',
        notes = $8,
        updated_at = NOW()
      WHERE id = $9
    `, [
      billing_period_start, billing_period_end, due_date,
      billing_preference, subtotal, processing_fee, total,
      notes, id
    ]);

    // Delete existing items and re-insert
    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);

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

    // Fetch updated invoice
    const result = await pool.query(`
      SELECT i.*, c.business_name as client_name
      FROM invoices i
      JOIN advertising_clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    res.json(result.rows[0]);

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

    // Get invoice details
    const invoiceResult = await pool.query(`
      SELECT 
        i.*,
        c.business_name as client_name,
        c.slug as client_slug
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
      await emailService.sendInvoiceToClient({
        invoice: {
          ...invoice,
          items: itemsResult.rows,
          stripe_invoice_url: stripeInvoiceUrl
        },
        contact
      });
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
  try {
    const { id } = req.params;
    const { amount, payment_method, notes, payment_date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount required' });
    }

    const invoiceResult = await pool.query(
      `SELECT * FROM invoices WHERE id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];
    const newAmountPaid = parseFloat(invoice.amount_paid || 0) + parseFloat(amount);
    const newBalanceDue = parseFloat(invoice.total) - newAmountPaid;
    
    // Determine new status
    let newStatus = invoice.status;
    if (newBalanceDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    await pool.query(`
      UPDATE invoices SET
        amount_paid = $1,
        balance_due = $2,
        status = $3,
        paid_at = CASE WHEN $3 = 'paid' THEN NOW() ELSE paid_at END,
        notes = COALESCE(notes, '') || E'\n' || $4,
        updated_at = NOW()
      WHERE id = $5
    `, [
      newAmountPaid,
      Math.max(0, newBalanceDue),
      newStatus,
      `Payment recorded: ${formatCurrency(amount)} via ${payment_method} on ${payment_date || new Date().toLocaleDateString()}. ${notes || ''}`,
      id
    ]);

    res.json({ 
      success: true, 
      message: newStatus === 'paid' ? 'Invoice marked as paid' : 'Payment recorded',
      new_balance: Math.max(0, newBalanceDue),
      status: newStatus
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ============================================================
// POST /api/billing/invoices/:id/charge - Charge saved payment method
// ============================================================
router.post('/invoices/:id/charge', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method_id } = req.body;

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

    if (!stripeService) {
      return res.status(500).json({ error: 'Payment service not available' });
    }

    if (!invoice.stripe_customer_id) {
      return res.status(400).json({ error: 'No payment method on file for this client' });
    }

    // Use provided payment method or fall back to invoice's stored method
    const methodToCharge = payment_method_id || invoice.payment_method_id;

    if (!methodToCharge) {
      return res.status(400).json({ error: 'No payment method available' });
    }

    // Attempt charge
    const chargeResult = await stripeService.chargeCustomer(
      invoice.stripe_entity_code || 'wsic',
      {
        stripeCustomerId: invoice.stripe_customer_id,
        paymentMethodId: methodToCharge,
        amount: parseFloat(invoice.balance_due),
        description: `Invoice ${invoice.invoice_number} - ${invoice.client_name}`,
        invoiceId: invoice.id,
        type: 'invoice'
      }
    );

    if (!chargeResult.success) {
      // Update payment attempt tracking
      await pool.query(`
        UPDATE invoices SET
          payment_attempts = payment_attempts + 1,
          last_payment_attempt_at = NOW(),
          last_payment_error = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [chargeResult.message, id]);

      return res.status(400).json({ 
        error: 'Payment failed', 
        message: chargeResult.message 
      });
    }

    // Update invoice as paid
    await pool.query(`
      UPDATE invoices SET
        status = 'paid',
        amount_paid = total,
        balance_due = 0,
        paid_at = NOW(),
        payment_attempts = payment_attempts + 1,
        last_payment_attempt_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      payment_intent_id: chargeResult.paymentIntent?.id
    });

  } catch (error) {
    console.error('Error charging invoice:', error);
    res.status(500).json({ error: 'Failed to process payment' });
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
        COALESCE(SUM(balance_due) FILTER (WHERE due_date >= CURRENT_DATE), 0) as current,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as days_1_30,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days'), 0) as days_31_60,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days'), 0) as days_61_90,
        COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - INTERVAL '90 days'), 0) as days_over_90
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
          WHEN i.due_date >= CURRENT_DATE THEN 'current'
          WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30'
          WHEN i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60'
          WHEN i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90'
          ELSE 'over-90'
        END as aging_bucket,
        EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::int as days_overdue
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
        payment_method_id, grace_period_ends_at, created_by
      ) VALUES (
        $1, $2, $3, 'draft',
        $4, $5, $6, $6,
        $7, $8,
        CURRENT_DATE, $9,
        $10, $11, $12,
        $13, $9 + INTERVAL '30 days', $14
      )
      RETURNING *
    `, [
      invoice_number, order.client_id, orderId,
      order.monthly_total, processing_fee, total,
      billing_period_start || order.contract_start_date,
      billing_period_end,
      dueDate.toISOString().split('T')[0],
      order.billing_preference, order.stripe_entity_code || 'wsic', order.stripe_customer_id,
      order.stripe_payment_method_id, req.user?.id
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
        item.adjusted_price || item.unit_price,
        parseFloat(item.adjusted_price || item.unit_price) * (item.quantity || 1),
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
