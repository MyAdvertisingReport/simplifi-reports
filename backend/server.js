/**
 * Simpli.fi Reports - Backend Server
 * Custom reporting tool for programmatic advertising
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
// const { generateProfessionalPDF } = require('./pdfGenerator');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database helper (initialized after async setup)
let dbHelper = null;

// Initialize Simpli.fi client
let simplifiClient = null;

// Initialize Report Center service
let reportCenterService = null;

// Auth middleware
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

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = dbHelper.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// ============================================
// USER MANAGEMENT ROUTES (Admin only)
// ============================================

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = dbHelper.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
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

    const user = dbHelper.createUser(email, password, name, role);
    res.status(201).json(user);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
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
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// ============================================
// CLIENT ROUTES
// ============================================

// Sync clients from Simpli.fi organizations
app.post('/api/clients/sync', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }

    // Get all organizations from Simpli.fi
    const orgsData = await simplifiClient.getOrganizations();
    const organizations = orgsData.organizations || [];
    
    // Get existing clients to check which orgs already exist
    const existingClients = dbHelper.getAllClients();
    const existingOrgIds = new Set(existingClients.map(c => c.simplifi_org_id).filter(Boolean));
    
    // Get default brand (first one) - can be changed later
    const brands = dbHelper.getAllBrands();
    console.log('Available brands:', brands);
    const defaultBrand = brands[0];
    
    if (!defaultBrand) {
      return res.status(400).json({ error: 'No brands exist. Create a brand first.' });
    }

    console.log('Using default brand:', defaultBrand.name, defaultBrand.id);

    const results = {
      total: organizations.length,
      created: [],
      skipped: [],
      errors: []
    };

    for (const org of organizations) {
      const orgId = org.id;
      const orgName = org.name;

      // Skip if already exists
      if (existingOrgIds.has(orgId)) {
        results.skipped.push({ id: orgId, name: orgName, reason: 'Already exists' });
        continue;
      }

      try {
        console.log(`Creating client for org: ${orgName} (${orgId})`);
        // Create new client
        const client = dbHelper.createClient(
          orgName,
          defaultBrand.id,
          orgId,
          null, // logo_path
          '#1e3a8a', // primary_color
          '#3b82f6'  // secondary_color
        );
        console.log(`Created client: ${client?.id}`);
        results.created.push({ id: orgId, name: orgName, clientId: client.id });
      } catch (err) {
        console.error(`Error creating client for ${orgName}:`, err.message);
        results.errors.push({ id: orgId, name: orgName, error: err.message });
      }
    }

    console.log('Sync results:', results.created.length, 'created,', results.skipped.length, 'skipped,', results.errors.length, 'errors');
    res.json(results);
  } catch (error) {
    console.error('Error syncing organizations:', error);
    res.status(500).json({ error: 'Failed to sync organizations: ' + error.message });
  }
});

// Get Simpli.fi organizations (without creating clients)
app.get('/api/simplifi/organizations', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }

    console.log('Fetching organizations from Simpli.fi...');
    const orgsData = await simplifiClient.getOrganizations();
    console.log('Organizations response:', JSON.stringify(orgsData).substring(0, 500));
    
    const organizations = orgsData.organizations || [];
    console.log(`Found ${organizations.length} organizations`);
    
    // Get existing clients to mark which are already synced
    const existingClients = dbHelper.getAllClients();
    const existingOrgIds = new Set(existingClients.map(c => c.simplifi_org_id).filter(Boolean));
    
    // Mark each org as synced or not
    const orgsWithStatus = organizations.map(org => ({
      ...org,
      isSynced: existingOrgIds.has(org.id),
      clientId: existingClients.find(c => c.simplifi_org_id === org.id)?.id || null
    }));

    res.json({ organizations: orgsWithStatus });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations: ' + error.message });
  }
});

app.get('/api/clients', authenticateToken, (req, res) => {
  try {
    const clients = dbHelper.getAllClients();
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
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
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

app.post('/api/clients', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, brandId, simplifiOrgId, logoPath, primaryColor, secondaryColor } = req.body;
    
    if (!name || !brandId) {
      return res.status(400).json({ error: 'Name and brand are required' });
    }

    const client = dbHelper.createClient(
      name, brandId, simplifiOrgId, logoPath,
      primaryColor || '#1a56db', secondaryColor || '#64748b'
    );
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const client = dbHelper.updateClient(req.params.id, req.body);
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete a client
app.delete('/api/clients/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    dbHelper.deleteClient(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Sync a single organization as a client
app.post('/api/clients/sync-one', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { orgId, orgName } = req.body;
    
    if (!orgId || !orgName) {
      return res.status(400).json({ error: 'orgId and orgName are required' });
    }

    // Check if already exists
    const existingClients = dbHelper.getAllClients();
    const existing = existingClients.find(c => c.simplifi_org_id === orgId);
    if (existing) {
      return res.status(400).json({ error: 'Organization already synced' });
    }

    // Get default brand
    const brands = dbHelper.getAllBrands();
    const defaultBrand = brands[0];
    if (!defaultBrand) {
      return res.status(400).json({ error: 'No brands exist. Create a brand first.' });
    }

    // Create client
    const client = dbHelper.createClient(
      orgName,
      defaultBrand.id,
      orgId,
      null,
      '#1e3a8a',
      '#3b82f6'
    );

    res.json(client);
  } catch (error) {
    console.error('Error syncing organization:', error);
    res.status(500).json({ error: 'Failed to sync organization' });
  }
});

// ============================================
// INTERNAL NOTES API ROUTES
// ============================================

// Get all notes for a client
app.get('/api/clients/:clientId/notes', authenticateToken, (req, res) => {
  try {
    const notes = dbHelper.getNotesByClient(req.params.clientId);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get notes for a specific campaign
app.get('/api/clients/:clientId/campaigns/:campaignId/notes', authenticateToken, (req, res) => {
  try {
    const notes = dbHelper.getNotesByCampaign(req.params.clientId, parseInt(req.params.campaignId));
    res.json(notes);
  } catch (error) {
    console.error('Error fetching campaign notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create a new note
app.post('/api/clients/:clientId/notes', authenticateToken, (req, res) => {
  try {
    const { note, campaignId, noteType, isPinned } = req.body;
    
    console.log('=== CREATING NOTE ===');
    console.log('Client ID:', req.params.clientId);
    console.log('User:', req.user?.id, req.user?.name);
    console.log('Note:', note);
    console.log('Campaign ID:', campaignId);
    console.log('Note Type:', noteType);
    
    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    if (!req.user?.id) {
      console.error('User ID missing from request');
      return res.status(400).json({ error: 'User information missing' });
    }
    
    // Get user name - either from token or look up from database
    let userName = req.user.name;
    if (!userName) {
      const dbUser = dbHelper.getUserById(req.user.id);
      userName = dbUser?.name || req.user.email || 'Unknown User';
      console.log('Looked up user name from DB:', userName);
    }
    
    const newNote = dbHelper.createNote(
      req.params.clientId,
      req.user.id,
      userName,
      note.trim(),
      { campaignId, noteType, isPinned }
    );
    
    console.log('Note created:', newNote);
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update a note
app.put('/api/notes/:noteId', authenticateToken, (req, res) => {
  try {
    const { note, noteType, isPinned } = req.body;
    const updatedNote = dbHelper.updateNote(req.params.noteId, { note, noteType, isPinned });
    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete a note
app.delete('/api/notes/:noteId', authenticateToken, (req, res) => {
  try {
    dbHelper.deleteNote(req.params.noteId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Toggle note pin status
app.post('/api/notes/:noteId/toggle-pin', authenticateToken, (req, res) => {
  try {
    const note = dbHelper.toggleNotePin(req.params.noteId);
    res.json(note);
  } catch (error) {
    console.error('Error toggling note pin:', error);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// ============================================
// SIMPLI.FI API ROUTES
// ============================================

app.get('/api/simplifi/organizations', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const orgs = await simplifiClient.getOrganizations();
    res.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simplifi/organizations/:orgId/campaigns', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const campaigns = await simplifiClient.getCampaigns(req.params.orgId, req.query);
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get campaigns with ads nested (includes ad names, sizes, file types)
app.get('/api/simplifi/organizations/:orgId/campaigns-with-ads', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const campaigns = await simplifiClient.getCampaignsWithAds(req.params.orgId);
    
    // Log first campaign's ads structure to debug
    if (campaigns.campaigns && campaigns.campaigns.length > 0) {
      const firstCampaign = campaigns.campaigns[0];
      console.log('=== CAMPAIGN WITH ADS STRUCTURE ===');
      console.log('Campaign:', firstCampaign.name);
      console.log('Ads:', JSON.stringify(firstCampaign.ads?.slice(0, 2), null, 2));
      console.log('===================================');
    }
    
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns with ads:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simplifi/campaigns/:campaignId/geo_fences', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const geoFences = await simplifiClient.getCampaignGeoFences(req.params.campaignId);
    res.json(geoFences);
  } catch (error) {
    console.error('Error fetching geo-fences:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get geo/location stats
app.get('/api/simplifi/organizations/:orgId/geo-stats', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    console.log('=== FETCHING GEO STATS ===');
    console.log('Org ID:', req.params.orgId);
    console.log('Query:', req.query);
    const stats = await simplifiClient.getGeoStats(req.params.orgId, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      campaignId: req.query.campaignId
    });
    console.log('Geo Stats Response:', JSON.stringify(stats, null, 2).substring(0, 500));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching geo stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get retargeting segments (pixels) for an organization
app.get('/api/simplifi/organizations/:orgId/pixels', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    console.log('=== FETCHING RETARGETING PIXELS ===');
    console.log('Org ID:', req.params.orgId);
    const segments = await simplifiClient.getRetargetingSegments(req.params.orgId);
    res.json(segments);
  } catch (error) {
    console.error('Error fetching pixels:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get specific pixel details (includes pixel code)
app.get('/api/simplifi/organizations/:orgId/pixels/:segmentId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const segment = await simplifiClient.getRetargetingSegmentDetails(req.params.orgId, req.params.segmentId);
    res.json(segment);
  } catch (error) {
    console.error('Error fetching pixel details:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get device stats
app.get('/api/simplifi/organizations/:orgId/device-stats', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    console.log('=== FETCHING DEVICE STATS ===');
    console.log('Org ID:', req.params.orgId);
    console.log('Query:', req.query);
    
    // Try to get device breakdown
    try {
      const stats = await simplifiClient.getDeviceBreakdown(req.params.orgId, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        campaignId: req.query.campaignId
      });
      console.log('Device Breakdown Response:', JSON.stringify(stats, null, 2).substring(0, 500));
      res.json(stats);
    } catch (e) {
      console.log('Device breakdown failed, trying old method...');
      // Fall back to old method
      const stats = await simplifiClient.getDeviceStats(req.params.orgId, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        campaignId: req.query.campaignId
      });
      console.log('Device Stats Response:', JSON.stringify(stats, null, 2).substring(0, 500));
      res.json(stats);
    }
  } catch (error) {
    console.error('Error fetching device stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get domain/placement stats (for OTT - Roku, Telly, etc.)
app.get('/api/simplifi/organizations/:orgId/domain-stats', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    console.log('=== FETCHING DOMAIN STATS ===');
    console.log('Org ID:', req.params.orgId);
    console.log('Query:', req.query);
    const stats = await simplifiClient.getDomainStats(req.params.orgId, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      campaignId: req.query.campaignId
    });
    console.log('Domain Stats Response:', JSON.stringify(stats, null, 2).substring(0, 1000));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching domain stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get campaign keywords
app.get('/api/simplifi/campaigns/:campaignId/keywords', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    console.log('=== FETCHING KEYWORDS ===');
    console.log('Campaign ID:', req.params.campaignId);
    const keywords = await simplifiClient.getCampaignKeywords(req.params.campaignId);
    console.log('Keywords Response:', JSON.stringify(keywords, null, 2).substring(0, 500));
    res.json(keywords);
  } catch (error) {
    console.error('Error fetching keywords:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get campaign with full targeting info
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/targeting', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const campaign = await simplifiClient.getCampaignWithTargeting(req.params.orgId, req.params.campaignId);
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign targeting:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simplifi/campaigns/:campaignId/ads', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const ads = await simplifiClient.getCampaignAds(req.params.campaignId);
    console.log('=== ADS API RESPONSE ===');
    console.log('Campaign ID:', req.params.campaignId);
    console.log('Response:', JSON.stringify(ads, null, 2));
    console.log('========================');
    res.json(ads);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all ads with details for an organization (aggregates from all campaigns)
app.get('/api/simplifi/organizations/:orgId/ads', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    
    // First get all campaigns
    const campaignsData = await simplifiClient.getCampaigns(req.params.orgId, {});
    const campaigns = campaignsData.campaigns || [];
    
    // Then get ads for each campaign (limit to avoid too many API calls)
    let allAds = [];
    for (const campaign of campaigns.slice(0, 20)) {
      try {
        const adsData = await simplifiClient.getCampaignAds(campaign.id);
        const ads = (adsData.ads || []).map(ad => ({
          ...ad,
          campaign_id: campaign.id,
          campaign_name: campaign.name
        }));
        allAds = allAds.concat(ads);
      } catch (e) {
        console.error(`Error fetching ads for campaign ${campaign.id}:`, e.message);
      }
    }
    
    res.json({ ads: allAds });
  } catch (error) {
    console.error('Error fetching organization ads:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simplifi/organizations/:orgId/stats', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }

    const { startDate, endDate, campaignId, byCampaign, byDay, byAd } = req.query;
    
    // Check cache first
    const cacheKey = `stats:${req.params.orgId}:${startDate}:${endDate}:${campaignId || 'all'}:${byCampaign}:${byDay}:${byAd}`;
    const cached = dbHelper.getCachedStats(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const stats = await simplifiClient.getCampaignStats(req.params.orgId, {
      startDate,
      endDate,
      campaignId: campaignId ? parseInt(campaignId) : undefined,
      byCampaign: byCampaign === 'true',
      byDay: byDay === 'true',
      byAd: byAd === 'true'
    });

    // Cache for 15 minutes
    dbHelper.setCachedStats(cacheKey, stats, 15);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORT CONFIG ROUTES
// ============================================

// ============================================
// REPORT CENTER API ROUTES (Simpli.fi Report Center)
// ============================================

// Get all available report templates
app.get('/api/simplifi/organizations/:orgId/report-center/templates', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const templates = await simplifiClient.getReportTemplates(req.params.orgId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific template details
app.get('/api/simplifi/organizations/:orgId/report-center/templates/:templateId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const template = await simplifiClient.getReportTemplate(req.params.orgId, req.params.templateId);
    res.json(template);
  } catch (error) {
    console.error('Error fetching report template:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all report models for an organization
app.get('/api/simplifi/organizations/:orgId/report-center/reports', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const reports = await simplifiClient.getReports(req.params.orgId, req.query);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new report model from a template
app.post('/api/simplifi/organizations/:orgId/report-center/reports', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const { templateId, title } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required' });
    }
    const report = await simplifiClient.createReportModel(req.params.orgId, templateId, title);
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report model:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific report model
app.get('/api/simplifi/organizations/:orgId/report-center/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const report = await simplifiClient.getReportModel(req.params.orgId, req.params.reportId);
    res.json(report);
  } catch (error) {
    console.error('Error fetching report model:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a report model
app.put('/api/simplifi/organizations/:orgId/report-center/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const report = await simplifiClient.updateReportModel(req.params.orgId, req.params.reportId, req.body);
    res.json(report);
  } catch (error) {
    console.error('Error updating report model:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a report model
app.delete('/api/simplifi/organizations/:orgId/report-center/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    await simplifiClient.deleteReportModel(req.params.orgId, req.params.reportId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting report model:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a report snapshot (one-time async report)
app.post('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/snapshots', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const { filters, format, webhookUrls, recipients } = req.body;
    const snapshot = await simplifiClient.createReportSnapshot(req.params.orgId, req.params.reportId, {
      filters,
      format,
      webhookUrls,
      recipients
    });
    res.status(202).json(snapshot);
  } catch (error) {
    console.error('Error creating report snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all snapshots for a report
app.get('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/snapshots', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const snapshots = await simplifiClient.getReportSnapshots(req.params.orgId, req.params.reportId);
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific snapshot
app.get('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/snapshots/:snapshotId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const snapshot = await simplifiClient.getReportSnapshot(req.params.orgId, req.params.reportId, req.params.snapshotId);
    res.json(snapshot);
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download a snapshot (proxy to handle auth)
app.get('/api/simplifi/report-center/download', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Download URL is required' });
    }
    const data = await simplifiClient.downloadSnapshot(url);
    res.json(data);
  } catch (error) {
    console.error('Error downloading snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a report schedule
app.post('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const { interval, onDay, format, filters, webhookUrls, recipients } = req.body;
    const schedule = await simplifiClient.createReportSchedule(req.params.orgId, req.params.reportId, {
      interval,
      onDay,
      format,
      filters,
      webhookUrls,
      recipients
    });
    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all schedules for a report
app.get('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const schedules = await simplifiClient.getReportSchedules(
      req.params.orgId, 
      req.params.reportId, 
      req.query.children === 'true'
    );
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific schedule
app.get('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules/:scheduleId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const schedule = await simplifiClient.getReportSchedule(
      req.params.orgId, 
      req.params.reportId, 
      req.params.scheduleId
    );
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a schedule
app.put('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules/:scheduleId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const schedule = await simplifiClient.updateReportSchedule(
      req.params.orgId, 
      req.params.reportId, 
      req.params.scheduleId,
      req.body
    );
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a schedule
app.delete('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules/:scheduleId', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    await simplifiClient.deleteReportSchedule(req.params.orgId, req.params.reportId, req.params.scheduleId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enable a schedule
app.post('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules/:scheduleId/enable', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const result = await simplifiClient.enableReportSchedule(
      req.params.orgId, 
      req.params.reportId, 
      req.params.scheduleId
    );
    res.json(result);
  } catch (error) {
    console.error('Error enabling schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disable a schedule
app.post('/api/simplifi/organizations/:orgId/report-center/reports/:reportId/schedules/:scheduleId/disable', authenticateToken, async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }
    const result = await simplifiClient.disableReportSchedule(
      req.params.orgId, 
      req.params.reportId, 
      req.params.scheduleId
    );
    res.json(result);
  } catch (error) {
    console.error('Error disabling schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint to receive report notifications from Simpli.fi
app.post('/api/webhooks/simplifi-report', (req, res) => {
  try {
    console.log('=== SIMPLI.FI WEBHOOK RECEIVED ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const { report_id, schedule_id, snapshot_id, download_link, report_filename } = req.body;
    
    // Store webhook notification in database for processing
    // In production, you'd process this async and download the report
    dbHelper.storeWebhookNotification({
      reportId: report_id,
      scheduleId: schedule_id,
      snapshotId: snapshot_id,
      downloadLink: download_link,
      filename: report_filename,
      receivedAt: new Date().toISOString()
    });
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================
// REPORT CENTER ENHANCED DATA ENDPOINTS
// ============================================

// Get geo-fence performance (impressions per location)
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/geofence-performance', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching geo-fence performance for campaign ${campaignId}...`);
    const data = await reportCenterService.getGeoFencePerformance(orgId, campaignId, start, end);
    res.json({ geofence_performance: data || [] });
  } catch (error) {
    console.error('Error fetching geo-fence performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get location performance (city/metro/region breakdown)
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/location-performance', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching location performance for campaign ${campaignId}...`);
    const data = await reportCenterService.getLocationPerformance(orgId, campaignId, start, end);
    res.json({ location_performance: data || [] });
  } catch (error) {
    console.error('Error fetching location performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get conversion data
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/conversions', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching conversion data for campaign ${campaignId}...`);
    const data = await reportCenterService.getConversionData(orgId, campaignId, start, end);
    res.json({ conversions: data });
  } catch (error) {
    console.error('Error fetching conversion data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get device breakdown
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/device-breakdown', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching device breakdown for campaign ${campaignId}...`);
    const data = await reportCenterService.getDeviceBreakdown(orgId, campaignId, start, end);
    res.json({ device_breakdown: data || [] });
  } catch (error) {
    console.error('Error fetching device breakdown:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get viewability metrics
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/viewability', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching viewability metrics for campaign ${campaignId}...`);
    const data = await reportCenterService.getViewabilityMetrics(orgId, campaignId, start, end);
    res.json({ viewability: data });
  } catch (error) {
    console.error('Error fetching viewability metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get domain/placement performance (for OTT)
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/domain-performance', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching domain performance for campaign ${campaignId}...`);
    const data = await reportCenterService.getDomainPerformance(orgId, campaignId, start, end);
    res.json({ domain_performance: data || [] });
  } catch (error) {
    console.error('Error fetching domain performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get keyword performance
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/keyword-performance', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching keyword performance for campaign ${campaignId}...`);
    const data = await reportCenterService.getKeywordPerformance(orgId, campaignId, start, end);
    res.json({ keyword_performance: data || [] });
  } catch (error) {
    console.error('Error fetching keyword performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ALL enhanced data for a campaign in one call
app.get('/api/simplifi/organizations/:orgId/campaigns/:campaignId/enhanced-data', authenticateToken, async (req, res) => {
  try {
    if (!reportCenterService) {
      return res.status(503).json({ error: 'Report Center service not configured' });
    }
    
    const { orgId, campaignId } = req.params;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`Fetching all enhanced data for campaign ${campaignId}...`);
    const data = await reportCenterService.getEnhancedCampaignData(orgId, campaignId, start, end);
    res.json(data);
  } catch (error) {
    console.error('Error fetching enhanced data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CLIENT REPORT CONFIG ROUTES
// ============================================

app.get('/api/clients/:clientId/reports', authenticateToken, (req, res) => {
  try {
    const reports = dbHelper.getReportConfigsByClient(req.params.clientId);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/clients/:clientId/reports', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, description, campaignIds, metricsConfig, layoutConfig } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Report name is required' });
    }

    const report = dbHelper.createReportConfig(
      req.params.clientId,
      name,
      description || '',
      campaignIds || [],
      metricsConfig || { showImpressions: true, showClicks: true, showCTR: true, showSpend: true },
      layoutConfig || { sections: ['summary', 'campaigns', 'daily'] }
    );
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

app.get('/api/reports/:id', authenticateToken, (req, res) => {
  try {
    const report = dbHelper.getReportConfigById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// ============================================
// PUBLIC REPORT LINK ROUTES
// ============================================

app.post('/api/reports/:id/links', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { expiresAt } = req.body;
    const link = dbHelper.createReportLink(req.params.id, expiresAt);
    res.status(201).json({
      ...link,
      url: `/report/${link.token}`
    });
  } catch (error) {
    console.error('Error creating report link:', error);
    res.status(500).json({ error: 'Failed to create report link' });
  }
});

// ============================================
// PUBLIC CLIENT REPORT (using share_token)
// ============================================

// PUBLIC ROUTE - Get client data by share token (no auth)
app.get('/api/public/client/:token', async (req, res) => {
  try {
    const client = dbHelper.getClientByShareToken(req.params.token);
    
    if (!client) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Return client info (without sensitive data)
    res.json({
      id: client.id,
      name: client.name,
      brand_name: client.brand_name,
      logo_path: client.logo_path,
      primary_color: client.primary_color,
      secondary_color: client.secondary_color,
      campaign_goal: client.campaign_goal,
      monthly_budget: client.monthly_budget,
      start_date: client.start_date,
      contact_name: client.contact_name,
      simplifi_org_id: client.simplifi_org_id
    });
  } catch (error) {
    console.error('Error fetching public client:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// PUBLIC ROUTE - Get campaign stats for public report
app.get('/api/public/client/:token/stats', async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }

    const client = dbHelper.getClientByShareToken(req.params.token);
    
    if (!client || !client.simplifi_org_id) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { startDate, endDate } = req.query;
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get campaigns with ads
    const campaignsData = await simplifiClient.getCampaignsWithAds(client.simplifi_org_id);
    
    // Get overall stats by campaign
    const statsData = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start,
      endDate: end,
      byCampaign: true
    });
    
    // Get daily stats for charts
    const dailyData = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start,
      endDate: end,
      byDay: true
    });

    // Get ad stats
    const adStatsData = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start,
      endDate: end,
      byAd: true
    });

    res.json({
      campaigns: campaignsData.campaigns || [],
      campaignStats: statsData.campaign_stats || [],
      dailyStats: (dailyData.campaign_stats || []).sort((a, b) => new Date(a.stat_date) - new Date(b.stat_date)),
      adStats: adStatsData.campaign_stats || [],
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PUBLIC ROUTE - No auth required
app.get('/api/public/reports/:token', async (req, res) => {
  try {
    const reportLink = dbHelper.getReportLinkByToken(req.params.token);
    
    if (!reportLink) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check expiration
    if (reportLink.expires_at && new Date(reportLink.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Report link has expired' });
    }

    // Parse JSON fields
    const report = {
      ...reportLink,
      campaign_ids: JSON.parse(reportLink.campaign_ids || '[]'),
      metrics_config: JSON.parse(reportLink.metrics_config || '{}'),
      layout_config: JSON.parse(reportLink.layout_config || '{}')
    };

    res.json(report);
  } catch (error) {
    console.error('Error fetching public report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// PUBLIC ROUTE - Get stats for public report
app.get('/api/public/reports/:token/stats', async (req, res) => {
  try {
    if (!simplifiClient) {
      return res.status(503).json({ error: 'Simpli.fi API not configured' });
    }

    const reportLink = dbHelper.getReportLinkByToken(req.params.token);
    
    if (!reportLink) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (reportLink.expires_at && new Date(reportLink.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Report link has expired' });
    }

    const { startDate, endDate } = req.query;
    const campaignIds = JSON.parse(reportLink.campaign_ids || '[]');

    // Get overall stats
    const overallStats = await simplifiClient.getCampaignStats(reportLink.simplifi_org_id, {
      startDate,
      endDate
    });

    // Get stats by campaign
    const campaignStats = await simplifiClient.getCampaignStats(reportLink.simplifi_org_id, {
      startDate,
      endDate,
      byCampaign: true
    });

    // Get daily stats
    const dailyStats = await simplifiClient.getCampaignStats(reportLink.simplifi_org_id, {
      startDate,
      endDate,
      byDay: true
    });

    // Filter to only configured campaigns if specified
    let filteredCampaignStats = campaignStats.campaign_stats;
    if (campaignIds.length > 0) {
      filteredCampaignStats = campaignStats.campaign_stats.filter(
        stat => campaignIds.includes(stat.campaign_id)
      );
    }

    res.json({
      overall: overallStats.campaign_stats[0] || null,
      byCampaign: filteredCampaignStats,
      byDay: dailyStats.campaign_stats
    });
  } catch (error) {
    console.error('Error fetching public report stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    simplifiConfigured: !!simplifiClient,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

// ============================================
// PDF REPORT GENERATION
// ============================================

// Generate PDF report for a client
app.get('/api/clients/:clientId/report/pdf', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { startDate, endDate, includeHistory } = req.query;
    
    console.log('=== GENERATING PDF REPORT ===');
    console.log('Client ID:', clientId);
    
    // Get client info
    const client = dbHelper.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    if (!client.simplifi_org_id) {
      return res.status(400).json({ error: 'Client has no Simpli.fi organization linked' });
    }
    
    // Get campaigns
    const campaignsData = await simplifiClient.getCampaignsWithAds(client.simplifi_org_id);
    const campaigns = campaignsData.campaigns || [];
    
    // Calculate date ranges
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get current period stats
    const currentStats = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });

    // Get daily stats for chart
    const dailyStatsResponse = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      byDay: true
    });

    // Aggregate daily stats
    const dailyTotals = {};
    (dailyStatsResponse.campaign_stats || []).forEach(day => {
      const date = day.stat_date;
      if (!dailyTotals[date]) {
        dailyTotals[date] = { date, impressions: 0, clicks: 0, spend: 0 };
      }
      dailyTotals[date].impressions += day.impressions || 0;
      dailyTotals[date].clicks += day.clicks || 0;
      dailyTotals[date].spend += day.total_spend || 0;
    });
    const dailyStats = Object.values(dailyTotals).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build campaign stats map
    const campaignStats = {};
    (currentStats.campaign_stats || []).forEach(stat => {
      campaignStats[stat.campaign_id] = stat;
    });
    
    // For 12-month history
    let history = null;
    let monthlyBreakdown = [];
    
    if (includeHistory === 'true') {
      // Get stats for each of the last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0);
        const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
        
        try {
          const monthStats = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
            startDate: monthStart.toISOString().split('T')[0],
            endDate: monthEnd.toISOString().split('T')[0]
          });
          
          let monthImpressions = 0, monthClicks = 0, monthSpend = 0;
          (monthStats.campaign_stats || []).forEach(s => {
            monthImpressions += s.impressions || 0;
            monthClicks += s.clicks || 0;
            monthSpend += s.total_spend || 0;
          });
          
          monthlyBreakdown.push({
            month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            impressions: monthImpressions,
            clicks: monthClicks,
            spend: monthSpend,
            ctr: monthImpressions > 0 ? (monthClicks / monthImpressions * 100) : 0
          });
        } catch (e) {
          monthlyBreakdown.push({
            month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            impressions: 0, clicks: 0, spend: 0, ctr: 0
          });
        }
      }

      // Calculate all-time highs from monthly data
      const allTimeHighs = monthlyBreakdown.length > 0 ? {
        impressions: Math.max(...monthlyBreakdown.map(m => m.impressions)),
        clicks: Math.max(...monthlyBreakdown.map(m => m.clicks)),
        ctr: Math.max(...monthlyBreakdown.map(m => m.ctr)),
        bestMonth: monthlyBreakdown.reduce((best, m) => m.impressions > best.impressions ? m : best, monthlyBreakdown[0])
      } : null;

      // Calculate growth (compare last month to previous month)
      const growth = monthlyBreakdown.length >= 2 ? {
        impressions: monthlyBreakdown[monthlyBreakdown.length - 2].impressions > 0 
          ? ((monthlyBreakdown[monthlyBreakdown.length - 1].impressions - monthlyBreakdown[monthlyBreakdown.length - 2].impressions) / monthlyBreakdown[monthlyBreakdown.length - 2].impressions * 100)
          : 0,
        clicks: monthlyBreakdown[monthlyBreakdown.length - 2].clicks > 0
          ? ((monthlyBreakdown[monthlyBreakdown.length - 1].clicks - monthlyBreakdown[monthlyBreakdown.length - 2].clicks) / monthlyBreakdown[monthlyBreakdown.length - 2].clicks * 100)
          : 0
      } : null;

      history = {
        monthlyBreakdown,
        allTimeHighs,
        growth,
        totalImpressions: monthlyBreakdown.reduce((sum, m) => sum + m.impressions, 0),
        totalClicks: monthlyBreakdown.reduce((sum, m) => sum + m.clicks, 0),
        totalSpend: monthlyBreakdown.reduce((sum, m) => sum + m.spend, 0)
      };
    }
    
    // Check if we should generate actual PDF or just return data
    const returnPDF = req.query.download === 'true';
    
    if (returnPDF) {
      // Generate actual PDF using puppeteer
      try {
        const pdfBuffer = await generateProfessionalPDF({
          client,
          dateRange: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
          },
          campaigns,
          campaignStats,
          dailyStats,
          history,
          showSpendData: req.query.showSpend === 'true'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${client.name.replace(/[^a-z0-9]/gi, '_')}_Report_${start.toISOString().split('T')[0]}.pdf"`);
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        // Fallback to returning JSON data for frontend rendering
        res.json({
          error: 'PDF generation failed, returning data for frontend rendering',
          fallback: true,
          client: {
            name: client.name,
            brandName: client.brand_name,
            orgId: client.simplifi_org_id,
            logo_url: client.logo_url,
            primary_color: client.primary_color
          },
          dateRange: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
          },
          campaigns,
          campaignStats,
          dailyStats,
          history,
          generatedAt: new Date().toISOString()
        });
      }
    } else {
      // Return JSON data for frontend to render
      const reportData = {
        client: {
          name: client.name,
          brandName: client.brand_name,
          orgId: client.simplifi_org_id,
          logo_url: client.logo_url,
          primary_color: client.primary_color,
          secondary_color: client.secondary_color
        },
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        campaigns,
        campaignStats,
        dailyStats,
        history,
        generatedAt: new Date().toISOString()
      };
      
      res.json(reportData);
    }
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Direct PDF export endpoint - generates and downloads PDF immediately
app.get('/api/clients/:clientId/export-pdf', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { startDate, endDate, showSpendData } = req.query;
    
    console.log('=== EXPORTING PDF ===');
    console.log('Client ID:', clientId);
    console.log('Date Range:', startDate, 'to', endDate);
    
    // Get client info
    const client = dbHelper.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    if (!client.simplifi_org_id) {
      return res.status(400).json({ error: 'Client has no Simpli.fi organization linked' });
    }
    
    // Calculate date ranges
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get campaigns
    const campaignsData = await simplifiClient.getCampaignsWithAds(client.simplifi_org_id);
    const campaigns = campaignsData.campaigns || [];
    
    // Get current period stats
    const currentStats = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });

    // Get daily stats for chart
    const dailyStatsResponse = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      byDay: true
    });

    // Aggregate daily stats
    const dailyTotals = {};
    (dailyStatsResponse.campaign_stats || []).forEach(day => {
      const date = day.stat_date;
      if (!dailyTotals[date]) {
        dailyTotals[date] = { date, impressions: 0, clicks: 0, spend: 0 };
      }
      dailyTotals[date].impressions += day.impressions || 0;
      dailyTotals[date].clicks += day.clicks || 0;
      dailyTotals[date].spend += day.total_spend || 0;
    });
    const dailyStats = Object.values(dailyTotals).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build campaign stats map
    const campaignStats = {};
    (currentStats.campaign_stats || []).forEach(stat => {
      campaignStats[stat.campaign_id] = stat;
    });
    
    // Get 12-month history
    let history = [];
    try {
      const monthlyBreakdown = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const monthEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0);
        
        const monthStats = await simplifiClient.getCampaignStats(client.simplifi_org_id, {
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        });
        
        let monthImpressions = 0, monthClicks = 0, monthSpend = 0;
        (monthStats.campaign_stats || []).forEach(s => {
          monthImpressions += s.impressions || 0;
          monthClicks += s.clicks || 0;
          monthSpend += s.total_spend || 0;
        });
        
        monthlyBreakdown.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          impressions: monthImpressions,
          clicks: monthClicks,
          spend: monthSpend
        });
      }
      history = monthlyBreakdown;
    } catch (historyError) {
      console.error('Failed to get history:', historyError);
    }
    
    // Generate PDF
    const pdfBuffer = await generateProfessionalPDF({
      client: {
        ...client,
        brand_name: client.brand_name
      },
      dateRange: {
        start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      },
      campaigns,
      campaignStats,
      dailyStats,
      history,
      showSpendData: showSpendData === 'true'
    });

    // Send PDF
    const filename = `${client.name.replace(/[^a-z0-9]/gi, '_')}_Report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    // Initialize database (async for sql.js)
    await initializeDatabase();
    dbHelper = new DatabaseHelper();
    seedInitialData();
    console.log('✓ Database initialized');

    // Initialize Simpli.fi client
    if (process.env.SIMPLIFI_APP_KEY && process.env.SIMPLIFI_USER_KEY) {
      simplifiClient = new SimplifiClient(
        process.env.SIMPLIFI_APP_KEY,
        process.env.SIMPLIFI_USER_KEY
      );
      console.log('✓ Simpli.fi client initialized');
      
      // Initialize Report Center service
      reportCenterService = new ReportCenterService(
        process.env.SIMPLIFI_APP_KEY,
        process.env.SIMPLIFI_USER_KEY
      );
      console.log('✓ Report Center service initialized');
    } else {
      console.warn('⚠ Simpli.fi API keys not configured. Add them to .env file.');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Simpli.fi Reports Server Started                ║
╠═══════════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                         ║
║  API:      http://localhost:${PORT}/api                     ║
╠═══════════════════════════════════════════════════════════╣
║  Simpli.fi:      ${simplifiClient ? '✓ Connected' : '✗ Not configured'}                      ║
║  Report Center:  ${reportCenterService ? '✓ Ready' : '✗ Not configured'}                         ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
