/**
 * Database Module - PostgreSQL with Caching Tables
 * Supports both UUID and TEXT client IDs (auto-detected)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Don't recreate existing tables - they may have different schema
    // Just create the caching tables
    
    // Check if clients table exists to get the ID type
    const clientsCheck = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'id'
    `);
    
    let idType = 'TEXT';
    if (clientsCheck.rows.length > 0) {
      const dt = clientsCheck.rows[0].data_type;
      if (dt === 'uuid') idType = 'UUID';
      console.log(`[DB] clients.id type detected: ${dt} -> using ${idType}`);
    }

    // ============================================
    // CACHING TABLES
    // ============================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_campaigns (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        campaign_name TEXT,
        status TEXT,
        start_date DATE,
        end_date DATE,
        budget DECIMAL(12,2),
        campaign_type TEXT,
        campaign_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id)
      );
      CREATE INDEX IF NOT EXISTS idx_cached_campaigns_client ON cached_campaigns(client_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_campaign_stats (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        stat_date DATE NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        cpm DECIMAL(10,4) DEFAULT 0,
        cpc DECIMAL(10,4) DEFAULT 0,
        total_spend DECIMAL(12,4) DEFAULT 0,
        vcr DECIMAL(10,6) DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        video_views INTEGER DEFAULT 0,
        raw_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, stat_date)
      );
      CREATE INDEX IF NOT EXISTS idx_campaign_stats_lookup ON cached_campaign_stats(client_id, campaign_id, stat_date);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_ads (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        ad_id INTEGER NOT NULL,
        ad_name TEXT,
        status TEXT,
        ad_type TEXT,
        preview_url TEXT,
        ad_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, ad_id)
      );
      CREATE INDEX IF NOT EXISTS idx_cached_ads_campaign ON cached_ads(client_id, campaign_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_ad_stats (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        ad_id INTEGER NOT NULL,
        stat_date DATE NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        cpm DECIMAL(10,4) DEFAULT 0,
        video_views INTEGER DEFAULT 0,
        raw_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, ad_id, stat_date)
      );
      CREATE INDEX IF NOT EXISTS idx_ad_stats_lookup ON cached_ad_stats(client_id, campaign_id, ad_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_keywords (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        max_bid DECIMAL(10,4),
        keyword_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, keyword)
      );
      CREATE INDEX IF NOT EXISTS idx_keywords_campaign ON cached_keywords(client_id, campaign_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_keyword_stats (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        stat_date DATE,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_geo_fences (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        geo_fence_id INTEGER NOT NULL,
        geo_fence_name TEXT,
        geo_fence_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, geo_fence_id)
      );
      CREATE INDEX IF NOT EXISTS idx_geo_fences_campaign ON cached_geo_fences(client_id, campaign_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_geo_fence_stats (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        geo_fence_id INTEGER NOT NULL,
        stat_date DATE,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_location_stats (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        city TEXT,
        metro TEXT,
        region TEXT,
        country TEXT,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_location_stats_campaign ON cached_location_stats(client_id, campaign_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_device_stats (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        device_type TEXT NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_viewability (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        viewability_rate DECIMAL(10,6),
        measured_rate DECIMAL(10,6),
        viewable_impressions INTEGER DEFAULT 0,
        measured_impressions INTEGER DEFAULT 0,
        raw_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_conversions (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        campaign_id INTEGER NOT NULL,
        conversion_type TEXT,
        conversions INTEGER DEFAULT 0,
        conversion_value DECIMAL(12,4) DEFAULT 0,
        raw_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL UNIQUE,
        last_full_sync TIMESTAMP,
        last_incremental_sync TIMESTAMP,
        sync_in_progress BOOLEAN DEFAULT FALSE,
        last_error TEXT,
        campaigns_synced INTEGER DEFAULT 0,
        stats_synced INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('[DB] Database initialized successfully');
  } finally {
    client.release();
  }
}

// ============================================
// DATABASE HELPER CLASS
// ============================================

class DatabaseHelper {
  // ==========================================
  // USER METHODS
  // ==========================================
  
  async getUserByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }
  
  async getUserById(id) {
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }
  
  async getAllUsers() {
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  }
  
  async createUser(emailOrData, password, name, role) {
    // Support both object and separate parameters
    let email, pwd, userName, userRole;
    if (typeof emailOrData === 'object') {
      email = emailOrData.email;
      pwd = emailOrData.password;
      userName = emailOrData.name;
      userRole = emailOrData.role || 'user';
    } else {
      email = emailOrData;
      pwd = password;
      userName = name;
      userRole = role || 'user';
    }
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, pwd, userName, userRole]
    );
    return result.rows[0];
  }
  
  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    
    if (updates.name) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.email) { fields.push(`email = $${i++}`); values.push(updates.email); }
    if (updates.role) { fields.push(`role = $${i++}`); values.push(updates.role); }
    if (updates.password) { fields.push(`password_hash = $${i++}`); values.push(updates.password); }
    
    if (fields.length === 0) return this.getUserById(id);
    
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, email, name, role`,
      values
    );
    return result.rows[0];
  }
  
  async deleteUser(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  // ==========================================
  // BRAND METHODS
  // ==========================================
  
  async getAllBrands() {
    const result = await pool.query('SELECT * FROM brands ORDER BY name');
    return result.rows;
  }
  
  async createBrand(nameOrData, logoUrl, primaryColor) {
    // Support both object and separate parameters
    let name, logo, color;
    if (typeof nameOrData === 'object') {
      name = nameOrData.name;
      logo = nameOrData.logo_url || nameOrData.logoUrl;
      color = nameOrData.primary_color || nameOrData.primaryColor || '#6366f1';
    } else {
      name = nameOrData;
      logo = logoUrl;
      color = primaryColor || '#6366f1';
    }
    
    const result = await pool.query(
      'INSERT INTO brands (name, primary_color) VALUES ($1, $2) RETURNING *',
      [name, color]
    );
    return result.rows[0];
  }

  // ==========================================
  // CLIENT METHODS
  // ==========================================
  
  async getAllClients() {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      ORDER BY c.name
    `);
    return result.rows;
  }
  
  async getClientById(id) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0];
  }
  
  async getClientBySlug(slug) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.slug = $1
    `, [slug]);
    return result.rows[0];
  }
  
  async getClientByToken(token) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.public_token = $1
    `, [token]);
    return result.rows[0];
  }
  
  async getClientByOrgId(orgId) {
    const result = await pool.query('SELECT * FROM clients WHERE simplifi_org_id = $1', [orgId]);
    return result.rows[0];
  }
  
  async getClientsForUser(userId) {
    const result = await pool.query(`
      SELECT * FROM advertising_clients
      WHERE assigned_to = $1
      ORDER BY business_name
    `, [userId]);
    return result.rows;
  }
  
  async createClient(data) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const token = data.public_token || require('crypto').randomBytes(16).toString('hex');
    
    const result = await pool.query(`
      INSERT INTO clients (name, slug, brand_id, simplifi_org_id, public_token, logo_path, primary_color, secondary_color, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.name,
      slug,
      data.brand_id || null,
      data.simplifi_org_id || null,
      token,
      data.logo_path || null,
      data.primary_color || '#1e3a8a',
      data.secondary_color || '#3b82f6',
      data.status || 'active'
    ]);
    return result.rows[0];
  }
  
  async updateClient(id, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    
    const allowedFields = ['name', 'slug', 'brand_id', 'simplifi_org_id', 'public_token', 
                          'logo_path', 'primary_color', 'secondary_color', 'status',
                          'date_range_start', 'date_range_end'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${i++}`);
        values.push(updates[field]);
      }
    }
    
    if (fields.length === 0) return this.getClientById(id);
    
    values.push(id);
    const result = await pool.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }
  
  async deleteClient(id) {
    // Delete related data first
    await pool.query('DELETE FROM client_assignments WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM client_notes WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM cached_campaigns WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM cached_campaign_stats WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM cached_ads WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM cached_ad_stats WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM sync_status WHERE client_id = $1', [id]);
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  }

  // ==========================================
  // CLIENT ASSIGNMENT METHODS
  // Uses advertising_clients.assigned_to column
  // ==========================================
  
  async getClientAssignments(clientId) {
    // Get the user assigned to this client
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, u.role
      FROM users u
      JOIN advertising_clients ac ON u.id = ac.assigned_to
      WHERE ac.id = $1
    `, [clientId]);
    return result.rows;
  }

  async getAllClientAssignments() {
    const result = await pool.query(`
      SELECT 
        ac.id as client_id,
        ac.business_name as client_name,
        ac.assigned_to as user_id,
        u.name as user_name, 
        u.email as user_email
      FROM advertising_clients ac
      JOIN users u ON ac.assigned_to = u.id
      WHERE ac.assigned_to IS NOT NULL
    `);
    return result.rows;
  }
  
  async assignUserToClient(clientId, userId) {
    await pool.query(
      'UPDATE advertising_clients SET assigned_to = $2 WHERE id = $1',
      [clientId, userId]
    );
  }
  
  async removeUserFromClient(clientId, userId) {
    await pool.query(
      'UPDATE advertising_clients SET assigned_to = NULL WHERE id = $1 AND assigned_to = $2',
      [clientId, userId]
    );
  }

  async userHasAccessToClient(userId, clientId) {
    const result = await pool.query(
      'SELECT 1 FROM advertising_clients WHERE id = $2 AND assigned_to = $1',
      [userId, clientId]
    );
    return result.rows.length > 0;
  }

  // ==========================================
  // ALIAS METHODS (for server.js compatibility)
  // ==========================================
  
  async getClientsByUserId(userId) {
    return this.getClientsForUser(userId);
  }

  async assignClientToUser(clientId, userId) {
    return this.assignUserToClient(clientId, userId);
  }

  async unassignClientFromUser(clientId, userId) {
    return this.removeUserFromClient(clientId, userId);
  }

  async getUsersByClientId(clientId) {
    return this.getClientAssignments(clientId);
  }

  // ==========================================
  // CLIENT NOTES METHODS
  // ==========================================
  
  async getClientNotes(clientId) {
    const result = await pool.query(`
      SELECT n.*, u.name as user_name
      FROM client_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.client_id = $1
      ORDER BY n.is_pinned DESC, n.created_at DESC
    `, [clientId]);
    return result.rows;
  }
  
  async createNote(clientIdOrData, userId, content) {
    // Support both object and separate parameters
    let clientId, uid, noteContent;
    if (typeof clientIdOrData === 'object') {
      clientId = clientIdOrData.client_id;
      uid = clientIdOrData.user_id;
      noteContent = clientIdOrData.content;
    } else {
      clientId = clientIdOrData;
      uid = userId;
      noteContent = content;
    }
    
    const result = await pool.query(
      'INSERT INTO client_notes (client_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [clientId, uid, noteContent]
    );
    return result.rows[0];
  }
  
  async toggleNotePin(noteId) {
    const result = await pool.query(
      'UPDATE client_notes SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING *',
      [noteId]
    );
    return result.rows[0];
  }
  
  async deleteNote(noteId) {
    await pool.query('DELETE FROM client_notes WHERE id = $1', [noteId]);
  }

  // ==========================================
  // CACHE METHODS - CAMPAIGNS
  // ==========================================
  
  async getCachedCampaigns(clientId) {
    const result = await pool.query(
      'SELECT * FROM cached_campaigns WHERE client_id = $1 ORDER BY campaign_name',
      [clientId]
    );
    return result.rows;
  }
  
  async upsertCachedCampaign(clientId, campaignId, data) {
    await pool.query(`
      INSERT INTO cached_campaigns (client_id, campaign_id, campaign_name, status, start_date, end_date, budget, campaign_type, campaign_data, last_synced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (client_id, campaign_id) DO UPDATE SET
        campaign_name = EXCLUDED.campaign_name,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        budget = EXCLUDED.budget,
        campaign_type = EXCLUDED.campaign_type,
        campaign_data = EXCLUDED.campaign_data,
        last_synced = NOW()
    `, [clientId, campaignId, data.name, data.status, data.start_date, data.end_date, data.budget, data.campaign_type, JSON.stringify(data)]);
  }

  // ==========================================
  // CACHE METHODS - CAMPAIGN STATS
  // ==========================================
  
  async getCachedCampaignStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_campaign_stats 
      WHERE client_id = $1 AND campaign_id = $2 AND stat_date >= $3 AND stat_date <= $4
      ORDER BY stat_date
    `, [clientId, campaignId, startDate, endDate]);
    return result.rows;
  }
  
  async upsertCachedStats(clientId, campaignId, statDate, data) {
    await pool.query(`
      INSERT INTO cached_campaign_stats (client_id, campaign_id, stat_date, impressions, clicks, ctr, cpm, cpc, total_spend, vcr, conversions, video_views, raw_data, last_synced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (client_id, campaign_id, stat_date) DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        ctr = EXCLUDED.ctr,
        cpm = EXCLUDED.cpm,
        cpc = EXCLUDED.cpc,
        total_spend = EXCLUDED.total_spend,
        vcr = EXCLUDED.vcr,
        conversions = EXCLUDED.conversions,
        video_views = EXCLUDED.video_views,
        raw_data = EXCLUDED.raw_data,
        last_synced = NOW()
    `, [
      clientId, campaignId, statDate,
      data.impressions || 0,
      data.clicks || 0,
      data.ctr || 0,
      data.cpm || 0,
      data.cpc || 0,
      data.total_spend || 0,
      data.vcr || 0,
      data.conversions || 0,
      data.video_views || 0,
      JSON.stringify(data)
    ]);
  }

  async getCachedDailyStats(clientId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_campaign_stats 
      WHERE client_id = $1 AND stat_date >= $2 AND stat_date <= $3
      ORDER BY stat_date
    `, [clientId, startDate, endDate]);
    return result.rows;
  }

  // ==========================================
  // CACHE METHODS - ADS
  // ==========================================
  
  async getCachedAds(clientId, campaignId) {
    const result = await pool.query(
      'SELECT * FROM cached_ads WHERE client_id = $1 AND campaign_id = $2',
      [clientId, campaignId]
    );
    return result.rows;
  }
  
  async upsertCachedAd(clientId, campaignId, adId, data) {
    await pool.query(`
      INSERT INTO cached_ads (client_id, campaign_id, ad_id, ad_name, status, ad_type, preview_url, ad_data, last_synced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (client_id, campaign_id, ad_id) DO UPDATE SET
        ad_name = EXCLUDED.ad_name,
        status = EXCLUDED.status,
        ad_type = EXCLUDED.ad_type,
        preview_url = EXCLUDED.preview_url,
        ad_data = EXCLUDED.ad_data,
        last_synced = NOW()
    `, [clientId, campaignId, adId, data.name, data.status, data.ad_type, data.primary_creative_url, JSON.stringify(data)]);
  }

  // ==========================================
  // CACHE METHODS - AD STATS
  // ==========================================
  
  async getCachedAdStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT ad_id, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(spend) as spend
      FROM cached_ad_stats 
      WHERE client_id = $1 AND campaign_id = $2 AND stat_date >= $3 AND stat_date <= $4
      GROUP BY ad_id
    `, [clientId, campaignId, startDate, endDate]);
    return result.rows;
  }
  
  async upsertCachedAdStats(clientId, campaignId, adId, statDate, data) {
    await pool.query(`
      INSERT INTO cached_ad_stats (client_id, campaign_id, ad_id, stat_date, impressions, clicks, spend, ctr, cpm, video_views, raw_data, last_synced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (client_id, campaign_id, ad_id, stat_date) DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        spend = EXCLUDED.spend,
        ctr = EXCLUDED.ctr,
        cpm = EXCLUDED.cpm,
        video_views = EXCLUDED.video_views,
        raw_data = EXCLUDED.raw_data,
        last_synced = NOW()
    `, [
      clientId, campaignId, adId, statDate,
      data.impressions || 0, data.clicks || 0, data.spend || data.total_spend || 0,
      data.ctr || 0, data.cpm || 0, data.video_views || 0,
      JSON.stringify(data)
    ]);
  }

  // ==========================================
  // SYNC STATUS METHODS
  // ==========================================
  
  async getSyncStatus(clientId) {
    const result = await pool.query('SELECT * FROM sync_status WHERE client_id = $1', [clientId]);
    return result.rows[0];
  }
  
  async getLastSyncTime(clientId) {
    const result = await pool.query(
      'SELECT GREATEST(last_full_sync, last_incremental_sync) as last_sync FROM sync_status WHERE client_id = $1',
      [clientId]
    );
    return result.rows[0]?.last_sync;
  }
  
  async updateSyncStatus(clientId, updates) {
    const existing = await this.getSyncStatus(clientId);
    
    if (existing) {
      const fields = [];
      const values = [];
      let i = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = $${i++}`);
        values.push(value);
      }
      fields.push(`updated_at = NOW()`);
      values.push(clientId);
      
      await pool.query(`UPDATE sync_status SET ${fields.join(', ')} WHERE client_id = $${i}`, values);
    } else {
      await pool.query(
        `INSERT INTO sync_status (client_id, ${Object.keys(updates).join(', ')}) VALUES ($1, ${Object.keys(updates).map((_, i) => `$${i + 2}`).join(', ')})`,
        [clientId, ...Object.values(updates)]
      );
    }
  }

  // ==========================================
  // AGGREGATED CACHE DATA METHOD
  // ==========================================
  
  async getAllCachedDataForCampaign(clientId, campaignId, startDate, endDate) {
    const [
      campaignResult,
      statsResult,
      adsResult,
      adStatsResult,
      lastSyncResult
    ] = await Promise.all([
      pool.query('SELECT * FROM cached_campaigns WHERE client_id = $1 AND campaign_id = $2', [clientId, campaignId]),
      pool.query('SELECT * FROM cached_campaign_stats WHERE client_id = $1 AND campaign_id = $2 AND stat_date >= $3 AND stat_date <= $4 ORDER BY stat_date', [clientId, campaignId, startDate, endDate]),
      pool.query('SELECT * FROM cached_ads WHERE client_id = $1 AND campaign_id = $2', [clientId, campaignId]),
      pool.query('SELECT ad_id, SUM(impressions)::int as impressions, SUM(clicks)::int as clicks, SUM(spend)::numeric as spend FROM cached_ad_stats WHERE client_id = $1 AND campaign_id = $2 AND stat_date >= $3 AND stat_date <= $4 GROUP BY ad_id', [clientId, campaignId, startDate, endDate]),
      pool.query('SELECT GREATEST(last_full_sync, last_incremental_sync) as last_sync FROM sync_status WHERE client_id = $1', [clientId])
    ]);

    return {
      campaign: campaignResult.rows[0] || null,
      stats: statsResult.rows,
      ads: adsResult.rows,
      adStats: adStatsResult.rows,
      keywords: [],
      keywordStats: [],
      geoFences: [],
      geoFenceStats: [],
      locationStats: [],
      deviceStats: [],
      viewability: null,
      conversions: [],
      lastSynced: lastSyncResult.rows[0]?.last_sync
    };
  }

  // ==========================================
  // BATCH CACHE METHODS (for server.js compatibility)
  // ==========================================

  async cacheStatsBatch(clientId, stats) {
    if (!stats || stats.length === 0) return;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        const statDate = stat.stat_date || stat.date;
        const campaignId = stat.campaign_id;
        
        if (!statDate || !campaignId) continue;
        
        await client.query(`
          INSERT INTO cached_campaign_stats 
          (client_id, campaign_id, stat_date, impressions, clicks, ctr, cpm, cpc, total_spend, vcr, conversions, video_views, raw_data, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (client_id, campaign_id, stat_date) DO UPDATE SET
            impressions = EXCLUDED.impressions,
            clicks = EXCLUDED.clicks,
            ctr = EXCLUDED.ctr,
            cpm = EXCLUDED.cpm,
            cpc = EXCLUDED.cpc,
            total_spend = EXCLUDED.total_spend,
            vcr = EXCLUDED.vcr,
            conversions = EXCLUDED.conversions,
            video_views = EXCLUDED.video_views,
            raw_data = EXCLUDED.raw_data,
            last_synced = NOW()
        `, [
          clientId,
          campaignId,
          statDate,
          stat.impressions || 0,
          stat.clicks || 0,
          stat.ctr || 0,
          stat.cpm || 0,
          stat.cpc || 0,
          stat.total_spend || 0,
          stat.vcr || 0,
          stat.conversions || 0,
          stat.video_views || 0,
          JSON.stringify(stat)
        ]);
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateFetchLog(clientId, lastFetchDate, status) {
    await pool.query(`
      INSERT INTO sync_status (client_id, last_incremental_sync, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (client_id) DO UPDATE SET
        last_incremental_sync = $2,
        updated_at = NOW()
    `, [clientId, lastFetchDate]);
  }

  async getLastFetchDate(clientId) {
    const result = await pool.query(
      'SELECT last_incremental_sync FROM sync_status WHERE client_id = $1',
      [clientId]
    );
    return result.rows[0]?.last_incremental_sync;
  }

  async getCachedStats(clientId, startDate, endDate, byCampaign = false) {
    const result = await pool.query(`
      SELECT * FROM cached_campaign_stats 
      WHERE client_id = $1 AND stat_date >= $2 AND stat_date <= $3
      ORDER BY stat_date
    `, [clientId, startDate, endDate]);
    return result.rows;
  }
}

// ============================================
// SEED INITIAL DATA
// ============================================

async function seedInitialData() {
  const helper = new DatabaseHelper();
  
  try {
    const existingAdmin = await helper.getUserByEmail('admin@example.com');
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      // Use direct query since column name might differ
      await pool.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        ['admin@example.com', hashedPassword, 'Admin User', 'admin']
      );
      console.log('✓ Created default admin user');
    }
  } catch (e) {
    console.log('Note: Could not seed initial data:', e.message);
  }
}

module.exports = {
  pool,
  initializeDatabase,
  seedInitialData,
  DatabaseHelper
};
