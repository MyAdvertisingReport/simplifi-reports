// ============================================================
// ORDER FORM API ROUTES
// Handles order creation, management, and client operations
// ============================================================

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database pool - will be set by the main server
let pool = null;

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
        ct.title as contact_title
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

// GET /api/orders - List all orders
router.get('/', async (req, res) => {
  try {
    const { status, client_id, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        o.*,
        c.business_name as client_name,
        c.industry as client_industry
      FROM orders o
      JOIN advertising_clients c ON o.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    if (client_id) {
      paramCount++;
      query += ` AND o.client_id = $${paramCount}`;
      params.push(client_id);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ${parseInt(limit)}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
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
        c.industry as client_industry
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
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

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
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
      items = []
    } = req.body;

    // Validate required fields
    if (!client_id || !contract_start_date || !contract_end_date) {
      return res.status(400).json({ error: 'Missing required fields: client_id, contract_start_date, contract_end_date' });
    }

    // Generate order number
    const order_number = await generateOrderNumber(client);

    // Calculate totals
    let monthly_total = 0;
    for (const item of items) {
      monthly_total += parseFloat(item.line_total) || 0;
    }
    const contract_total = monthly_total * (term_months || 1);

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        id, order_number, client_id, contract_start_date, contract_end_date,
        term_months, billing_frequency, payment_preference, status,
        monthly_total, contract_total, notes, internal_notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'draft',
        $8, $9, $10, $11, NOW(), NOW()
      ) RETURNING *`,
      [
        order_number, client_id, contract_start_date, contract_end_date,
        term_months, billing_frequency, payment_preference,
        monthly_total, contract_total, notes, internal_notes
      ]
    );

    const newOrder = orderResult.rows[0];

    // Create order items
    const createdItems = [];
    for (const item of items) {
      const itemResult = await client.query(
        `INSERT INTO order_items (
          id, order_id, entity_id, product_id, product_name, product_category,
          quantity, unit_price, discount_percent, line_total,
          spots_per_week, spot_length, ad_size, premium_placement,
          monthly_impressions, notes, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, NOW(), NOW()
        ) RETURNING *`,
        [
          newOrder.id, item.entity_id, item.product_id, item.product_name, item.product_category,
          item.quantity || 1, item.unit_price, item.discount_percent || 0, item.line_total,
          item.spots_per_week, item.spot_length, item.ad_size, item.premium_placement,
          item.monthly_impressions, item.notes
        ]
      );
      createdItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...newOrder,
      items: createdItems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id - Update order
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
    if (items && items.length > 0) {
      for (const item of items) {
        monthly_total += parseFloat(item.line_total) || 0;
      }
    }
    const contract_total = monthly_total * (term_months || 1);

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
        updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        contract_start_date, contract_end_date, term_months,
        billing_frequency, payment_preference, status,
        monthly_total, contract_total, notes, internal_notes, id
      ]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    // If items provided, replace all items
    if (items && items.length >= 0) {
      // Delete existing items
      await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

      // Create new items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (
            id, order_id, entity_id, product_id, product_name, product_category,
            quantity, unit_price, discount_percent, line_total,
            spots_per_week, spot_length, ad_size, premium_placement,
            monthly_impressions, notes, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, NOW(), NOW()
          )`,
          [
            id, item.entity_id, item.product_id, item.product_name, item.product_category,
            item.quantity || 1, item.unit_price, item.discount_percent || 0, item.line_total,
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
      items: finalItems.rows
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

    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

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

module.exports = router;
module.exports.initPool = initPool;
