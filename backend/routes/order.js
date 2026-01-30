// ============================================================
// ORDER FORM API ROUTES
// Handles order creation, management, approval workflow, and client signing
// ============================================================

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const crypto = require('crypto');

// Stripe service for payment processing
let stripeService = null;
try {
  const stripeModule = require('../services/stripe-service');
  stripeService = stripeModule.stripeService;
  console.log('Stripe service loaded in order routes');
} catch (err) {
  console.log('Stripe service not available:', err.message);
}

// Database pool - will be set by the main server
let pool = null;

// Email service - will be injected
let emailService = null;

// Initialize the pool
const initPool = (connectionString) => {
  if (!pool && connectionString) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Order routes connecting to database');
  }
};

// Initialize email service
const initEmailService = (service) => {
  emailService = service;
  console.log('Order routes email service initialized');
};

// Middleware to ensure pool is available
const ensurePool = (req, res, next) => {
  if (!pool) {
    // Try to initialize from environment
    const connString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (connString) {
      initPool(connString);
    }
  }
  if (!pool) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  next();
};

router.use(ensurePool);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Generate a secure signing token
const generateSigningToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Check if order has price adjustments
const checkPriceAdjustments = (items) => {
  if (!items || items.length === 0) return false;
  return items.some(item => {
    const unitPrice = parseFloat(item.unit_price) || 0;
    const originalPrice = parseFloat(item.original_price) || parseFloat(item.unit_price) || 0;
    return Math.abs(unitPrice - originalPrice) > 0.01; // Allow for floating point
  });
};

// Get client IP address from request
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.ip || 
         'unknown';
};

// ============================================================
// CLIENT ROUTES
// ============================================================

// GET /api/orders/clients - List all clients with primary contact
router.get('/clients', async (req, res) => {
  try {
    const { search, status, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        c.id,
        c.business_name,
        c.industry,
        c.website,
        c.status,
        c.notes,
        c.created_at,
        ct.id as contact_id,
        ct.first_name as contact_first_name,
        ct.last_name as contact_last_name,
        ct.email as contact_email,
        ct.phone as contact_phone,
        ct.title as contact_title,
        (SELECT COUNT(*) FROM contacts WHERE client_id = c.id) as contact_count
      FROM advertising_clients c
      LEFT JOIN contacts ct ON ct.client_id = c.id AND ct.is_primary = true
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (c.business_name ILIKE $${paramCount} OR ct.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY c.business_name LIMIT ${parseInt(limit)}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/orders/clients/:id - Get single client with all contacts
router.get('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const clientResult = await pool.query(
      'SELECT * FROM advertising_clients WHERE id = $1',
      [id]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const contactsResult = await pool.query(
      'SELECT * FROM contacts WHERE client_id = $1 ORDER BY is_primary DESC, last_name',
      [id]
    );

    res.json({
      ...clientResult.rows[0],
      contacts: contactsResult.rows
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// POST /api/orders/clients - Create new client with contacts
router.post('/clients', async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    
    const {
      business_name,
      industry,
      website,
      status = 'prospect',
      notes,
      contacts,
      // Legacy single contact fields
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      contact_title
    } = req.body;

    // Generate slug from business name
    const slug = business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create client
    const clientResult = await dbClient.query(
      `INSERT INTO advertising_clients (id, business_name, slug, industry, website, status, notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [business_name, slug, industry, website, status, notes]
    );

    const newClient = clientResult.rows[0];
    const createdContacts = [];

    // Handle multiple contacts if provided
    if (contacts && Array.isArray(contacts) && contacts.length > 0) {
      for (const contact of contacts) {
        if (contact.first_name || contact.last_name) {
          const isPrimary = contact.contact_type === 'owner' || contact.is_primary;
          const contactResult = await dbClient.query(
            `INSERT INTO contacts (id, client_id, first_name, last_name, email, phone, title, contact_type, is_primary, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             RETURNING *`,
            [newClient.id, contact.first_name, contact.last_name, contact.email, contact.phone, 
             contact.title, contact.contact_type || 'other', isPrimary]
          );
          createdContacts.push(contactResult.rows[0]);
        }
      }
    } else if (contact_first_name || contact_last_name) {
      // Legacy: Create single owner/primary contact
      const contactResult = await dbClient.query(
        `INSERT INTO contacts (id, client_id, first_name, last_name, email, phone, title, contact_type, is_primary, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'owner', true, NOW(), NOW())
         RETURNING *`,
        [newClient.id, contact_first_name, contact_last_name, contact_email, contact_phone, contact_title]
      );
      createdContacts.push(contactResult.rows[0]);
    }

    await dbClient.query('COMMIT');

    // Return with legacy fields for compatibility
    const primaryContact = createdContacts.find(c => c.is_primary) || createdContacts[0];
    res.status(201).json({
      ...newClient,
      contacts: createdContacts,
      contact_count: createdContacts.length,
      contact_first_name: primaryContact?.first_name,
      contact_last_name: primaryContact?.last_name,
      contact_email: primaryContact?.email,
      contact_phone: primaryContact?.phone,
      contact_title: primaryContact?.title
    });
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  } finally {
    dbClient.release();
  }
});

// POST /api/orders/clients/import - Bulk import clients
router.post('/clients/import', async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    
    const { clients } = req.body;
    const results = { success: 0, failed: 0, errors: [] };

    for (const clientData of clients) {
      try {
        const {
          business_name,
          industry,
          website,
          status = 'prospect',
          notes,
          contact_first_name,
          contact_last_name,
          contact_email,
          contact_phone,
          contact_title
        } = clientData;

        if (!business_name) {
          results.failed++;
          results.errors.push({ row: clientData, error: 'Missing business_name' });
          continue;
        }

        const slug = business_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const clientResult = await dbClient.query(
          `INSERT INTO advertising_clients (id, business_name, slug, industry, website, status, notes, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`,
          [business_name, slug, industry, website, status || 'prospect', notes]
        );

        if (contact_first_name && contact_last_name) {
          await dbClient.query(
            `INSERT INTO contacts (id, client_id, first_name, last_name, email, phone, title, is_primary, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
            [clientResult.rows[0].id, contact_first_name, contact_last_name, contact_email, contact_phone, contact_title]
          );
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: clientData, error: err.message });
      }
    }

    await dbClient.query('COMMIT');
    res.json(results);
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error importing clients:', error);
    res.status(500).json({ error: 'Failed to import clients' });
  } finally {
    dbClient.release();
  }
});

// PUT /api/orders/clients/:id - Update client with multiple contacts
router.put('/clients/:id', async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    
    const { id } = req.params;
    const {
      business_name,
      industry,
      website,
      status,
      notes,
      contacts,
      // Legacy single contact fields (for backward compatibility)
      contact_first_name,
      contact_last_name,
      contact_email,
      contact_phone,
      contact_title
    } = req.body;

    // Update client
    const clientResult = await dbClient.query(
      `UPDATE advertising_clients 
       SET business_name = COALESCE($1, business_name),
           industry = $2,
           website = $3,
           status = COALESCE($4, status),
           notes = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [business_name, industry, website, status, notes, id]
    );

    if (clientResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ error: 'Client not found' });
    }

    const updatedClient = clientResult.rows[0];

    // Handle multiple contacts if provided
    if (contacts && Array.isArray(contacts)) {
      // Get existing contact IDs
      const existingContacts = await dbClient.query(
        'SELECT id FROM contacts WHERE client_id = $1',
        [id]
      );
      const existingIds = existingContacts.rows.map(c => c.id);
      
      // Process each contact
      for (const contact of contacts) {
        const isPrimary = contact.contact_type === 'owner' || contact.is_primary;
        
        // Check if this is an existing contact (has valid UUID id)
        const isExisting = contact.id && !contact.id.startsWith('new_') && existingIds.includes(contact.id);
        
        if (isExisting) {
          // Update existing contact
          await dbClient.query(
            `UPDATE contacts 
             SET first_name = $1,
                 last_name = $2,
                 email = $3,
                 phone = $4,
                 title = $5,
                 contact_type = $6,
                 is_primary = $7,
                 updated_at = NOW()
             WHERE id = $8`,
            [contact.first_name, contact.last_name, contact.email, contact.phone, 
             contact.title, contact.contact_type, isPrimary, contact.id]
          );
        } else if (contact.first_name || contact.last_name) {
          // Create new contact
          await dbClient.query(
            `INSERT INTO contacts (id, client_id, first_name, last_name, email, phone, title, contact_type, is_primary, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [id, contact.first_name, contact.last_name, contact.email, contact.phone,
             contact.title, contact.contact_type || 'other', isPrimary]
          );
        }
      }
      
      // Remove contacts that are no longer in the list
      const newContactIds = contacts
        .filter(c => c.id && !c.id.startsWith('new_'))
        .map(c => c.id);
      
      for (const existingId of existingIds) {
        if (!newContactIds.includes(existingId)) {
          await dbClient.query('DELETE FROM contacts WHERE id = $1', [existingId]);
        }
      }
    } else if (contact_first_name || contact_last_name) {
      // Legacy: Handle single contact update
      const existingContact = await dbClient.query(
        'SELECT id FROM contacts WHERE client_id = $1 AND is_primary = true',
        [id]
      );

      if (existingContact.rows.length > 0) {
        await dbClient.query(
          `UPDATE contacts 
           SET first_name = $1,
               last_name = $2,
               email = $3,
               phone = $4,
               title = $5,
               updated_at = NOW()
           WHERE client_id = $6 AND is_primary = true`,
          [contact_first_name, contact_last_name, contact_email, contact_phone, contact_title, id]
        );
      } else {
        await dbClient.query(
          `INSERT INTO contacts (id, client_id, first_name, last_name, email, phone, title, is_primary, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
          [id, contact_first_name, contact_last_name, contact_email, contact_phone, contact_title]
        );
      }
    }

    await dbClient.query('COMMIT');

    // Fetch all contacts for response
    const allContacts = await pool.query(
      'SELECT * FROM contacts WHERE client_id = $1 ORDER BY is_primary DESC, created_at',
      [id]
    );

    // Return combined result
    const primaryContact = allContacts.rows.find(c => c.is_primary) || allContacts.rows[0];
    res.json({
      ...updatedClient,
      contacts: allContacts.rows,
      contact_count: allContacts.rows.length,
      // Legacy fields for backward compatibility
      contact_first_name: primaryContact?.first_name,
      contact_last_name: primaryContact?.last_name,
      contact_email: primaryContact?.email,
      contact_phone: primaryContact?.phone,
      contact_title: primaryContact?.title
    });
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  } finally {
    dbClient.release();
  }
});

// ============================================================
// ORDER ROUTES
// ============================================================

// Generate order number
const generateOrderNumber = async (poolClient) => {
  const year = new Date().getFullYear();
  const result = await poolClient.query(
    `SELECT order_number FROM orders 
     WHERE order_number LIKE $1 
     ORDER BY order_number DESC LIMIT 1`,
    [`ORD-${year}-%`]
  );
  
  let nextNum = 1;
  if (result.rows.length > 0) {
    const lastNum = parseInt(result.rows[0].order_number.split('-')[2]);
    nextNum = lastNum + 1;
  }
  
  return `ORD-${year}-${String(nextNum).padStart(4, '0')}`;
};

// GET /api/orders - List all orders WITH item counts and proper totals
router.get('/', async (req, res) => {
  try {
    const { status, client_id, clientId, sales_associate_id, limit = 200 } = req.query;
    const user = req.user;
    
    // Support both clientId (camelCase) and client_id (snake_case)
    const filterClientId = clientId || client_id;
    
    // Updated query to include item_count, calculate total_value, and get submitted_by name
    // Also get sales_associate info
    let query = `
      SELECT 
        o.*,
        c.business_name as client_name,
        c.industry as client_industry,
        c.slug as client_slug,
        COALESCE(u.name, o.submitted_signature) as submitted_by_name,
        u.email as submitted_by_email,
        approver.name as approved_by_name,
        sales_rep.name as sales_associate_name,
        sales_rep.id as sales_associate_id,
        COALESCE(item_stats.item_count, parent_item_stats.item_count, 0) as item_count,
        COALESCE(item_stats.setup_fees_total, 0) as setup_fees_total,
        CASE 
          WHEN o.term_months = 1 THEN COALESCE(o.monthly_total, 0) + COALESCE(item_stats.setup_fees_total, 0)
          ELSE COALESCE(o.monthly_total, 0) * COALESCE(o.term_months, 1) + COALESCE(item_stats.setup_fees_total, 0)
        END as total_value,
        COALESCE(item_stats.items_json, parent_item_stats.items_json) as items
      FROM orders o
      JOIN advertising_clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.submitted_by = u.id
      LEFT JOIN users approver ON o.approved_by = approver.id
      LEFT JOIN users sales_rep ON o.sales_associate_id = sales_rep.id OR o.submitted_by = sales_rep.id
      LEFT JOIN (
        SELECT 
          oi.order_id,
          COUNT(*) as item_count,
          COALESCE(SUM(oi.setup_fee), 0) as setup_fees_total,
          json_agg(json_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'product_category', oi.product_category,
            'entity_id', oi.entity_id,
            'entity_name', e.name,
            'entity_code', e.code,
            'unit_price', oi.unit_price,
            'book_price', oi.book_price,
            'setup_fee', oi.setup_fee,
            'book_setup_fee', oi.book_setup_fee,
            'quantity', oi.quantity,
            'line_total', oi.line_total
          )) as items_json
        FROM order_items oi
        LEFT JOIN entities e ON oi.entity_id = e.id
        GROUP BY oi.order_id
      ) item_stats ON item_stats.order_id = o.id
      LEFT JOIN (
        SELECT 
          oi.order_id,
          COUNT(*) as item_count,
          json_agg(json_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'product_category', oi.product_category,
            'entity_id', oi.entity_id,
            'entity_name', e.name,
            'entity_code', e.code,
            'unit_price', oi.unit_price,
            'book_price', oi.book_price,
            'setup_fee', oi.setup_fee,
            'book_setup_fee', oi.book_setup_fee,
            'quantity', oi.quantity,
            'line_total', oi.line_total
          )) as items_json
        FROM order_items oi
        LEFT JOIN entities e ON oi.entity_id = e.id
        GROUP BY oi.order_id
      ) parent_item_stats ON parent_item_stats.order_id = o.parent_order_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Sales reps only see their own orders (unless admin/super_admin)
    const isAdmin = user && (user.is_super_admin || user.role === 'admin' || user.role === 'manager');
    if (!isAdmin && user) {
      paramCount++;
      query += ` AND (o.submitted_by = $${paramCount} OR o.sales_associate_id = $${paramCount})`;
      params.push(user.id);
    }

    if (status) {
      // Support comma-separated status values (e.g., "signed,active")
      const statuses = status.split(',').map(s => s.trim()).filter(s => s);
      if (statuses.length === 1) {
        paramCount++;
        query += ` AND o.status = $${paramCount}`;
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        const placeholders = statuses.map((_, i) => `$${paramCount + i + 1}`).join(', ');
        query += ` AND o.status IN (${placeholders})`;
        statuses.forEach(s => params.push(s));
        paramCount += statuses.length;
      }
    }

    if (filterClientId) {
      paramCount++;
      query += ` AND o.client_id = $${paramCount}`;
      params.push(filterClientId);
    }

    // Filter by sales associate (for admin filtering)
    if (sales_associate_id) {
      paramCount++;
      query += ` AND (o.sales_associate_id = $${paramCount} OR o.submitted_by = $${paramCount})`;
      params.push(sales_associate_id);
    }

    // Order by status priority, then by date
    query += ` ORDER BY 
      CASE o.status 
        WHEN 'pending_approval' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'sent' THEN 3
        WHEN 'signed' THEN 4
        WHEN 'active' THEN 5
        WHEN 'draft' THEN 6
        WHEN 'completed' THEN 7
        WHEN 'cancelled' THEN 8
        ELSE 9
      END,
      o.created_at DESC 
      LIMIT ${parseInt(limit)}`;

    const result = await pool.query(query, params);
    
    // Return array directly for backward compatibility with OrderList
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/pending-approvals - Get orders needing approval (for managers)
router.get('/pending-approvals', async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*,
        c.business_name as client_name,
        c.industry as client_industry,
        c.slug as client_slug,
        COALESCE(u.name, o.submitted_signature, 'Unknown') as submitted_by_name,
        u.email as submitted_by_email,
        COALESCE(item_stats.item_count, 0) as item_count,
        COALESCE(item_stats.setup_fees_total, 0) as setup_fees_total,
        CASE 
          WHEN o.term_months = 1 THEN COALESCE(o.monthly_total, 0) + COALESCE(item_stats.setup_fees_total, 0)
          ELSE COALESCE(o.monthly_total, 0) * COALESCE(o.term_months, 1) + COALESCE(item_stats.setup_fees_total, 0)
        END as total_value,
        item_stats.items_json as items
      FROM orders o
      JOIN advertising_clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.submitted_by = u.id
      LEFT JOIN (
        SELECT 
          oi.order_id,
          COUNT(*) as item_count,
          COALESCE(SUM(oi.setup_fee), 0) as setup_fees_total,
          json_agg(json_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'product_category', oi.product_category,
            'entity_id', oi.entity_id,
            'entity_name', e.name,
            'entity_code', e.code,
            'unit_price', oi.unit_price,
            'quantity', oi.quantity,
            'line_total', oi.line_total
          )) as items_json
        FROM order_items oi
        LEFT JOIN entities e ON oi.entity_id = e.id
        GROUP BY oi.order_id
      ) item_stats ON item_stats.order_id = o.id
      WHERE o.status = 'pending_approval'
      ORDER BY o.created_at ASC
    `;

    const result = await pool.query(query);
    res.json({ orders: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// GET /api/orders/pending-approvals/count - Get count of pending approvals (for badge)
router.get('/pending-approvals/count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'pending_approval'`
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching pending approvals count:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// GET /api/orders/:id - Get single order with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const orderResult = await pool.query(
      `SELECT 
        o.*,
        c.business_name as client_name,
        c.industry as client_industry,
        c.slug as client_slug,
        u.name as submitted_by_name,
        u.email as submitted_by_email,
        approver.name as approved_by_name
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.submitted_by = u.id
       LEFT JOIN users approver ON o.approved_by = approver.id
       WHERE o.id = $1`,
      [id]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.*, e.name as entity_name, e.code as entity_code
       FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [id]
    );

    // If no items found and this is a kill/change order, get parent order's items
    let items = itemsResult.rows;
    const order = orderResult.rows[0];
    
    if (items.length === 0 && order.parent_order_id) {
      const parentItemsResult = await pool.query(
        `SELECT oi.*, e.name as entity_name, e.code as entity_code
         FROM order_items oi
         LEFT JOIN entities e ON oi.entity_id = e.id
         WHERE oi.order_id = $1
         ORDER BY oi.created_at`,
        [order.parent_order_id]
      );
      items = parentItemsResult.rows;
    }

    // Get primary contact for the client
    const contactResult = await pool.query(
      `SELECT * FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1`,
      [order.client_id]
    );

    // Calculate totals from items
    const monthly_total = items.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    const setup_fees_total = items.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0);
    
    // Use calculated totals, but fall back to stored values if no items
    const calculated_monthly = items.length > 0 ? monthly_total : (parseFloat(order.monthly_total) || 0);
    const calculated_setup = items.length > 0 ? setup_fees_total : 0;
    const total_value = order.term_months === 1 
      ? calculated_monthly + calculated_setup 
      : (calculated_monthly * (order.term_months || 1)) + calculated_setup;

    res.json({
      ...order,
      items: items,
      item_count: items.length,
      monthly_total: calculated_monthly,
      setup_fees_total: calculated_setup,
      total_value,
      primary_contact: contactResult.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      client_id,
      contract_start_date,
      contract_end_date,
      term_months,
      billing_frequency = 'monthly',
      payment_preference = 'invoice',
      notes,
      internal_notes,
      items = [],
      status = 'draft'
    } = req.body;

    // Get submitted_by from authenticated user (if available)
    // Check if user exists in users table to avoid FK constraint violation
    let submitted_by = null;
    if (req.user?.id) {
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [req.user.id]
      );
      if (userCheck.rows.length > 0) {
        submitted_by = req.user.id;
      }
    }

    // Validate required fields
    if (!client_id || !contract_start_date || !contract_end_date) {
      return res.status(400).json({ error: 'Missing required fields: client_id, contract_start_date, contract_end_date' });
    }

    // Validate client has at least one contact for non-draft orders
    if (status !== 'draft') {
      const contactCheck = await client.query(
        'SELECT COUNT(*) as count FROM contacts WHERE client_id = $1',
        [client_id]
      );
      if (parseInt(contactCheck.rows[0].count) === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Client must have at least one contact before submitting an order. Please add a contact first.',
          code: 'NO_CONTACTS'
        });
      }
    }

    // Generate order number
    const order_number = await generateOrderNumber(client);

    // Calculate totals
    let monthly_total = 0;
    let setup_fees_total = 0;
    for (const item of items) {
      monthly_total += parseFloat(item.line_total) || 0;
      setup_fees_total += parseFloat(item.setup_fee) || 0;
    }
    
    // For one-time orders (term_months = 1), don't multiply
    const isOneTime = term_months === 1;
    const contract_total = isOneTime 
      ? monthly_total + setup_fees_total 
      : (monthly_total * (term_months || 1)) + setup_fees_total;

    // Check for price adjustments
    const has_price_adjustments = checkPriceAdjustments(items);

    // Create order with submitted_by
    const orderResult = await client.query(
      `INSERT INTO orders (
        id, order_number, client_id, contract_start_date, contract_end_date,
        term_months, billing_frequency, payment_preference, status,
        monthly_total, contract_total, notes, internal_notes, submitted_by, 
        has_price_adjustments, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING *`,
      [
        order_number, client_id, contract_start_date, contract_end_date,
        term_months, billing_frequency, payment_preference, status,
        monthly_total, contract_total, notes, internal_notes, submitted_by,
        has_price_adjustments
      ]
    );

    const newOrder = orderResult.rows[0];

    // Check for $0 products - only admins can add $0 line items (barters, comp items, etc.)
    const isAdmin = req.user && (req.user.is_super_admin || req.user.role === 'admin' || req.user.role === 'manager');
    for (const item of items) {
      const lineTotal = parseFloat(item.line_total) || 0;
      if (lineTotal <= 0 && !isAdmin) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Product "${item.product_name}" has a $0 value. Only administrators can add complimentary or barter items. Please contact your manager.`,
          code: 'ZERO_PRICE_NOT_ALLOWED'
        });
      }
    }

    // Create order items
    const createdItems = [];
    for (const item of items) {
      // Look up the product's default_rate and setup_fee from the catalog as book values
      let bookPrice = item.book_price || item.original_price;
      let bookSetupFee = item.book_setup_fee || item.original_setup_fee;
      
      // If book prices not provided and we have a product_id, look them up from the catalog
      if ((!bookPrice || !bookSetupFee) && item.product_id) {
        const productLookup = await client.query(
          'SELECT default_rate, setup_fee FROM products WHERE id = $1',
          [item.product_id]
        );
        if (productLookup.rows.length > 0) {
          const catalogProduct = productLookup.rows[0];
          if (!bookPrice) {
            bookPrice = parseFloat(catalogProduct.default_rate) || item.unit_price;
          }
          if (!bookSetupFee && bookSetupFee !== 0) {
            bookSetupFee = parseFloat(catalogProduct.setup_fee) || 0;
          }
        }
      }
      
      // Fall back to unit_price if still no book_price
      bookPrice = bookPrice || item.unit_price;
      bookSetupFee = bookSetupFee ?? item.setup_fee ?? 0;
      
      const itemResult = await client.query(
        `INSERT INTO order_items (
          id, order_id, entity_id, product_id, product_name, product_category,
          quantity, unit_price, book_price, discount_percent, line_total, 
          setup_fee, book_setup_fee,
          spots_per_week, spot_length, ad_size, premium_placement,
          monthly_impressions, notes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
        ) RETURNING *`,
        [
          newOrder.id, item.entity_id, item.product_id, item.product_name, item.product_category,
          item.quantity || 1, item.unit_price, bookPrice, item.discount_percent || 0, item.line_total,
          item.setup_fee || 0, bookSetupFee,
          item.spots_per_week, item.spot_length, item.ad_size, item.premium_placement,
          item.monthly_impressions, item.notes
        ]
      );
      createdItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...newOrder,
      items: createdItems,
      item_count: createdItems.length,
      setup_fees_total,
      total_value: contract_total
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// ORDER SUBMISSION WITH SIGNATURE
// ============================================================

// POST /api/orders/:id/submit - Submit order for approval with sales rep signature
router.post('/:id/submit', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { signature, items } = req.body;
    const user = req.user;

    if (!signature) {
      return res.status(400).json({ error: 'Signature is required to submit an order' });
    }

    // Get the order
    const orderResult = await client.query(
      `SELECT o.*, c.business_name as client_name, c.slug as client_slug
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only draft orders can be submitted' });
    }

    // Check client has contacts
    const contactCheck = await client.query(
      'SELECT COUNT(*) as count FROM contacts WHERE client_id = $1',
      [order.client_id]
    );
    if (parseInt(contactCheck.rows[0].count) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Client must have at least one contact before submitting',
        code: 'NO_CONTACTS'
      });
    }

    // Check for price adjustments to determine status
    const itemsResult = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );
    
    // Use provided items or fetched items
    const orderItems = items || itemsResult.rows;
    const hasPriceAdjustments = checkPriceAdjustments(orderItems);
    
    // If price adjustments exist, needs approval. Otherwise, auto-approve AND auto-send
    const clientIP = getClientIP(req);

    // Check if user exists in users table to avoid FK constraint violation
    let validUserId = null;
    if (user?.id) {
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [user.id]
      );
      if (userCheck.rows.length > 0) {
        validUserId = user.id;
      }
    }

    let updatedOrder;
    let signingUrl = null;
    let primaryContact = null;

    if (hasPriceAdjustments) {
      // Needs approval - set to pending_approval
      const updateResult = await client.query(
        `UPDATE orders SET
          status = 'pending_approval',
          submitted_by = $1,
          submitted_signature = $2,
          submitted_signature_date = NOW(),
          submitted_ip_address = $3,
          has_price_adjustments = true,
          updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [validUserId || order.submitted_by, signature, clientIP, id]
      );
      
      await client.query('COMMIT');
      
      updatedOrder = {
        ...updateResult.rows[0],
        client_name: order.client_name,
        client_slug: order.client_slug,
        submitted_by_name: user?.name || signature || 'Unknown'
      };

      // Send approval request email to managers
      if (emailService) {
        try {
          await emailService.sendApprovalRequest({
            order: updatedOrder,
            submittedBy: { name: user?.name || signature || 'Unknown', email: user?.email },
            adjustments: orderItems.filter(item => {
              const unitPrice = parseFloat(item.unit_price) || 0;
              const originalPrice = parseFloat(item.original_price) || unitPrice;
              return Math.abs(unitPrice - originalPrice) > 0.01;
            }).map(item => ({
              product_name: item.product_name,
              original_price: item.original_price || item.unit_price,
              adjusted_price: item.unit_price,
              discount_percent: item.discount_percent
            }))
          });
        } catch (emailError) {
          console.error('Failed to send approval request email:', emailError);
        }
      }
    } else {
      // Auto-approve AND auto-send to client
      // Generate signing token
      const signingToken = generateSigningToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Get primary contact for the client
      const contactResult = await client.query(
        'SELECT * FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1',
        [order.client_id]
      );

      if (contactResult.rows.length === 0) {
        // No contact - just approve, don't send
        const updateResult = await client.query(
          `UPDATE orders SET
            status = 'approved',
            submitted_by = $1,
            submitted_signature = $2,
            submitted_signature_date = NOW(),
            submitted_ip_address = $3,
            has_price_adjustments = false,
            approved_by = $4,
            approved_at = NOW(),
            updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [validUserId || order.submitted_by, signature, clientIP, validUserId, id]
        );
        
        await client.query('COMMIT');
        
        updatedOrder = {
          ...updateResult.rows[0],
          client_name: order.client_name,
          client_slug: order.client_slug,
          submitted_by_name: user?.name || signature || 'Unknown'
        };
      } else {
        primaryContact = contactResult.rows[0];

        // Update order: approve AND set signing token (status = 'sent')
        const updateResult = await client.query(
          `UPDATE orders SET
            status = 'sent',
            submitted_by = $1,
            submitted_signature = $2,
            submitted_signature_date = NOW(),
            submitted_ip_address = $3,
            has_price_adjustments = false,
            approved_by = $4,
            approved_at = NOW(),
            signing_token = $5,
            signing_token_expires_at = $6,
            sent_to_client_at = NOW(),
            sent_to_client_by = $7,
            updated_at = NOW()
           WHERE id = $8
           RETURNING *`,
          [
            validUserId || order.submitted_by, 
            signature, 
            clientIP, 
            validUserId,
            signingToken,
            expiresAt,
            validUserId,
            id
          ]
        );
        
        await client.query('COMMIT');
        
        // Calculate totals for email
        const orderMonthlyTotal = parseFloat(updateResult.rows[0].monthly_total) || 0;
        const orderContractTotal = parseFloat(updateResult.rows[0].contract_total) || orderMonthlyTotal * (updateResult.rows[0].term_months || 1);
        
        updatedOrder = {
          ...updateResult.rows[0],
          client_name: order.client_name,
          client_slug: order.client_slug,
          submitted_by_name: user?.name || signature || 'Unknown',
          monthly_total: orderMonthlyTotal,
          contract_total: orderContractTotal
        };

        // Fetch items with entity names and logos for email
        const itemsWithEntities = await client.query(
          `SELECT oi.*, e.name as entity_name, e.logo_url 
           FROM order_items oi 
           LEFT JOIN entities e ON oi.entity_id = e.id 
           WHERE oi.order_id = $1`,
          [id]
        );
        updatedOrder.items = itemsWithEntities.rows;

        // Build signing URL
        const baseUrl = process.env.BASE_URL || 'https://myadvertisingreport.com';
        signingUrl = `${baseUrl}/sign/${signingToken}`;

        // Send contract email to client
        if (emailService && primaryContact.email) {
          try {
            console.log(`[Order Submit] Sending contract email to ${primaryContact.email} for order ${updatedOrder.order_number}`);
            const emailResult = await emailService.sendContractToClient({
              order: updatedOrder,
              contact: primaryContact,
              signingUrl: signingUrl
            });
            console.log(`[Order Submit] Email result:`, emailResult);
          } catch (emailError) {
            console.error('Failed to send contract email:', emailError);
          }
        } else {
          console.log(`[Order Submit] Email not sent - emailService: ${!!emailService}, primaryContact.email: ${primaryContact?.email}`);
        }
      }

      // Also send internal notification
      if (emailService) {
        try {
          await emailService.sendOrderSubmittedInternal({
            order: updatedOrder,
            submittedBy: { name: user?.name || signature || 'Unknown', email: user?.email },
            autoSent: !!primaryContact
          });
        } catch (emailError) {
          console.error('Failed to send internal notification:', emailError);
        }
      }
    }

    res.json({
      ...updatedOrder,
      auto_approved: !hasPriceAdjustments,
      auto_sent: !hasPriceAdjustments && !!primaryContact,
      signing_url: signingUrl,
      sent_to: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name} (${primaryContact.email})` : null,
      message: hasPriceAdjustments 
        ? 'Order submitted for approval' 
        : (primaryContact 
            ? 'Order auto-approved and sent to client for signature!'
            : 'Order auto-approved (no client contact found - please add contact and send manually)')
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting order:', error);
    res.status(500).json({ error: 'Failed to submit order' });
  } finally {
    client.release();
  }
});

// ============================================================
// APPROVAL WORKFLOW
// ============================================================

// PUT /api/orders/:id/approve - Approve an order (managers only)
router.put('/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { notes, autoSend = true } = req.body; // Default to auto-send
    const user = req.user;

    // Check user has permission (admin or manager)
    if (!user || !['admin', 'manager'].includes(user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only managers can approve orders' });
    }

    // Get the order with items
    const orderResult = await client.query(
      `SELECT o.*, c.business_name as client_name, c.slug as client_slug,
              u.name as submitted_by_name, u.email as submitted_by_email
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.submitted_by = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending_approval') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is not pending approval' });
    }

    // Check if user exists in users table to avoid FK constraint violation
    let validUserId = null;
    if (user?.id) {
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [user.id]
      );
      if (userCheck.rows.length > 0) {
        validUserId = user.id;
      }
    }

    // Check if we should auto-send to client
    let primaryContact = null;
    let signingUrl = null;
    let autoSent = false;

    if (autoSend) {
      // Get primary contact for the client
      const contactResult = await client.query(
        'SELECT * FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1',
        [order.client_id]
      );
      
      if (contactResult.rows.length > 0) {
        primaryContact = contactResult.rows[0];
      }
    }

    let updatedOrder;

    if (primaryContact) {
      // Approve AND send to client in one step
      const signingToken = generateSigningToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const updateResult = await client.query(
        `UPDATE orders SET
          status = 'sent',
          approved_by = $1,
          approved_at = NOW(),
          approval_notes = $2,
          signing_token = $3,
          signing_token_expires_at = $4,
          sent_to_client_at = NOW(),
          sent_to_client_by = $5,
          updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [validUserId, notes || null, signingToken, expiresAt, validUserId, id]
      );

      // Fetch items with entity names for email
      const itemsWithEntities = await client.query(
        `SELECT oi.*, e.name as entity_name, e.logo_url, e.code as entity_code
         FROM order_items oi 
         LEFT JOIN entities e ON oi.entity_id = e.id 
         WHERE oi.order_id = $1`,
        [id]
      );

      await client.query('COMMIT');

      const orderMonthlyTotal = parseFloat(updateResult.rows[0].monthly_total) || 0;
      const orderContractTotal = parseFloat(updateResult.rows[0].contract_total) || orderMonthlyTotal * (updateResult.rows[0].term_months || 1);

      updatedOrder = {
        ...updateResult.rows[0],
        client_name: order.client_name,
        client_slug: order.client_slug,
        approved_by_name: user.name,
        items: itemsWithEntities.rows,
        monthly_total: orderMonthlyTotal,
        contract_total: orderContractTotal
      };

      // Build signing URL
      const baseUrl = process.env.BASE_URL || 'https://myadvertisingreport.com';
      signingUrl = `${baseUrl}/sign/${signingToken}`;
      autoSent = true;

      // Send contract email to client
      if (emailService && primaryContact.email) {
        try {
          console.log(`[Order Approve] Auto-sending contract to ${primaryContact.email} for order ${updatedOrder.order_number}`);
          await emailService.sendContractToClient({
            order: updatedOrder,
            contact: primaryContact,
            signingUrl: signingUrl
          });
        } catch (emailError) {
          console.error('Failed to send contract email:', emailError);
        }
      }
    } else {
      // Just approve (no contact to send to)
      const updateResult = await client.query(
        `UPDATE orders SET
          status = 'approved',
          approved_by = $1,
          approved_at = NOW(),
          approval_notes = $2,
          updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [validUserId, notes || null, id]
      );

      await client.query('COMMIT');

      updatedOrder = {
        ...updateResult.rows[0],
        client_name: order.client_name,
        client_slug: order.client_slug,
        approved_by_name: user.name
      };
    }

    // Send approval notification email to the submitter
    if (emailService && order.submitted_by_email) {
      try {
        await emailService.sendOrderApproved({
          order: updatedOrder,
          approvedBy: { name: user.name },
          submittedBy: { 
            name: order.submitted_by_name, 
            email: order.submitted_by_email 
          },
          autoSent: autoSent,
          sentTo: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name} (${primaryContact.email})` : null
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
    }

    res.json({
      ...updatedOrder,
      auto_sent: autoSent,
      signing_url: signingUrl,
      sent_to: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name} (${primaryContact.email})` : null,
      message: autoSent 
        ? `Order approved and sent to ${primaryContact.first_name} ${primaryContact.last_name} for signature!`
        : (autoSend 
            ? 'Order approved (no primary contact found - please add contact and send manually)'
            : 'Order approved successfully')
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving order:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/reject - Reject an order (managers only)
router.put('/:id/reject', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    // Check user has permission
    if (!user || !['admin', 'manager'].includes(user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only managers can reject orders' });
    }

    if (!reason) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get the order
    const orderResult = await client.query(
      `SELECT o.*, c.business_name as client_name,
              u.name as submitted_by_name, u.email as submitted_by_email
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.submitted_by = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending_approval') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is not pending approval' });
    }

    // Update order status back to draft with rejection reason
    const updateResult = await client.query(
      `UPDATE orders SET
        status = 'draft',
        rejected_reason = $1,
        updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, id]
    );

    await client.query('COMMIT');

    const updatedOrder = {
      ...updateResult.rows[0],
      client_name: order.client_name
    };

    // Send rejection notification email
    if (emailService && order.submitted_by_email) {
      try {
        await emailService.sendOrderRejected({
          order: updatedOrder,
          rejectedBy: { name: user.name },
          reason: reason,
          submittedBy: { 
            name: order.submitted_by_name, 
            email: order.submitted_by_email 
          }
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }

    res.json({
      ...updatedOrder,
      message: 'Order rejected and returned to draft'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  } finally {
    client.release();
  }
});

// ============================================================
// SEND TO CLIENT
// ============================================================

// POST /api/orders/:id/send-to-client - Generate signing link and send to client
router.post('/:id/send-to-client', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { contact_id } = req.body; // Optional: specific contact to send to
    const user = req.user;

    // Get the order
    const orderResult = await client.query(
      `SELECT o.*, c.business_name as client_name, c.slug as client_slug
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be approved before sending to client' });
    }

    // Get the contact to send to (specific or primary)
    let contactQuery = contact_id 
      ? 'SELECT * FROM contacts WHERE id = $1'
      : 'SELECT * FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1';
    
    const contactResult = await client.query(
      contactQuery,
      [contact_id || order.client_id]
    );

    if (contactResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No contact found to send the contract to' });
    }

    const contact = contactResult.rows[0];

    if (!contact.email) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Contact does not have an email address' });
    }

    // Generate signing token (expires in 7 days)
    const signingToken = generateSigningToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Check if user exists in users table to avoid FK constraint violation
    let validUserId = null;
    if (user?.id) {
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1',
        [user.id]
      );
      if (userCheck.rows.length > 0) {
        validUserId = user.id;
      }
    }

    // Update order with signing token
    const updateResult = await client.query(
      `UPDATE orders SET
        status = 'sent',
        signing_token = $1,
        signing_token_expires_at = $2,
        sent_to_client_at = NOW(),
        sent_to_client_by = $3,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [signingToken, expiresAt, validUserId, id]
    );

    await client.query('COMMIT');

    const updatedOrder = {
      ...updateResult.rows[0],
      client_name: order.client_name,
      client_slug: order.client_slug
    };

    // Send contract email to client
    const baseUrl = process.env.BASE_URL || 'https://myadvertisingreport.com';
    const signingUrl = `${baseUrl}/sign/${signingToken}`;

    if (emailService) {
      try {
        await emailService.sendContractToClient({
          order: updatedOrder,
          contact: contact,
          signingUrl: signingUrl
        });
      } catch (emailError) {
        console.error('Failed to send contract email:', emailError);
        // Still return success - the link was generated
      }
    }

    res.json({
      ...updatedOrder,
      signing_url: signingUrl,
      sent_to: {
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email
      },
      expires_at: expiresAt,
      message: 'Contract sent to client successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending to client:', error);
    res.status(500).json({ error: 'Failed to send contract to client' });
  } finally {
    client.release();
  }
});

// ============================================================
// PUBLIC SIGNING ROUTES (No auth required)
// ============================================================

// GET /api/orders/sign/:token - Get order for signing (public)
router.get('/sign/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find order by signing token
    const orderResult = await pool.query(
      `SELECT 
        o.id, o.order_number, o.contract_start_date, o.contract_end_date,
        o.term_months, o.monthly_total, o.contract_total, o.billing_frequency,
        o.status, o.signing_token_expires_at, o.notes,
        o.submitted_signature, o.submitted_signature_date,
        c.business_name as client_name, c.id as client_id,
        u.name as submitted_by_name
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       LEFT JOIN users u ON o.submitted_by = u.id
       WHERE o.signing_token = $1`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found or link is invalid' });
    }

    const order = orderResult.rows[0];

    // Check if already signed
    if (order.status === 'signed' || order.status === 'active') {
      return res.status(400).json({ 
        error: 'This contract has already been signed',
        signed: true
      });
    }

    // Check if token expired
    if (new Date() > new Date(order.signing_token_expires_at)) {
      return res.status(400).json({ 
        error: 'This signing link has expired. Please contact your representative for a new link.',
        expired: true
      });
    }

    // Check if order is in correct status
    if (order.status !== 'sent') {
      return res.status(400).json({ error: 'This contract is not available for signing' });
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT product_name, product_category, quantity, unit_price, line_total, setup_fee,
              e.name as entity_name
       FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [order.id]
    );

    // Get primary contact
    const contactResult = await pool.query(
      'SELECT first_name, last_name, email, title FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1',
      [order.client_id]
    );

    // Calculate totals
    const items = itemsResult.rows;
    const setup_fees_total = items.reduce((sum, item) => sum + (parseFloat(item.setup_fee) || 0), 0);

    res.json({
      order_number: order.order_number,
      client_name: order.client_name,
      contract_start_date: order.contract_start_date,
      contract_end_date: order.contract_end_date,
      term_months: order.term_months,
      monthly_total: order.monthly_total,
      contract_total: order.contract_total,
      setup_fees_total: setup_fees_total,
      billing_frequency: order.billing_frequency,
      notes: order.notes,
      items: items,
      contact: contactResult.rows[0] || null,
      sales_rep: {
        name: order.submitted_by_name,
        signature: order.submitted_signature,
        signed_date: order.submitted_signature_date
      }
    });
  } catch (error) {
    console.error('Error fetching order for signing:', error);
    res.status(500).json({ error: 'Failed to load contract' });
  }
});

// POST /api/orders/sign/:token - Sign the contract (public)
router.post('/sign/:token', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { token } = req.params;
    const { 
      signature, 
      signer_name, 
      signer_email, 
      signer_title,
      agreed_to_terms 
    } = req.body;

    // Validate required fields
    if (!signature || !signer_name || !signer_email) {
      return res.status(400).json({ error: 'Signature, name, and email are required' });
    }

    if (!agreed_to_terms) {
      return res.status(400).json({ error: 'You must agree to the terms of service' });
    }

    // Find order by signing token
    const orderResult = await client.query(
      `SELECT o.*, c.business_name as client_name, c.slug as client_slug
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contract not found or link is invalid' });
    }

    const order = orderResult.rows[0];

    // Check if already signed
    if (order.status === 'signed' || order.status === 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This contract has already been signed' });
    }

    // Check if token expired
    if (new Date() > new Date(order.signing_token_expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This signing link has expired' });
    }

    // Check status
    if (order.status !== 'sent') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This contract is not available for signing' });
    }

    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Update order with signature
    const updateResult = await client.query(
      `UPDATE orders SET
        status = 'signed',
        signed_by_name = $1,
        signed_by_email = $2,
        signed_by_title = $3,
        signed_at = NOW(),
        signed_ip_address = $4,
        signed_user_agent = $5,
        signing_token = NULL,
        signing_token_expires_at = NULL,
        updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [signer_name, signer_email, signer_title, clientIP, userAgent, order.id]
    );

    await client.query('COMMIT');

    const signedOrder = {
      ...updateResult.rows[0],
      client_name: order.client_name,
      client_slug: order.client_slug
    };

    // Get contact for confirmation email
    const contactResult = await pool.query(
      'SELECT * FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1',
      [order.client_id]
    );
    const contact = contactResult.rows[0] || { 
      first_name: signer_name.split(' ')[0],
      last_name: signer_name.split(' ').slice(1).join(' '),
      email: signer_email 
    };

    // Send confirmation emails
    if (emailService) {
      try {
        // Send to client
        await emailService.sendSignatureConfirmation({
          order: signedOrder,
          contact: contact,
          pdfUrl: null // PDF generation is a future feature
        });

        // Send internal notification
        await emailService.sendContractSignedInternal({
          order: signedOrder,
          contact: contact
        });
      } catch (emailError) {
        console.error('Failed to send signature confirmation emails:', emailError);
      }
    }

    res.json({
      success: true,
      order_number: signedOrder.order_number,
      signed_at: signedOrder.signed_at,
      message: 'Contract signed successfully! You will receive a confirmation email shortly.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error signing contract:', error);
    res.status(500).json({ error: 'Failed to sign contract' });
  } finally {
    client.release();
  }
});

// ============================================================
// UPDATE ORDER
// ============================================================

// PUT /api/orders/:id - Update existing order
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      contract_start_date,
      contract_end_date,
      term_months,
      billing_frequency,
      payment_preference,
      status,
      notes,
      internal_notes,
      items
    } = req.body;

    // Calculate totals if items provided
    let monthly_total = 0;
    let setup_fees_total = 0;
    if (items && items.length > 0) {
      for (const item of items) {
        monthly_total += parseFloat(item.line_total) || 0;
        setup_fees_total += parseFloat(item.setup_fee) || 0;
      }
    }
    
    const isOneTime = term_months === 1;
    const contract_total = isOneTime 
      ? monthly_total + setup_fees_total 
      : (monthly_total * (term_months || 1)) + setup_fees_total;

    // Check for price adjustments
    const has_price_adjustments = items ? checkPriceAdjustments(items) : false;

    // Update order
    const orderResult = await client.query(
      `UPDATE orders SET
        contract_start_date = COALESCE($1, contract_start_date),
        contract_end_date = COALESCE($2, contract_end_date),
        term_months = COALESCE($3, term_months),
        billing_frequency = COALESCE($4, billing_frequency),
        payment_preference = COALESCE($5, payment_preference),
        status = COALESCE($6, status),
        monthly_total = $7,
        contract_total = $8,
        notes = COALESCE($9, notes),
        internal_notes = COALESCE($10, internal_notes),
        has_price_adjustments = $11,
        updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        contract_start_date, contract_end_date, term_months,
        billing_frequency, payment_preference, status,
        monthly_total, contract_total, notes, internal_notes,
        has_price_adjustments, id
      ]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    // If items provided, replace all items
    if (items && items.length >= 0) {
      // Check for $0 products - only admins can add $0 line items (barters, comp items, etc.)
      const isAdmin = req.user && (req.user.is_super_admin || req.user.role === 'admin' || req.user.role === 'manager');
      for (const item of items) {
        const lineTotal = parseFloat(item.line_total) || 0;
        if (lineTotal <= 0 && !isAdmin) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Product "${item.product_name}" has a $0 value. Only administrators can add complimentary or barter items. Please contact your manager.`,
            code: 'ZERO_PRICE_NOT_ALLOWED'
          });
        }
      }

      // Delete existing items
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

      // Create new items with book price tracking
      for (const item of items) {
        // Look up the product's default_rate and setup_fee from the catalog as book values
        let bookPrice = item.book_price || item.original_price;
        let bookSetupFee = item.book_setup_fee || item.original_setup_fee;
        
        // If book prices not provided and we have a product_id, look them up from the catalog
        if ((!bookPrice || !bookSetupFee) && item.product_id) {
          const productLookup = await client.query(
            'SELECT default_rate, setup_fee FROM products WHERE id = $1',
            [item.product_id]
          );
          if (productLookup.rows.length > 0) {
            const catalogProduct = productLookup.rows[0];
            if (!bookPrice) {
              bookPrice = parseFloat(catalogProduct.default_rate) || item.unit_price;
            }
            if (!bookSetupFee && bookSetupFee !== 0) {
              bookSetupFee = parseFloat(catalogProduct.setup_fee) || 0;
            }
          }
        }
        
        // Fall back to unit_price if still no book_price
        bookPrice = bookPrice || item.unit_price;
        bookSetupFee = bookSetupFee ?? item.setup_fee ?? 0;
        
        await client.query(
          `INSERT INTO order_items (
            id, order_id, entity_id, product_id, product_name, product_category,
            quantity, unit_price, book_price, discount_percent, line_total, 
            setup_fee, book_setup_fee,
            spots_per_week, spot_length, ad_size, premium_placement,
            monthly_impressions, notes, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
          )`,
          [
            id, item.entity_id, item.product_id, item.product_name, item.product_category,
            item.quantity || 1, item.unit_price, bookPrice, item.discount_percent || 0, item.line_total,
            item.setup_fee || 0, bookSetupFee,
            item.spots_per_week, item.spot_length, item.ad_size, item.premium_placement,
            item.monthly_impressions, item.notes
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated order with items
    const finalOrder = await pool.query(
      `SELECT o.*, c.business_name as client_name
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [id]
    );

    const finalItems = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
      [id]
    );

    res.json({
      ...finalOrder.rows[0],
      items: finalItems.rows,
      item_count: finalItems.rows.length,
      setup_fees_total,
      total_value: contract_total
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'pending_approval', 'approved', 'sent', 'signed', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Build dynamic update based on status
    let query = 'UPDATE orders SET status = $1, updated_at = NOW()';
    const params = [status];
    let paramCount = 1;

    // Track specific timestamps for journey timeline
    if (status === 'active') {
      paramCount++;
      query += `, activated_at = NOW()`;
    } else if (status === 'completed') {
      paramCount++;
      query += `, completed_at = NOW()`;
    } else if (status === 'cancelled') {
      paramCount++;
      query += `, cancelled_at = NOW()`;
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// DELETE /api/orders/:id - Delete order (only if draft)
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if order is draft
    const orderCheck = await client.query(
      'SELECT status FROM orders WHERE id = $1',
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orderCheck.rows[0].status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only draft orders can be deleted' });
    }

    // Delete items first
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    
    // Delete order
    await client.query('DELETE FROM orders WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  } finally {
    client.release();
  }
});

// ============================================================
// PRODUCT ROUTES (for order form dropdowns)
// ============================================================

// GET /api/orders/products - Get products for order form
router.get('/products/list', async (req, res) => {
  try {
    const { entity_id, category_id } = req.query;
    
    let query = `
      SELECT 
        p.id, p.code, p.name, p.description, p.default_rate, p.rate_type,
        p.min_term_months, p.setup_fee, p.category, p.entity_id,
        c.name as category_name, c.code as category_code,
        e.name as entity_name, e.code as entity_code
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN entities e ON p.entity_id = e.id
      WHERE p.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (entity_id) {
      paramCount++;
      query += ` AND p.entity_id = $${paramCount}`;
      params.push(entity_id);
    }

    if (category_id) {
      paramCount++;
      query += ` AND p.category_id = $${paramCount}`;
      params.push(category_id);
    }

    query += ' ORDER BY c.display_order, p.display_order, p.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/orders/entities - Get entities for order form
router.get('/entities/list', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name FROM entities WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// GET /api/orders/categories - Get categories for order form
router.get('/categories/list', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, icon, color FROM product_categories WHERE is_active = true ORDER BY display_order'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================
// ORDER VARIANT ROUTES
// Upload Orders, Change Orders, Kill Orders
// ============================================================

// POST /api/orders/upload - Create order from uploaded signed document
router.post('/upload', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      client_id,
      uploaded_document_id,
      contract_start_date,
      contract_end_date,
      term_months,
      billing_frequency = 'monthly',
      notes,
      client_signature_date,
      items
    } = req.body;

    if (!client_id || !uploaded_document_id) {
      return res.status(400).json({ error: 'Client and document are required' });
    }

    // Generate order number
    const countResult = await client.query('SELECT COUNT(*) FROM orders');
    const orderNumber = `ORD-${String(parseInt(countResult.rows[0].count) + 1001).padStart(5, '0')}`;

    // Calculate totals
    let monthly_total = 0;
    let setup_fees_total = 0;
    if (items && items.length > 0) {
      for (const item of items) {
        monthly_total += parseFloat(item.line_total) || 0;
        setup_fees_total += parseFloat(item.setup_fee) || 0;
      }
    }
    const contract_total = (monthly_total * (term_months || 1)) + setup_fees_total;

    // Get user from token
    let submitted_by = req.user?.id || null;

    // Create order with 'signed' status
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, client_id, order_type, status,
        contract_start_date, contract_end_date, term_months,
        billing_frequency, monthly_total, contract_total,
        notes, uploaded_document_id, submitted_by,
        client_signature_date, created_at, updated_at
      ) VALUES (
        $1, $2, 'upload', 'signed',
        $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *`,
      [
        orderNumber, client_id, contract_start_date, contract_end_date,
        term_months, billing_frequency, monthly_total, contract_total,
        notes, uploaded_document_id, submitted_by, client_signature_date
      ]
    );

    const order = orderResult.rows[0];

    // Create order items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (
            id, order_id, entity_id, product_id, product_name, product_category,
            quantity, unit_price, original_price, discount_percent, line_total,
            setup_fee, notes, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
          )`,
          [
            order.id, item.entity_id, item.product_id, item.product_name,
            item.product_category, item.quantity || 1, item.unit_price,
            item.original_price || item.unit_price, item.discount_percent || 0,
            item.line_total, item.setup_fee || 0, item.notes
          ]
        );
      }
    }

    // Update document with order reference
    await client.query(
      'UPDATE documents SET order_id = $1, updated_at = NOW() WHERE id = $2',
      [order.id, uploaded_document_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...order,
      order_number: orderNumber,
      item_count: items?.length || 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating upload order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/change - Create change order (electronic)
router.post('/change', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      parent_order_id,
      effective_date,
      notes,
      management_approval_confirmed,
      signature,
      change_summary,
      items
    } = req.body;

    if (!parent_order_id) {
      return res.status(400).json({ error: 'Parent order is required' });
    }

    if (!management_approval_confirmed) {
      return res.status(400).json({ error: 'Management approval is required' });
    }

    // Verify parent order
    const parentResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND status IN ($2, $3)',
      [parent_order_id, 'signed', 'active']
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent order not found or not in valid status' });
    }

    const parentOrder = parentResult.rows[0];

    // Generate change order number
    const countResult = await client.query(
      "SELECT COUNT(*) FROM orders WHERE order_type IN ('change', 'change_upload')"
    );
    const changeOrderNumber = `CHG-${String(parseInt(countResult.rows[0].count) + 1001).padStart(5, '0')}`;

    // Calculate totals
    let monthly_total = 0;
    let setup_fees_total = 0;
    if (items && items.length > 0) {
      for (const item of items) {
        monthly_total += parseFloat(item.line_total) || 0;
        setup_fees_total += parseFloat(item.setup_fee) || 0;
      }
    }

    let submitted_by = req.user?.id || null;

    // Create change order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, client_id, order_type, status, parent_order_id,
        contract_start_date, contract_end_date, term_months,
        monthly_total, contract_total, notes, effective_date,
        management_approval_confirmed, change_summary,
        submitted_by, submitted_signature, submitted_signature_date,
        has_price_adjustments, created_at, updated_at
      ) VALUES (
        $1, $2, 'change', 'pending_approval', $3,
        $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, NOW(), true, NOW(), NOW()
      ) RETURNING *`,
      [
        changeOrderNumber, parentOrder.client_id, parent_order_id,
        parentOrder.contract_start_date, parentOrder.contract_end_date,
        parentOrder.term_months, monthly_total,
        (monthly_total * (parentOrder.term_months || 1)) + setup_fees_total,
        notes, effective_date, management_approval_confirmed,
        JSON.stringify(change_summary), submitted_by, signature
      ]
    );

    const changeOrder = orderResult.rows[0];

    // Create order items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (
            id, order_id, entity_id, product_id, product_name, product_category,
            quantity, unit_price, original_price, line_total, setup_fee,
            notes, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
          )`,
          [
            changeOrder.id, item.entity_id, item.product_id, item.product_name,
            item.product_category, item.quantity || 1, item.unit_price,
            item.unit_price, item.line_total, item.setup_fee || 0, item.notes
          ]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...changeOrder,
      order_number: changeOrderNumber,
      item_count: items?.length || 0,
      parent_order_number: parentOrder.order_number
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating change order:', error);
    res.status(500).json({ error: 'Failed to create change order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/change-upload - Create change order from uploaded document
router.post('/change-upload', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      parent_order_id,
      uploaded_document_id,
      effective_date,
      notes,
      management_approval_confirmed,
      change_summary
    } = req.body;

    if (!parent_order_id || !uploaded_document_id) {
      return res.status(400).json({ error: 'Parent order and document are required' });
    }

    // Verify parent order
    const parentResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND status IN ($2, $3)',
      [parent_order_id, 'signed', 'active']
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent order not found' });
    }

    const parentOrder = parentResult.rows[0];

    // Generate order number
    const countResult = await client.query(
      "SELECT COUNT(*) FROM orders WHERE order_type IN ('change', 'change_upload')"
    );
    const orderNumber = `CHG-${String(parseInt(countResult.rows[0].count) + 1001).padStart(5, '0')}`;

    const newMonthly = change_summary?.new_monthly || parentOrder.monthly_total;

    // Create change order with 'signed' status
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, client_id, order_type, status, parent_order_id,
        contract_start_date, contract_end_date, term_months,
        monthly_total, notes, effective_date, uploaded_document_id,
        management_approval_confirmed, change_summary, created_at, updated_at
      ) VALUES (
        $1, $2, 'change_upload', 'signed', $3,
        $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *`,
      [
        orderNumber, parentOrder.client_id, parent_order_id,
        parentOrder.contract_start_date, parentOrder.contract_end_date,
        parentOrder.term_months, newMonthly, notes, effective_date,
        uploaded_document_id, management_approval_confirmed, JSON.stringify(change_summary)
      ]
    );

    // Update parent order monthly total
    await client.query(
      'UPDATE orders SET monthly_total = $1, updated_at = NOW() WHERE id = $2',
      [newMonthly, parent_order_id]
    );

    // Update document
    await client.query(
      'UPDATE documents SET order_id = $1, document_type = $2, updated_at = NOW() WHERE id = $3',
      [orderResult.rows[0].id, 'change_order', uploaded_document_id]
    );

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create change order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/kill - Create kill order (electronic)
router.post('/kill', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      parent_order_id,
      effective_date,
      cancellation_reason,
      management_approval_confirmed,
      signature
    } = req.body;

    if (!parent_order_id) {
      return res.status(400).json({ error: 'Parent order is required' });
    }

    if (!management_approval_confirmed) {
      return res.status(400).json({ error: 'Management approval is required' });
    }

    if (!cancellation_reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    // Verify parent order
    const parentResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND status IN ($2, $3)',
      [parent_order_id, 'signed', 'active']
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent order not found or not in valid status' });
    }

    const parentOrder = parentResult.rows[0];

    // Generate kill order number
    const countResult = await client.query(
      "SELECT COUNT(*) FROM orders WHERE order_type IN ('kill', 'kill_upload')"
    );
    const killOrderNumber = `KIL-${String(parseInt(countResult.rows[0].count) + 1001).padStart(5, '0')}`;

    let submitted_by = req.user?.id || null;

    // Create kill order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, client_id, order_type, status, parent_order_id,
        contract_start_date, contract_end_date, term_months,
        monthly_total, contract_total, notes, effective_date,
        cancellation_reason, management_approval_confirmed,
        submitted_by, submitted_signature, submitted_signature_date,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'kill', 'pending_approval', $3,
        $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, NOW(), NOW(), NOW()
      ) RETURNING *`,
      [
        killOrderNumber, parentOrder.client_id, parent_order_id,
        parentOrder.contract_start_date, parentOrder.contract_end_date,
        parentOrder.term_months, parentOrder.monthly_total, parentOrder.contract_total,
        cancellation_reason, effective_date, cancellation_reason,
        management_approval_confirmed, submitted_by, signature
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      ...orderResult.rows[0],
      parent_order_number: parentOrder.order_number
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating kill order:', error);
    res.status(500).json({ error: 'Failed to create kill order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/kill-upload - Create kill order from uploaded document
router.post('/kill-upload', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      parent_order_id,
      uploaded_document_id,
      effective_date,
      cancellation_reason,
      management_approval_confirmed
    } = req.body;

    if (!parent_order_id || !uploaded_document_id) {
      return res.status(400).json({ error: 'Parent order and document are required' });
    }

    // Verify parent order
    const parentResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND status IN ($2, $3)',
      [parent_order_id, 'signed', 'active']
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent order not found' });
    }

    const parentOrder = parentResult.rows[0];

    // Generate order number
    const countResult = await client.query(
      "SELECT COUNT(*) FROM orders WHERE order_type IN ('kill', 'kill_upload')"
    );
    const orderNumber = `KIL-${String(parseInt(countResult.rows[0].count) + 1001).padStart(5, '0')}`;

    // Create kill order with 'signed' status
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, client_id, order_type, status, parent_order_id,
        contract_start_date, contract_end_date, effective_date,
        cancellation_reason, uploaded_document_id,
        management_approval_confirmed, created_at, updated_at
      ) VALUES (
        $1, $2, 'kill_upload', 'signed', $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *`,
      [
        orderNumber, parentOrder.client_id, parent_order_id,
        parentOrder.contract_start_date, parentOrder.contract_end_date,
        effective_date, cancellation_reason, uploaded_document_id,
        management_approval_confirmed
      ]
    );

    // Update parent order status to cancelled
    await client.query(
      "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [parent_order_id]
    );

    // Update document
    await client.query(
      'UPDATE documents SET order_id = $1, document_type = $2, updated_at = NOW() WHERE id = $3',
      [orderResult.rows[0].id, 'kill_order', uploaded_document_id]
    );

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to create kill order' });
  } finally {
    client.release();
  }
});

// ============================================================
// STRIPE PAYMENT METHOD ENDPOINTS
// For manually entering payment info from signed contracts
// ============================================================

// POST /api/orders/payment-method/card - Create card payment method
router.post('/payment-method/card', async (req, res) => {
  try {
    if (!stripeService) {
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const {
      entityCode,
      clientId,
      cardNumber,
      expMonth,
      expYear,
      cvc,
      zip,
      clientEmail,
      clientName,
    } = req.body;

    if (!entityCode || !cardNumber || !expMonth || !expYear || !cvc) {
      return res.status(400).json({ error: 'Missing required card information' });
    }

    // Get or create Stripe customer
    const customer = await stripeService.getOrCreateCustomer(entityCode, {
      email: clientEmail,
      businessName: clientName,
      clientId: clientId,
    });

    // Create payment method using Stripe API directly
    const stripe = stripeService.getClient(entityCode);
    
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(expMonth),
        exp_year: parseInt(expYear.length === 2 ? '20' + expYear : expYear),
        cvc: cvc,
      },
      billing_details: {
        name: clientName,
        email: clientEmail,
        address: {
          postal_code: zip,
        },
      },
    });

    // Attach payment method to customer
    await stripeService.attachPaymentMethod(entityCode, paymentMethod.id, customer.id);

    // Set as default payment method
    await stripeService.setDefaultPaymentMethod(entityCode, customer.id, paymentMethod.id);

    // Update client record with Stripe customer ID
    if (clientId) {
      await pool.query(
        `UPDATE advertising_clients 
         SET stripe_customer_id = $1, 
             payment_method = 'credit_card',
             updated_at = NOW() 
         WHERE id = $2`,
        [customer.id, clientId]
      );
    }

    console.log(`[STRIPE] Card payment method created for ${clientName}: ${paymentMethod.card.brand} ****${paymentMethod.card.last4}`);

    res.json({
      success: true,
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
      card: {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      },
    });
  } catch (error) {
    console.error('Error creating card payment method:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create payment method',
      code: error.code,
    });
  }
});

// POST /api/orders/payment-method/ach - Create ACH bank account payment method
router.post('/payment-method/ach', async (req, res) => {
  try {
    if (!stripeService) {
      return res.status(500).json({ error: 'Stripe service not configured' });
    }

    const {
      entityCode,
      clientId,
      accountHolderName,
      routingNumber,
      accountNumber,
      accountType,
      clientEmail,
      clientName,
    } = req.body;

    if (!entityCode || !accountHolderName || !routingNumber || !accountNumber) {
      return res.status(400).json({ error: 'Missing required bank account information' });
    }

    // Get or create Stripe customer
    const customer = await stripeService.getOrCreateCustomer(entityCode, {
      email: clientEmail,
      businessName: clientName,
      clientId: clientId,
    });

    const stripe = stripeService.getClient(entityCode);
    
    // Use the modern PaymentMethod API with us_bank_account
    // This creates a payment method that can be used for ACH Direct Debit
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'company',
        account_number: accountNumber,
        routing_number: routingNumber,
        account_type: accountType || 'checking',
      },
      billing_details: {
        name: accountHolderName,
        email: clientEmail,
      },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    // Set as default payment method for invoices
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Update client record with Stripe customer ID and payment method
    if (clientId) {
      await pool.query(
        `UPDATE advertising_clients 
         SET stripe_customer_id = $1, 
             payment_method = 'ach',
             stripe_payment_method_id = $2,
             updated_at = NOW() 
         WHERE id = $3`,
        [customer.id, paymentMethod.id, clientId]
      );
    }

    console.log(`[STRIPE] ACH payment method created for ${clientName}: ****${accountNumber.slice(-4)}`);

    res.json({
      success: true,
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
      bankAccount: {
        last4: paymentMethod.us_bank_account.last4,
        bankName: paymentMethod.us_bank_account.bank_name,
        accountType: paymentMethod.us_bank_account.account_type,
      },
    });
  } catch (error) {
    console.error('Error creating ACH payment method:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create bank account',
      code: error.code,
    });
  }
});

// POST /api/orders/payment-method/verify-ach - Verify ACH with micro-deposits (legacy, kept for reference)
router.post('/payment-method/verify-ach', async (req, res) => {
  res.status(400).json({ 
    error: 'Micro-deposit verification not required for this integration. Bank accounts are ready to use immediately.',
  });
});

module.exports = router;
module.exports.initPool = initPool;
module.exports.initEmailService = initEmailService;
