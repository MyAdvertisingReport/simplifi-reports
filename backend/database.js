/**
 * Database initialization and management
 * Uses PostgreSQL for persistent storage
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let pool = null;

// Generate URL-friendly slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
    .substring(0, 50);            // Limit length
}

async function initializeDatabase() {
  // Use DATABASE_URL from Railway
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to PostgreSQL');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    throw err;
  }

  // Create tables
  await pool.query(`
    -- Users table (admins and sales associates)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'sales')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Your brands (WSIC, Lake Norman Woman, etc.)
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_path TEXT,
      primary_color TEXT DEFAULT '#1a56db',
      secondary_color TEXT DEFAULT '#7c3aed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Clients (advertisers)
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      brand_id TEXT NOT NULL REFERENCES brands(id),
      simplifi_org_id INTEGER,
      logo_path TEXT,
      primary_color TEXT DEFAULT '#1a56db',
      secondary_color TEXT DEFAULT '#64748b',
      monthly_budget REAL,
      campaign_goal TEXT,
      contact_name TEXT,
      contact_email TEXT,
      start_date TEXT,
      share_token TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add slug column if it doesn't exist (for existing databases)
  try {
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE`);
  } catch (e) {
    // Column might already exist
  }

  await pool.query(`
    -- Report configurations (templates for each client)
    CREATE TABLE IF NOT EXISTS report_configs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      name TEXT NOT NULL,
      description TEXT,
      campaign_ids TEXT,
      metrics_config TEXT,
      layout_config TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Public report links (shareable URLs)
    CREATE TABLE IF NOT EXISTS report_links (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      report_config_id TEXT NOT NULL REFERENCES report_configs(id),
      expires_at TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Cached stats (to reduce API calls)
    CREATE TABLE IF NOT EXISTS stats_cache (
      id TEXT PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Internal notes (staff only, not visible to clients)
    CREATE TABLE IF NOT EXISTS internal_notes (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      campaign_id INTEGER,
      user_id TEXT NOT NULL REFERENCES users(id),
      user_name TEXT NOT NULL,
      note TEXT NOT NULL,
      note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'strategy', 'issue', 'milestone', 'billing')),
      is_pinned INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Report Center webhook notifications
    CREATE TABLE IF NOT EXISTS webhook_notifications (
      id TEXT PRIMARY KEY,
      report_id INTEGER,
      schedule_id INTEGER,
      snapshot_id INTEGER,
      download_link TEXT,
      filename TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloaded', 'processed', 'failed')),
      data TEXT,
      received_at TIMESTAMP NOT NULL,
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Report Center report models (store created models for reuse)
    CREATE TABLE IF NOT EXISTS report_models (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      simplifi_org_id INTEGER NOT NULL,
      simplifi_report_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      filters TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    -- Client assignments (which sales reps can see which clients)
    CREATE TABLE IF NOT EXISTS client_assignments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, user_id)
    );
  `);

  // Stats cache table - stores historical stats to reduce API calls
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stats_cache (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      campaign_id INTEGER,
      stat_date DATE NOT NULL,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      total_spend DECIMAL(10,2) DEFAULT 0,
      ctr DECIMAL(8,6) DEFAULT 0,
      vcr DECIMAL(8,6) DEFAULT 0,
      video_complete INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, campaign_id, stat_date)
    )
  `);

  // Track last successful fetch per client
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fetch_log (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      last_fetch_date DATE NOT NULL,
      last_fetch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      UNIQUE(client_id)
    )
  `);

  console.log('✓ Database tables initialized');
  return pool;
}

async function seedInitialData() {
  // Check if brands exist
  const brandResult = await pool.query("SELECT COUNT(*) as count FROM brands");
  const brandCount = parseInt(brandResult.rows[0].count);
  
  if (brandCount === 0) {
    // Insert your brands
    await pool.query(
      `INSERT INTO brands (id, name, logo_path, primary_color, secondary_color) VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), 'WSIC', '/wsic-logo.png', '#1e3a8a', '#dc2626']
    );
    
    await pool.query(
      `INSERT INTO brands (id, name, logo_path, primary_color, secondary_color) VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), 'Lake Norman Woman', '/lnw-logo.png', '#0d9488', '#0d9488']
    );

    console.log('✓ Seeded initial brands');
  }

  // Check if admin exists
  const userResult = await pool.query("SELECT COUNT(*) as count FROM users");
  const userCount = parseInt(userResult.rows[0].count);
  
  if (userCount === 0) {
    // Create default admin - use environment variables if set, otherwise use defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
    const adminName = process.env.ADMIN_NAME || 'Admin User';
    
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), adminEmail, passwordHash, adminName, 'admin']
    );

    console.log('✓ Created default admin user');
    console.log('  Email:', adminEmail);
    if (adminEmail === 'admin@example.com') {
      console.log('  Password: changeme123');
      console.log('  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
    } else {
      console.log('  Password: [set via environment variable]');
    }
  }

  // Generate slugs for any existing clients without them
  const clientsWithoutSlugs = await pool.query("SELECT id, name FROM clients WHERE slug IS NULL");
  if (clientsWithoutSlugs.rows.length > 0) {
    console.log(`Generating slugs for ${clientsWithoutSlugs.rows.length} clients...`);
    for (const client of clientsWithoutSlugs.rows) {
      const slug = await generateUniqueSlugForMigration(client.name);
      await pool.query("UPDATE clients SET slug = $1 WHERE id = $2", [slug, client.id]);
      console.log(`  ✓ ${client.name} → ${slug}`);
    }
    console.log('✓ Client slugs generated');
  }
}

// Helper for migration - generates unique slug
async function generateUniqueSlugForMigration(name) {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await pool.query("SELECT id FROM clients WHERE slug = $1", [slug]);
    if (existing.rows.length === 0) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Database helper class
class DatabaseHelper {
  // Users
  async getUserByEmail(email) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
  }

  async getUserById(id) {
    const result = await pool.query(
      "SELECT id, email, password_hash, name, role, created_at FROM users WHERE id = $1", 
      [id]
    );
    return result.rows[0] || null;
  }

  async updateUser(id, updates) {
    const user = await this.getUserById(id);
    if (!user) return null;
    
    const newEmail = updates.email || user.email;
    const newName = updates.name || user.name;
    const newRole = updates.role || user.role;
    
    if (updates.password) {
      const newPasswordHash = bcrypt.hashSync(updates.password, 10);
      await pool.query(
        "UPDATE users SET email = $1, name = $2, role = $3, password_hash = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5",
        [newEmail, newName, newRole, newPasswordHash, id]
      );
    } else {
      await pool.query(
        "UPDATE users SET email = $1, name = $2, role = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
        [newEmail, newName, newRole, id]
      );
    }
    return this.getUserById(id);
  }

  async deleteUser(id) {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
  }

  async createUser(data) {
    const { email, password, name, role } = data;
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    await pool.query(
      "INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)",
      [id, email, passwordHash, name, role]
    );
    return this.getUserById(id);
  }

  async getAllUsers() {
    const result = await pool.query("SELECT id, email, name, role, created_at FROM users");
    return result.rows;
  }

  // Brands
  async getAllBrands() {
    const result = await pool.query("SELECT * FROM brands");
    return result.rows;
  }

  async getBrandById(id) {
    const result = await pool.query("SELECT * FROM brands WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async createBrand(name, logoPath = null, primaryColor = '#1a56db', secondaryColor = '#7c3aed') {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO brands (id, name, logo_path, primary_color, secondary_color) VALUES ($1, $2, $3, $4, $5)`,
      [id, name, logoPath, primaryColor, secondaryColor]
    );
    return this.getBrandById(id);
  }

  // Clients
  async getAllClients() {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY c.name
    `);
    return result.rows;
  }

  async getClientById(id) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async getClientBySlug(slug) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.slug = $1
    `, [slug]);
    return result.rows[0] || null;
  }

  async getClientByOrgId(orgId) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.simplifi_org_id = $1
    `, [orgId]);
    return result.rows[0] || null;
  }

  async createClient(data) {
    const id = uuidv4();
    const shareToken = uuidv4().replace(/-/g, '');
    const name = data.name;
    const slug = await this.generateUniqueSlug(name);
    const brandId = data.brand_id;
    const simplifiOrgId = data.simplifi_org_id;
    const logoPath = data.logo_path;
    const primaryColor = data.primary_color || '#3b82f6';
    const secondaryColor = data.secondary_color || '#1e40af';
    
    await pool.query(`
      INSERT INTO clients (id, name, slug, brand_id, simplifi_org_id, logo_path, primary_color, secondary_color, monthly_budget, campaign_goal, contact_name, contact_email, start_date, share_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      id, name, slug, brandId, simplifiOrgId || null, logoPath || null, primaryColor, secondaryColor,
      data.monthly_budget || null,
      data.campaign_goal || null,
      data.contact_name || null,
      data.contact_email || null,
      data.start_date || null,
      shareToken
    ]);
    return this.getClientById(id);
  }

  // Generate unique slug, adding number suffix if needed
  async generateUniqueSlug(name) {
    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existing = await pool.query("SELECT id FROM clients WHERE slug = $1", [slug]);
      if (existing.rows.length === 0) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Get client by share token (for public reports)
  async getClientByShareToken(token) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.share_token = $1
    `, [token]);
    return result.rows[0] || null;
  }

  async updateClient(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.name) { 
      fields.push(`name = $${paramCount++}`); 
      values.push(updates.name); 
      // Also update slug if name changes
      const newSlug = await this.generateUniqueSlug(updates.name);
      fields.push(`slug = $${paramCount++}`);
      values.push(newSlug);
    }
    if (updates.brandId) { fields.push(`brand_id = $${paramCount++}`); values.push(updates.brandId); }
    if (updates.simplifiOrgId !== undefined) { fields.push(`simplifi_org_id = $${paramCount++}`); values.push(updates.simplifiOrgId); }
    if (updates.logoPath !== undefined) { fields.push(`logo_path = $${paramCount++}`); values.push(updates.logoPath); }
    if (updates.primaryColor) { fields.push(`primary_color = $${paramCount++}`); values.push(updates.primaryColor); }
    if (updates.secondaryColor) { fields.push(`secondary_color = $${paramCount++}`); values.push(updates.secondaryColor); }
    if (updates.monthlyBudget !== undefined) { fields.push(`monthly_budget = $${paramCount++}`); values.push(updates.monthlyBudget); }
    if (updates.campaignGoal !== undefined) { fields.push(`campaign_goal = $${paramCount++}`); values.push(updates.campaignGoal); }
    if (updates.contactName !== undefined) { fields.push(`contact_name = $${paramCount++}`); values.push(updates.contactName); }
    if (updates.contactEmail !== undefined) { fields.push(`contact_email = $${paramCount++}`); values.push(updates.contactEmail); }
    if (updates.startDate !== undefined) { fields.push(`start_date = $${paramCount++}`); values.push(updates.startDate); }
    
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await pool.query(`UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount}`, values);
    }
    return this.getClientById(id);
  }

  async deleteClient(id) {
    // Delete associated data first
    await pool.query(`DELETE FROM client_assignments WHERE client_id = $1`, [id]);
    await pool.query(`DELETE FROM internal_notes WHERE client_id = $1`, [id]);
    await pool.query(`DELETE FROM report_links WHERE report_config_id IN (SELECT id FROM report_configs WHERE client_id = $1)`, [id]);
    await pool.query(`DELETE FROM report_configs WHERE client_id = $1`, [id]);
    await pool.query(`DELETE FROM report_models WHERE client_id = $1`, [id]);
    // Delete the client
    await pool.query(`DELETE FROM clients WHERE id = $1`, [id]);
  }

  // Report Configs
  async getReportConfigsByClient(clientId) {
    const result = await pool.query(
      "SELECT * FROM report_configs WHERE client_id = $1 AND is_active = 1", 
      [clientId]
    );
    return result.rows;
  }

  async getReportConfigById(id) {
    const result = await pool.query(`
      SELECT rc.*, c.name as client_name, c.logo_path as client_logo,
             c.primary_color, c.secondary_color, c.simplifi_org_id,
             b.name as brand_name, b.logo_path as brand_logo
      FROM report_configs rc
      JOIN clients c ON rc.client_id = c.id
      JOIN brands b ON c.brand_id = b.id
      WHERE rc.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async createReportConfig(clientId, name, description, campaignIds, metricsConfig, layoutConfig) {
    const id = uuidv4();
    await pool.query(`
      INSERT INTO report_configs (id, client_id, name, description, campaign_ids, metrics_config, layout_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, clientId, name, description, JSON.stringify(campaignIds), JSON.stringify(metricsConfig), JSON.stringify(layoutConfig)]);
    return this.getReportConfigById(id);
  }

  // Report Links
  async createReportLink(reportConfigId, expiresAt = null) {
    const id = uuidv4();
    const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    await pool.query(`
      INSERT INTO report_links (id, token, report_config_id, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [id, token, reportConfigId, expiresAt]);
    return { id, token, reportConfigId, expiresAt };
  }

  async getReportLinkByToken(token) {
    const result = await pool.query(`
      SELECT rl.*, rc.client_id, rc.name as report_name, rc.campaign_ids,
             rc.metrics_config, rc.layout_config,
             c.name as client_name, c.logo_path as client_logo,
             c.primary_color, c.secondary_color, c.simplifi_org_id,
             b.name as brand_name, b.logo_path as brand_logo
      FROM report_links rl
      JOIN report_configs rc ON rl.report_config_id = rc.id
      JOIN clients c ON rc.client_id = c.id
      JOIN brands b ON c.brand_id = b.id
      WHERE rl.token = $1 AND rl.is_active = 1
    `, [token]);
    return result.rows[0] || null;
  }

  // Stats Cache
  async getCachedStats(cacheKey) {
    const result = await pool.query(`
      SELECT data FROM stats_cache 
      WHERE cache_key = $1 AND expires_at > CURRENT_TIMESTAMP
    `, [cacheKey]);
    const row = result.rows[0];
    return row ? JSON.parse(row.data) : null;
  }

  async setCachedStats(cacheKey, data, ttlMinutes = 15) {
    const id = uuidv4();
    // Delete existing cache entry if exists
    await pool.query("DELETE FROM stats_cache WHERE cache_key = $1", [cacheKey]);
    await pool.query(`
      INSERT INTO stats_cache (id, cache_key, data, expires_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '${ttlMinutes} minutes')
    `, [id, cacheKey, JSON.stringify(data)]);
  }

  async cleanExpiredCache() {
    await pool.query("DELETE FROM stats_cache WHERE expires_at < CURRENT_TIMESTAMP");
  }

  // ============================================
  // INTERNAL NOTES
  // ============================================
  
  // Get all notes for a client
  async getNotesByClient(clientId) {
    const result = await pool.query(`
      SELECT * FROM internal_notes 
      WHERE client_id = $1 
      ORDER BY is_pinned DESC, created_at DESC
    `, [clientId]);
    return result.rows;
  }

  // Get notes for a specific campaign
  async getNotesByCampaign(clientId, campaignId) {
    const result = await pool.query(`
      SELECT * FROM internal_notes 
      WHERE client_id = $1 AND (campaign_id = $2 OR campaign_id IS NULL)
      ORDER BY is_pinned DESC, created_at DESC
    `, [clientId, campaignId]);
    return result.rows;
  }

  // Create a new note
  async createNote(clientId, userId, userName, note, options = {}) {
    const id = uuidv4();
    const { campaignId = null, noteType = 'general', isPinned = false } = options;
    
    await pool.query(`
      INSERT INTO internal_notes (id, client_id, campaign_id, user_id, user_name, note, note_type, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, clientId, campaignId, userId, userName, note, noteType, isPinned ? 1 : 0]);
    
    const result = await pool.query("SELECT * FROM internal_notes WHERE id = $1", [id]);
    return result.rows[0];
  }

  // Update a note
  async updateNote(noteId, updates) {
    const { note, noteType, isPinned } = updates;
    const setClauses = [];
    const params = [];
    let paramCount = 1;
    
    if (note !== undefined) {
      setClauses.push(`note = $${paramCount++}`);
      params.push(note);
    }
    if (noteType !== undefined) {
      setClauses.push(`note_type = $${paramCount++}`);
      params.push(noteType);
    }
    if (isPinned !== undefined) {
      setClauses.push(`is_pinned = $${paramCount++}`);
      params.push(isPinned ? 1 : 0);
    }
    
    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(noteId);
      
      await pool.query(
        `UPDATE internal_notes SET ${setClauses.join(', ')} WHERE id = $${paramCount}`, 
        params
      );
    }
    
    const result = await pool.query("SELECT * FROM internal_notes WHERE id = $1", [noteId]);
    return result.rows[0];
  }

  // Delete a note
  async deleteNote(noteId) {
    await pool.query("DELETE FROM internal_notes WHERE id = $1", [noteId]);
    return true;
  }

  // Toggle pin status
  async toggleNotePin(noteId) {
    await pool.query(`
      UPDATE internal_notes 
      SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [noteId]);
    const result = await pool.query("SELECT * FROM internal_notes WHERE id = $1", [noteId]);
    return result.rows[0];
  }

  // ============================================
  // WEBHOOK NOTIFICATION METHODS
  // ============================================

  // Store a webhook notification
  async storeWebhookNotification(data) {
    const id = uuidv4();
    await pool.query(`
      INSERT INTO webhook_notifications (id, report_id, schedule_id, snapshot_id, download_link, filename, received_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, data.reportId, data.scheduleId, data.snapshotId, data.downloadLink, data.filename, data.receivedAt]);
    return { id, ...data };
  }

  // Get pending webhook notifications
  async getPendingWebhookNotifications() {
    const result = await pool.query(
      "SELECT * FROM webhook_notifications WHERE status = 'pending' ORDER BY received_at ASC"
    );
    return result.rows;
  }

  // Update webhook notification status
  async updateWebhookNotificationStatus(id, status, data = null) {
    let sql = "UPDATE webhook_notifications SET status = $1";
    const params = [status];
    let paramCount = 2;
    
    if (data) {
      sql += `, data = $${paramCount++}`;
      params.push(JSON.stringify(data));
    }
    
    if (status === 'downloaded' || status === 'processed') {
      sql += ", processed_at = CURRENT_TIMESTAMP";
    }
    
    sql += ` WHERE id = $${paramCount}`;
    params.push(id);
    
    await pool.query(sql, params);
  }

  // ============================================
  // REPORT MODEL METHODS
  // ============================================

  // Store a report model reference
  async storeReportModel(clientId, orgId, simplifiReportId, templateId, title, category = null, filters = null) {
    const id = uuidv4();
    await pool.query(`
      INSERT INTO report_models (id, client_id, simplifi_org_id, simplifi_report_id, template_id, title, category, filters)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, clientId, orgId, simplifiReportId, templateId, title, category, filters ? JSON.stringify(filters) : null]);
    return { id, clientId, orgId, simplifiReportId, templateId, title, category, filters };
  }

  // Get report models for a client
  async getReportModelsByClient(clientId) {
    const result = await pool.query(
      "SELECT * FROM report_models WHERE client_id = $1 ORDER BY created_at DESC",
      [clientId]
    );
    return result.rows;
  }

  // Get report model by Simpli.fi report ID
  async getReportModelBySimplifiId(simplifiReportId) {
    const result = await pool.query(
      "SELECT * FROM report_models WHERE simplifi_report_id = $1",
      [simplifiReportId]
    );
    return result.rows[0] || null;
  }

  // ============================================
  // CLIENT ASSIGNMENT METHODS
  // ============================================

  // Assign a client to a user
  async assignClientToUser(clientId, userId) {
    const id = uuidv4();
    try {
      await pool.query(`
        INSERT INTO client_assignments (id, client_id, user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (client_id, user_id) DO NOTHING
      `, [id, clientId, userId]);
      return true;
    } catch (error) {
      console.error('Error assigning client:', error);
      return false;
    }
  }

  // Remove client assignment
  async unassignClientFromUser(clientId, userId) {
    await pool.query(
      "DELETE FROM client_assignments WHERE client_id = $1 AND user_id = $2", 
      [clientId, userId]
    );
    return true;
  }

  // Get all clients assigned to a user
  async getClientsByUserId(userId) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      JOIN client_assignments ca ON c.id = ca.client_id
      WHERE ca.user_id = $1
      ORDER BY c.name
    `, [userId]);
    return result.rows;
  }

  // Get all users assigned to a client
  async getUsersByClientId(clientId) {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.role
      FROM users u
      JOIN client_assignments ca ON u.id = ca.user_id
      WHERE ca.client_id = $1
      ORDER BY u.name
    `, [clientId]);
    return result.rows;
  }

  // Get all client assignments
  async getAllClientAssignments() {
    const result = await pool.query(`
      SELECT ca.*, c.name as client_name, u.name as user_name, u.email as user_email
      FROM client_assignments ca
      JOIN clients c ON ca.client_id = c.id
      JOIN users u ON ca.user_id = u.id
      ORDER BY c.name, u.name
    `);
    return result.rows;
  }

  // Check if user has access to client
  async userHasAccessToClient(userId, clientId) {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM client_assignments 
      WHERE user_id = $1 AND client_id = $2
    `, [userId, clientId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // ============================================
  // STATS CACHE METHODS
  // ============================================

  // Save stats to cache (upsert)
  async cacheStats(clientId, campaignId, statDate, stats) {
    const id = `${clientId}-${campaignId || 'org'}-${statDate}`;
    await pool.query(`
      INSERT INTO stats_cache (id, client_id, campaign_id, stat_date, impressions, clicks, total_spend, ctr, vcr, video_complete, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id, campaign_id, stat_date) 
      DO UPDATE SET 
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        total_spend = EXCLUDED.total_spend,
        ctr = EXCLUDED.ctr,
        vcr = EXCLUDED.vcr,
        video_complete = EXCLUDED.video_complete,
        updated_at = CURRENT_TIMESTAMP
    `, [
      id, 
      clientId, 
      campaignId || null, 
      statDate, 
      stats.impressions || 0,
      stats.clicks || 0,
      stats.total_spend || 0,
      stats.ctr || 0,
      stats.vcr || 0,
      stats.video_complete || 0
    ]);
  }

  // Batch save stats
  async cacheStatsBatch(clientId, statsArray) {
    for (const stat of statsArray) {
      await this.cacheStats(
        clientId,
        stat.campaign_id,
        stat.stat_date,
        stat
      );
    }
  }

  // Get cached stats for a client within date range
  async getCachedStats(clientId, startDate, endDate, byCampaign = false) {
    let query;
    if (byCampaign) {
      query = `
        SELECT campaign_id, 
               SUM(impressions) as impressions, 
               SUM(clicks) as clicks, 
               SUM(total_spend) as total_spend
        FROM stats_cache 
        WHERE client_id = $1 AND stat_date >= $2 AND stat_date <= $3 AND campaign_id IS NOT NULL
        GROUP BY campaign_id
      `;
    } else {
      query = `
        SELECT stat_date, 
               SUM(impressions) as impressions, 
               SUM(clicks) as clicks, 
               SUM(total_spend) as total_spend
        FROM stats_cache 
        WHERE client_id = $1 AND stat_date >= $2 AND stat_date <= $3
        GROUP BY stat_date
        ORDER BY stat_date
      `;
    }
    const result = await pool.query(query, [clientId, startDate, endDate]);
    return result.rows;
  }

  // Get the last date we have cached data for a client
  async getLastCachedDate(clientId) {
    const result = await pool.query(
      "SELECT MAX(stat_date) as last_date FROM stats_cache WHERE client_id = $1",
      [clientId]
    );
    return result.rows[0]?.last_date || null;
  }

  // Update fetch log
  async updateFetchLog(clientId, lastFetchDate, status = 'success', errorMessage = null) {
    const id = `fetch-${clientId}`;
    await pool.query(`
      INSERT INTO fetch_log (id, client_id, last_fetch_date, last_fetch_time, status, error_message)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
      ON CONFLICT (client_id)
      DO UPDATE SET 
        last_fetch_date = EXCLUDED.last_fetch_date,
        last_fetch_time = CURRENT_TIMESTAMP,
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message
    `, [id, clientId, lastFetchDate, status, errorMessage]);
  }

  // Get fetch log for a client
  async getFetchLog(clientId) {
    const result = await pool.query(
      "SELECT * FROM fetch_log WHERE client_id = $1",
      [clientId]
    );
    return result.rows[0] || null;
  }
}

function getDatabase() {
  return pool;
}

module.exports = { initializeDatabase, seedInitialData, DatabaseHelper, getDatabase, generateSlug };
