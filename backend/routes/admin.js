// ============================================================================
// PRODUCT MANAGEMENT API ROUTES
// Save as: backend/routes/admin.js
// ============================================================================

const express = require('express');
const router = express.Router();

// ============================================================================
// ENTITIES
// ============================================================================

router.get('/entities', async (req, res) => {
  try {
    const result = await req.dbPool.query(`
      SELECT id, code, name, is_active
      FROM entities
      WHERE is_active = TRUE
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entities:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// ============================================================================
// CATEGORIES
// ============================================================================

router.get('/categories', async (req, res) => {
  try {
    const result = await req.dbPool.query(`
      SELECT 
        id, code, name, description, 
        icon, color, display_order, is_active,
        created_at, updated_at
      FROM product_categories
      ORDER BY display_order, name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  const { code, name, description, icon, color, display_order, is_active } = req.body;
  
  try {
    const result = await req.dbPool.query(`
      INSERT INTO product_categories (code, name, description, icon, color, display_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [code, name, description, icon, color, display_order ?? 0, is_active ?? true]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Category code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name, description, icon, color, display_order, is_active } = req.body;
  
  try {
    const result = await req.dbPool.query(`
      UPDATE product_categories
      SET code = $1, name = $2, description = $3, icon = $4, 
          color = $5, display_order = $6, is_active = $7,
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [code, name, description, icon, color, display_order, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ============================================================================
// PRODUCTS
// ============================================================================

router.get('/products', async (req, res) => {
  const { entity, category, active_only } = req.query;
  
  try {
    let query = `
      SELECT 
        p.id, p.code, p.name, p.description,
        p.entity_id, e.code AS entity_code, e.name AS entity_name,
        p.category_id, pc.code AS category_code, pc.name AS category_name, pc.color AS category_color,
        p.default_rate, p.rate_type, p.setup_fee,
        p.min_term_months, p.min_quantity, p.max_quantity,
        p.unit_label, p.requires_details, p.custom_fields,
        p.display_order, p.available_all_entities,
        p.is_active, p.internal_notes,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN entities e ON p.entity_id = e.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (entity) {
      params.push(entity);
      query += ` AND e.code = $${params.length}`;
    }
    
    if (category) {
      params.push(category);
      query += ` AND pc.id = $${params.length}`;
    }
    
    if (active_only === 'true') {
      query += ` AND p.is_active = TRUE`;
    }
    
    query += ` ORDER BY pc.display_order, p.display_order, p.name`;
    
    const result = await req.dbPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await req.dbPool.query(`
      SELECT 
        p.*,
        e.code AS entity_code, e.name AS entity_name,
        pc.code AS category_code, pc.name AS category_name
      FROM products p
      LEFT JOIN entities e ON p.entity_id = e.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

router.post('/products', async (req, res) => {
  const {
    code, name, description, entity_id, category_id,
    default_rate, rate_type, setup_fee,
    min_term_months, min_quantity, max_quantity,
    unit_label, requires_details, custom_fields,
    display_order, available_all_entities, is_active, internal_notes
  } = req.body;
  
  try {
    // Get the category code for the legacy 'category' column
    const catResult = await req.dbPool.query(
      'SELECT code FROM product_categories WHERE id = $1',
      [category_id]
    );
    const categoryCode = catResult.rows[0]?.code || null;
    
    const result = await req.dbPool.query(`
      INSERT INTO products (
        code, name, description, entity_id, category_id, category,
        default_rate, rate_type, setup_fee,
        min_term_months, min_quantity, max_quantity,
        unit_label, requires_details, custom_fields,
        display_order, available_all_entities, is_active, internal_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      code, name, description, entity_id, category_id, categoryCode,
      default_rate, rate_type || 'monthly', setup_fee || null,
      min_term_months || 1, min_quantity || 1, max_quantity || null,
      unit_label || 'unit', requires_details || false, custom_fields || null,
      display_order || 0, available_all_entities || false, is_active ?? true, internal_notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Product code already exists for this entity' });
    } else {
      res.status(500).json({ error: 'Failed to create product' });
    }
  }
});

router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const {
    code, name, description, entity_id, category_id,
    default_rate, rate_type, setup_fee,
    min_term_months, min_quantity, max_quantity,
    unit_label, requires_details, custom_fields,
    display_order, available_all_entities, is_active, internal_notes
  } = req.body;
  
  try {
    // Get the category code for the legacy 'category' column
    const catResult = await req.dbPool.query(
      'SELECT code FROM product_categories WHERE id = $1',
      [category_id]
    );
    const categoryCode = catResult.rows[0]?.code || null;
    
    const result = await req.dbPool.query(`
      UPDATE products SET
        code = $1, name = $2, description = $3, entity_id = $4, 
        category_id = $5, category = $6,
        default_rate = $7, rate_type = $8, setup_fee = $9,
        min_term_months = $10, min_quantity = $11, max_quantity = $12,
        unit_label = $13, requires_details = $14, custom_fields = $15,
        display_order = $16, available_all_entities = $17, 
        is_active = $18, internal_notes = $19,
        updated_at = NOW()
      WHERE id = $20
      RETURNING *
    `, [
      code, name, description, entity_id, category_id, categoryCode,
      default_rate, rate_type, setup_fee,
      min_term_months, min_quantity, max_quantity,
      unit_label, requires_details, custom_fields,
      display_order, available_all_entities, is_active, internal_notes,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Soft delete - just mark as inactive
    const result = await req.dbPool.query(`
      UPDATE products SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============================================================================
// PACKAGES
// ============================================================================

router.get('/packages', async (req, res) => {
  const { entity, active_only } = req.query;
  
  try {
    let query = `
      SELECT 
        pkg.id, pkg.code, pkg.name, pkg.description,
        pkg.entity_id, e.code AS entity_code, e.name AS entity_name,
        pkg.base_price, pkg.price_type,
        pkg.discount_type, pkg.discount_value,
        pkg.default_term_months, pkg.min_term_months,
        pkg.display_order, pkg.featured, pkg.color, pkg.icon,
        pkg.is_active, pkg.available_from, pkg.available_until,
        pkg.internal_notes,
        pkg.created_at, pkg.updated_at,
        COUNT(pi.id) AS product_count,
        COALESCE(SUM(COALESCE(pi.override_price, p.default_rate) * pi.quantity), 0) AS products_total_value
      FROM packages pkg
      LEFT JOIN entities e ON pkg.entity_id = e.id
      LEFT JOIN package_items pi ON pkg.id = pi.package_id
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (entity) {
      params.push(entity);
      query += ` AND e.code = $${params.length}`;
    }
    
    if (active_only === 'true') {
      query += ` AND pkg.is_active = TRUE`;
    }
    
    query += ` GROUP BY pkg.id, e.code, e.name ORDER BY pkg.display_order, pkg.name`;
    
    const result = await req.dbPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

router.get('/packages/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get package
    const pkgResult = await req.dbPool.query(`
      SELECT 
        pkg.*,
        e.code AS entity_code, e.name AS entity_name
      FROM packages pkg
      LEFT JOIN entities e ON pkg.entity_id = e.id
      WHERE pkg.id = $1
    `, [id]);
    
    if (pkgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Get package items
    const itemsResult = await req.dbPool.query(`
      SELECT 
        pi.id, pi.product_id, pi.quantity, pi.override_price, 
        pi.is_required, pi.display_order,
        p.code AS product_code, p.name AS product_name, 
        p.default_rate, p.rate_type
      FROM package_items pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.package_id = $1
      ORDER BY pi.display_order, p.name
    `, [id]);
    
    const pkg = pkgResult.rows[0];
    pkg.items = itemsResult.rows;
    
    res.json(pkg);
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

router.post('/packages', async (req, res) => {
  const {
    code, name, description, entity_id,
    base_price, price_type, discount_type, discount_value,
    default_term_months, min_term_months,
    display_order, featured, color, icon,
    is_active, available_from, available_until, internal_notes,
    items // Array of { product_id, quantity, override_price, is_required }
  } = req.body;
  
  const client = await req.dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create package
    const pkgResult = await client.query(`
      INSERT INTO packages (
        code, name, description, entity_id,
        base_price, price_type, discount_type, discount_value,
        default_term_months, min_term_months,
        display_order, featured, color, icon,
        is_active, available_from, available_until, internal_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      code, name, description, entity_id,
      base_price, price_type || 'fixed', discount_type || null, discount_value || null,
      default_term_months || 1, min_term_months || 1,
      display_order || 0, featured || false, color || null, icon || null,
      is_active ?? true, available_from || null, available_until || null, internal_notes
    ]);
    
    const pkg = pkgResult.rows[0];
    
    // Add package items
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await client.query(`
          INSERT INTO package_items (package_id, product_id, quantity, override_price, is_required, display_order)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [pkg.id, item.product_id, item.quantity || 1, item.override_price || null, item.is_required ?? true, i]);
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch complete package with items
    const fullPkg = await req.dbPool.query(`
      SELECT pkg.*, e.code AS entity_code, e.name AS entity_name
      FROM packages pkg
      LEFT JOIN entities e ON pkg.entity_id = e.id
      WHERE pkg.id = $1
    `, [pkg.id]);
    
    res.status(201).json(fullPkg.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating package:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Package code already exists for this entity' });
    } else {
      res.status(500).json({ error: 'Failed to create package' });
    }
  } finally {
    client.release();
  }
});

router.put('/packages/:id', async (req, res) => {
  const { id } = req.params;
  const {
    code, name, description, entity_id,
    base_price, price_type, discount_type, discount_value,
    default_term_months, min_term_months,
    display_order, featured, color, icon,
    is_active, available_from, available_until, internal_notes,
    items
  } = req.body;
  
  const client = await req.dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update package
    const pkgResult = await client.query(`
      UPDATE packages SET
        code = $1, name = $2, description = $3, entity_id = $4,
        base_price = $5, price_type = $6, discount_type = $7, discount_value = $8,
        default_term_months = $9, min_term_months = $10,
        display_order = $11, featured = $12, color = $13, icon = $14,
        is_active = $15, available_from = $16, available_until = $17, internal_notes = $18,
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `, [
      code, name, description, entity_id,
      base_price, price_type, discount_type, discount_value,
      default_term_months, min_term_months,
      display_order, featured, color, icon,
      is_active, available_from, available_until, internal_notes,
      id
    ]);
    
    if (pkgResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Replace package items
    if (items !== undefined) {
      await client.query('DELETE FROM package_items WHERE package_id = $1', [id]);
      
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await client.query(`
            INSERT INTO package_items (package_id, product_id, quantity, override_price, is_required, display_order)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [id, item.product_id, item.quantity || 1, item.override_price || null, item.is_required ?? true, i]);
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.json(pkgResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  } finally {
    client.release();
  }
});

router.delete('/packages/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Soft delete
    const result = await req.dbPool.query(`
      UPDATE packages SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

module.exports = router;
