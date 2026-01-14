/**
 * Database initialization and management
 * Uses sql.js - a pure JavaScript SQLite implementation (no native compilation required)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'data', 'reports.db');

let db = null;

async function initializeDatabase() {
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize SQL.js
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    -- Users table (admins and sales associates)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'sales')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    -- Your brands (WSIC, Lake Norman Woman, etc.)
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_path TEXT,
      primary_color TEXT DEFAULT '#1a56db',
      secondary_color TEXT DEFAULT '#7c3aed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    -- Clients (advertisers)
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand_id TEXT NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (brand_id) REFERENCES brands(id)
    );
  `);

  db.run(`
    -- Report configurations (templates for each client)
    CREATE TABLE IF NOT EXISTS report_configs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      campaign_ids TEXT,
      metrics_config TEXT,
      layout_config TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
  `);

  db.run(`
    -- Public report links (shareable URLs)
    CREATE TABLE IF NOT EXISTS report_links (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      report_config_id TEXT NOT NULL,
      expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_config_id) REFERENCES report_configs(id)
    );
  `);

  db.run(`
    -- Cached stats (to reduce API calls)
    CREATE TABLE IF NOT EXISTS stats_cache (
      id TEXT PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    -- Internal notes (staff only, not visible to clients)
    CREATE TABLE IF NOT EXISTS internal_notes (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      campaign_id INTEGER,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      note TEXT NOT NULL,
      note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'strategy', 'issue', 'milestone', 'billing')),
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
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
      received_at DATETIME NOT NULL,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    -- Report Center report models (store created models for reuse)
    CREATE TABLE IF NOT EXISTS report_models (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      simplifi_org_id INTEGER NOT NULL,
      simplifi_report_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      filters TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
  `);

  // Save to file
  saveDatabase();

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function seedInitialData() {
  // Check if brands exist
  const brandCount = db.exec("SELECT COUNT(*) as count FROM brands")[0];
  const count = brandCount ? brandCount.values[0][0] : 0;
  
  if (count === 0) {
    // Insert your brands
    db.run(`INSERT INTO brands (id, name, logo_path, primary_color, secondary_color) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'WSIC', '/wsic-logo.png', '#1e3a8a', '#dc2626']);
    
    db.run(`INSERT INTO brands (id, name, logo_path, primary_color, secondary_color) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'Lake Norman Woman', '/lnw-logo.png', '#0d9488', '#0d9488']);

    console.log('✓ Seeded initial brands');
  }

  // Check if admin exists
  const userCount = db.exec("SELECT COUNT(*) as count FROM users")[0];
  const uCount = userCount ? userCount.values[0][0] : 0;
  
  if (uCount === 0) {
    // Create default admin
    const defaultPassword = bcrypt.hashSync('changeme123', 10);
    db.run(`INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'admin@example.com', defaultPassword, 'Admin User', 'admin']);

    console.log('✓ Created default admin user');
    console.log('  Email: admin@example.com');
    console.log('  Password: changeme123');
    console.log('  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
  }

  saveDatabase();
}

// Helper to convert sql.js results to objects
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function getOne(result) {
  const rows = rowsToObjects(result);
  return rows.length > 0 ? rows[0] : null;
}

function getAll(result) {
  return rowsToObjects(result);
}

// Database helper class
class DatabaseHelper {
  // Users
  getUserByEmail(email) {
    const result = db.exec("SELECT * FROM users WHERE email = ?", [email]);
    return getOne(result);
  }

  getUserById(id) {
    const result = db.exec("SELECT id, email, name, role, created_at FROM users WHERE id = ?", [id]);
    return getOne(result);
  }

  createUser(email, password, name, role) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
      [id, email, passwordHash, name, role]);
    saveDatabase();
    return this.getUserById(id);
  }

  getAllUsers() {
    const result = db.exec("SELECT id, email, name, role, created_at FROM users");
    return rowsToObjects(result);
  }

  // Brands
  getAllBrands() {
    const result = db.exec("SELECT * FROM brands");
    return rowsToObjects(result);
  }

  getBrandById(id) {
    const result = db.exec("SELECT * FROM brands WHERE id = ?", [id]);
    return getOne(result);
  }

  // Clients
  getAllClients() {
    const result = db.exec(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      ORDER BY c.name
    `);
    return rowsToObjects(result);
  }

  getClientById(id) {
    const result = db.exec(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      JOIN brands b ON c.brand_id = b.id
      WHERE c.id = ?
    `, [id]);
    return getOne(result);
  }

  createClient(name, brandId, simplifiOrgId, logoPath, primaryColor, secondaryColor, extraFields = {}) {
    const id = uuidv4();
    const shareToken = uuidv4().replace(/-/g, ''); // Generate a static share token for this client
    db.run(`
      INSERT INTO clients (id, name, brand_id, simplifi_org_id, logo_path, primary_color, secondary_color, monthly_budget, campaign_goal, contact_name, contact_email, start_date, share_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, name, brandId, simplifiOrgId || null, logoPath || null, primaryColor, secondaryColor,
      extraFields.monthlyBudget || null,
      extraFields.campaignGoal || null,
      extraFields.contactName || null,
      extraFields.contactEmail || null,
      extraFields.startDate || null,
      shareToken
    ]);
    saveDatabase();
    return this.getClientById(id);
  }

  // Get client by share token (for public reports)
  getClientByShareToken(token) {
    const result = db.exec(`
      SELECT c.*, b.name as brand_name, b.logo_path as brand_logo
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.share_token = ?
    `, [token]);
    return getOne(result);
  }

  updateClient(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.brandId) { fields.push('brand_id = ?'); values.push(updates.brandId); }
    if (updates.simplifiOrgId !== undefined) { fields.push('simplifi_org_id = ?'); values.push(updates.simplifiOrgId); }
    if (updates.logoPath !== undefined) { fields.push('logo_path = ?'); values.push(updates.logoPath); }
    if (updates.primaryColor) { fields.push('primary_color = ?'); values.push(updates.primaryColor); }
    if (updates.secondaryColor) { fields.push('secondary_color = ?'); values.push(updates.secondaryColor); }
    if (updates.monthlyBudget !== undefined) { fields.push('monthly_budget = ?'); values.push(updates.monthlyBudget); }
    if (updates.campaignGoal !== undefined) { fields.push('campaign_goal = ?'); values.push(updates.campaignGoal); }
    if (updates.contactName !== undefined) { fields.push('contact_name = ?'); values.push(updates.contactName); }
    if (updates.contactEmail !== undefined) { fields.push('contact_email = ?'); values.push(updates.contactEmail); }
    if (updates.startDate !== undefined) { fields.push('start_date = ?'); values.push(updates.startDate); }
    
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      db.run(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
      saveDatabase();
    }
    return this.getClientById(id);
  }

  deleteClient(id) {
    // Delete associated data first
    db.run(`DELETE FROM internal_notes WHERE client_id = ?`, [id]);
    db.run(`DELETE FROM report_links WHERE report_config_id IN (SELECT id FROM report_configs WHERE client_id = ?)`, [id]);
    db.run(`DELETE FROM report_configs WHERE client_id = ?`, [id]);
    // Delete the client
    db.run(`DELETE FROM clients WHERE id = ?`, [id]);
    saveDatabase();
  }

  // Report Configs
  getReportConfigsByClient(clientId) {
    const result = db.exec("SELECT * FROM report_configs WHERE client_id = ? AND is_active = 1", [clientId]);
    return rowsToObjects(result);
  }

  getReportConfigById(id) {
    const result = db.exec(`
      SELECT rc.*, c.name as client_name, c.logo_path as client_logo,
             c.primary_color, c.secondary_color, c.simplifi_org_id,
             b.name as brand_name, b.logo_path as brand_logo
      FROM report_configs rc
      JOIN clients c ON rc.client_id = c.id
      JOIN brands b ON c.brand_id = b.id
      WHERE rc.id = ?
    `, [id]);
    return getOne(result);
  }

  createReportConfig(clientId, name, description, campaignIds, metricsConfig, layoutConfig) {
    const id = uuidv4();
    db.run(`
      INSERT INTO report_configs (id, client_id, name, description, campaign_ids, metrics_config, layout_config)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, clientId, name, description, JSON.stringify(campaignIds), JSON.stringify(metricsConfig), JSON.stringify(layoutConfig)]);
    saveDatabase();
    return this.getReportConfigById(id);
  }

  // Report Links
  createReportLink(reportConfigId, expiresAt = null) {
    const id = uuidv4();
    const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    db.run(`
      INSERT INTO report_links (id, token, report_config_id, expires_at)
      VALUES (?, ?, ?, ?)
    `, [id, token, reportConfigId, expiresAt]);
    saveDatabase();
    return { id, token, reportConfigId, expiresAt };
  }

  getReportLinkByToken(token) {
    const result = db.exec(`
      SELECT rl.*, rc.client_id, rc.name as report_name, rc.campaign_ids,
             rc.metrics_config, rc.layout_config,
             c.name as client_name, c.logo_path as client_logo,
             c.primary_color, c.secondary_color, c.simplifi_org_id,
             b.name as brand_name, b.logo_path as brand_logo
      FROM report_links rl
      JOIN report_configs rc ON rl.report_config_id = rc.id
      JOIN clients c ON rc.client_id = c.id
      JOIN brands b ON c.brand_id = b.id
      WHERE rl.token = ? AND rl.is_active = 1
    `, [token]);
    return getOne(result);
  }

  // Stats Cache
  getCachedStats(cacheKey) {
    const result = db.exec(`
      SELECT data FROM stats_cache 
      WHERE cache_key = ? AND expires_at > datetime('now')
    `, [cacheKey]);
    const row = getOne(result);
    return row ? JSON.parse(row.data) : null;
  }

  setCachedStats(cacheKey, data, ttlMinutes = 15) {
    const id = uuidv4();
    // Delete existing cache entry if exists
    db.run("DELETE FROM stats_cache WHERE cache_key = ?", [cacheKey]);
    db.run(`
      INSERT INTO stats_cache (id, cache_key, data, expires_at)
      VALUES (?, ?, ?, datetime('now', '+' || ? || ' minutes'))
    `, [id, cacheKey, JSON.stringify(data), ttlMinutes]);
    saveDatabase();
  }

  cleanExpiredCache() {
    db.run("DELETE FROM stats_cache WHERE expires_at < datetime('now')");
    saveDatabase();
  }

  // ============================================
  // INTERNAL NOTES
  // ============================================
  
  // Get all notes for a client
  getNotesByClient(clientId) {
    const result = db.exec(`
      SELECT * FROM internal_notes 
      WHERE client_id = ? 
      ORDER BY is_pinned DESC, created_at DESC
    `, [clientId]);
    return getAll(result);
  }

  // Get notes for a specific campaign
  getNotesByCampaign(clientId, campaignId) {
    const result = db.exec(`
      SELECT * FROM internal_notes 
      WHERE client_id = ? AND (campaign_id = ? OR campaign_id IS NULL)
      ORDER BY is_pinned DESC, created_at DESC
    `, [clientId, campaignId]);
    return getAll(result);
  }

  // Create a new note
  createNote(clientId, userId, userName, note, options = {}) {
    const id = uuidv4();
    const { campaignId = null, noteType = 'general', isPinned = false } = options;
    
    db.run(`
      INSERT INTO internal_notes (id, client_id, campaign_id, user_id, user_name, note, note_type, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, clientId, campaignId, userId, userName, note, noteType, isPinned ? 1 : 0]);
    
    saveDatabase();
    
    const result = db.exec("SELECT * FROM internal_notes WHERE id = ?", [id]);
    return getOne(result);
  }

  // Update a note
  updateNote(noteId, updates) {
    const { note, noteType, isPinned } = updates;
    const setClauses = [];
    const params = [];
    
    if (note !== undefined) {
      setClauses.push('note = ?');
      params.push(note);
    }
    if (noteType !== undefined) {
      setClauses.push('note_type = ?');
      params.push(noteType);
    }
    if (isPinned !== undefined) {
      setClauses.push('is_pinned = ?');
      params.push(isPinned ? 1 : 0);
    }
    
    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')");
      params.push(noteId);
      
      db.run(`UPDATE internal_notes SET ${setClauses.join(', ')} WHERE id = ?`, params);
      saveDatabase();
    }
    
    const result = db.exec("SELECT * FROM internal_notes WHERE id = ?", [noteId]);
    return getOne(result);
  }

  // Delete a note
  deleteNote(noteId) {
    db.run("DELETE FROM internal_notes WHERE id = ?", [noteId]);
    saveDatabase();
    return true;
  }

  // Toggle pin status
  toggleNotePin(noteId) {
    db.run("UPDATE internal_notes SET is_pinned = NOT is_pinned, updated_at = datetime('now') WHERE id = ?", [noteId]);
    saveDatabase();
    const result = db.exec("SELECT * FROM internal_notes WHERE id = ?", [noteId]);
    return getOne(result);
  }

  // ============================================
  // WEBHOOK NOTIFICATION METHODS
  // ============================================

  // Store a webhook notification
  storeWebhookNotification(data) {
    const id = uuidv4();
    db.run(`
      INSERT INTO webhook_notifications (id, report_id, schedule_id, snapshot_id, download_link, filename, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, data.reportId, data.scheduleId, data.snapshotId, data.downloadLink, data.filename, data.receivedAt]);
    saveDatabase();
    return { id, ...data };
  }

  // Get pending webhook notifications
  getPendingWebhookNotifications() {
    const result = db.exec("SELECT * FROM webhook_notifications WHERE status = 'pending' ORDER BY received_at ASC");
    return getAll(result);
  }

  // Update webhook notification status
  updateWebhookNotificationStatus(id, status, data = null) {
    const params = [status];
    let sql = "UPDATE webhook_notifications SET status = ?";
    
    if (data) {
      sql += ", data = ?";
      params.push(JSON.stringify(data));
    }
    
    if (status === 'downloaded' || status === 'processed') {
      sql += ", processed_at = datetime('now')";
    }
    
    sql += " WHERE id = ?";
    params.push(id);
    
    db.run(sql, params);
    saveDatabase();
  }

  // ============================================
  // REPORT MODEL METHODS
  // ============================================

  // Store a report model reference
  storeReportModel(clientId, orgId, simplifiReportId, templateId, title, category = null, filters = null) {
    const id = uuidv4();
    db.run(`
      INSERT INTO report_models (id, client_id, simplifi_org_id, simplifi_report_id, template_id, title, category, filters)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, clientId, orgId, simplifiReportId, templateId, title, category, filters ? JSON.stringify(filters) : null]);
    saveDatabase();
    
    const result = db.exec("SELECT * FROM report_models WHERE id = ?", [id]);
    const model = getOne(result);
    if (model && model.filters) {
      model.filters = JSON.parse(model.filters);
    }
    return model;
  }

  // Get report models for a client
  getReportModelsByClient(clientId) {
    const result = db.exec("SELECT * FROM report_models WHERE client_id = ? ORDER BY created_at DESC", [clientId]);
    const models = getAll(result);
    return models.map(m => ({
      ...m,
      filters: m.filters ? JSON.parse(m.filters) : null
    }));
  }

  // Get report model by Simpli.fi report ID
  getReportModelBySimplifiId(simplifiReportId) {
    const result = db.exec("SELECT * FROM report_models WHERE simplifi_report_id = ?", [simplifiReportId]);
    const model = getOne(result);
    if (model && model.filters) {
      model.filters = JSON.parse(model.filters);
    }
    return model;
  }

  // Delete a report model
  deleteReportModel(id) {
    db.run("DELETE FROM report_models WHERE id = ?", [id]);
    saveDatabase();
    return true;
  }
}

function getDatabase() {
  return db;
}

module.exports = { initializeDatabase, seedInitialData, DatabaseHelper, getDatabase, DB_PATH };
