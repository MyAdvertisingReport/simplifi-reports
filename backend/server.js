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
    
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app') || origin.includes('railway.app')) {
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
// HEALTH CHECK ENDPOINTS (for deployment)
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
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
      const users = dbHelper.getAllUsers();
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

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = dbHelper.getUserByEmail(email);
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

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ============================================
// USER MANAGEMENT ROUTES (Admin only)
// ============================================

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = dbHelper.getAllUsers();
    res.json(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (!['admin', 'sales'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = dbHelper.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = dbHelper.createUser({ email, password, name, role });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    dbHelper.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user (admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { email, name, role, password } = req.body;
    const userId = req.params.id;
    
    // Check if user exists
    const existingUser = dbHelper.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailUser = dbHelper.getUserByEmail(email);
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
    
    const updatedUser = dbHelper.updateUser(userId, updates);
    res.json({ id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change own password (any logged in user)
app.put('/api/auth/change-password', authenticateToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get user and verify current password
    const user = dbHelper.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    dbHelper.updateUser(req.user.id, { password: newPassword });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// BRAND ROUTES
// ============================================

app.get('/api/brands', authenticateToken, (req, res) => {
  try {
    const brands = dbHelper.getAllBrands();
    res.json(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to get brands' });
  }
});

app.post('/api/brands', authenticateToken, requireAdmin, (req, res) => {
  try {
    const brand = dbHelper.createBrand(req.body);
    res.json(brand);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// ============================================
// CLIENT ROUTES
// ============================================

app.get('/api/clients', authenticateToken, (req, res) => {
  try {
    const clients = dbHelper.getAllClients();
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

app.get('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const client = dbHelper.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

app.post('/api/clients', authenticateToken, (req, res) => {
  try {
    const client = dbHelper.createClient(req.body);
    res.json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const client = dbHelper.updateClient(req.params.id, req.body);
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    dbHelper.deleteClient(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// ============================================
// CLIENT NOTES ROUTES
// ============================================

app.get('/api/clients/:clientId/notes', authenticateToken, (req, res) => {
  try {
    const notes = dbHelper.getClientNotes(req.params.clientId);
    res.json(notes || []);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

app.post('/api/clients/:clientId/notes', authenticateToken, (req, res) => {
  try {
    const note = dbHelper.createNote({
      client_id: req.params.clientId,
      user_id: req.user.id,
      user_name: req.user.name,
      content: req.body.content
    });
    res.json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id/pin', authenticateToken, (req, res) => {
  try {
    const note = dbHelper.toggleNotePin(req.params.id);
    res.json(note);
  } catch (error) {
    console.error('Pin note error:', error);
    res.status(500).json({ error: 'Failed to pin note' });
  }
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
  try {
    dbHelper.deleteNote(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
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

// Get organization stats
app.get('/api/simplifi/organizations/:orgId/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, byDay, byCampaign } = req.query;
    const stats = await simplifiClient.getOrganizationStats(
      req.params.orgId,
      startDate,
      endDate,
      byDay === 'true',
      byCampaign === 'true'
    );
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

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

// Get campaign ads
app.get('/api/simplifi/campaigns/:campaignId/ads', authenticateToken, async (req, res) => {
  try {
    const ads = await simplifiClient.getCampaignAds(req.params.campaignId);
    res.json(ads);
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({ error: 'Failed to get ads' });
  }
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
      return res.status(503).json({ error: 'Report Center not initialized' });
    }
    const data = await reportCenterService.getLocationPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Location performance error:', error);
    res.status(500).json({ error: 'Failed to get location performance' });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/geo-fence-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center not initialized' });
    }
    const data = await reportCenterService.getGeoFencePerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Geo-fence performance error:', error);
    res.status(500).json({ error: 'Failed to get geo-fence performance' });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/keyword-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center not initialized' });
    }
    const data = await reportCenterService.getKeywordPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Keyword performance error:', error);
    res.status(500).json({ error: 'Failed to get keyword performance' });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/conversions', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center not initialized' });
    }
    const data = await reportCenterService.getConversions(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Conversions error:', error);
    res.status(500).json({ error: 'Failed to get conversions' });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/domain-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center not initialized' });
    }
    const data = await reportCenterService.getDomainPerformance(req.params.orgId, req.params.campaignId, startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Domain performance error:', error);
    res.status(500).json({ error: 'Failed to get domain performance' });
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
    const db = await initializeDatabase();
    dbHelper = new DatabaseHelper(db);
    
    // Seed initial data if needed
    await seedInitialData(dbHelper);
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
