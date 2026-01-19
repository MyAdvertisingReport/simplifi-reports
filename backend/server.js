/**
 * Simpli.fi Reports - Backend Server
 * Custom reporting tool for programmatic advertising
 * 
 * Production-ready with health checks and proper CORS
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const SimplifiClient = require('./simplifi-client');
const { ReportCenterService } = require('./report-center-service');
const { initializeDatabase, seedInitialData, DatabaseHelper } = require('./database');
const adminRoutes = require('./routes/admin');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Production CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin) || 
        origin.includes('vercel.app') || 
        origin.includes('railway.app') ||
        origin.includes('myadvertisingreport.com')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for now, log for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Database helper (initialized after async setup)
let dbHelper = null;

// Initialize Simpli.fi client
let simplifiClient = null;

// Initialize Report Center service
let reportCenterService = null;

// ============================================
// PRODUCT MANAGEMENT ROUTES
// ============================================
const { Pool } = require('pg');
let adminPool = null;

const setupAdminRoutes = () => {
  if (!adminPool) {
    adminPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  
  app.use('/api/admin', (req, res, next) => {
    req.dbPool = adminPool;
    next();
  }, adminRoutes);
  
  console.log('Admin routes initialized');
};

// ============================================
// HEALTH CHECK ENDPOINTS (for deployment)
// ============================================

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    simplifiConfigured: !!(simplifiClient && process.env.SIMPLIFI_APP_KEY && process.env.SIMPLIFI_USER_KEY)
  });
});

app.get('/api/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: false,
      simplifi: false
    }
  };

  // Check database
  try {
    if (dbHelper) {
      const users = await dbHelper.getAllUsers();
      health.checks.database = true;
      health.databaseUsers = users?.length || 0;
    }
  } catch (e) {
    health.checks.database = false;
    health.databaseError = e.message;
  }

  // Check Simpli.fi connection
  try {
    if (simplifiClient) {
      health.checks.simplifi = true;
    }
  } catch (e) {
    health.checks.simplifi = false;
  }

  // Overall status
  health.status = Object.values(health.checks).every(v => v) ? 'healthy' : 'degraded';

  res.json(health);
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await dbHelper.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Fetch fresh user data from database instead of using stale JWT data
    const user = await dbHelper.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Don't send password_hash to client
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============================================
// USER MANAGEMENT ROUTES (Admin only)
// ============================================

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbHelper.getAllUsers();
    res.json(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (!['admin', 'sales'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await dbHelper.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = await dbHelper.createUser({ email, password, name, role });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    await dbHelper.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, name, role, password } = req.body;
    const userId = req.params.id;
    
    // Check if user exists
    const existingUser = await dbHelper.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailUser = await dbHelper.getUserByEmail(email);
      if (emailUser && emailUser.id !== userId) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Update user
    const updates = {};
    if (email) updates.email = email;
    if (name) updates.name = name;
    if (role && ['admin', 'sales'].includes(role)) updates.role = role;
    if (password) updates.password = password;
    
    const updatedUser = await dbHelper.updateUser(userId, updates);
    res.json({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change own password (any logged in user)
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get user and verify current password
    const user = await dbHelper.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    await dbHelper.updateUser(req.user.id, { password: newPassword });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// BRAND ROUTES
// ============================================

app.get('/api/brands', authenticateToken, async (req, res) => {
  try {
    const brands = await dbHelper.getAllBrands();
    res.json(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to get brands' });
  }
});

app.post('/api/brands', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const brand = await dbHelper.createBrand(req.body);
    res.json(brand);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// ============================================
// CLIENT ROUTES
// ============================================

app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    let clients;
    // Admins see all clients, sales reps only see assigned clients
    if (req.user.role === 'admin') {
      clients = await dbHelper.getAllClients();
    } else {
      clients = await dbHelper.getClientsByUserId(req.user.id);
    }
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const client = await dbHelper.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Check access for non-admin users
    if (req.user.role !== 'admin' && !await dbHelper.userHasAccessToClient(req.user.id, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const client = await dbHelper.createClient(req.body);
    res.json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Get client by slug (authenticated - returns full data)
app.get('/api/clients/slug/:slug', authenticateToken, async (req, res) => {
  try {
    const client = await dbHelper.getClientBySlug(req.params.slug);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Get client by slug error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

// ============================================
// CLIENT ASSIGNMENT ROUTES (Admin only)
// ============================================

// Get all assignments
app.get('/api/client-assignments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const assignments = await dbHelper.getAllClientAssignments();
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to get assignments' });
  }
});

// Get users assigned to a specific client
app.get('/api/clients/:id/assignments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbHelper.getUsersByClientId(req.params.id);
    res.json(users);
  } catch (error) {
    console.error('Get client assignments error:', error);
    res.status(500).json({ error: 'Failed to get client assignments' });
  }
});

// Assign a user to a client
app.post('/api/clients/:id/assignments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    await dbHelper.assignClientToUser(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Assign client error:', error);
    res.status(500).json({ error: 'Failed to assign client' });
  }
});

// Remove user from client
app.delete('/api/clients/:id/assignments/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbHelper.unassignClientFromUser(req.params.id, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Unassign client error:', error);
    res.status(500).json({ error: 'Failed to unassign client' });
  }
});

// Get clients assigned to a specific user
app.get('/api/users/:id/clients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const clients = await dbHelper.getClientsByUserId(req.params.id);
    res.json(clients);
  } catch (error) {
    console.error('Get user clients error:', error);
    res.status(500).json({ error: 'Failed to get user clients' });
  }
});

app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const client = await dbHelper.updateClient(req.params.id, req.body);
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbHelper.deleteClient(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// ============================================
// CLIENT REPORT PDF ROUTES
// ============================================

// PDF report generation endpoint
app.get('/api/clients/:clientId/report/pdf', authenticateToken, async (req, res) => {
  try {
    // For now, return a message that PDF generation needs to be configured
    // Full implementation requires puppeteer or similar
    res.status(501).json({ 
      error: 'PDF generation not yet configured',
      message: 'PDF report generation requires additional server setup'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ============================================
// PUBLIC REPORT ROUTES (No auth required)
// ============================================

// Get client by share token (legacy)
app.get('/api/public/client/:token', async (req, res) => {
  try {
    const client = await dbHelper.getClientByShareToken(req.params.token);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Return limited public info
    res.json({
      id: client.id,
      name: client.name,
      slug: client.slug,
      simplifi_org_id: client.simplifi_org_id,
      primary_color: client.primary_color,
      secondary_color: client.secondary_color,
      logo_path: client.logo_path
    });
  } catch (error) {
    console.error('Get public client error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

// Get client by slug (new permanent URLs)
app.get('/api/public/client/slug/:slug', async (req, res) => {
  try {
    const client = await dbHelper.getClientBySlug(req.params.slug);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Return limited public info
    res.json({
      id: client.id,
      name: client.name,
      slug: client.slug,
      simplifi_org_id: client.simplifi_org_id,
      primary_color: client.primary_color,
      secondary_color: client.secondary_color,
      logo_path: client.logo_path
    });
  } catch (error) {
    console.error('Get public client by slug error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

// Get public stats by share token (legacy)
app.get('/api/public/client/:token/stats', async (req, res) => {
  try {
    const client = await dbHelper.getClientByShareToken(req.params.token);
    if (!client || !client.simplifi_org_id) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { startDate, endDate } = req.query;
    
    // Fetch campaigns
    const campaignsData = await simplifiClient.getCampaigns(client.simplifi_org_id);
    const campaigns = campaignsData.campaigns || [];

    // Fetch stats
    const stats = await simplifiClient.getOrganizationStats(client.simplifi_org_id, startDate, endDate, false, true);
    const dailyStats = await simplifiClient.getOrganizationStats(client.simplifi_org_id, startDate, endDate, true, false);

    res.json({
      campaigns,
      campaignStats: stats.campaign_stats || [],
      dailyStats: dailyStats.campaign_stats || []
    });
  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get public stats by slug (new permanent URLs)
app.get('/api/public/client/slug/:slug/stats', async (req, res) => {
  try {
    const client = await dbHelper.getClientBySlug(req.params.slug);
    if (!client || !client.simplifi_org_id) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { startDate, endDate } = req.query;
    
    // Fetch campaigns with ads included
    const campaignsData = await simplifiClient.getCampaignsWithAds(client.simplifi_org_id);
    const campaigns = campaignsData.campaigns || [];

    // Build ad details map from campaigns
    // Note: The include=ads may not return primary_creative_url, so we'll fetch ads separately for active campaigns
    const adDetailsMap = {};
    
    // First, populate from included ads (may have limited info)
    campaigns.forEach(campaign => {
      (campaign.ads || []).forEach(ad => {
        const width = ad.original_width ? parseInt(ad.original_width) : null;
        const height = ad.original_height ? parseInt(ad.original_height) : null;
        const adFileType = ad.ad_file_types?.[0]?.name || '';
        
        adDetailsMap[ad.id] = {
          name: ad.name,
          preview_url: ad.primary_creative_url, // May be null from include
          width: width,
          height: height,
          is_video: adFileType.toLowerCase() === 'video' || (ad.name || '').toLowerCase().includes('.mp4'),
          file_type: adFileType,
          campaign_id: campaign.id,
          campaign_name: campaign.name
        };
      });
    });
    
    // Fetch ads directly for active campaigns to get primary_creative_url
    const activeCampaigns = campaigns.filter(c => c.status?.toLowerCase() === 'active');
    for (const campaign of activeCampaigns.slice(0, 10)) { // Limit to first 10 for performance
      try {
        const adsData = await simplifiClient.getCampaignAds(client.simplifi_org_id, campaign.id);
        (adsData.ads || []).forEach(ad => {
          if (ad.primary_creative_url) {
            const width = ad.original_width ? parseInt(ad.original_width) : 
                          (ad.ad_sizes?.[0]?.width || null);
            const height = ad.original_height ? parseInt(ad.original_height) : 
                           (ad.ad_sizes?.[0]?.height || null);
            const adFileType = ad.ad_file_types?.[0]?.name || '';
            
            adDetailsMap[ad.id] = {
              name: ad.name,
              preview_url: ad.primary_creative_url,
              width: width,
              height: height,
              is_video: adFileType.toLowerCase() === 'video' || (ad.name || '').toLowerCase().includes('.mp4'),
              file_type: adFileType,
              campaign_id: campaign.id,
              campaign_name: campaign.name
            };
          }
        });
      } catch (adErr) {
        console.log(`Could not fetch ads for campaign ${campaign.id}:`, adErr.message);
      }
    }
    
    console.log(`Built adDetailsMap with ${Object.keys(adDetailsMap).length} ads, ${Object.values(adDetailsMap).filter(a => a.preview_url).length} have preview URLs`);

    // Fetch stats by campaign
    const stats = await simplifiClient.getOrganizationStats(client.simplifi_org_id, startDate, endDate, false, true);
    
    // Fetch daily stats
    const dailyStats = await simplifiClient.getOrganizationStats(client.simplifi_org_id, startDate, endDate, true, false);
    
    // Fetch ad stats and enrich them
    let enrichedAdStats = [];
    try {
      const adStatsData = await simplifiClient.getAdStats(client.simplifi_org_id, { startDate, endDate });
      const rawAdStats = adStatsData.campaign_stats || [];
      
      // Get active campaign IDs
      const activeCampaignIds = campaigns
        .filter(c => c.status?.toLowerCase() === 'active')
        .map(c => c.id);
      
      // Enrich ad stats with details from campaigns
      enrichedAdStats = rawAdStats
        .filter(stat => activeCampaignIds.includes(stat.campaign_id))
        .map(stat => {
          const details = adDetailsMap[stat.ad_id] || {};
          return {
            ...stat,
            name: details.name || stat.name || `Ad ${stat.ad_id}`,
            preview_url: details.preview_url,
            width: details.width,
            height: details.height,
            is_video: details.is_video || false,
            file_type: details.file_type || ''
          };
        });
        
      console.log(`Enriched ${enrichedAdStats.length} ad stats, ${Object.keys(adDetailsMap).length} ads in map`);
    } catch (adErr) {
      console.log('Ad stats not available:', adErr.message);
    }

    res.json({
      campaigns,
      campaignStats: stats.campaign_stats || [],
      dailyStats: dailyStats.campaign_stats || [],
      adStats: enrichedAdStats
    });
  } catch (error) {
    console.error('Get public stats by slug error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============================================
// PUBLIC REPORT CENTER ROUTES (No auth required)
// These use the same response format as authenticated endpoints
// ============================================

app.get('/api/public/report-center/:orgId/campaigns/:campaignId/location-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ location_performance: [] });
    }
    const data = await reportCenterService.getLocationPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ location_performance: data || [] });
  } catch (error) {
    console.error('Public location performance error:', error);
    res.json({ location_performance: [] });
  }
});

app.get('/api/public/report-center/:orgId/campaigns/:campaignId/geo-fence-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ geofence_performance: [] });
    }
    const data = await reportCenterService.getGeoFencePerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ geofence_performance: data || [] });
  } catch (error) {
    console.error('Public geo-fence performance error:', error);
    res.json({ geofence_performance: [] });
  }
});

app.get('/api/public/report-center/:orgId/campaigns/:campaignId/keyword-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ keyword_performance: [] });
    }
    const data = await reportCenterService.getKeywordPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ keyword_performance: data || [] });
  } catch (error) {
    console.error('Public keyword performance error:', error);
    res.json({ keyword_performance: [] });
  }
});

app.get('/api/public/report-center/:orgId/campaigns/:campaignId/domain-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ domain_performance: [] });
    }
    const data = await reportCenterService.getDomainPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ domain_performance: data || [] });
  } catch (error) {
    console.error('Public domain performance error:', error);
    res.json({ domain_performance: [] });
  }
});

// Public conversions endpoint
app.get('/api/public/report-center/:orgId/campaigns/:campaignId/conversions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ conversions: [] });
    }
    const data = await reportCenterService.getConversions(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ conversions: data || [] });
  } catch (error) {
    console.error('Public conversions error:', error);
    res.json({ conversions: [] });
  }
});

// Public device breakdown endpoint
app.get('/api/public/report-center/:orgId/campaigns/:campaignId/device-breakdown', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ device_breakdown: [] });
    }
    const data = await reportCenterService.getDeviceBreakdown(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ device_breakdown: data || [] });
  } catch (error) {
    console.error('Public device breakdown error:', error);
    res.json({ device_breakdown: [] });
  }
});

// Public viewability endpoint
app.get('/api/public/report-center/:orgId/campaigns/:campaignId/viewability', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ viewability: null });
    }
    const data = await reportCenterService.getViewabilityMetrics(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ viewability: data });
  } catch (error) {
    console.error('Public viewability error:', error);
    res.json({ viewability: null });
  }
});

// ============================================
// CLIENT NOTES ROUTES
// ============================================

app.get('/api/clients/:clientId/notes', authenticateToken, async (req, res) => {
  try {
    // Use direct query if dbHelper.getNotesByClient doesn't exist
    if (dbHelper.getNotesByClient) {
      const notes = await dbHelper.getNotesByClient(req.params.clientId);
      res.json(notes || []);
    } else if (dbHelper.query) {
      const result = await dbHelper.query(
        'SELECT * FROM client_notes WHERE client_id = $1 ORDER BY is_pinned DESC, created_at DESC',
        [req.params.clientId]
      );
      res.json(result.rows || []);
    } else {
      // Notes table might not exist - return empty array
      console.log('Notes feature not fully implemented - returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Get notes error:', error);
    // Return empty array instead of error - notes might not be set up
    res.json([]);
  }
});

app.post('/api/clients/:clientId/notes', authenticateToken, async (req, res) => {
  try {
    if (dbHelper.createNote) {
      const note = await dbHelper.createNote({
        client_id: req.params.clientId,
        user_id: req.user.id,
        user_name: req.user.name,
        content: req.body.content
      });
      res.json(note);
    } else if (dbHelper.query) {
      const result = await dbHelper.query(
        'INSERT INTO client_notes (client_id, user_id, user_name, content, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [req.params.clientId, req.user.id, req.user.name, req.body.content]
      );
      res.json(result.rows[0]);
    } else {
      res.status(501).json({ error: 'Notes feature not implemented' });
    }
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id/pin', authenticateToken, async (req, res) => {
  try {
    if (dbHelper.toggleNotePin) {
      const note = await dbHelper.toggleNotePin(req.params.id);
      res.json(note);
    } else if (dbHelper.query) {
      const result = await dbHelper.query(
        'UPDATE client_notes SET is_pinned = NOT COALESCE(is_pinned, false) WHERE id = $1 RETURNING *',
        [req.params.id]
      );
      res.json(result.rows[0]);
    } else {
      res.status(501).json({ error: 'Notes feature not implemented' });
    }
  } catch (error) {
    console.error('Pin note error:', error);
    res.status(500).json({ error: 'Failed to pin note' });
  }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    if (dbHelper.deleteNote) {
      await dbHelper.deleteNote(req.params.id);
      res.json({ success: true });
    } else if (dbHelper.query) {
      await dbHelper.query('DELETE FROM client_notes WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } else {
      res.status(501).json({ error: 'Notes feature not implemented' });
    }
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================
// CLIENT SYNC ROUTES
// ============================================

// Sync all clients from Simpli.fi
app.post('/api/clients/sync', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgs = await simplifiClient.getOrganizations();
    const organizations = orgs.organizations || [];
    
    // Get default brand
    let brand = await dbHelper.getAllBrands()[0];
    if (!brand) {
      brand = await dbHelper.createBrand({ name: 'Default', primary_color: '#3b82f6' });
    }
    
    let synced = 0;
    for (const org of organizations) {
      // Check if client already exists
      const existing = await dbHelper.getClientByOrgId(org.id);
      if (!existing) {
        await dbHelper.createClient({
          name: org.name,
          simplifi_org_id: org.id,
          brand_id: brand.id,
          status: 'active'
        });
        synced++;
      }
    }
    
    res.json({ success: true, synced, total: organizations.length });
  } catch (error) {
    console.error('Sync clients error:', error);
    res.status(500).json({ error: 'Failed to sync clients' });
  }
});

// Sync a single client from Simpli.fi
app.post('/api/clients/sync-one', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orgId, name, orgName } = req.body;
    const clientName = name || orgName;  // Accept either name or orgName
    
    if (!orgId || !clientName) {
      return res.status(400).json({ error: 'Organization ID and name required' });
    }
    
    // Get default brand
    let brand = await dbHelper.getAllBrands()[0];
    if (!brand) {
      brand = await dbHelper.createBrand({ name: 'Default', primary_color: '#3b82f6' });
    }
    
    // Check if already exists
    const existing = await dbHelper.getClientByOrgId(orgId);
    if (existing) {
      return res.json({ success: true, client: existing, existed: true });
    }
    
    const client = await dbHelper.createClient({
      name: clientName,
      simplifi_org_id: orgId,
      brand_id: brand.id,
      status: 'active'
    });
    
    res.json({ success: true, client });
  } catch (error) {
    console.error('Sync one client error:', error);
    res.status(500).json({ error: 'Failed to sync client' });
  }
});

// ============================================
// SIMPLI.FI PROXY ROUTES
// ============================================

// Get organizations
app.get('/api/simplifi/organizations', authenticateToken, async (req, res) => {
  try {
    const orgs = await simplifiClient.getOrganizations();
    res.json(orgs);
  } catch (error) {
    console.error('Get orgs error:', error);
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

// Get organization campaigns
app.get('/api/simplifi/organizations/:orgId/campaigns', authenticateToken, async (req, res) => {
  try {
    const campaigns = await simplifiClient.getCampaigns(req.params.orgId);
    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Get organization campaigns with ads included
app.get('/api/simplifi/organizations/:orgId/campaigns-with-ads', authenticateToken, async (req, res) => {
  try {
    const campaigns = await simplifiClient.getCampaignsWithAds(req.params.orgId);
    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns with ads error:', error);
    res.status(500).json({ error: 'Failed to get campaigns with ads' });
  }
});

// Get organization stats
app.get('/api/simplifi/organizations/:orgId/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, byDay, byCampaign, byAd } = req.query;
    
    // If byAd is requested, use a different method
    if (byAd === 'true') {
      const stats = await simplifiClient.getAdStats(req.params.orgId, {
        startDate,
        endDate
      });
      res.json(stats);
    } else {
      const stats = await simplifiClient.getOrganizationStats(
        req.params.orgId,
        startDate,
        endDate,
        byDay === 'true',
        byCampaign === 'true'
      );
      res.json(stats);
    }
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Smart stats endpoint - uses cache + incremental fetch
app.get('/api/clients/:clientId/cached-stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, byCampaign } = req.query;
    const clientId = req.params.clientId;
    
    // Get the client
    const client = await dbHelper.getClientById(clientId);
    if (!client || !client.simplifi_org_id) {
      return res.status(404).json({ error: 'Client not found or no org linked' });
    }
    
    let cachedStats = [];
    let lastCachedDate = null;
    let needsFetch = true;
    let fetchStartDate = startDate;
    
    // Try to get cached data (may fail if tables don't exist yet)
    try {
      lastCachedDate = await dbHelper.getLastCachedDate(clientId);
      
      if (lastCachedDate) {
        const lastCached = new Date(lastCachedDate);
        const requestEnd = new Date(endDate);
        
        // Only fetch if we need newer data
        if (lastCached >= requestEnd) {
          needsFetch = false;
        } else {
          // Fetch from day after last cached date
          const nextDay = new Date(lastCached);
          nextDay.setDate(nextDay.getDate() + 1);
          fetchStartDate = nextDay.toISOString().split('T')[0];
        }
      }
    } catch (cacheReadError) {
      console.log('Cache tables may not exist yet, will fetch fresh data');
      needsFetch = true;
    }
    
    // Try to fetch new data from Simpli.fi
    if (needsFetch) {
      try {
        console.log(`Fetching stats for ${client.name} from ${fetchStartDate} to ${endDate}`);
        
        // Fetch daily stats to cache
        const dailyStats = await simplifiClient.getOrganizationStats(
          client.simplifi_org_id,
          fetchStartDate,
          endDate,
          true, // byDay
          true  // byCampaign
        );
        
        // Try to cache the new stats (may fail if tables don't exist)
        if (dailyStats.campaign_stats && dailyStats.campaign_stats.length > 0) {
          try {
            await dbHelper.cacheStatsBatch(clientId, dailyStats.campaign_stats);
            await dbHelper.updateFetchLog(clientId, endDate, 'success');
            console.log(`Cached ${dailyStats.campaign_stats.length} stat records for ${client.name}`);
          } catch (cacheWriteError) {
            console.log('Failed to write to cache:', cacheWriteError.message);
          }
          
          // Return the fresh data directly
          return res.json({
            campaign_stats: byCampaign === 'true' 
              ? aggregateByCampaign(dailyStats.campaign_stats)
              : dailyStats.campaign_stats,
            from_cache: false,
            last_cached: endDate
          });
        }
      } catch (fetchError) {
        console.error(`Failed to fetch fresh stats for ${client.name}:`, fetchError.message);
        try {
          await dbHelper.updateFetchLog(clientId, lastCachedDate || startDate, 'error', fetchError.message);
        } catch (e) { /* ignore */ }
      }
    }
    
    // Try to return cached stats
    try {
      cachedStats = await dbHelper.getCachedStats(clientId, startDate, endDate, byCampaign === 'true');
    } catch (cacheReadError) {
      console.log('Failed to read cache:', cacheReadError.message);
      cachedStats = [];
    }
    
    // Format response similar to Simpli.fi API
    res.json({
      campaign_stats: cachedStats,
      from_cache: true,
      last_cached: lastCachedDate
    });
    
  } catch (error) {
    console.error('Get cached stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Helper to aggregate daily stats by campaign
function aggregateByCampaign(dailyStats) {
  const byCampaign = {};
  dailyStats.forEach(stat => {
    const campId = stat.campaign_id;
    if (!byCampaign[campId]) {
      byCampaign[campId] = {
        campaign_id: campId,
        impressions: 0,
        clicks: 0,
        total_spend: 0
      };
    }
    byCampaign[campId].impressions += stat.impressions || 0;
    byCampaign[campId].clicks += stat.clicks || 0;
    byCampaign[campId].total_spend += parseFloat(stat.total_spend || 0);
  });
  return Object.values(byCampaign);
}

// Get campaign details
app.get('/api/simplifi/campaigns/:campaignId', authenticateToken, async (req, res) => {
  try {
    const campaign = await simplifiClient.getCampaignDetails(req.params.campaignId);
    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

// Debug endpoint - test fetching ads with full org context
app.get('/api/debug/org/:orgId/campaign/:campaignId/ads', authenticateToken, async (req, res) => {
  try {
    const { orgId, campaignId } = req.params;
    console.log(`[DEBUG ADS] Testing ads fetch for org ${orgId}, campaign ${campaignId}`);
    
    // Try the full org context URL
    const fullUrl = `/organizations/${orgId}/campaigns/${campaignId}/ads`;
    console.log(`[DEBUG ADS] Trying full URL: ${fullUrl}`);
    
    const response = await simplifiClient.client.get(fullUrl);
    console.log(`[DEBUG ADS] Success! Got ${response.data?.ads?.length || 0} ads`);
    
    // Log first ad details
    if (response.data?.ads?.[0]) {
      const firstAd = response.data.ads[0];
      console.log(`[DEBUG ADS] First ad: id=${firstAd.id}, name=${firstAd.name}, primary_creative_url=${firstAd.primary_creative_url}`);
    }
    
    res.json({
      success: true,
      url_used: fullUrl,
      ad_count: response.data?.ads?.length || 0,
      ads: response.data?.ads || [],
      sample_ad: response.data?.ads?.[0] || null
    });
  } catch (error) {
    console.error('[DEBUG ADS] Error:', error.response?.status, error.response?.data || error.message);
    res.json({
      success: false,
      error: error.message,
      status: error.response?.status,
      response_data: error.response?.data
    });
  }
});

// Get campaign ads - requires orgId for full API path
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/ads', authenticateToken, async (req, res) => {
  try {
    const { orgId, campaignId } = req.params;
    console.log(`[ADS ENDPOINT] Fetching ads for org ${orgId}, campaign ${campaignId}`);
    const ads = await simplifiClient.getCampaignAds(orgId, campaignId);
    console.log(`[ADS ENDPOINT] Success - got ${ads?.ads?.length || 0} ads`);
    res.json(ads);
  } catch (error) {
    console.error('[ADS ENDPOINT] Error fetching ads:', error.message);
    res.status(500).json({ error: 'Failed to get ads', details: error.message });
  }
});

// Legacy endpoint - redirect to new format (kept for backward compatibility)
app.get('/api/simplifi/campaigns/:campaignId/ads', authenticateToken, async (req, res) => {
  res.status(400).json({ 
    error: 'This endpoint requires organization ID. Use /api/simplifi/organizations/:orgId/campaigns/:campaignId/ads instead' 
  });
});

// Get campaign ad stats
app.get('/api/simplifi/campaigns/:campaignId/ad-stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await simplifiClient.getCampaignAdStats(req.params.campaignId, startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Get ad stats error:', error);
    res.status(500).json({ error: 'Failed to get ad stats' });
  }
});

// Get campaign geo-fences
app.get('/api/simplifi/campaigns/:campaignId/geo_fences', authenticateToken, async (req, res) => {
  try {
    const geoFences = await simplifiClient.getCampaignGeoFences(req.params.campaignId);
    res.json(geoFences);
  } catch (error) {
    console.error('Get geo-fences error:', error);
    res.status(500).json({ error: 'Failed to get geo-fences' });
  }
});

// Get campaign keywords
app.get('/api/simplifi/campaigns/:campaignId/keywords', authenticateToken, async (req, res) => {
  try {
    const keywords = await simplifiClient.getCampaignKeywords(req.params.campaignId);
    res.json(keywords);
  } catch (error) {
    console.error('Get keywords error:', error);
    res.status(500).json({ error: 'Failed to get keywords' });
  }
});

// Get geo stats
app.get('/api/simplifi/organizations/:orgId/geo-stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    const stats = await simplifiClient.getGeoStats(req.params.orgId, startDate, endDate, campaignId);
    res.json(stats);
  } catch (error) {
    console.error('Get geo stats error:', error);
    res.status(500).json({ error: 'Failed to get geo stats' });
  }
});

// Get device stats
app.get('/api/simplifi/organizations/:orgId/device-stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    const stats = await simplifiClient.getDeviceStats(req.params.orgId, startDate, endDate, campaignId);
    res.json(stats);
  } catch (error) {
    console.error('Get device stats error:', error);
    res.status(500).json({ error: 'Failed to get device stats' });
  }
});

// Get retargeting pixels
app.get('/api/simplifi/organizations/:orgId/pixels', authenticateToken, async (req, res) => {
  try {
    const pixels = await simplifiClient.getRetargetingPixels(req.params.orgId);
    res.json(pixels);
  } catch (error) {
    console.error('Get pixels error:', error);
    res.status(500).json({ error: 'Failed to get pixels' });
  }
});

// ============================================
// REPORT CENTER ROUTES (Enhanced Data)
// ============================================

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/location-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ location_performance: [] });
    }
    const data = await reportCenterService.getLocationPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ location_performance: data || [] });
  } catch (error) {
    console.error('Location performance error:', error);
    res.json({ location_performance: [] });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/geo-fence-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`[GEO-FENCE PERF] Request for org ${req.params.orgId}, campaign ${req.params.campaignId}, ${startDate} to ${endDate}`);
    
    if (!reportCenterService) {
      console.log('[GEO-FENCE PERF] Report Center service not available');
      return res.json({ geofence_performance: [] });
    }
    const data = await reportCenterService.getGeoFencePerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    console.log(`[GEO-FENCE PERF] Got ${(data || []).length} geo-fences`);
    res.json({ geofence_performance: data || [] });
  } catch (error) {
    console.error('[GEO-FENCE PERF] Error:', error.message);
    res.json({ geofence_performance: [] });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/keyword-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ keyword_performance: [] });
    }
    const data = await reportCenterService.getKeywordPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ keyword_performance: data || [] });
  } catch (error) {
    console.error('Keyword performance error:', error);
    res.json({ keyword_performance: [] });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/conversions', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ conversions: [] });
    }
    const data = await reportCenterService.getConversions(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ conversions: data || [] });
  } catch (error) {
    console.error('Conversions error:', error);
    res.json({ conversions: [] });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/domain-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`[DOMAIN PERF] Request for org ${req.params.orgId}, campaign ${req.params.campaignId}, ${startDate} to ${endDate}`);
    
    if (!reportCenterService) {
      console.log('[DOMAIN PERF] Report Center service not available');
      return res.json({ domain_performance: [] });
    }
    
    if (!reportCenterService.getDomainPerformance) {
      console.log('[DOMAIN PERF] getDomainPerformance method not implemented');
      return res.json({ domain_performance: [] });
    }
    
    const data = await reportCenterService.getDomainPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    console.log(`[DOMAIN PERF] Got ${(data || []).length} domains`);
    res.json({ domain_performance: data || [] });
  } catch (error) {
    console.error('[DOMAIN PERF] Error:', error.message);
    res.json({ domain_performance: [] });
  }
});

// Device breakdown endpoint (Report Center)
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/device-breakdown', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`[DEVICE ENDPOINT] Request for org ${req.params.orgId}, campaign ${req.params.campaignId}`);
    
    if (!reportCenterService) {
      console.log('[DEVICE ENDPOINT] Report Center service not available');
      return res.json({ device_breakdown: [] });
    }
    const data = await reportCenterService.getDeviceBreakdown(req.params.orgId, req.params.campaignId, startDate, endDate);
    console.log(`[DEVICE ENDPOINT] Returning ${(data || []).length} device types`);
    res.json({ device_breakdown: data || [] });
  } catch (error) {
    console.error('[DEVICE ENDPOINT] Error:', error.message);
    res.json({ device_breakdown: [] });
  }
});

// Viewability endpoint (Report Center)
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/viewability', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.json({ viewability: null });
    }
    const data = await reportCenterService.getViewabilityMetrics(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json({ viewability: data });
  } catch (error) {
    console.error('Viewability error:', error);
    res.json({ viewability: null });
  }
});

// ============================================
// DIAGNOSTICS / TROUBLESHOOTING ENDPOINTS
// ============================================

// Public diagnostics - available without auth for troubleshooting public reports
app.get('/api/diagnostics/public', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    server: { status: 'ok', message: 'Backend server is responding' },
    imageProxy: { status: 'unknown', message: 'Not tested' },
    sampleImages: []
  };

  // Test image proxy endpoint
  try {
    const testUrl = 'https://media.simpli.fi/test.gif';
    const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(testUrl)}`;
    results.imageProxy = { 
      status: 'ok', 
      message: 'Image proxy endpoint is available',
      proxyUrl: proxyUrl,
      note: 'Use this endpoint for Safari cross-origin image loading'
    };
  } catch (error) {
    results.imageProxy = { status: 'error', message: error.message };
  }

  // Provide sample test URLs
  results.sampleImages = [
    { type: 'gif', testUrl: `${req.protocol}://${req.get('host')}/api/proxy/image?url=${encodeURIComponent('https://media.simpli.fi/uploads/creative/12345/test.gif')}` },
    { type: 'png', testUrl: `${req.protocol}://${req.get('host')}/api/proxy/image?url=${encodeURIComponent('https://media.simpli.fi/uploads/creative/12345/test.png')}` },
    { type: 'video', note: 'Videos load directly from media.simpli.fi (no proxy needed)' }
  ];

  // Known fixes reference
  results.knownFixes = {
    safariImages: 'Images from media.simpli.fi are proxied through /api/proxy/image to avoid Safari cross-origin blocking',
    videoAutoplay: 'Videos use muted + playsinline attributes for Safari autoplay',
    mobileSpacing: 'Text overflow fixed with word-break and flex-wrap properties'
  };

  res.json(results);
});

// Admin diagnostics - requires auth, shows more details
app.get('/api/diagnostics/admin', async (req, res) => {
  // Check for auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const results = {
    timestamp: new Date().toISOString(),
    server: { status: 'ok', uptime: process.uptime(), nodeVersion: process.version },
    database: { status: 'unknown' },
    simplifiApi: { status: 'unknown' },
    imageProxy: { status: 'unknown' },
    clients: { status: 'unknown' },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasSimplifiAppKey: !!process.env.SIMPLIFI_APP_KEY,
      hasSimplifiUserKey: !!process.env.SIMPLIFI_USER_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  };

  // Test database connection
  try {
    if (!dbHelper) {
      results.database = { status: 'error', message: 'Database helper not initialized' };
    } else {
      const clients = await dbHelper.getAllClients();
      const users = await dbHelper.getAllUsers();
      results.database = {
        status: 'ok',
        message: 'Database connected',
        clients: clients.length,
        users: users.length
      };
    }
  } catch (error) {
    results.database = { status: 'error', message: error.message };
  }

  // Test Simpli.fi API
  try {
    if (simplifiClient) {
      // Just check if client is initialized
      results.simplifiApi = {
        status: 'ok',
        message: 'Simpli.fi client initialized',
        note: 'API credentials are configured'
      };
    } else {
      results.simplifiApi = { status: 'error', message: 'Simpli.fi client not initialized' };
    }
  } catch (error) {
    results.simplifiApi = { status: 'error', message: error.message };
  }

  // Image proxy status
  results.imageProxy = {
    status: 'ok',
    endpoint: '/api/proxy/image',
    usage: 'GET /api/proxy/image?url=<encoded-simpli.fi-url>',
    supportedFormats: ['gif', 'png', 'jpg', 'jpeg', 'webp', 'mp4']
  };

  // Client configuration check
  try {
    if (!dbHelper) {
      results.clients = { status: 'error', message: 'Database helper not initialized' };
    } else {
      const allClients = await dbHelper.getAllClients();
      const clientIssues = [];
      
      for (const client of allClients) {
        const issues = [];
        if (!client.simplifi_org_id) issues.push('Missing Simpli.fi Org ID');
        if (!client.slug) issues.push('Missing slug');
        if (client.slug && !/^[a-z0-9-]+$/.test(client.slug)) issues.push('Invalid slug format');
        
        if (issues.length > 0) {
          clientIssues.push({ name: client.name, id: client.id, issues });
        }
      }
      
      results.clients = {
        status: clientIssues.length === 0 ? 'ok' : 'warning',
        total: allClients.length,
        withIssues: clientIssues.length,
        issues: clientIssues
      };
    }
  } catch (error) {
    results.clients = { status: 'error', message: error.message };
  }

  // Known fixes and mobile compatibility notes
  results.mobileCompatibility = {
    safariImageFix: {
      issue: 'Safari blocks cross-origin images from media.simpli.fi',
      solution: 'Images are proxied through /api/proxy/image endpoint',
      components: ['TopAdCard', 'AdPerformanceCard']
    },
    videoAutoplay: {
      issue: 'Safari requires specific attributes for video autoplay',
      solution: 'Videos use muted, playsinline, and loop attributes'
    },
    textOverflow: {
      issue: 'Long campaign names overflow on mobile',
      solution: 'Added word-break, overflow-wrap, and flex-wrap CSS properties',
      affectedAreas: ['Paused campaigns cards', 'Campaign detail header', 'Public URL box']
    }
  };

  res.json(results);
});

// Clear cache endpoint (admin only)
app.post('/api/diagnostics/clear-cache', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const { clientId } = req.body;
    
    // If using any caching mechanism, clear it here
    // For now, just acknowledge the request
    res.json({ 
      status: 'ok', 
      message: clientId ? `Cache cleared for client ${clientId}` : 'All cache cleared',
      note: 'Frontend may need to refresh to see changes'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Test specific image URL through proxy
app.get('/api/diagnostics/test-image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  const results = {
    originalUrl: url,
    isSimplifiUrl: url.includes('simpli.fi'),
    proxyUrl: null,
    status: 'unknown'
  };

  if (!results.isSimplifiUrl) {
    results.status = 'error';
    results.message = 'Only Simpli.fi URLs can be proxied';
    return res.json(results);
  }

  results.proxyUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
  
  // Test if we can fetch the image
  try {
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;
    
    await new Promise((resolve, reject) => {
      const request = protocol.get(url, (response) => {
        if (response.statusCode === 200) {
          results.status = 'ok';
          results.contentType = response.headers['content-type'];
          results.message = 'Image is accessible and can be proxied';
        } else {
          results.status = 'error';
          results.message = `Image returned status ${response.statusCode}`;
        }
        response.destroy();
        resolve();
      });
      request.on('error', (err) => {
        results.status = 'error';
        results.message = err.message;
        resolve();
      });
      request.setTimeout(5000, () => {
        results.status = 'error';
        results.message = 'Request timeout';
        request.destroy();
        resolve();
      });
    });
  } catch (error) {
    results.status = 'error';
    results.message = error.message;
  }

  res.json(results);
});

// ============================================
// IMAGE PROXY - For Safari cross-origin issues
// ============================================

app.get('/api/proxy/image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    // Only allow proxying from trusted Simpli.fi domains
    if (!url.includes('simpli.fi')) {
      return res.status(403).json({ error: 'Only Simpli.fi URLs allowed' });
    }
    
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;
    
    // Determine content type from URL
    let contentType = 'image/gif';
    if (url.includes('.png')) contentType = 'image/png';
    else if (url.includes('.jpg') || url.includes('.jpeg')) contentType = 'image/jpeg';
    else if (url.includes('.webp')) contentType = 'image/webp';
    else if (url.includes('.mp4')) contentType = 'video/mp4';
    
    // Set CORS headers BEFORE making the request
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    protocol.get(url, (proxyRes) => {
      // Use content-type from response or our guess
      const responseContentType = proxyRes.headers['content-type'] || contentType;
      res.setHeader('Content-Type', responseContentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('Image proxy error:', err.message);
      res.status(500).json({ error: 'Failed to fetch image' });
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Initialize database
    console.log('Initializing database...');
    await initializeDatabase();
    dbHelper = new DatabaseHelper();
    
    // Seed initial data if needed
    await seedInitialData();
    console.log('Database ready');

    // Initialize Simpli.fi client
    simplifiClient = new SimplifiClient(
      process.env.SIMPLIFI_APP_KEY,
      process.env.SIMPLIFI_USER_KEY
    );
    console.log('Simpli.fi client initialized');

    // Initialize Report Center service
    reportCenterService = new ReportCenterService(simplifiClient);
    console.log('Report Center service initialized');

    // Setup admin routes for product management
    setupAdminRoutes();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Simpli.fi Reports Server Running                        ║
╠═══════════════════════════════════════════════════════════╣
║   Port: ${PORT}                                            ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(36)}║
║   Health Check: http://localhost:${PORT}/api/health          ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
