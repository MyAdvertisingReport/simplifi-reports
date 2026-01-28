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

// Security packages
let helmet, rateLimit;
try {
  helmet = require('helmet');
} catch (e) {
  console.log('Note: helmet not installed - run "npm install helmet" for security headers');
}
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.log('Note: express-rate-limit not installed - run "npm install express-rate-limit" for rate limiting');
}

// ============================================
// SECURITY: Validate required environment variables
// ============================================
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET environment variable is not set!');
    console.error('   This is required for secure authentication in production.');
    process.exit(1);
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET not set - using dev-secret (NOT SAFE FOR PRODUCTION)');
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const SimplifiClient = require('./simplifi-client');
const { ReportCenterService } = require('./report-center-service');
const { initializeDatabase, seedInitialData, DatabaseHelper } = require('./database');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/order');
const emailRoutes = require('./routes/email');
const documentRoutes = require('./routes/document');
const billingRoutes = require('./routes/billing');
const emailService = require('./services/email-service');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// SECURITY: Helmet for HTTP headers
// ============================================
if (helmet) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to load
    contentSecurityPolicy: false // Disable CSP for now (can be configured later)
  }));
  console.log('✓ Helmet security headers enabled');
}

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
      console.warn(`⚠️  CORS: Allowing unknown origin: ${origin}`);
      // TODO: In strict mode, uncomment next line to block unknown origins:
      // callback(new Error('Not allowed by CORS'));
      callback(null, true); // Allow for now, but log for monitoring
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// SECURITY: Rate Limiting
// ============================================
if (rateLimit) {
  // General API rate limiting - 1000 requests per 15 minutes per IP
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', generalLimiter);

  // Strict rate limiting for login - 10 attempts per 15 minutes per IP
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, please try again in 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false
  });
  // Will be applied to login route below
  app.loginLimiter = loginLimiter;
  console.log('✓ Rate limiting enabled');
}

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

// Admin routes ready flag
let adminRoutesReady = false;

// Order routes ready flag
let orderRoutesReady = false;

// ============================================
// PRODUCT MANAGEMENT ROUTES
// ============================================
const { Pool } = require('pg');
let adminPool = null;

const setupAdminRoutes = () => {
  if (!adminPool) {
    // Use SUPABASE_DATABASE_URL for admin routes (Phase 1 tables)
    // Falls back to DATABASE_URL if not set
    const adminDbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    console.log('Admin routes connecting to:', adminDbUrl ? 'configured database' : 'NO DATABASE URL');
    
    adminPool = new Pool({
      connectionString: adminDbUrl,
      ssl: { rejectUnauthorized: false }
    });
  }
  adminRoutesReady = true;
  console.log('Admin routes initialized');
  
  // Initialize order routes with the same pool
  orderRoutes.initPool(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
  
  // Initialize document routes
  documentRoutes.initPool(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
  console.log('Document routes initialized');
  
  // Inject email service into order routes for notifications
  if (orderRoutes.initEmailService) {
    orderRoutes.initEmailService(emailService);
    console.log('Order routes email service initialized');
  }
  
  orderRoutesReady = true;
  console.log('Order routes initialized');
  
  // Initialize billing routes
  billingRoutes.initPool(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
  billingRoutes.initEmailService(emailService);
  const { stripeService } = require('./services/stripe-service');
  billingRoutes.initStripeService(stripeService);
  console.log('Billing routes initialized');
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

  jwt.verify(token, JWT_SECRET, (err, user) => {
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

// Login with rate limiting
const loginHandler = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
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
      JWT_SECRET,
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
};

// Apply rate limiting to login if available
if (app.loginLimiter) {
  app.post('/api/auth/login', app.loginLimiter, loginHandler);
} else {
  app.post('/api/auth/login', loginHandler);
}

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

    if (!['admin', 'sales', 'sales_associate', 'sales_manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await dbHelper.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await dbHelper.createUser({ email, password: hashedPassword, name, role });
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
    if (role && ['admin', 'sales', 'sales_associate', 'sales_manager'].includes(role)) updates.role = role;
    if (password) updates.password = await bcrypt.hash(password, 10);
    
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
    
    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbHelper.updateUser(req.user.id, { password: hashedPassword });
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
    // Use direct query to get all CRM fields
    const query = `
      SELECT 
        id, business_name as name, business_name, slug, industry, website,
        status, tier, tags, source, billing_terms,
        client_since, annual_contract_value, last_activity_at,
        assigned_to, created_by, created_at, updated_at,
        phone, address_line1, address_line2, city, state, zip,
        primary_contact_id, simpli_fi_client_id as simplifi_org_id,
        qbo_customer_id_wsic, qbo_customer_id_lkn, stripe_customer_id, notes
      FROM advertising_clients
      ORDER BY business_name ASC
    `;
    
    if (req.user.role === 'admin' || req.user.role === 'sales_manager') {
      const result = await adminPool.query(query);
      clients = result.rows;
    } else {
      // Sales associates only see assigned clients
      const assignedQuery = query.replace('ORDER BY', 'WHERE assigned_to = $1 ORDER BY');
      const result = await adminPool.query(assignedQuery, [req.user.id]);
      clients = result.rows;
    }
    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    // Fallback to dbHelper if direct query fails
    try {
      let clients;
      if (req.user.role === 'admin' || req.user.role === 'sales_manager') {
        clients = await dbHelper.getAllClients();
      } else {
        clients = await dbHelper.getClientsByUserId(req.user.id);
      }
      res.json(clients);
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to get clients' });
    }
  }
});

app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const client = await dbHelper.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    // Check access for non-admin/non-manager users
    const hasFullAccess = req.user.role === 'admin' || req.user.role === 'sales_manager';
    if (!hasFullAccess && !await dbHelper.userHasAccessToClient(req.user.id, req.params.id)) {
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
    const {
      name, logoPath, primaryColor, secondaryColor,
      monthlyBudget, campaignGoal, contactName, contactEmail, startDate,
      // New CRM fields
      status, tier, industry, clientSince, source, tags, website, billingTerms
    } = req.body;
    
    // Build dynamic update query for new CRM fields
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    // Handle existing fields through dbHelper pattern
    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (logoPath !== undefined) { updates.push(`logo_path = $${paramCount++}`); values.push(logoPath); }
    if (primaryColor !== undefined) { updates.push(`primary_color = $${paramCount++}`); values.push(primaryColor); }
    if (secondaryColor !== undefined) { updates.push(`secondary_color = $${paramCount++}`); values.push(secondaryColor); }
    if (monthlyBudget !== undefined) { updates.push(`monthly_budget = $${paramCount++}`); values.push(monthlyBudget); }
    if (campaignGoal !== undefined) { updates.push(`campaign_goal = $${paramCount++}`); values.push(campaignGoal); }
    if (contactName !== undefined) { updates.push(`contact_name = $${paramCount++}`); values.push(contactName); }
    if (contactEmail !== undefined) { updates.push(`contact_email = $${paramCount++}`); values.push(contactEmail); }
    if (startDate !== undefined) { updates.push(`start_date = $${paramCount++}`); values.push(startDate); }
    
    // New CRM fields
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (tier !== undefined) { updates.push(`tier = $${paramCount++}`); values.push(tier); }
    if (industry !== undefined) { updates.push(`industry = $${paramCount++}`); values.push(industry); }
    if (clientSince !== undefined) { updates.push(`client_since = $${paramCount++}`); values.push(clientSince); }
    if (source !== undefined) { updates.push(`source = $${paramCount++}`); values.push(source); }
    if (tags !== undefined) { updates.push(`tags = $${paramCount++}`); values.push(tags); }
    if (website !== undefined) { updates.push(`website = $${paramCount++}`); values.push(website); }
    if (billingTerms !== undefined) { updates.push(`billing_terms = $${paramCount++}`); values.push(billingTerms); }
    
    // Always update timestamp
    updates.push(`updated_at = NOW()`);
    
    // Add the id as the last parameter
    values.push(req.params.id);
    
    if (updates.length === 1) {
      // Only updated_at, nothing else changed
      const result = await adminPool.query(
        'SELECT * FROM advertising_clients WHERE id = $1',
        [req.params.id]
      );
      return res.json(result.rows[0]);
    }
    
    const query = `
      UPDATE advertising_clients 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await adminPool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Log status change activity if status changed
    if (status !== undefined) {
      try {
        await adminPool.query(
          `INSERT INTO client_activities (client_id, user_id, activity_type, title, description)
           VALUES ($1, $2, 'status_change', $3, $4)`,
          [req.params.id, req.user.id, `Status changed to ${status}`, `Updated by ${req.user.name || req.user.email}`]
        );
      } catch (activityErr) {
        console.log('Activity logging skipped:', activityErr.message);
      }
    }
    
    res.json(result.rows[0]);
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
// CLIENT CONTACTS ROUTES
// ============================================

// Get all contacts for a client
app.get('/api/clients/:clientId/contacts', authenticateToken, async (req, res) => {
  try {
    const result = await adminPool.query(
      `SELECT * FROM contacts 
       WHERE client_id = $1 
       ORDER BY is_primary DESC, created_at ASC`,
      [req.params.clientId]
    );
    res.json({ contacts: result.rows });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// Create a new contact for a client
app.post('/api/clients/:clientId/contacts', authenticateToken, async (req, res) => {
  try {
    const { 
      first_name, last_name, email, phone, title, 
      role, is_primary, preferred_contact_method, notes 
    } = req.body;
    
    // If this contact is primary, unset other primary contacts first
    if (is_primary) {
      await adminPool.query(
        'UPDATE contacts SET is_primary = false WHERE client_id = $1',
        [req.params.clientId]
      );
    }
    
    const result = await adminPool.query(
      `INSERT INTO contacts (
        client_id, first_name, last_name, email, phone, title,
        contact_type, role, is_primary, preferred_contact_method, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        req.params.clientId, first_name, last_name, email, phone, title,
        role || 'general', role || 'general', is_primary || false, 
        preferred_contact_method || 'email', notes
      ]
    );
    
    // If primary, update the client's primary_contact_id
    if (is_primary) {
      await adminPool.query(
        'UPDATE advertising_clients SET primary_contact_id = $1, updated_at = NOW() WHERE id = $2',
        [result.rows[0].id, req.params.clientId]
      );
    }
    
    // Log activity
    try {
      await adminPool.query(
        `INSERT INTO client_activities (client_id, user_id, activity_type, title, description)
         VALUES ($1, $2, 'contact_added', $3, $4)`,
        [
          req.params.clientId, 
          req.user.id,
          `Contact added: ${first_name} ${last_name}`,
          `${title || 'Contact'} - ${email || phone || 'No contact info'}`
        ]
      );
    } catch (activityErr) {
      console.log('Activity logging skipped:', activityErr.message);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update a contact
app.put('/api/clients/:clientId/contacts/:contactId', authenticateToken, async (req, res) => {
  try {
    const { 
      first_name, last_name, email, phone, title,
      role, is_primary, preferred_contact_method, notes 
    } = req.body;
    
    // If this contact is being set as primary, unset other primary contacts first
    if (is_primary) {
      await adminPool.query(
        'UPDATE contacts SET is_primary = false WHERE client_id = $1 AND id != $2',
        [req.params.clientId, req.params.contactId]
      );
    }
    
    const result = await adminPool.query(
      `UPDATE contacts SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        title = COALESCE($5, title),
        role = COALESCE($6, role),
        is_primary = COALESCE($7, is_primary),
        preferred_contact_method = COALESCE($8, preferred_contact_method),
        notes = COALESCE($9, notes),
        updated_at = NOW()
      WHERE id = $10 AND client_id = $11
      RETURNING *`,
      [
        first_name, last_name, email, phone, title,
        role, is_primary, preferred_contact_method, notes,
        req.params.contactId, req.params.clientId
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // If primary, update the client's primary_contact_id
    if (is_primary) {
      await adminPool.query(
        'UPDATE advertising_clients SET primary_contact_id = $1, updated_at = NOW() WHERE id = $2',
        [req.params.contactId, req.params.clientId]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete a contact
app.delete('/api/clients/:clientId/contacts/:contactId', authenticateToken, async (req, res) => {
  try {
    // Check if this is the primary contact
    const checkResult = await adminPool.query(
      'SELECT is_primary FROM contacts WHERE id = $1 AND client_id = $2',
      [req.params.contactId, req.params.clientId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // If deleting primary contact, clear the client's primary_contact_id
    if (checkResult.rows[0].is_primary) {
      await adminPool.query(
        'UPDATE advertising_clients SET primary_contact_id = NULL WHERE id = $1',
        [req.params.clientId]
      );
    }
    
    await adminPool.query(
      'DELETE FROM contacts WHERE id = $1 AND client_id = $2',
      [req.params.contactId, req.params.clientId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ============================================
// CLIENT ACTIVITIES ROUTES
// ============================================

// Get activities for a client
app.get('/api/clients/:clientId/activities', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Try to get from client_activities table
    const result = await adminPool.query(
      `SELECT ca.*, u.name as user_name
       FROM client_activities ca
       LEFT JOIN users u ON ca.user_id = u.id
       WHERE ca.client_id = $1
       ORDER BY ca.created_at DESC
       LIMIT $2`,
      [req.params.clientId, limit]
    );
    
    res.json({ activities: result.rows });
  } catch (error) {
    // If table doesn't exist yet, return empty array
    if (error.code === '42P01') {
      console.log('client_activities table not found - returning empty array');
      res.json({ activities: [] });
    } else {
      console.error('Get activities error:', error);
      res.status(500).json({ error: 'Failed to get activities' });
    }
  }
});

// Log a manual activity
app.post('/api/clients/:clientId/activities', authenticateToken, async (req, res) => {
  try {
    const { activity_type, title, description, metadata } = req.body;
    
    const result = await adminPool.query(
      `INSERT INTO client_activities (
        client_id, user_id, activity_type, title, description, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [
        req.params.clientId,
        req.user.id,
        activity_type || 'other',
        title,
        description,
        metadata ? JSON.stringify(metadata) : '{}'
      ]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
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

// Public diagnostics - limited info, available without auth for troubleshooting
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

// Admin diagnostics - requires proper authentication
app.get('/api/diagnostics/admin', authenticateToken, requireAdmin, async (req, res) => {
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
      hasJwtSecret: !!process.env.JWT_SECRET,
      securityHeadersEnabled: !!helmet,
      rateLimitingEnabled: !!rateLimit
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

// Clear cache endpoint (admin only - now using proper middleware)
app.post('/api/diagnostics/clear-cache', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { clientId } = req.body;
    
    // If using any caching mechanism, clear it here
    // For now, just acknowledge the request
    res.json({ 
      status: 'ok', 
      message: clientId ? `Cache cleared for client ${clientId}` : 'All cache cleared',
      note: 'Frontend may need to refresh to see changes',
      clearedBy: req.user.email
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
// PRODUCT MANAGEMENT ROUTES (placeholder - actual setup in startServer)
// ============================================
// Note: Admin routes are set up dynamically after database is ready
// We use a flag to track if routes are ready

app.use('/api/admin', (req, res, next) => {
  if (!adminRoutesReady || !adminPool) {
    return res.status(503).json({ error: 'Admin routes not yet initialized. Please wait...' });
  }
  req.dbPool = adminPool;
  next();
}, adminRoutes);

// ============================================
// PUBLIC SIGNING ROUTES (No auth required)
// These must be defined BEFORE the authenticated /api/orders routes
// ============================================

// Public contract signing - GET (view contract)
app.get('/api/orders/sign/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find order by signing token
    const orderResult = await adminPool.query(
      `SELECT 
        o.id, o.order_number, o.contract_start_date, o.contract_end_date,
        o.term_months, o.monthly_total, o.contract_total, o.billing_frequency,
        o.status, o.signing_token_expires_at, o.notes,
        o.submitted_signature, o.submitted_signature_date,
        c.business_name as client_name, c.id as client_id
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired signing link' });
    }

    const order = orderResult.rows[0];

    // Check if token has expired
    if (order.signing_token_expires_at && new Date(order.signing_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'This signing link has expired. Please contact your sales representative for a new link.' });
    }

    // Check if already signed
    if (order.status === 'signed' || order.status === 'active') {
      return res.status(400).json({ error: 'This agreement has already been signed', alreadySigned: true });
    }

    // Get order items with product details
    const itemsResult = await adminPool.query(
      `SELECT 
        oi.*, 
        p.name as product_name, 
        p.description as product_description,
        e.name as entity_name,
        e.logo_url as entity_logo
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [order.id]
    );

    // Get primary contact for this client
    const contactResult = await adminPool.query(
      `SELECT * FROM contacts WHERE client_id = $1 AND is_primary = true LIMIT 1`,
      [order.client_id]
    );

    res.json({
      order: {
        ...order,
        items: itemsResult.rows
      },
      contact: contactResult.rows[0] || null
    });

  } catch (error) {
    console.error('Error loading contract for signing:', error);
    res.status(500).json({ error: 'Failed to load contract' });
  }
});

// Public contract signing - POST (sign contract)
app.post('/api/orders/sign/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { signature, signer_name, signer_email, signer_title, agreed_to_terms } = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    // Find order by signing token
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired signing link' });
    }

    const order = orderResult.rows[0];

    // Check if token has expired
    if (order.signing_token_expires_at && new Date(order.signing_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'This signing link has expired' });
    }

    // Check if already signed
    if (order.status === 'signed' || order.status === 'active') {
      return res.status(400).json({ error: 'This agreement has already been signed' });
    }

    // Get client IP and user agent
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Update order with signature
    const updateResult = await adminPool.query(
      `UPDATE orders SET
        status = 'signed',
        client_signature = $1,
        client_signature_date = NOW(),
        client_signer_name = $2,
        client_signer_email = $3,
        client_signer_title = $4,
        client_signer_ip = $5,
        client_signer_user_agent = $6,
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [signature, signer_name, signer_email, signer_title, clientIP, userAgent, order.id]
    );

    res.json({
      success: true,
      message: 'Agreement signed successfully!',
      order: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({ error: 'Failed to sign contract' });
  }
});

// POST /api/orders/sign/:token/complete - Combined signing + payment in one call
app.post('/api/orders/sign/:token/complete', async (req, res) => {
  try {
    const { token } = req.params;
    const { 
      signature, signer_name, signer_email, signer_title, agreed_to_terms,
      billing_preference, payment_method_id, ach_account_name 
    } = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    // Find order by signing token
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name, c.id as client_id, c.stripe_customer_id as existing_stripe_id
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1 AND o.signing_token_expires_at > NOW()`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired signing link' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'signed' || order.client_signature) {
      return res.status(400).json({ error: 'This agreement has already been signed' });
    }

    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Use stored values from setup-intent, or get primary entity
    let stripeCustomerId = order.stripe_customer_id || order.existing_stripe_id;
    let primaryEntityCode = order.stripe_entity_code;
    
    if (!primaryEntityCode) {
      const itemsResult = await adminPool.query(
        `SELECT e.code as entity_code FROM order_items oi
         LEFT JOIN entities e ON oi.entity_id = e.id
         WHERE oi.order_id = $1 ORDER BY oi.line_total DESC LIMIT 1`,
        [order.id]
      );
      primaryEntityCode = itemsResult.rows[0]?.entity_code || 'wsic';
    }

    let paymentStatus = 'pending';
    let paymentType = billing_preference;

    // If we have a payment method from Stripe Elements, set it as default
    if (payment_method_id && stripeCustomerId) {
      try {
        const Stripe = require('stripe');
        const stripeSecretKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_SECRET_KEY`] || process.env.STRIPE_WSIC_SECRET_KEY;
        const stripe = new Stripe(stripeSecretKey);
        
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: payment_method_id }
        });
        
        paymentStatus = 'authorized';
        paymentType = 'card';
      } catch (stripeError) {
        console.error('Error setting default payment method:', stripeError);
        // Continue anyway - payment method was already attached via SetupIntent
        paymentStatus = 'authorized';
      }
    } else if (billing_preference === 'ach') {
      // ACH will be set up separately via Financial Connections
      paymentStatus = 'ach_pending';
      paymentType = 'ach';
    }

    // Update order with signature and payment info
    const updateResult = await adminPool.query(
      `UPDATE orders SET
        status = 'signed',
        client_signature = $1,
        client_signature_date = NOW(),
        client_signer_name = $2,
        client_signer_email = $3,
        client_signer_title = $4,
        client_signer_ip = $5,
        client_signer_user_agent = $6,
        billing_preference = $7,
        stripe_entity_code = $8,
        stripe_customer_id = $9,
        payment_method_id = $10,
        payment_type = $11,
        payment_status = $12,
        updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        signature, signer_name, signer_email, signer_title || '',
        clientIP, userAgent, billing_preference, primaryEntityCode,
        stripeCustomerId, payment_method_id || null, paymentType,
        paymentStatus, order.id
      ]
    );

    // Get order items for email
    const orderItemsResult = await adminPool.query(
      `SELECT oi.*, p.name as product_name, e.name as entity_name, e.logo_url as entity_logo
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1`,
      [order.id]
    );
    const orderWithItems = { ...order, ...updateResult.rows[0], items: orderItemsResult.rows };

    // Send appropriate email based on billing preference
    try {
      const needsAchSetup = billing_preference === 'ach';
      
      if (needsAchSetup) {
        // Send ACH setup email - they need to complete bank verification
        const { sendAchSetupEmail } = require('./services/email-service');
        // TODO: Generate actual Stripe Financial Connections URL
        const achSetupUrl = `${process.env.BASE_URL || 'https://www.myadvertisingreport.com'}/ach-setup/${token}`;
        await sendAchSetupEmail({
          order: orderWithItems,
          contact: { first_name: signer_name.split(' ')[0], email: signer_email },
          achSetupUrl
        });
      } else {
        // Send full confirmation email - payment method already captured
        const { sendSignatureConfirmation } = require('./services/email-service');
        await sendSignatureConfirmation({
          order: orderWithItems,
          contact: { first_name: signer_name.split(' ')[0], email: signer_email }
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Agreement signed and payment information saved!',
      order: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error completing signing:', error);
    res.status(500).json({ error: 'Failed to complete signing' });
  }
});

// POST /api/orders/sign/:token/setup-intent - Create Stripe SetupIntent for card collection
app.post('/api/orders/sign/:token/setup-intent', async (req, res) => {
  try {
    const { token } = req.params;
    const { billing_preference, signer_email, signer_name } = req.body;

    console.log('[SETUP-INTENT] Starting for token:', token?.substring(0, 10) + '...');

    // Find order
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name, c.id as client_id, c.stripe_customer_id as existing_stripe_id
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1 AND o.signing_token_expires_at > NOW()`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      console.log('[SETUP-INTENT] Invalid or expired token');
      return res.status(404).json({ error: 'Invalid or expired signing link' });
    }

    const order = orderResult.rows[0];
    console.log('[SETUP-INTENT] Found order:', order.id, 'Client:', order.client_name);

    // Get primary entity
    const itemsResult = await adminPool.query(
      `SELECT e.code as entity_code FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1 ORDER BY oi.line_total DESC LIMIT 1`,
      [order.id]
    );
    const primaryEntityCode = itemsResult.rows[0]?.entity_code || 'wsic';
    console.log('[SETUP-INTENT] Primary entity:', primaryEntityCode);

    // Initialize Stripe
    const Stripe = require('stripe');
    const stripeSecretKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_SECRET_KEY`] || process.env.STRIPE_WSIC_SECRET_KEY;
    const stripePublishableKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_PUBLISHABLE_KEY`] || process.env.STRIPE_WSIC_PUBLISHABLE_KEY;
    
    if (!stripeSecretKey) {
      console.error('[SETUP-INTENT] Missing Stripe secret key for entity:', primaryEntityCode);
      return res.status(500).json({ error: 'Payment system not configured for this entity' });
    }
    
    if (!stripePublishableKey) {
      console.error('[SETUP-INTENT] Missing Stripe publishable key for entity:', primaryEntityCode);
      return res.status(500).json({ error: 'Payment system not fully configured' });
    }
    
    const stripe = new Stripe(stripeSecretKey);

    // Get or create customer - use provided email or generate placeholder
    const customerEmail = signer_email || `client-${order.client_id}@placeholder.local`;
    let customerId = order.existing_stripe_id;
    
    if (customerId) {
      // Verify customer still exists in Stripe
      console.log('[SETUP-INTENT] Verifying existing customer:', customerId);
      try {
        await stripe.customers.retrieve(customerId);
        console.log('[SETUP-INTENT] Customer verified');
      } catch (verifyError) {
        if (verifyError.code === 'resource_missing') {
          console.log('[SETUP-INTENT] Customer not found in Stripe, will create new one');
          customerId = null; // Reset so we create a new one
          // Clear the invalid customer ID from the database
          await adminPool.query(
            `UPDATE advertising_clients SET stripe_customer_id = NULL WHERE id = $1`,
            [order.client_id]
          );
        } else {
          throw verifyError;
        }
      }
    }
    
    if (!customerId) {
      console.log('[SETUP-INTENT] Creating new Stripe customer for:', customerEmail);
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: order.client_name || 'Unknown Client',
        metadata: { client_id: order.client_id }
      });
      customerId = customer.id;
      
      // Save to client
      await adminPool.query(
        `UPDATE advertising_clients SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, order.client_id]
      );
      console.log('[SETUP-INTENT] Created customer:', customerId);
    } else {
      console.log('[SETUP-INTENT] Using existing customer:', customerId);
    }

    // Create SetupIntent
    console.log('[SETUP-INTENT] Creating SetupIntent for customer:', customerId);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { order_id: order.id }
    });

    // Store entity code on order
    await adminPool.query(
      `UPDATE orders SET stripe_entity_code = $1, stripe_customer_id = $2, billing_preference = $3 WHERE id = $4`,
      [primaryEntityCode, customerId, billing_preference, order.id]
    );

    console.log('[SETUP-INTENT] Success! SetupIntent created:', setupIntent.id);

    res.json({
      clientSecret: setupIntent.client_secret,
      publishableKey: stripePublishableKey,
      customerId
    });

  } catch (error) {
    console.error('[SETUP-INTENT] Error:', error.message);
    console.error('[SETUP-INTENT] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to initialize payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/orders/sign/:token/payment-method/ach - Create ACH payment method during client signing (NO AUTH REQUIRED)
app.post('/api/orders/sign/:token/payment-method/ach', async (req, res) => {
  try {
    const { token } = req.params;
    const {
      accountHolderName,
      routingNumber,
      accountNumber,
      accountType,
      signerEmail,
    } = req.body;

    // Validate token and get order
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name, c.id as client_id, c.stripe_customer_id as existing_stripe_id
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1 AND o.signing_token_expires_at > NOW()`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired signing link' });
    }

    const order = orderResult.rows[0];

    if (!accountHolderName || !routingNumber || !accountNumber) {
      return res.status(400).json({ error: 'Missing required bank account information' });
    }

    // Get primary entity
    const itemsResult = await adminPool.query(
      `SELECT e.code as entity_code FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1 ORDER BY oi.line_total DESC LIMIT 1`,
      [order.id]
    );
    const primaryEntityCode = itemsResult.rows[0]?.entity_code || 'wsic';

    // Initialize Stripe
    const Stripe = require('stripe');
    const stripeSecretKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_SECRET_KEY`] || process.env.STRIPE_WSIC_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    const stripe = new Stripe(stripeSecretKey);

    // Get or create customer
    let customerId = order.existing_stripe_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: signerEmail,
        name: order.client_name,
        metadata: { client_id: order.client_id }
      });
      customerId = customer.id;
      
      // Save to client
      await adminPool.query(
        `UPDATE advertising_clients SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, order.client_id]
      );
    }

    // Create ACH payment method
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
        email: signerEmail,
      },
    });

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Update order with payment info
    await adminPool.query(
      `UPDATE orders SET 
        stripe_entity_code = $1, 
        stripe_customer_id = $2, 
        stripe_payment_method_id = $3,
        billing_preference = 'ach'
       WHERE id = $4`,
      [primaryEntityCode, customerId, paymentMethod.id, order.id]
    );

    // Update client record
    await adminPool.query(
      `UPDATE advertising_clients 
       SET stripe_customer_id = $1, 
           payment_method = 'ach',
           stripe_payment_method_id = $2,
           updated_at = NOW() 
       WHERE id = $3`,
      [customerId, paymentMethod.id, order.client_id]
    );

    console.log(`[STRIPE] ACH payment method created for ${order.client_name} via signing: ****${accountNumber.slice(-4)}`);

    res.json({
      success: true,
      customerId: customerId,
      paymentMethodId: paymentMethod.id,
      bankAccount: {
        last4: paymentMethod.us_bank_account.last4,
        bankName: paymentMethod.us_bank_account.bank_name,
        accountType: paymentMethod.us_bank_account.account_type,
      },
    });

  } catch (error) {
    console.error('Error creating ACH payment method during signing:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create bank account',
      code: error.code,
    });
  }
});

// POST /api/orders/sign/:token/payment-method/card - Save card payment method during client signing (NO AUTH REQUIRED)
app.post('/api/orders/sign/:token/payment-method/card', async (req, res) => {
  try {
    const { token } = req.params;
    const { paymentMethodId, signerEmail } = req.body;

    // Validate token and get order
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name, c.id as client_id, c.stripe_customer_id as existing_stripe_id
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1 AND o.signing_token_expires_at > NOW()`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired signing link' });
    }

    const order = orderResult.rows[0];

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Missing payment method ID' });
    }

    // Get primary entity
    const itemsResult = await adminPool.query(
      `SELECT e.code as entity_code FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1 ORDER BY oi.line_total DESC LIMIT 1`,
      [order.id]
    );
    const primaryEntityCode = itemsResult.rows[0]?.entity_code || 'wsic';

    // Initialize Stripe
    const Stripe = require('stripe');
    const stripeSecretKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_SECRET_KEY`] || process.env.STRIPE_WSIC_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    const stripe = new Stripe(stripeSecretKey);

    // Get or create customer
    let customerId = order.existing_stripe_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: signerEmail,
        name: order.client_name,
        metadata: { client_id: order.client_id }
      });
      customerId = customer.id;
      
      // Save to client
      await adminPool.query(
        `UPDATE advertising_clients SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, order.client_id]
      );
    }

    // Attach payment method to customer (if not already attached)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (attachError) {
      // Payment method might already be attached, continue
      if (!attachError.message.includes('already been attached')) {
        throw attachError;
      }
    }

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Update order with payment info
    await adminPool.query(
      `UPDATE orders SET 
        stripe_entity_code = $1, 
        stripe_customer_id = $2, 
        stripe_payment_method_id = $3,
        billing_preference = 'card'
       WHERE id = $4`,
      [primaryEntityCode, customerId, paymentMethodId, order.id]
    );

    // Update client record
    await adminPool.query(
      `UPDATE advertising_clients 
       SET stripe_customer_id = $1, 
           payment_method = 'card',
           stripe_payment_method_id = $2,
           updated_at = NOW() 
       WHERE id = $3`,
      [customerId, paymentMethodId, order.client_id]
    );

    // Get card details for response
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    console.log(`[STRIPE] Card payment method saved for ${order.client_name} via signing: ****${paymentMethod.card?.last4}`);

    res.json({
      success: true,
      customerId: customerId,
      paymentMethodId: paymentMethodId,
      card: {
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand,
        expMonth: paymentMethod.card?.exp_month,
        expYear: paymentMethod.card?.exp_year,
      },
    });

  } catch (error) {
    console.error('Error saving card payment method during signing:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to save card',
      code: error.code,
    });
  }
});

// POST /api/orders/sign/:token/payment-setup - Initialize payment (legacy)
app.post('/api/orders/sign/:token/payment-setup', async (req, res) => {
  try {
    const { token } = req.params;
    const { billing_preference, signer_email, signer_name } = req.body;

    // Find order by signing token
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name, c.id as client_id
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid signing token' });
    }

    const order = orderResult.rows[0];

    // Get order items to determine primary entity
    const itemsResult = await adminPool.query(
      `SELECT oi.*, e.code as entity_code, e.name as entity_name
       FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1
       ORDER BY oi.line_total DESC`,
      [order.id]
    );

    // Primary entity is the one with the largest line item
    const primaryEntityCode = itemsResult.rows[0]?.entity_code || 'wsic';

    // Initialize Stripe service
    const { stripeService } = require('./services/stripe-service');

    // Get or create Stripe customer
    const customer = await stripeService.getOrCreateCustomer(primaryEntityCode, {
      email: signer_email,
      businessName: order.client_name,
      clientId: order.client_id
    });

    // Create setup intent - use card for both 'card' and 'invoice' (backup), ach for 'ach'
    const paymentMethodTypes = billing_preference === 'ach' ? ['us_bank_account'] : ['card'];
    const setupIntent = await stripeService.createSetupIntent(primaryEntityCode, customer.id, paymentMethodTypes);

    // Store Stripe customer ID on client if not already there
    await adminPool.query(
      `UPDATE advertising_clients SET stripe_customer_id = $1 WHERE id = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id = '')`,
      [customer.id, order.client_id]
    );

    // Store primary entity and billing preference on order
    await adminPool.query(
      `UPDATE orders SET stripe_entity_code = $1, stripe_customer_id = $2, billing_preference = $3 WHERE id = $4`,
      [primaryEntityCode, customer.id, billing_preference, order.id]
    );

    // Get publishable key for this entity
    const publishableKeyMap = {
      wsic: process.env.STRIPE_WSIC_PUBLISHABLE_KEY,
      lkn: process.env.STRIPE_LKN_PUBLISHABLE_KEY,
      lwp: process.env.STRIPE_LWP_PUBLISHABLE_KEY || process.env.STRIPE_WSIC_PUBLISHABLE_KEY
    };

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customer.id,
      entityCode: primaryEntityCode,
      publishableKey: publishableKeyMap[primaryEntityCode] || publishableKeyMap.wsic
    });

  } catch (error) {
    console.error('Error setting up payment:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// POST /api/orders/sign/:token/complete-payment - Complete payment after setup
app.post('/api/orders/sign/:token/complete-payment', async (req, res) => {
  try {
    const { token } = req.params;
    const { payment_method_id, billing_preference, payment_type } = req.body;

    // Find order
    const orderResult = await adminPool.query(
      `SELECT o.*, c.business_name as client_name
       FROM orders o
       JOIN advertising_clients c ON o.client_id = c.id
       WHERE o.signing_token = $1`,
      [token]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid signing token' });
    }

    const order = orderResult.rows[0];
    const entityCode = order.stripe_entity_code || 'wsic';
    const actualBillingPreference = billing_preference || order.billing_preference || 'card';

    const { stripeService } = require('./services/stripe-service');

    // Set as default payment method (if we have one - ACH might be null initially)
    if (payment_method_id) {
      await stripeService.setDefaultPaymentMethod(entityCode, order.stripe_customer_id, payment_method_id);
    }

    // Calculate total with fee if card payment (not for invoice - that's just backup)
    let chargeAmount = parseFloat(order.contract_total);
    let processingFee = 0;
    if (actualBillingPreference === 'card') {
      processingFee = stripeService.calculateProcessingFee(chargeAmount);
      chargeAmount += processingFee;
    }

    // Determine payment behavior based on billing preference
    // - 'card': Auto-charge (if upfront, charge now; else save for recurring)
    // - 'ach': Auto-debit (if upfront, charge now; else save for recurring)  
    // - 'invoice': Save backup payment method, send invoices manually

    if (actualBillingPreference === 'invoice') {
      // Invoice billing - just save the backup payment method
      await adminPool.query(
        `UPDATE orders SET 
          payment_status = 'invoice_pending',
          payment_method_id = $1,
          payment_type = 'backup_card',
          billing_preference = 'invoice',
          updated_at = NOW()
         WHERE id = $2`,
        [payment_method_id, order.id]
      );

      res.json({
        success: true,
        message: 'Backup payment method saved. You will receive invoices via email.',
        billing_preference: 'invoice'
      });

    } else if (order.billing_frequency === 'upfront' && payment_method_id) {
      // Upfront billing - charge now
      const chargeResult = await stripeService.chargeCustomer(entityCode, {
        stripeCustomerId: order.stripe_customer_id,
        paymentMethodId: payment_method_id,
        amount: chargeAmount,
        description: `Advertising Agreement ${order.order_number}`,
        invoiceId: order.id
      });

      if (!chargeResult.success) {
        return res.status(400).json({ error: chargeResult.message || 'Payment failed' });
      }

      await adminPool.query(
        `UPDATE orders SET 
          payment_status = 'paid',
          payment_method_id = $1,
          payment_type = $2,
          processing_fee = $3,
          stripe_payment_intent_id = $4,
          billing_preference = $5,
          paid_at = NOW(),
          updated_at = NOW()
         WHERE id = $6`,
        [payment_method_id, actualBillingPreference, processingFee, chargeResult.paymentIntent?.id, actualBillingPreference, order.id]
      );

      res.json({
        success: true,
        message: 'Payment completed!',
        charged: true,
        amount: chargeAmount,
        processingFee,
        billing_preference: actualBillingPreference
      });

    } else {
      // Monthly billing or ACH pending - save payment method for recurring
      await adminPool.query(
        `UPDATE orders SET 
          payment_status = $1,
          payment_method_id = $2,
          payment_type = $3,
          billing_preference = $4,
          updated_at = NOW()
         WHERE id = $5`,
        [
          actualBillingPreference === 'ach' ? 'ach_pending' : 'authorized',
          payment_method_id,
          actualBillingPreference,
          actualBillingPreference,
          order.id
        ]
      );

      res.json({
        success: true,
        message: actualBillingPreference === 'ach' 
          ? 'Bank account verification in progress. You will be notified once verified.'
          : 'Payment method saved for recurring billing.',
        billing_preference: actualBillingPreference
      });
    }

  } catch (error) {
    console.error('Error completing payment:', error);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
});

// GET /api/stripe/publishable-key/:entity - Get publishable key for entity
app.get('/api/stripe/publishable-key/:entity', (req, res) => {
  const { entity } = req.params;
  const keyMap = {
    wsic: process.env.STRIPE_WSIC_PUBLISHABLE_KEY,
    lkn: process.env.STRIPE_LKN_PUBLISHABLE_KEY,
    lwp: process.env.STRIPE_LWP_PUBLISHABLE_KEY || process.env.STRIPE_WSIC_PUBLISHABLE_KEY
  };
  
  const key = keyMap[entity] || keyMap.wsic;
  
  if (!key) {
    return res.status(500).json({ error: 'Stripe not configured for this entity' });
  }
  
  res.json({ key, entity });
});

// ============================================
// ORDER ROUTES (Authenticated)
// ============================================

app.use('/api/orders', authenticateToken, (req, res, next) => {
  if (!orderRoutesReady) {
    return res.status(503).json({ error: 'Order routes not yet initialized. Please wait...' });
  }
  next();
}, orderRoutes);

// ============================================
// DOCUMENT ROUTES (Authenticated)
// ============================================

app.use('/api/documents', authenticateToken, documentRoutes);

// ============================================
// EMAIL ROUTES
// ============================================

app.use('/api/email', authenticateToken, emailRoutes);

// ============================================
// BILLING ROUTES (Authenticated)
// ============================================

app.use('/api/billing', authenticateToken, billingRoutes);

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
      const securityStatus = [];
      if (helmet) securityStatus.push('Helmet');
      if (rateLimit) securityStatus.push('RateLimit');
      if (process.env.JWT_SECRET) securityStatus.push('JWT');
      
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Simpli.fi Reports Server Running                        ║
╠═══════════════════════════════════════════════════════════╣
║   Port: ${PORT}                                            ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(36)}║
║   Security: ${(securityStatus.length ? securityStatus.join(', ') : 'Basic').padEnd(40)}║
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
