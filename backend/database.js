/**
 * Enhanced Database Helper with Full Caching Support
 * 
 * This module manages PostgreSQL storage for:
 * - User/Client/Brand data (existing)
 * - Cached Simpli.fi campaign data
 * - Cached stats (campaign, ad, keyword, geo-fence, location, device)
 * - Sync status tracking
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ============================================
// DATABASE INITIALIZATION
// ============================================

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // NOTE: We assume existing tables (users, clients, brands, client_assignments, client_notes) 
    // already exist with the correct schema. This migration ONLY creates new cache tables.
    
    // Check if clients table exists to determine ID type
    const clientsCheck = await client.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'id'
    `);
    
    // Determine the ID type used by existing clients table
    let clientIdType = 'UUID'; // default
    if (clientsCheck.rows.length > 0) {
      const dataType = clientsCheck.rows[0].data_type;
      if (dataType === 'text' || dataType === 'character varying') {
        clientIdType = 'TEXT';
      }
      console.log(`[DB] Existing clients.id type: ${dataType} -> using ${clientIdType} for foreign keys`);
    }

    // ============================================
    // NEW CACHING TABLES (adapt to existing schema)
    // ============================================

    // Cached campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_campaigns (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
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

    // Cached campaign stats (daily granularity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_campaign_stats (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
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

    // Cached ads
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_ads (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
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

    // Cached ad stats (daily granularity)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_ad_stats (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
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

    // Cached keywords
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_keywords (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        max_bid DECIMAL(10,4),
        keyword_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, keyword)
      );
      CREATE INDEX IF NOT EXISTS idx_keywords_campaign ON cached_keywords(client_id, campaign_id);
    `);

    // Cached keyword stats
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_keyword_stats (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        keyword TEXT NOT NULL,
        stat_date DATE,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, keyword, stat_date)
      );
    `);

    // Cached geo-fences
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_geo_fences (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        geo_fence_id INTEGER NOT NULL,
        geo_fence_name TEXT,
        geo_fence_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, geo_fence_id)
      );
      CREATE INDEX IF NOT EXISTS idx_geo_fences_campaign ON cached_geo_fences(client_id, campaign_id);
    `);

    // Cached geo-fence stats
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_geo_fence_stats (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        geo_fence_id INTEGER NOT NULL,
        stat_date DATE,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, geo_fence_id, stat_date)
      );
    `);

    // Cached location stats
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_location_stats (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        city TEXT,
        metro TEXT,
        region TEXT,
        country TEXT,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, city, metro, region, country)
      );
      CREATE INDEX IF NOT EXISTS idx_location_stats_campaign ON cached_location_stats(client_id, campaign_id);
    `);

    // Cached device stats
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_device_stats (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        device_type TEXT NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        spend DECIMAL(12,4) DEFAULT 0,
        ctr DECIMAL(10,6) DEFAULT 0,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, device_type)
      );
    `);

    // Cached viewability metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_viewability (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
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

    // Cached conversions
    await client.query(`
      CREATE TABLE IF NOT EXISTS cached_conversions (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL,
        campaign_id INTEGER NOT NULL,
        conversion_type TEXT,
        conversions INTEGER DEFAULT 0,
        conversion_value DECIMAL(12,4) DEFAULT 0,
        raw_data JSONB,
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, conversion_type)
      );
    `);

    // Sync status tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_status (
        id SERIAL PRIMARY KEY,
        client_id ${clientIdType} NOT NULL UNIQUE,
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

    console.log('[DB] Cache tables initialized successfully');
  } finally {
    client.release();
  }
}

// ============================================
// DATABASE HELPER CLASS
// ============================================

class DatabaseHelper {
  // ==========================================
  // EXISTING METHODS (users, clients, brands)
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
  
  async createUser(email, hashedPassword, name, role = 'user') {
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );
    return result.rows[0];
  }
  
  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.name) { fields.push(`name = $${paramCount++}`); values.push(updates.name); }
    if (updates.email) { fields.push(`email = $${paramCount++}`); values.push(updates.email); }
    if (updates.role) { fields.push(`role = $${paramCount++}`); values.push(updates.role); }
    if (updates.password) { fields.push(`password = $${paramCount++}`); values.push(updates.password); }
    
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, role`,
      values
    );
    return result.rows[0];
  }
  
  async deleteUser(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
  
  // Brands
  async getAllBrands() {
    const result = await pool.query('SELECT * FROM brands ORDER BY name');
    return result.rows;
  }
  
  async createBrand(name, logoUrl, primaryColor) {
    const result = await pool.query(
      'INSERT INTO brands (name, logo_url, primary_color) VALUES ($1, $2, $3) RETURNING *',
      [name, logoUrl, primaryColor]
    );
    return result.rows[0];
  }
  
  // Clients
  async getAllClients() {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_url as brand_logo, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      ORDER BY c.name
    `);
    return result.rows;
  }
  
  async getClientById(id) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_url as brand_logo, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0];
  }
  
  async getClientBySlug(slug) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_url as brand_logo, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.slug = $1
    `, [slug]);
    return result.rows[0];
  }
  
  async getClientByToken(token) {
    const result = await pool.query(`
      SELECT c.*, b.name as brand_name, b.logo_url as brand_logo, b.primary_color as brand_color
      FROM clients c
      LEFT JOIN brands b ON c.brand_id = b.id
      WHERE c.public_token = $1
    `, [token]);
    return result.rows[0];
  }
  
  async createClient(data) {
    const result = await pool.query(
      `INSERT INTO clients (name, slug, brand_id, simplifi_org_id, public_token, date_range_start, date_range_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.name, data.slug, data.brand_id, data.simplifi_org_id, data.public_token, data.date_range_start, data.date_range_end]
    );
    return result.rows[0];
  }
  
  async updateClient(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });
    
    values.push(id);
    const result = await pool.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }
  
  async deleteClient(id) {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  }
  
  // Client Assignments
  async getClientAssignments(clientId) {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role FROM users u
       JOIN client_assignments ca ON u.id = ca.user_id
       WHERE ca.client_id = $1`,
      [clientId]
    );
    return result.rows;
  }
  
  async assignUserToClient(clientId, userId) {
    await pool.query(
      'INSERT INTO client_assignments (client_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [clientId, userId]
    );
  }
  
  async removeUserFromClient(clientId, userId) {
    await pool.query(
      'DELETE FROM client_assignments WHERE client_id = $1 AND user_id = $2',
      [clientId, userId]
    );
  }
  
  async getClientsForUser(userId) {
    const result = await pool.query(
      `SELECT c.* FROM clients c
       JOIN client_assignments ca ON c.id = ca.client_id
       WHERE ca.user_id = $1`,
      [userId]
    );
    return result.rows;
  }
  
  // Client Notes
  async getClientNotes(clientId) {
    const result = await pool.query(
      `SELECT n.*, u.name as author_name FROM client_notes n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.client_id = $1
       ORDER BY n.is_pinned DESC, n.created_at DESC`,
      [clientId]
    );
    return result.rows;
  }
  
  async createNote(clientId, userId, content) {
    const result = await pool.query(
      'INSERT INTO client_notes (client_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [clientId, userId, content]
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
  // NEW CACHING METHODS
  // ==========================================

  // --- CAMPAIGNS ---
  async cacheCampaigns(clientId, campaigns) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const campaign of campaigns) {
        await client.query(`
          INSERT INTO cached_campaigns (client_id, campaign_id, campaign_name, status, start_date, end_date, budget, campaign_type, campaign_data, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (client_id, campaign_id) 
          DO UPDATE SET campaign_name = $3, status = $4, start_date = $5, end_date = $6, budget = $7, campaign_type = $8, campaign_data = $9, last_synced = NOW()
        `, [
          clientId,
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.start_date,
          campaign.end_date,
          campaign.bid_settings?.budget,
          campaign.campaign_type?.name,
          JSON.stringify(campaign)
        ]);
      }
      
      await client.query('COMMIT');
      return campaigns.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedCampaigns(clientId) {
    const result = await pool.query(
      'SELECT * FROM cached_campaigns WHERE client_id = $1 ORDER BY campaign_name',
      [clientId]
    );
    return result.rows;
  }

  async getCachedCampaign(clientId, campaignId) {
    const result = await pool.query(
      'SELECT * FROM cached_campaigns WHERE client_id = $1 AND campaign_id = $2',
      [clientId, campaignId]
    );
    return result.rows[0];
  }

  // --- CAMPAIGN STATS ---
  async cacheCampaignStats(clientId, campaignId, stats) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        await client.query(`
          INSERT INTO cached_campaign_stats 
          (client_id, campaign_id, stat_date, impressions, clicks, ctr, cpm, cpc, total_spend, vcr, conversions, raw_data, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (client_id, campaign_id, stat_date) 
          DO UPDATE SET impressions = $4, clicks = $5, ctr = $6, cpm = $7, cpc = $8, total_spend = $9, vcr = $10, conversions = $11, raw_data = $12, last_synced = NOW()
        `, [
          clientId,
          campaignId,
          stat.stat_date,
          stat.impressions || 0,
          stat.clicks || 0,
          stat.ctr || 0,
          stat.cpm || 0,
          stat.cpc || 0,
          stat.total_spend || 0,
          stat.vcr || 0,
          stat.weighted_actions || 0,
          JSON.stringify(stat)
        ]);
      }
      
      await client.query('COMMIT');
      return stats.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedCampaignStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_campaign_stats 
      WHERE client_id = $1 AND campaign_id = $2 AND stat_date >= $3 AND stat_date <= $4
      ORDER BY stat_date
    `, [clientId, campaignId, startDate, endDate]);
    return result.rows;
  }

  async getCachedDailyStats(clientId, startDate, endDate) {
    const result = await pool.query(`
      SELECT stat_date, 
             SUM(impressions) as impressions, 
             SUM(clicks) as clicks,
             SUM(total_spend) as total_spend,
             SUM(conversions) as conversions
      FROM cached_campaign_stats 
      WHERE client_id = $1 AND stat_date >= $2 AND stat_date <= $3
      GROUP BY stat_date
      ORDER BY stat_date
    `, [clientId, startDate, endDate]);
    return result.rows;
  }

  async getLastCachedStatsDate(clientId, campaignId) {
    const result = await pool.query(`
      SELECT MAX(stat_date) as last_date FROM cached_campaign_stats 
      WHERE client_id = $1 AND campaign_id = $2
    `, [clientId, campaignId]);
    return result.rows[0]?.last_date;
  }

  // --- ADS ---
  async cacheAds(clientId, campaignId, ads) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const ad of ads) {
        await client.query(`
          INSERT INTO cached_ads (client_id, campaign_id, ad_id, ad_name, status, ad_type, preview_url, ad_data, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (client_id, campaign_id, ad_id) 
          DO UPDATE SET ad_name = $4, status = $5, ad_type = $6, preview_url = $7, ad_data = $8, last_synced = NOW()
        `, [
          clientId,
          campaignId,
          ad.id,
          ad.name,
          ad.status,
          ad.ad_file_type?.name,
          ad.preview_tag,
          JSON.stringify(ad)
        ]);
      }
      
      await client.query('COMMIT');
      return ads.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedAds(clientId, campaignId) {
    const result = await pool.query(
      'SELECT * FROM cached_ads WHERE client_id = $1 AND campaign_id = $2',
      [clientId, campaignId]
    );
    return result.rows;
  }

  // --- AD STATS ---
  async cacheAdStats(clientId, campaignId, adId, stats) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        await client.query(`
          INSERT INTO cached_ad_stats (client_id, campaign_id, ad_id, stat_date, impressions, clicks, spend, ctr, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (client_id, campaign_id, ad_id, stat_date) 
          DO UPDATE SET impressions = $5, clicks = $6, spend = $7, ctr = $8, last_synced = NOW()
        `, [clientId, campaignId, adId, stat.stat_date, stat.impressions || 0, stat.clicks || 0, stat.spend || 0, stat.ctr || 0]);
      }
      
      await client.query('COMMIT');
      return stats.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedAdStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT ad_id, SUM(impressions) as impressions, SUM(clicks) as clicks, SUM(spend) as spend
      FROM cached_ad_stats 
      WHERE client_id = $1 AND campaign_id = $2 AND stat_date >= $3 AND stat_date <= $4
      GROUP BY ad_id
    `, [clientId, campaignId, startDate, endDate]);
    return result.rows;
  }

  // --- KEYWORDS ---
  async cacheKeywords(clientId, campaignId, keywords) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const kw of keywords) {
        await client.query(`
          INSERT INTO cached_keywords (client_id, campaign_id, keyword, max_bid, last_synced)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (client_id, campaign_id, keyword) 
          DO UPDATE SET max_bid = $4, last_synced = NOW()
        `, [clientId, campaignId, kw.keyword, kw.max_bid]);
      }
      
      await client.query('COMMIT');
      return keywords.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedKeywords(clientId, campaignId) {
    const result = await pool.query(
      'SELECT * FROM cached_keywords WHERE client_id = $1 AND campaign_id = $2 ORDER BY keyword',
      [clientId, campaignId]
    );
    return result.rows;
  }

  // --- KEYWORD STATS ---
  async cacheKeywordStats(clientId, campaignId, startDate, endDate, stats) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        await client.query(`
          INSERT INTO cached_keyword_stats (client_id, campaign_id, keyword, date_range_start, date_range_end, impressions, clicks, ctr, spend, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (client_id, campaign_id, keyword, date_range_start, date_range_end) 
          DO UPDATE SET impressions = $6, clicks = $7, ctr = $8, spend = $9, last_synced = NOW()
        `, [clientId, campaignId, stat.keyword, startDate, endDate, stat.impressions || 0, stat.clicks || 0, stat.ctr || 0, stat.spend || 0]);
      }
      
      await client.query('COMMIT');
      return stats.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedKeywordStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_keyword_stats 
      WHERE client_id = $1 AND campaign_id = $2 
        AND date_range_start <= $3 AND date_range_end >= $4
      ORDER BY impressions DESC
    `, [clientId, campaignId, endDate, startDate]);
    return result.rows;
  }

  // --- GEO-FENCES ---
  async cacheGeoFences(clientId, campaignId, geoFences) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const gf of geoFences) {
        await client.query(`
          INSERT INTO cached_geo_fences (client_id, campaign_id, geo_fence_id, geo_fence_name, geo_fence_data, last_synced)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (client_id, campaign_id, geo_fence_id) 
          DO UPDATE SET geo_fence_name = $4, geo_fence_data = $5, last_synced = NOW()
        `, [clientId, campaignId, gf.id, gf.name, JSON.stringify(gf)]);
      }
      
      await client.query('COMMIT');
      return geoFences.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedGeoFences(clientId, campaignId) {
    const result = await pool.query(
      'SELECT * FROM cached_geo_fences WHERE client_id = $1 AND campaign_id = $2',
      [clientId, campaignId]
    );
    return result.rows;
  }

  // --- GEO-FENCE STATS ---
  async cacheGeoFenceStats(clientId, campaignId, startDate, endDate, stats) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        await client.query(`
          INSERT INTO cached_geo_fence_stats (client_id, campaign_id, geo_fence_id, date_range_start, date_range_end, impressions, clicks, conversions, spend, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (client_id, campaign_id, geo_fence_id, date_range_start, date_range_end) 
          DO UPDATE SET impressions = $6, clicks = $7, conversions = $8, spend = $9, last_synced = NOW()
        `, [clientId, campaignId, stat.geoFenceId, startDate, endDate, stat.impressions || 0, stat.clicks || 0, stat.conversions || 0, stat.spend || 0]);
      }
      
      await client.query('COMMIT');
      return stats.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedGeoFenceStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_geo_fence_stats 
      WHERE client_id = $1 AND campaign_id = $2 
        AND date_range_start <= $3 AND date_range_end >= $4
    `, [clientId, campaignId, endDate, startDate]);
    return result.rows;
  }

  // --- LOCATION STATS ---
  async cacheLocationStats(clientId, campaignId, startDate, endDate, stats) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        await client.query(`
          INSERT INTO cached_location_stats (client_id, campaign_id, city, metro, region, country, date_range_start, date_range_end, impressions, clicks, spend, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (client_id, campaign_id, city, metro, region, date_range_start, date_range_end) 
          DO UPDATE SET impressions = $9, clicks = $10, spend = $11, last_synced = NOW()
        `, [clientId, campaignId, stat.city, stat.metro, stat.region, stat.country, startDate, endDate, stat.impressions || 0, stat.clicks || 0, stat.spend || 0]);
      }
      
      await client.query('COMMIT');
      return stats.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedLocationStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_location_stats 
      WHERE client_id = $1 AND campaign_id = $2 
        AND date_range_start <= $3 AND date_range_end >= $4
      ORDER BY impressions DESC
    `, [clientId, campaignId, endDate, startDate]);
    return result.rows;
  }

  // --- DEVICE STATS ---
  async cacheDeviceStats(clientId, campaignId, startDate, endDate, stats) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const stat of stats) {
        await client.query(`
          INSERT INTO cached_device_stats (client_id, campaign_id, device_type, date_range_start, date_range_end, impressions, clicks, spend, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (client_id, campaign_id, device_type, date_range_start, date_range_end) 
          DO UPDATE SET impressions = $6, clicks = $7, spend = $8, last_synced = NOW()
        `, [clientId, campaignId, stat.deviceType, startDate, endDate, stat.impressions || 0, stat.clicks || 0, stat.spend || 0]);
      }
      
      await client.query('COMMIT');
      return stats.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedDeviceStats(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_device_stats 
      WHERE client_id = $1 AND campaign_id = $2 
        AND date_range_start <= $3 AND date_range_end >= $4
    `, [clientId, campaignId, endDate, startDate]);
    return result.rows;
  }

  // --- VIEWABILITY ---
  async cacheViewability(clientId, campaignId, startDate, endDate, data) {
    await pool.query(`
      INSERT INTO cached_viewability (client_id, campaign_id, date_range_start, date_range_end, viewability_rate, measured_impressions, viewable_impressions, avg_view_time, last_synced)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (client_id, campaign_id, date_range_start, date_range_end) 
      DO UPDATE SET viewability_rate = $5, measured_impressions = $6, viewable_impressions = $7, avg_view_time = $8, last_synced = NOW()
    `, [clientId, campaignId, startDate, endDate, data.viewabilityRate || 0, data.measuredImpressions || 0, data.viewableImpressions || 0, data.avgViewTime || 0]);
  }

  async getCachedViewability(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_viewability 
      WHERE client_id = $1 AND campaign_id = $2 
        AND date_range_start <= $3 AND date_range_end >= $4
    `, [clientId, campaignId, endDate, startDate]);
    return result.rows[0];
  }

  // --- CONVERSIONS ---
  async cacheConversions(clientId, campaignId, startDate, endDate, conversions) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const conv of conversions) {
        await client.query(`
          INSERT INTO cached_conversions (client_id, campaign_id, conversion_name, date_range_start, date_range_end, conversions, conversion_value, last_synced)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (client_id, campaign_id, conversion_name, date_range_start, date_range_end) 
          DO UPDATE SET conversions = $6, conversion_value = $7, last_synced = NOW()
        `, [clientId, campaignId, conv.name, startDate, endDate, conv.conversions || 0, conv.value || 0]);
      }
      
      await client.query('COMMIT');
      return conversions.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getCachedConversions(clientId, campaignId, startDate, endDate) {
    const result = await pool.query(`
      SELECT * FROM cached_conversions 
      WHERE client_id = $1 AND campaign_id = $2 
        AND date_range_start <= $3 AND date_range_end >= $4
    `, [clientId, campaignId, endDate, startDate]);
    return result.rows;
  }

  // --- SYNC STATUS ---
  async updateSyncStatus(clientId, syncType, campaignId, status, recordCount, error = null) {
    await pool.query(`
      INSERT INTO sync_status (client_id, sync_type, campaign_id, last_sync_start, last_sync_end, last_sync_status, records_synced, last_error)
      VALUES ($1, $2, $3, NOW(), NOW(), $4, $5, $6)
      ON CONFLICT (client_id, sync_type, campaign_id) 
      DO UPDATE SET last_sync_end = NOW(), last_sync_status = $4, records_synced = $5, last_error = $6
    `, [clientId, syncType, campaignId, status, recordCount, error]);
  }

  async getSyncStatus(clientId) {
    const result = await pool.query(
      'SELECT * FROM sync_status WHERE client_id = $1 ORDER BY last_sync_end DESC',
      [clientId]
    );
    return result.rows;
  }

  async getLastSyncTime(clientId, syncType = null) {
    const query = syncType
      ? 'SELECT MAX(last_sync_end) as last_sync FROM sync_status WHERE client_id = $1 AND sync_type = $2'
      : 'SELECT MAX(last_sync_end) as last_sync FROM sync_status WHERE client_id = $1';
    const params = syncType ? [clientId, syncType] : [clientId];
    const result = await pool.query(query, params);
    return result.rows[0]?.last_sync;
  }

  // --- AGGREGATED DATA FOR CAMPAIGN PAGE ---
  async getAllCachedDataForCampaign(clientId, campaignId, startDate, endDate) {
    const [
      campaign,
      stats,
      ads,
      adStats,
      keywords,
      keywordStats,
      geoFences,
      geoFenceStats,
      locationStats,
      deviceStats,
      viewability,
      conversions,
      syncStatus
    ] = await Promise.all([
      this.getCachedCampaign(clientId, campaignId),
      this.getCachedCampaignStats(clientId, campaignId, startDate, endDate),
      this.getCachedAds(clientId, campaignId),
      this.getCachedAdStats(clientId, campaignId, startDate, endDate),
      this.getCachedKeywords(clientId, campaignId),
      this.getCachedKeywordStats(clientId, campaignId, startDate, endDate),
      this.getCachedGeoFences(clientId, campaignId),
      this.getCachedGeoFenceStats(clientId, campaignId, startDate, endDate),
      this.getCachedLocationStats(clientId, campaignId, startDate, endDate),
      this.getCachedDeviceStats(clientId, campaignId, startDate, endDate),
      this.getCachedViewability(clientId, campaignId, startDate, endDate),
      this.getCachedConversions(clientId, campaignId, startDate, endDate),
      this.getSyncStatus(clientId)
    ]);

    return {
      campaign,
      stats,
      ads,
      adStats,
      keywords,
      keywordStats,
      geoFences,
      geoFenceStats,
      locationStats,
      deviceStats,
      viewability,
      conversions,
      lastSynced: syncStatus[0]?.last_sync_end
    };
  }
}

// Seed initial admin user
async function seedInitialData() {
  const bcrypt = require('bcryptjs');
  const helper = new DatabaseHelper();
  
  try {
    const existingAdmin = await helper.getUserByEmail('admin@example.com');
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await helper.createUser('admin@example.com', hashedPassword, 'Admin User', 'admin');
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
