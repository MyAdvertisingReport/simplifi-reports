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
const crypto = require('crypto');
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

// Trust proxy for Railway/Heroku/etc (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

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
  
  // Initialize email logging with database pool
  if (emailService.initEmailLogging) {
    emailService.initEmailLogging(adminPool);
    console.log('Email service logging initialized');
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

// Super Admin-only middleware
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Super Admin access required' });
    }
    const result = await adminPool.query(
      'SELECT is_super_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0 || !result.rows[0].is_super_admin) {
      return res.status(403).json({ error: 'Super Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Log Super Admin actions
const logSuperAdminAction = async (superAdminId, actionType, targetUserId, targetUserName, description, metadata = {}, req = null) => {
  try {
    await adminPool.query(`
      INSERT INTO super_admin_audit_log 
      (super_admin_id, action_type, target_user_id, target_user_name, description, metadata, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      superAdminId,
      actionType,
      targetUserId,
      targetUserName,
      description,
      JSON.stringify(metadata),
      req?.ip || req?.connection?.remoteAddress || null,
      req?.headers?.['user-agent'] || null
    ]);
  } catch (error) {
    console.error('Failed to log super admin action:', error);
  }
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
    
    // Direct SQL query to get user with password_hash
    const result = await adminPool.query(
      'SELECT id, email, name, role, password_hash, is_super_admin, is_sales FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await adminPool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, is_super_admin: user.is_super_admin, is_sales: user.is_sales }
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
    // Fetch fresh user data from database including super admin flag
    const result = await adminPool.query(
      'SELECT id, email, name, role, is_super_admin, is_sales, title FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        is_super_admin: user.is_super_admin || false,
        is_sales: user.is_sales || false,
        title: user.title
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

    if (!['admin', 'sales', 'sales_associate', 'sales_manager', 'staff', 'event_manager'].includes(role)) {
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
    const existingResult = await adminPool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const existingUser = existingResult.rows[0];
    
    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailResult = await adminPool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailResult.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 0;
    
    if (email) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }
    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
      // Also update first_name and last_name if they exist
      const nameParts = name.split(' ');
      paramCount++;
      updates.push(`first_name = $${paramCount}`);
      values.push(nameParts[0] || '');
      paramCount++;
      updates.push(`last_name = $${paramCount}`);
      values.push(nameParts.slice(1).join(' ') || '');
    }
    if (role && ['admin', 'sales', 'sales_associate', 'sales_manager', 'staff', 'event_manager'].includes(role)) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }
    if (password) {
      paramCount++;
      updates.push(`password_hash = $${paramCount}`);
      values.push(await bcrypt.hash(password, 10));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(userId);
    
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, role`;
    const result = await adminPool.query(updateQuery, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user: ' + error.message });
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
    const userResult = await adminPool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await adminPool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// ENHANCED USER MANAGEMENT ROUTES
// ============================================

// Get all users with extended info including stats (Admin only)
app.get('/api/users/extended', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.role, 
        u.is_sales,
        u.is_super_admin,
        u.title,
        u.rab_name,
        u.is_active,
        u.last_login,
        u.created_at,
        -- Client stats
        COALESCE(client_stats.total_clients, 0) as client_count,
        COALESCE(client_stats.active_clients, 0) as active_client_count,
        COALESCE(client_stats.prospect_clients, 0) as prospect_client_count,
        -- Order stats
        COALESCE(order_stats.active_orders, 0) as active_orders,
        COALESCE(order_stats.total_revenue, 0) as total_revenue,
        -- Activity stats (last 30 days)
        COALESCE(activity_stats.recent_activities, 0) as recent_activities
      FROM users u
      LEFT JOIN (
        SELECT 
          assigned_to,
          COUNT(*) as total_clients,
          COUNT(*) FILTER (WHERE status = 'active') as active_clients,
          COUNT(*) FILTER (WHERE status IN ('prospect', 'lead')) as prospect_clients
        FROM advertising_clients
        WHERE assigned_to IS NOT NULL
        GROUP BY assigned_to
      ) client_stats ON u.id = client_stats.assigned_to
      LEFT JOIN (
        SELECT 
          c.assigned_to,
          COUNT(*) FILTER (WHERE o.status IN ('signed', 'active')) as active_orders,
          COALESCE(SUM(o.contract_total) FILTER (WHERE o.status IN ('signed', 'active', 'completed')), 0) as total_revenue
        FROM advertising_clients c
        JOIN orders o ON c.id = o.client_id
        WHERE c.assigned_to IS NOT NULL
        GROUP BY c.assigned_to
      ) order_stats ON u.id = order_stats.assigned_to
      LEFT JOIN (
        SELECT user_id, COUNT(*) as recent_activities
        FROM client_activities
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY user_id
      ) activity_stats ON u.id = activity_stats.user_id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get extended users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get sales users only (for assignment dropdowns)
app.get('/api/users/sales', authenticateToken, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT id, name, email, role, title
      FROM users 
      WHERE is_sales = true AND is_active = true
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sales users error:', error);
    res.status(500).json({ error: 'Failed to get sales users' });
  }
});

// Create user with optional password (sends invite email if no password)
app.post('/api/users/invite', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, name, role, title, is_sales, sendInvite } = req.body;
    
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role are required' });
    }

    if (!['admin', 'sales_manager', 'sales_associate', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await dbHelper.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Create user without password (they'll set it via invite link)
    const result = await adminPool.query(`
      INSERT INTO users (
        id, email, name, role, is_sales, title, 
        password_hash, password_reset_token, password_reset_expires,
        is_active, created_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        '', $6, $7,
        true, NOW()
      )
      RETURNING id, email, name, role, is_sales, title, created_at
    `, [
      email.toLowerCase().trim(), 
      name.trim(), 
      role, 
      is_sales || false,
      title || null,
      resetToken,
      resetExpires
    ]);

    const user = result.rows[0];

    // Send invite email if requested
    if (sendInvite !== false) {
      const inviteUrl = `${process.env.BASE_URL || 'https://myadvertisingreport.com'}/set-password/${resetToken}`;
      
      try {
        await emailService.sendEmail({
          to: email,
          subject: 'Welcome to WSIC Advertising Platform - Set Your Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to the Team!</h1>
              </div>
              
              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #374151;">Hi ${name},</p>
                
                <p style="font-size: 16px; color: #374151;">
                  You've been invited to join the WSIC Advertising Platform. 
                  Click the button below to set your password and access your account.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" 
                     style="background: #2563eb; color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold;
                            display: inline-block;">
                    Set Your Password
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">
                  This link will expire in 48 hours. If you didn't expect this invitation, 
                  please contact your administrator.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                
                <p style="font-size: 12px; color: #9ca3af;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
                </p>
              </div>
            </div>
          `
        });
        
        user.invite_sent = true;
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        user.invite_sent = false;
        user.invite_error = 'Email could not be sent';
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Create user with invite error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Resend invite email
app.post('/api/users/:id/resend-invite', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user
    const userResult = await adminPool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Generate new token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
    
    // Update user with new token
    await adminPool.query(`
      UPDATE users 
      SET password_reset_token = $1, password_reset_expires = $2
      WHERE id = $3
    `, [resetToken, resetExpires, userId]);
    
    // Send invite email
    const inviteUrl = `${process.env.BASE_URL || 'https://myadvertisingreport.com'}/set-password/${resetToken}`;
    
    await emailService.sendEmail({
      to: user.email,
      subject: 'WSIC Advertising Platform - Set Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Set Your Password</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Hi ${user.name},</p>
            
            <p style="font-size: 16px; color: #374151;">
              Click the button below to set your password for the WSIC Advertising Platform.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background: #2563eb; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block;">
                Set Your Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              This link will expire in 48 hours.
            </p>
          </div>
        </div>
      `
    });
    
    res.json({ success: true, message: 'Invite email sent' });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

// ============================================
// PASSWORD RESET ROUTES (Public - no auth required)
// ============================================

// Validate password reset token
app.get('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await adminPool.query(`
      SELECT id, email, name 
      FROM users 
      WHERE password_reset_token = $1 
        AND password_reset_expires > NOW()
        AND is_active = true
    `, [token]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired token',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }
    
    const user = result.rows[0];
    res.json({ 
      valid: true, 
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

// Set password using reset token
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Find user by token
    const userResult = await adminPool.query(`
      SELECT id, email, name, role 
      FROM users 
      WHERE password_reset_token = $1 
        AND password_reset_expires > NOW()
        AND is_active = true
    `, [token]);
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired token',
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }
    
    const user = userResult.rows[0];
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password and clear reset token
    await adminPool.query(`
      UPDATE users 
      SET password_hash = $1, 
          password_reset_token = NULL, 
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [hashedPassword, user.id]);
    
    // Generate login token
    const loginToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Password set successfully',
      token: loginToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Request password reset (for existing users who forgot password)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const userResult = await adminPool.query(
      'SELECT id, email, name FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );
    
    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour for forgot password
    
    // Save token
    await adminPool.query(`
      UPDATE users 
      SET password_reset_token = $1, password_reset_expires = $2
      WHERE id = $3
    `, [resetToken, resetExpires, user.id]);
    
    // Send reset email
    const resetUrl = `${process.env.BASE_URL || 'https://myadvertisingreport.com'}/set-password/${resetToken}`;
    
    await emailService.sendEmail({
      to: user.email,
      subject: 'WSIC Advertising Platform - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Hi ${user.name},</p>
            
            <p style="font-size: 16px; color: #374151;">
              We received a request to reset your password. Click the button below to choose a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #dc2626; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              This link will expire in 1 hour. If you didn't request this reset, 
              you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    });
    
    res.json({ 
      success: true, 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ============================================
// CLIENT ASSIGNMENT / CLAIM ROUTES
// ============================================

// Claim an open account (Sales associates)
app.post('/api/clients/:id/claim', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.id;
    const userId = req.user.id;
    
    // Check if user is a sales user
    const userResult = await adminPool.query(
      'SELECT is_sales FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0 || !userResult.rows[0].is_sales) {
      return res.status(403).json({ error: 'Only sales users can claim accounts' });
    }
    
    // Check if account is open (unassigned)
    const clientResult = await adminPool.query(
      'SELECT id, business_name, assigned_to FROM advertising_clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    if (client.assigned_to) {
      return res.status(400).json({ error: 'This account is already assigned to another user' });
    }
    
    // Claim the account
    await adminPool.query(`
      UPDATE advertising_clients 
      SET assigned_to = $1, 
          date_reassigned = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [userId, clientId]);
    
    // Log activity
    try {
      await adminPool.query(`
        INSERT INTO client_activities (client_id, user_id, activity_type, title, description)
        VALUES ($1, $2, 'assignment_change', 'Account Claimed', $3)
      `, [clientId, userId, `Claimed by ${req.user.name}`]);
    } catch (actErr) {
      console.log('Activity logging skipped:', actErr.message);
    }
    
    res.json({ success: true, message: `Successfully claimed ${client.business_name}` });
  } catch (error) {
    console.error('Claim client error:', error);
    res.status(500).json({ error: 'Failed to claim account' });
  }
});

// Release an account back to open (owner or admin)
app.post('/api/clients/:id/release', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Get client
    const clientResult = await adminPool.query(
      'SELECT id, business_name, assigned_to FROM advertising_clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    // Check permission - must be owner or admin
    if (!isAdmin && client.assigned_to !== userId) {
      return res.status(403).json({ error: 'Only the assigned user or an admin can release this account' });
    }
    
    // Get current owner name for history
    let previousOwnerName = 'Unknown';
    if (client.assigned_to) {
      const ownerResult = await adminPool.query(
        'SELECT name FROM users WHERE id = $1',
        [client.assigned_to]
      );
      if (ownerResult.rows.length > 0) {
        previousOwnerName = ownerResult.rows[0].name;
      }
    }
    
    // Release the account
    await adminPool.query(`
      UPDATE advertising_clients 
      SET assigned_to = NULL,
          previous_owner = $1,
          date_reassigned = NOW(),
          updated_at = NOW()
      WHERE id = $2
    `, [previousOwnerName, clientId]);
    
    // Log activity
    try {
      await adminPool.query(`
        INSERT INTO client_activities (client_id, user_id, activity_type, title, description)
        VALUES ($1, $2, 'assignment_change', 'Account Released', $3)
      `, [clientId, userId, `Released by ${req.user.name} (previously: ${previousOwnerName})`]);
    } catch (actErr) {
      console.log('Activity logging skipped:', actErr.message);
    }
    
    res.json({ success: true, message: `${client.business_name} is now an open account` });
  } catch (error) {
    console.error('Release client error:', error);
    res.status(500).json({ error: 'Failed to release account' });
  }
});

// Reassign account (Admin only)
app.post('/api/clients/:id/reassign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const clientId = req.params.id;
    const { newOwnerId } = req.body;
    
    if (!newOwnerId) {
      return res.status(400).json({ error: 'New owner ID is required' });
    }
    
    // Get client
    const clientResult = await adminPool.query(
      'SELECT id, business_name, assigned_to FROM advertising_clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    // Get new owner
    const newOwnerResult = await adminPool.query(
      'SELECT id, name, is_sales FROM users WHERE id = $1 AND is_active = true',
      [newOwnerId]
    );
    
    if (newOwnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'New owner not found' });
    }
    
    const newOwner = newOwnerResult.rows[0];
    
    if (!newOwner.is_sales) {
      return res.status(400).json({ error: 'New owner must be a sales user' });
    }
    
    // Get previous owner name
    let previousOwnerName = 'Open Account';
    if (client.assigned_to) {
      const prevOwnerResult = await adminPool.query(
        'SELECT name FROM users WHERE id = $1',
        [client.assigned_to]
      );
      if (prevOwnerResult.rows.length > 0) {
        previousOwnerName = prevOwnerResult.rows[0].name;
      }
    }
    
    // Reassign
    await adminPool.query(`
      UPDATE advertising_clients 
      SET assigned_to = $1,
          previous_owner = $2,
          date_reassigned = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [newOwnerId, previousOwnerName, clientId]);
    
    // Log activity
    try {
      await adminPool.query(`
        INSERT INTO client_activities (client_id, user_id, activity_type, title, description)
        VALUES ($1, $2, 'assignment_change', 'Account Reassigned', $3)
      `, [clientId, req.user.id, `Reassigned from ${previousOwnerName} to ${newOwner.name} by ${req.user.name}`]);
    } catch (actErr) {
      console.log('Activity logging skipped:', actErr.message);
    }
    
    res.json({ 
      success: true, 
      message: `${client.business_name} reassigned to ${newOwner.name}` 
    });
  } catch (error) {
    console.error('Reassign client error:', error);
    res.status(500).json({ error: 'Failed to reassign account' });
  }
});

// ============================================
// MASTER LIST ROUTE (Read-only view for all)
// ============================================

// Get master list (all clients, limited fields for non-owners)
app.get('/api/clients/master-list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'sales_manager';
    
    const result = await adminPool.query(`
      SELECT 
        c.id,
        c.business_name,
        c.status,
        c.contact_type,
        c.tags,
        c.source,
        c.primary_contact_name,
        c.primary_contact_email,
        c.primary_contact_phone,
        c.assigned_to,
        c.previous_owner,
        u.name as assigned_to_name,
        CASE WHEN c.assigned_to = $1 THEN true ELSE false END as is_mine,
        CASE WHEN c.assigned_to IS NULL THEN true ELSE false END as is_open
      FROM advertising_clients c
      LEFT JOIN users u ON c.assigned_to = u.id
      ORDER BY c.business_name ASC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get master list error:', error);
    res.status(500).json({ error: 'Failed to get master list' });
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
    // Single efficient query that includes order, invoice, and activity stats via JOINs
    // This eliminates the need for hundreds of individual API calls from the frontend
    const baseQuery = `
      SELECT 
        c.id, 
        c.business_name as name, 
        c.business_name, 
        c.slug, 
        c.industry, 
        c.website,
        c.status, 
        c.tags, 
        c.billing_terms,
        c.client_since, 
        c.annual_contract_value, 
        c.last_activity_at,
        c.assigned_to, 
        c.created_by, 
        c.created_at, 
        c.updated_at,
        c.phone, 
        c.address_line1, 
        c.address_line2, 
        c.city, 
        c.state, 
        c.zip,
        c.primary_contact_id,
        c.primary_contact_name,
        c.simpli_fi_client_id as simplifi_org_id,
        c.qbo_customer_id_wsic, 
        c.qbo_customer_id_lkn, 
        c.stripe_customer_id, 
        c.notes,
        -- Assigned user name
        u.name as assigned_to_name,
        -- Order stats (aggregated via subquery)
        COALESCE(order_stats.total_orders, 0) as total_orders,
        COALESCE(order_stats.active_orders, 0) as active_orders,
        COALESCE(order_stats.total_revenue, 0) as total_revenue,
        -- Invoice stats (aggregated via subquery)
        COALESCE(invoice_stats.total_invoices, 0) as total_invoices,
        COALESCE(invoice_stats.open_invoices, 0) as open_invoices,
        COALESCE(invoice_stats.open_balance, 0) as open_balance,
        -- Activity count
        COALESCE(activity_stats.activity_count, 0) as activity_count
      FROM advertising_clients c
      -- Left join assigned user
      LEFT JOIN users u ON c.assigned_to = u.id
      -- Left join order stats
      LEFT JOIN (
        SELECT 
          client_id,
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status IN ('signed', 'active')) as active_orders,
          COALESCE(SUM(contract_total) FILTER (WHERE status IN ('signed', 'active', 'completed')), 0) as total_revenue
        FROM orders
        GROUP BY client_id
      ) order_stats ON c.id = order_stats.client_id
      -- Left join invoice stats
      LEFT JOIN (
        SELECT 
          client_id,
          COUNT(*) as total_invoices,
          COUNT(*) FILTER (WHERE status IN ('sent', 'approved')) as open_invoices,
          COALESCE(SUM(balance_due) FILTER (WHERE status IN ('sent', 'approved')), 0) as open_balance
        FROM invoices
        GROUP BY client_id
      ) invoice_stats ON c.id = invoice_stats.client_id
      -- Left join activity stats
      LEFT JOIN (
        SELECT 
          client_id,
          COUNT(*) as activity_count
        FROM client_activities
        GROUP BY client_id
      ) activity_stats ON c.id = activity_stats.client_id
    `;
    
    let result;
    if (req.user.role === 'admin' || req.user.role === 'sales_manager') {
      const query = baseQuery + ' ORDER BY c.business_name ASC';
      result = await adminPool.query(query);
    } else {
      // Sales associates only see assigned clients
      const query = baseQuery + ' WHERE c.assigned_to = $1 ORDER BY c.business_name ASC';
      result = await adminPool.query(query, [req.user.id]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get clients error:', error);
    // Fallback to simple query without stats if JOINs fail
    try {
      const fallbackQuery = `
        SELECT 
          id, business_name as name, business_name, slug, industry, website,
          status, tier, tags, source, billing_terms,
          client_since, annual_contract_value, last_activity_at,
          assigned_to, created_by, created_at, updated_at,
          phone, address_line1, address_line2, city, state, zip,
          primary_contact_id, simpli_fi_client_id as simplifi_org_id,
          qbo_customer_id_wsic, qbo_customer_id_lkn, stripe_customer_id, notes,
          0 as total_orders, 0 as active_orders, 0 as total_revenue,
          0 as total_invoices, 0 as open_invoices, 0 as open_balance
        FROM advertising_clients
        ORDER BY business_name ASC
      `;
      const result = await adminPool.query(fallbackQuery);
      res.json(result.rows);
    } catch (fallbackError) {
      console.error('Fallback query error:', fallbackError);
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
    // Query advertising_clients directly
    const result = await adminPool.query(
      `SELECT ac.*, u.name as assigned_to_name
       FROM advertising_clients ac
       LEFT JOIN users u ON ac.assigned_to = u.id
       WHERE ac.slug = $1`,
      [req.params.slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = result.rows[0];
    // Map business_name to name for frontend compatibility
    client.name = client.business_name || client.name;
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
    const result = await adminPool.query(
      'SELECT * FROM advertising_clients WHERE slug = $1',
      [req.params.slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = result.rows[0];
    // Return limited public info
    res.json({
      id: client.id,
      name: client.business_name || client.name,
      business_name: client.business_name,
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
    const result = await adminPool.query(
      'SELECT * FROM advertising_clients WHERE slug = $1',
      [req.params.slug]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = result.rows[0];
    if (!client.simplifi_org_id) {
      return res.status(404).json({ error: 'Client has no Simpli.fi integration' });
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

// POST /api/orders/sign/:token/setup-intent/ach - Create SetupIntent for ACH/Bank via Financial Connections
app.post('/api/orders/sign/:token/setup-intent/ach', async (req, res) => {
  try {
    const { token } = req.params;
    const { signer_email, signer_name } = req.body;

    console.log('[ACH-SETUP-INTENT] Starting for token:', token?.substring(0, 10) + '...');

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
    console.log('[ACH-SETUP-INTENT] Found order:', order.id, 'Client:', order.client_name);

    const itemsResult = await adminPool.query(
      `SELECT e.code as entity_code FROM order_items oi
       LEFT JOIN entities e ON oi.entity_id = e.id
       WHERE oi.order_id = $1 ORDER BY oi.line_total DESC LIMIT 1`,
      [order.id]
    );
    const primaryEntityCode = itemsResult.rows[0]?.entity_code || 'wsic';

    const Stripe = require('stripe');
    const stripeSecretKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_SECRET_KEY`] || process.env.STRIPE_WSIC_SECRET_KEY;
    const stripePublishableKey = process.env[`STRIPE_${primaryEntityCode.toUpperCase()}_PUBLISHABLE_KEY`] || process.env.STRIPE_WSIC_PUBLISHABLE_KEY;
    
    if (!stripeSecretKey || !stripePublishableKey) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    const stripe = new Stripe(stripeSecretKey);

    const customerEmail = signer_email || `client-${order.client_id}@placeholder.local`;
    let customerId = order.existing_stripe_id;
    
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (verifyError) {
        if (verifyError.code === 'resource_missing') {
          customerId = null;
          await adminPool.query(`UPDATE advertising_clients SET stripe_customer_id = NULL WHERE id = $1`, [order.client_id]);
        } else {
          throw verifyError;
        }
      }
    }
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: signer_name || order.client_name || 'Unknown Client',
        metadata: { client_id: order.client_id }
      });
      customerId = customer.id;
      await adminPool.query(`UPDATE advertising_clients SET stripe_customer_id = $1 WHERE id = $2`, [customerId, order.client_id]);
    }

    // Create SetupIntent with Financial Connections for instant bank verification
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'],
          },
          verification_method: 'automatic',
        },
      },
      metadata: { order_id: order.id, payment_type: 'ach' }
    });

    await adminPool.query(
      `UPDATE orders SET stripe_entity_code = $1, stripe_customer_id = $2 WHERE id = $3`,
      [primaryEntityCode, customerId, order.id]
    );

    console.log('[ACH-SETUP-INTENT] Success! SetupIntent:', setupIntent.id);

    res.json({
      clientSecret: setupIntent.client_secret,
      publishableKey: stripePublishableKey,
      customerId
    });

  } catch (error) {
    console.error('[ACH-SETUP-INTENT] Error:', error.message);
    res.status(500).json({ error: 'Failed to initialize bank connection' });
  }
});

// POST /api/orders/sign/:token/payment-method/ach - Save verified ACH payment method (NO AUTH REQUIRED)
app.post('/api/orders/sign/:token/payment-method/ach', async (req, res) => {
  try {
    const { token } = req.params;
    const {
      paymentMethodId,
      signerEmail,
      pendingVerification,
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

    // NEW FLOW: Payment method already created via Financial Connections
    if (!paymentMethodId) {
      return res.status(400).json({ 
        error: 'Please use the "Connect Bank Account" button to securely link your bank via Stripe.' 
      });
    }

    console.log(`[STRIPE] Saving verified ACH payment method ${paymentMethodId} for ${order.client_name}`);

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

    // Retrieve the payment method to get bank details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Get customer ID
    let customerId = order.existing_stripe_id || order.stripe_customer_id;
    
    // Set as default payment method for customer
    if (customerId) {
      try {
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } catch (updateErr) {
        console.log('[STRIPE] Could not set default payment method:', updateErr.message);
      }
    }

    // Update order with payment info
    await adminPool.query(
      `UPDATE orders SET 
        stripe_entity_code = $1, 
        stripe_customer_id = $2, 
        stripe_payment_method_id = $3,
        billing_preference = 'ach'
       WHERE id = $4`,
      [primaryEntityCode, customerId, paymentMethodId, order.id]
    );

    // Update client record
    await adminPool.query(
      `UPDATE advertising_clients 
       SET stripe_customer_id = $1, 
           payment_method = 'ach',
           stripe_payment_method_id = $2,
           updated_at = NOW() 
       WHERE id = $3`,
      [customerId, paymentMethodId, order.client_id]
    );

    const bankLast4 = paymentMethod.us_bank_account?.last4 || '****';
    const bankName = paymentMethod.us_bank_account?.bank_name || 'Bank';
    console.log(`[STRIPE] ACH payment method saved for ${order.client_name}: ${bankName} ****${bankLast4}`);

    res.json({
      success: true,
      customerId: customerId,
      paymentMethodId: paymentMethodId,
      bankAccount: {
        last4: paymentMethod.us_bank_account?.last4,
        bankName: paymentMethod.us_bank_account?.bank_name,
        accountType: paymentMethod.us_bank_account?.account_type,
      },
      pendingVerification: pendingVerification || false,
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
// SUPER ADMIN ROUTES
// ============================================

// Get user data for "View As" mode (Super Admin only)
app.get('/api/super-admin/view-as/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    const userResult = await adminPool.query(
      'SELECT id, name, email, role, is_sales, is_super_admin, title FROM users WHERE id = $1',
      [targetUserId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUser = userResult.rows[0];
    
    // Log the view-as action
    await logSuperAdminAction(
      req.user.id, 'view_as_start', targetUserId, targetUser.name,
      `Started viewing as ${targetUser.name}`, { targetRole: targetUser.role }, req
    );
    
    // Get clients this user would see
    let clients = [];
    if (targetUser.role === 'admin' || targetUser.role === 'sales_manager') {
      const clientsResult = await adminPool.query(`
        SELECT c.*, u.name as assigned_to_name
        FROM advertising_clients c
        LEFT JOIN users u ON c.assigned_to = u.id
        ORDER BY c.business_name ASC LIMIT 100
      `);
      clients = clientsResult.rows;
    } else if (targetUser.is_sales) {
      const clientsResult = await adminPool.query(`
        SELECT c.*, u.name as assigned_to_name
        FROM advertising_clients c
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.assigned_to = $1
        ORDER BY c.business_name ASC
      `, [targetUserId]);
      clients = clientsResult.rows;
    }
    
    // Get their recent activities
    const activitiesResult = await adminPool.query(`
      SELECT ca.*, c.business_name as client_name
      FROM client_activities ca
      JOIN advertising_clients c ON ca.client_id = c.id
      WHERE ca.user_id = $1
      ORDER BY ca.created_at DESC LIMIT 20
    `, [targetUserId]);
    
    res.json({
      viewing_as: targetUser,
      clients,
      recent_activities: activitiesResult.rows
    });
  } catch (error) {
    console.error('View as error:', error);
    res.status(500).json({ error: 'Failed to load user view' });
  }
});

// Log end of "View As" session
app.post('/api/super-admin/view-as/:userId/end', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const userResult = await adminPool.query('SELECT name FROM users WHERE id = $1', [targetUserId]);
    const targetUserName = userResult.rows[0]?.name || 'Unknown';
    
    await logSuperAdminAction(
      req.user.id, 'view_as_end', targetUserId, targetUserName,
      `Stopped viewing as ${targetUserName}`, {}, req
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('End view-as error:', error);
    res.status(500).json({ error: 'Failed to log end of view-as session' });
  }
});

// Get Super Admin audit log
app.get('/api/super-admin/audit-log', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const result = await adminPool.query(`
      SELECT sal.*, u.name as super_admin_name, u.email as super_admin_email
      FROM super_admin_audit_log sal
      JOIN users u ON sal.super_admin_id = u.id
      ORDER BY sal.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);
    
    const countResult = await adminPool.query('SELECT COUNT(*) FROM super_admin_audit_log');
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

// Get list of Super Admins
app.get('/api/super-admin/list', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT id, name, email, role, title, last_login, created_at
      FROM users WHERE is_super_admin = TRUE AND is_active = TRUE
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get super admins error:', error);
    res.status(500).json({ error: 'Failed to get super admins' });
  }
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
// TRAINING CENTER ROUTES
// ============================================

// Get all training categories
app.get('/api/training/categories', authenticateToken, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT * FROM training_categories 
      WHERE is_active = true 
      ORDER BY sort_order
    `);
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get training categories error:', error);
    // Return empty array if table doesn't exist yet
    res.json({ categories: [] });
  }
});

// Get all training modules
app.get('/api/training/modules', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT tm.*, tc.name as category_name, tc.color as category_color
      FROM training_modules tm
      LEFT JOIN training_categories tc ON tc.id = tm.category_id
      WHERE tm.is_active = true
    `;
    const params = [];
    
    if (category) {
      query += ` AND tm.category_id = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY tm.sort_order`;
    
    const result = await adminPool.query(query, params);
    res.json({ modules: result.rows });
  } catch (error) {
    console.error('Get training modules error:', error);
    res.json({ modules: [] });
  }
});

// Get single training module
app.get('/api/training/modules/:id', authenticateToken, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT tm.*, tc.name as category_name
      FROM training_modules tm
      LEFT JOIN training_categories tc ON tc.id = tm.category_id
      WHERE tm.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get training module error:', error);
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// Get user's training progress
app.get('/api/training/my-progress', authenticateToken, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT tp.*, tm.title as module_title, tc.name as category_name
      FROM training_progress tp
      JOIN training_modules tm ON tm.id = tp.module_id
      LEFT JOIN training_categories tc ON tc.id = tm.category_id
      WHERE tp.user_id = $1
      ORDER BY tp.last_accessed_at DESC
    `, [req.user.id]);
    
    // Convert to object keyed by module_id for easy lookup
    const progress = {};
    result.rows.forEach(row => {
      progress[row.module_id] = row;
    });
    
    res.json({ progress });
  } catch (error) {
    console.error('Get training progress error:', error);
    res.json({ progress: {} });
  }
});

// Mark module as complete
app.post('/api/training/modules/:id/complete', authenticateToken, async (req, res) => {
  try {
    const moduleId = req.params.id;
    const userId = req.user.id;
    
    // Upsert progress record
    const result = await adminPool.query(`
      INSERT INTO training_progress (user_id, module_id, status, progress_percent, completed_at, last_accessed_at)
      VALUES ($1, $2, 'completed', 100, NOW(), NOW())
      ON CONFLICT (user_id, module_id) 
      DO UPDATE SET 
        status = 'completed',
        progress_percent = 100,
        completed_at = NOW(),
        last_accessed_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [userId, moduleId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark module complete error:', error);
    res.status(500).json({ error: 'Failed to mark complete' });
  }
});

// Get user's training progress (for profile page)
app.get('/api/users/:id/training-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permission
    if (req.user.role !== 'admin' && req.user.id !== userId && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const progressResult = await adminPool.query(`
      SELECT tp.*, tm.title as module_title, tm.is_required, tc.name as category_name
      FROM training_progress tp
      JOIN training_modules tm ON tm.id = tp.module_id
      LEFT JOIN training_categories tc ON tc.id = tm.category_id
      WHERE tp.user_id = $1
      ORDER BY tp.completed_at DESC NULLS LAST
    `, [userId]);
    
    // Get total counts
    const totalResult = await adminPool.query(`
      SELECT 
        COUNT(*) as total_modules,
        COUNT(CASE WHEN is_required THEN 1 END) as required_modules
      FROM training_modules 
      WHERE is_active = true
    `);
    
    const completedCount = progressResult.rows.filter(p => p.status === 'completed').length;
    const requiredCompleted = progressResult.rows.filter(p => p.status === 'completed' && p.is_required).length;
    const totalModules = parseInt(totalResult.rows[0]?.total_modules || 0);
    const requiredModules = parseInt(totalResult.rows[0]?.required_modules || 0);
    
    res.json({
      progress: progressResult.rows,
      summary: {
        completed_modules: completedCount,
        total_modules: totalModules,
        completion_percent: totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0,
        required_completed: requiredCompleted,
        required_remaining: requiredModules - requiredCompleted
      }
    });
  } catch (error) {
    console.error('Get user training progress error:', error);
    res.json({ progress: [], summary: {} });
  }
});

// ============================================
// USER PROFILE & STATS ROUTES
// ============================================

// Get single user by ID
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permission - admins can view anyone, users can view themselves
    if (req.user.role !== 'admin' && req.user.id !== userId && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const result = await adminPool.query(
      'SELECT id, name, email, role, is_super_admin, start_date, manager_id, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user profile with extended stats
app.get('/api/users/:id/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const days = parseInt(req.query.days) || 30;
    
    // Check permission
    if (req.user.role !== 'admin' && req.user.id !== userId && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Get user info
    const userResult = await adminPool.query(
      'SELECT id, name, email, role, is_super_admin, start_date, manager_id, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get client counts
    const clientsResult = await adminPool.query(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN status IN ('prospect', 'lead') THEN 1 END) as prospect_clients,
        COUNT(CASE WHEN status = 'churned' THEN 1 END) as churned_clients,
        COALESCE(SUM(CASE WHEN status = 'active' THEN total_revenue END), 0) as total_revenue
      FROM advertising_clients
      WHERE assigned_to = $1
    `, [userId]);
    
    // Get order counts
    const ordersResult = await adminPool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM orders
      WHERE created_by = $1
    `, [userId]);
    
    // Get activity counts within time range
    const activitiesResult = await adminPool.query(`
      SELECT 
        COUNT(CASE WHEN activity_type = 'call_logged' THEN 1 END) as calls,
        COUNT(CASE WHEN activity_type IN ('meeting_scheduled', 'appointment_scheduled') THEN 1 END) as appointments,
        COUNT(CASE WHEN activity_type = 'proposal_sent' THEN 1 END) as proposals,
        COUNT(CASE WHEN activity_type IN ('order_signed', 'deal_closed') THEN 1 END) as closed_deals
      FROM client_activities
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '1 day' * $2
    `, [userId, days]);
    
    // Get new clients in period
    const newClientsResult = await adminPool.query(`
      SELECT COUNT(*) as new_clients
      FROM advertising_clients
      WHERE assigned_to = $1
        AND created_at >= NOW() - INTERVAL '1 day' * $2
    `, [userId, days]);
    
    res.json({
      user,
      totals: clientsResult.rows[0],
      orders: ordersResult.rows[0],
      activities: activitiesResult.rows[0],
      new_clients: parseInt(newClientsResult.rows[0]?.new_clients || 0)
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Get user goals
app.get('/api/users/:id/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permission
    if (req.user.role !== 'admin' && req.user.id !== userId && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const result = await adminPool.query(`
      SELECT * FROM user_goals
      WHERE user_id = $1
      ORDER BY year DESC, month DESC
      LIMIT 12
    `, [userId]);
    
    res.json({ goals: result.rows });
  } catch (error) {
    console.error('Get user goals error:', error);
    res.json({ goals: [] });
  }
});

// Create/update user goals
app.post('/api/users/:id/goals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { year, month, appointments_target, proposals_target, closed_deals_target, new_clients_target, revenue_target, notes } = req.body;
    
    const result = await adminPool.query(`
      INSERT INTO user_goals (
        user_id, year, month, 
        appointments_target, proposals_target, closed_deals_target, 
        new_clients_target, revenue_target, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        appointments_target = EXCLUDED.appointments_target,
        proposals_target = EXCLUDED.proposals_target,
        closed_deals_target = EXCLUDED.closed_deals_target,
        new_clients_target = EXCLUDED.new_clients_target,
        revenue_target = EXCLUDED.revenue_target,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [
      userId, year, month,
      appointments_target || 0,
      proposals_target || 0,
      closed_deals_target || 0,
      new_clients_target || 0,
      revenue_target || 0,
      notes,
      req.user.id
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create user goals error:', error);
    res.status(500).json({ error: 'Failed to save goals' });
  }
});

// Get user meeting notes
app.get('/api/users/:id/meeting-notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permission
    if (req.user.role !== 'admin' && req.user.id !== userId && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const result = await adminPool.query(`
      SELECT * FROM user_meeting_notes 
      WHERE user_id = $1 
      ORDER BY meeting_date DESC
      LIMIT 20
    `, [userId]);
    
    res.json({ notes: result.rows });
  } catch (error) {
    console.error('Get meeting notes error:', error);
    // Return empty array if table doesn't exist yet
    res.json({ notes: [] });
  }
});

// Create user meeting note
app.post('/api/users/:id/meeting-notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Only admins can add meeting notes
    if (req.user.role !== 'admin' && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { meeting_date, title, notes, action_items } = req.body;
    
    const result = await adminPool.query(`
      INSERT INTO user_meeting_notes (user_id, meeting_date, title, notes, action_items, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, meeting_date, title, notes, action_items, req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create meeting note error:', error);
    res.status(500).json({ error: 'Failed to save meeting note' });
  }
});

// ============================================
// COMMISSION TRACKING ROUTES
// ============================================

// Get commission rates (admin only)
app.get('/api/commissions/rates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.query;
    
    let query = `
      SELECT cr.*, u.name as user_name, e.name as entity_name
      FROM commission_rates cr
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN entities e ON cr.entity_id = e.id
      WHERE cr.is_active = true
    `;
    const params = [];
    
    if (user_id) {
      params.push(user_id);
      query += ` AND cr.user_id = $${params.length}`;
    }
    
    query += ' ORDER BY cr.user_id, cr.product_category';
    
    const result = await adminPool.query(query, params);
    
    // Also get defaults
    const defaultsResult = await adminPool.query(`
      SELECT * FROM commission_rate_defaults WHERE is_active = true
    `);
    
    res.json({
      rates: result.rows,
      defaults: defaultsResult.rows
    });
  } catch (error) {
    console.error('Get commission rates error:', error);
    res.json({ rates: [], defaults: [] });
  }
});

// Create/update commission rate
app.post('/api/commissions/rates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      user_id, product_category, entity_id, rate_type, rate_value,
      min_deal_value, max_deal_value, effective_date, expiration_date, notes
    } = req.body;
    
    // Check if rate already exists for this user/category/entity combo
    const existingResult = await adminPool.query(`
      SELECT id FROM commission_rates 
      WHERE user_id = $1 
        AND COALESCE(product_category, '') = COALESCE($2, '')
        AND COALESCE(entity_id::text, '') = COALESCE($3, '')
        AND is_active = true
    `, [user_id, product_category, entity_id]);
    
    let result;
    if (existingResult.rows.length > 0) {
      // Update existing
      result = await adminPool.query(`
        UPDATE commission_rates SET
          rate_type = $1, rate_value = $2, min_deal_value = $3, max_deal_value = $4,
          effective_date = COALESCE($5, CURRENT_DATE), expiration_date = $6,
          notes = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [rate_type, rate_value, min_deal_value, max_deal_value, effective_date, expiration_date, notes, existingResult.rows[0].id]);
    } else {
      // Create new
      result = await adminPool.query(`
        INSERT INTO commission_rates (
          user_id, product_category, entity_id, rate_type, rate_value,
          min_deal_value, max_deal_value, effective_date, expiration_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE), $9, $10, $11)
        RETURNING *
      `, [user_id, product_category, entity_id, rate_type, rate_value, min_deal_value, max_deal_value, effective_date, expiration_date, notes, req.user.id]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save commission rate error:', error);
    res.status(500).json({ error: 'Failed to save commission rate' });
  }
});

// Delete commission rate
app.delete('/api/commissions/rates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await adminPool.query(`
      UPDATE commission_rates SET is_active = false, updated_at = NOW() WHERE id = $1
    `, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete commission rate error:', error);
    res.status(500).json({ error: 'Failed to delete commission rate' });
  }
});

// Get commissions list
app.get('/api/commissions', authenticateToken, async (req, res) => {
  try {
    const { user_id, period_month, period_year, status } = req.query;
    
    // Non-admins can only see their own commissions
    const effectiveUserId = req.user.role === 'admin' || req.user.is_super_admin 
      ? user_id 
      : req.user.id;
    
    let query = `
      SELECT c.*, 
        u.name as user_name, u.email as user_email,
        ac.business_name as client_name,
        o.order_number
      FROM commissions c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN advertising_clients ac ON c.client_id = ac.id
      LEFT JOIN orders o ON c.order_id = o.id
      WHERE 1=1
    `;
    const params = [];
    
    if (effectiveUserId) {
      params.push(effectiveUserId);
      query += ` AND c.user_id = $${params.length}`;
    }
    if (period_month) {
      params.push(period_month);
      query += ` AND c.period_month = $${params.length}`;
    }
    if (period_year) {
      params.push(period_year);
      query += ` AND c.period_year = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }
    
    query += ' ORDER BY c.created_at DESC LIMIT 500';
    
    const result = await adminPool.query(query, params);
    res.json({ commissions: result.rows });
  } catch (error) {
    console.error('Get commissions error:', error);
    res.json({ commissions: [] });
  }
});

// Get commission summary (for dashboard)
app.get('/api/commissions/summary', authenticateToken, async (req, res) => {
  try {
    const { user_id, period_year } = req.query;
    const year = period_year || new Date().getFullYear();
    
    // Non-admins can only see their own
    const effectiveUserId = req.user.role === 'admin' || req.user.is_super_admin 
      ? user_id 
      : req.user.id;
    
    let query = `
      SELECT 
        period_month,
        period_year,
        COUNT(*) as commission_count,
        SUM(order_amount) as total_order_value,
        SUM(commission_amount) as total_commission,
        SUM(COALESCE(adjustment_amount, 0)) as total_adjustments,
        SUM(commission_amount + COALESCE(adjustment_amount, 0)) as net_commission,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
      FROM commissions
      WHERE period_year = $1
    `;
    const params = [year];
    
    if (effectiveUserId) {
      params.push(effectiveUserId);
      query += ` AND user_id = $${params.length}`;
    }
    
    query += ' GROUP BY period_year, period_month ORDER BY period_month';
    
    const result = await adminPool.query(query, params);
    
    // Calculate totals
    const totals = {
      total_commission: 0,
      total_pending: 0,
      total_approved: 0,
      total_paid: 0
    };
    
    result.rows.forEach(row => {
      totals.total_commission += parseFloat(row.total_commission || 0);
      totals.total_pending += parseInt(row.pending_count || 0);
      totals.total_approved += parseInt(row.approved_count || 0);
      totals.total_paid += parseInt(row.paid_count || 0);
    });
    
    res.json({
      monthly: result.rows,
      totals,
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Get commission summary error:', error);
    res.json({ monthly: [], totals: {}, year: new Date().getFullYear() });
  }
});

// Calculate commission for an order (triggered when order is signed/approved)
app.post('/api/commissions/calculate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { order_id, invoice_id } = req.body;
    
    if (!order_id && !invoice_id) {
      return res.status(400).json({ error: 'Order ID or Invoice ID required' });
    }
    
    let orderData, userId, clientId, amount;
    
    if (order_id) {
      const orderResult = await adminPool.query(`
        SELECT o.*, oi.product_id, p.category as product_category
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1
        LIMIT 1
      `, [order_id]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      orderData = orderResult.rows[0];
      userId = orderData.created_by;
      clientId = orderData.client_id;
      amount = parseFloat(orderData.contract_total || 0);
    }
    
    // Get commission rate for this user
    let rateResult = await adminPool.query(`
      SELECT * FROM commission_rates 
      WHERE user_id = $1 AND is_active = true
      AND (product_category IS NULL OR product_category = $2)
      ORDER BY product_category NULLS LAST
      LIMIT 1
    `, [userId, orderData?.product_category]);
    
    // Fall back to default rate
    if (rateResult.rows.length === 0) {
      rateResult = await adminPool.query(`
        SELECT * FROM commission_rate_defaults 
        WHERE is_active = true
        AND (product_category IS NULL OR product_category = $1)
        ORDER BY product_category NULLS LAST
        LIMIT 1
      `, [orderData?.product_category]);
    }
    
    if (rateResult.rows.length === 0) {
      return res.status(400).json({ error: 'No commission rate found' });
    }
    
    const rate = rateResult.rows[0];
    let commissionAmount;
    
    if (rate.rate_type === 'percentage') {
      commissionAmount = amount * (parseFloat(rate.rate_value) / 100);
    } else {
      commissionAmount = parseFloat(rate.rate_value);
    }
    
    // Create commission record
    const now = new Date();
    const result = await adminPool.query(`
      INSERT INTO commissions (
        user_id, order_id, invoice_id, client_id,
        order_amount, commission_rate, rate_type, commission_amount,
        period_month, period_year, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `, [
      userId, order_id, invoice_id, clientId,
      amount, rate.rate_value, rate.rate_type, commissionAmount,
      now.getMonth() + 1, now.getFullYear()
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Calculate commission error:', error);
    res.status(500).json({ error: 'Failed to calculate commission' });
  }
});

// Approve commission
app.post('/api/commissions/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await adminPool.query(`
      UPDATE commissions 
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [req.user.id, req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({ error: 'Failed to approve commission' });
  }
});

// Mark commission as paid
app.post('/api/commissions/:id/paid', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payment_reference } = req.body;
    
    const result = await adminPool.query(`
      UPDATE commissions 
      SET status = 'paid', paid_at = NOW(), payment_reference = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [payment_reference, req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark commission paid error:', error);
    res.status(500).json({ error: 'Failed to mark commission as paid' });
  }
});

// Bulk approve commissions
app.post('/api/commissions/bulk-approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { commission_ids } = req.body;
    
    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return res.status(400).json({ error: 'Commission IDs required' });
    }
    
    const result = await adminPool.query(`
      UPDATE commissions 
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE id = ANY($2) AND status = 'pending'
      RETURNING *
    `, [req.user.id, commission_ids]);
    
    res.json({ approved: result.rows.length, commissions: result.rows });
  } catch (error) {
    console.error('Bulk approve commissions error:', error);
    res.status(500).json({ error: 'Failed to approve commissions' });
  }
});

// Get pending commissions for approval (with order details)
app.get('/api/commissions/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await adminPool.query(`
      SELECT c.*, 
        u.name as user_name, u.email as user_email, u.role as user_role,
        ac.business_name as client_name,
        o.order_number, o.contract_total, o.status as order_status,
        o.client_signature_date as signed_date
      FROM commissions c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN advertising_clients ac ON c.client_id = ac.id
      LEFT JOIN orders o ON c.order_id = o.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at DESC
    `);
    
    res.json({ commissions: result.rows });
  } catch (error) {
    console.error('Get pending commissions error:', error);
    res.json({ commissions: [] });
  }
});

// Create split commission
app.post('/api/commissions/:id/split', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { split_user_id, split_percentage, split_reason } = req.body;
    
    if (!split_user_id || !split_percentage) {
      return res.status(400).json({ error: 'Split user and percentage required' });
    }
    
    // Get the original commission
    const originalResult = await adminPool.query(
      'SELECT * FROM commissions WHERE id = $1',
      [req.params.id]
    );
    
    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commission not found' });
    }
    
    const original = originalResult.rows[0];
    
    if (original.is_split) {
      return res.status(400).json({ error: 'Commission is already split' });
    }
    
    // Calculate split amounts
    const splitPct = parseFloat(split_percentage);
    const originalPct = 100 - splitPct;
    const originalAmount = parseFloat(original.commission_amount);
    
    const newOriginalAmount = (originalAmount * originalPct / 100).toFixed(2);
    const splitAmount = (originalAmount * splitPct / 100).toFixed(2);
    
    // Update the original commission
    await adminPool.query(`
      UPDATE commissions 
      SET commission_amount = $1, 
          is_split = true, 
          split_with_user_id = $2, 
          split_percentage = $3,
          split_reason = $4,
          updated_at = NOW()
      WHERE id = $5
    `, [newOriginalAmount, split_user_id, originalPct, split_reason, req.params.id]);
    
    // Create the split commission for the other user
    const splitResult = await adminPool.query(`
      INSERT INTO commissions (
        user_id, order_id, invoice_id, client_id,
        order_amount, commission_rate, rate_type, commission_amount,
        period_month, period_year, status,
        is_split, split_with_user_id, split_percentage, split_reason, parent_commission_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', true, $11, $12, $13, $14)
      RETURNING *
    `, [
      split_user_id, original.order_id, original.invoice_id, original.client_id,
      original.order_amount, original.commission_rate, original.rate_type, splitAmount,
      original.period_month, original.period_year,
      original.user_id, splitPct, split_reason, req.params.id
    ]);
    
    // Return both commissions
    const updatedOriginal = await adminPool.query(
      'SELECT * FROM commissions WHERE id = $1',
      [req.params.id]
    );
    
    res.json({
      original: updatedOriginal.rows[0],
      split: splitResult.rows[0]
    });
  } catch (error) {
    console.error('Split commission error:', error);
    res.status(500).json({ error: 'Failed to split commission' });
  }
});

// Update commission amount (for adjustments)
app.put('/api/commissions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { commission_amount, adjustment_amount, adjustment_reason, notes } = req.body;
    
    const updates = ['updated_at = NOW()'];
    const params = [];
    let paramCount = 0;
    
    if (commission_amount !== undefined) {
      paramCount++;
      updates.push(`commission_amount = $${paramCount}`);
      params.push(commission_amount);
    }
    if (adjustment_amount !== undefined) {
      paramCount++;
      updates.push(`adjustment_amount = $${paramCount}`);
      params.push(adjustment_amount);
    }
    if (adjustment_reason !== undefined) {
      paramCount++;
      updates.push(`adjustment_reason = $${paramCount}`);
      params.push(adjustment_reason);
    }
    if (notes !== undefined) {
      paramCount++;
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
    }
    
    paramCount++;
    params.push(req.params.id);
    
    const result = await adminPool.query(`
      UPDATE commissions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *
    `, params);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update commission error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// Delete/cancel commission
app.delete('/api/commissions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await adminPool.query(`
      UPDATE commissions SET status = 'cancelled', updated_at = NOW() WHERE id = $1
    `, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete commission error:', error);
    res.status(500).json({ error: 'Failed to cancel commission' });
  }
});

// ============================================
// REPORTING & ANALYTICS ROUTES
// ============================================

// Sales Performance Report
app.get('/api/reports/sales-performance', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    // Build date filter
    let dateFilter = '';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      dateFilter += ` AND o.created_at >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      dateFilter += ` AND o.created_at <= $${params.length}`;
    }
    
    let userFilter = '';
    if (user_id) {
      params.push(user_id);
      userFilter = ` AND u.id = $${params.length}`;
    }
    
    // Main query for sales performance
    const result = await adminPool.query(`
      SELECT 
        u.id as user_id,
        u.name as rep_name,
        u.email as rep_email,
        u.role,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status IN ('signed', 'active') THEN o.id END) as closed_orders,
        COUNT(DISTINCT o.client_id) as unique_clients,
        COALESCE(SUM(CASE WHEN o.status IN ('signed', 'active') THEN o.contract_total END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN o.status IN ('signed', 'active') THEN o.contract_total END), 0) as avg_deal_size,
        COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'rejected' THEN o.id END) as rejected_orders
      FROM users u
      LEFT JOIN orders o ON o.submitted_by = u.id ${dateFilter}
      WHERE u.role IN ('sales_associate', 'sales_manager', 'admin', 'staff')
      ${userFilter}
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_revenue DESC
    `, params);
    
    // Get monthly trend
    const trendParams = user_id ? [user_id] : [];
    const trendUserFilter = user_id ? 'AND o.submitted_by = $1' : '';
    
    const trendResult = await adminPool.query(`
      SELECT 
        DATE_TRUNC('month', o.created_at) as month,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(CASE WHEN o.status IN ('signed', 'active') THEN o.contract_total END), 0) as revenue
      FROM orders o
      WHERE o.created_at >= NOW() - INTERVAL '12 months'
      ${trendUserFilter}
      GROUP BY DATE_TRUNC('month', o.created_at)
      ORDER BY month
    `, trendParams);
    
    res.json({
      data: result.rows,
      trend: trendResult.rows
    });
  } catch (error) {
    console.error('Sales performance report error:', error);
    res.json({ data: [], trend: [] });
  }
});

// Pipeline Report
app.get('/api/reports/pipeline', authenticateToken, async (req, res) => {
  try {
    const { assigned_to } = req.query;
    
    let userFilter = '';
    const params = [];
    
    if (assigned_to) {
      params.push(assigned_to);
      userFilter = ` AND ac.assigned_to = $${params.length}`;
    }
    
    // Pipeline by status
    const statusResult = await adminPool.query(`
      SELECT 
        ac.status,
        COUNT(*) as client_count,
        COUNT(CASE WHEN ac.assigned_to IS NOT NULL THEN 1 END) as assigned_count,
        COUNT(CASE WHEN ac.assigned_to IS NULL THEN 1 END) as unassigned_count,
        COALESCE(SUM(ac.total_revenue), 0) as total_revenue
      FROM advertising_clients ac
      WHERE 1=1 ${userFilter}
      GROUP BY ac.status
      ORDER BY 
        CASE ac.status 
          WHEN 'lead' THEN 1 
          WHEN 'prospect' THEN 2 
          WHEN 'active' THEN 3 
          WHEN 'inactive' THEN 4 
          WHEN 'churned' THEN 5 
        END
    `, params);
    
    // Pipeline by industry
    const industryResult = await adminPool.query(`
      SELECT 
        COALESCE(ac.industry, 'Other') as industry,
        COUNT(*) as client_count,
        COUNT(CASE WHEN ac.status = 'active' THEN 1 END) as active_count,
        COALESCE(SUM(ac.total_revenue), 0) as total_revenue
      FROM advertising_clients ac
      WHERE 1=1 ${userFilter}
      GROUP BY ac.industry
      ORDER BY client_count DESC
      LIMIT 15
    `, params);
    
    // Recent activity in pipeline
    const activityResult = await adminPool.query(`
      SELECT 
        DATE(ca.created_at) as date,
        COUNT(*) as activity_count,
        COUNT(DISTINCT ca.client_id) as unique_clients
      FROM client_activities ca
      ${assigned_to ? 'WHERE ca.user_id = $1' : ''}
      AND ca.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(ca.created_at)
      ORDER BY date
    `, params);
    
    res.json({
      by_status: statusResult.rows,
      by_industry: industryResult.rows,
      activity_trend: activityResult.rows
    });
  } catch (error) {
    console.error('Pipeline report error:', error);
    res.json({ by_status: [], by_industry: [], activity_trend: [] });
  }
});

// Activity Report
app.get('/api/reports/activity', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let dateFilter = 'WHERE ca.created_at >= NOW() - INTERVAL \'30 days\'';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      dateFilter = `WHERE ca.created_at >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      dateFilter += ` AND ca.created_at <= $${params.length}`;
    }
    
    let userFilter = '';
    if (user_id) {
      params.push(user_id);
      userFilter = ` AND ca.user_id = $${params.length}`;
    }
    
    // Activity by type per user
    const byUserResult = await adminPool.query(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(CASE WHEN ca.activity_type = 'call_logged' THEN 1 END) as calls,
        COUNT(CASE WHEN ca.activity_type IN ('meeting_scheduled', 'appointment_scheduled') THEN 1 END) as appointments,
        COUNT(CASE WHEN ca.activity_type = 'proposal_sent' THEN 1 END) as proposals,
        COUNT(CASE WHEN ca.activity_type = 'email_sent' THEN 1 END) as emails,
        COUNT(CASE WHEN ca.activity_type IN ('order_signed', 'deal_closed') THEN 1 END) as deals_closed,
        COUNT(*) as total_activities
      FROM users u
      LEFT JOIN client_activities ca ON ca.user_id = u.id ${dateFilter.replace('WHERE', 'AND')} ${userFilter}
      WHERE u.role IN ('sales_associate', 'sales_manager', 'admin', 'staff')
      GROUP BY u.id, u.name
      ORDER BY total_activities DESC
    `, params);
    
    // Daily activity trend
    const trendResult = await adminPool.query(`
      SELECT 
        DATE(ca.created_at) as date,
        ca.activity_type,
        COUNT(*) as count
      FROM client_activities ca
      ${dateFilter} ${userFilter}
      GROUP BY DATE(ca.created_at), ca.activity_type
      ORDER BY date
    `, params);
    
    // Activity types breakdown
    const typesResult = await adminPool.query(`
      SELECT 
        ca.activity_type,
        COUNT(*) as count
      FROM client_activities ca
      ${dateFilter} ${userFilter}
      GROUP BY ca.activity_type
      ORDER BY count DESC
    `, params);
    
    res.json({
      by_user: byUserResult.rows,
      trend: trendResult.rows,
      by_type: typesResult.rows
    });
  } catch (error) {
    console.error('Activity report error:', error);
    res.json({ by_user: [], trend: [], by_type: [] });
  }
});

// Revenue by Entity Report
app.get('/api/reports/revenue-by-entity', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      dateFilter += ` AND oi.created_at >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      dateFilter += ` AND oi.created_at <= $${params.length}`;
    }
    
    const result = await adminPool.query(`
      SELECT 
        e.id as entity_id,
        e.name as entity_name,
        e.code as entity_code,
        COUNT(DISTINCT oi.order_id) as order_count,
        COALESCE(SUM(oi.line_total), 0) as total_revenue
      FROM entities e
      LEFT JOIN order_items oi ON oi.entity_id = e.id ${dateFilter}
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('signed', 'active')
      GROUP BY e.id, e.name, e.code
      ORDER BY total_revenue DESC
    `, params);
    
    // Monthly trend by entity
    const trendResult = await adminPool.query(`
      SELECT 
        e.code as entity_code,
        DATE_TRUNC('month', oi.created_at) as month,
        COALESCE(SUM(oi.line_total), 0) as revenue
      FROM entities e
      LEFT JOIN order_items oi ON oi.entity_id = e.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('signed', 'active')
      WHERE oi.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY e.code, DATE_TRUNC('month', oi.created_at)
      ORDER BY month, e.code
    `, []);
    
    res.json({
      data: result.rows,
      trend: trendResult.rows
    });
  } catch (error) {
    console.error('Revenue by entity report error:', error);
    res.json({ data: [], trend: [] });
  }
});

// Revenue by Product Category Report
app.get('/api/reports/revenue-by-product', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date) {
      params.push(start_date);
      dateFilter += ` AND oi.created_at >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      dateFilter += ` AND oi.created_at <= $${params.length}`;
    }
    
    const result = await adminPool.query(`
      SELECT 
        COALESCE(p.category, 'Other') as category,
        COUNT(DISTINCT oi.order_id) as order_count,
        COUNT(*) as line_item_count,
        COALESCE(SUM(oi.line_total), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id ${dateFilter}
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('signed', 'active')
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `, params);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Revenue by product report error:', error);
    res.json({ data: [] });
  }
});

// Team Leaderboard
app.get('/api/reports/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { period } = req.query; // 'week', 'month', 'quarter', 'year'
    
    let dateFilter = 'NOW() - INTERVAL \'30 days\'';
    if (period === 'week') dateFilter = 'NOW() - INTERVAL \'7 days\'';
    if (period === 'quarter') dateFilter = 'NOW() - INTERVAL \'90 days\'';
    if (period === 'year') dateFilter = 'NOW() - INTERVAL \'365 days\'';
    
    const result = await adminPool.query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.role,
        COUNT(DISTINCT CASE WHEN o.status IN ('signed', 'active') THEN o.id END) as closed_deals,
        COALESCE(SUM(CASE WHEN o.status IN ('signed', 'active') THEN o.contract_total END), 0) as revenue,
        COUNT(DISTINCT ca.id) as activities,
        COUNT(DISTINCT CASE WHEN ac.created_at >= ${dateFilter} THEN ac.id END) as new_clients
      FROM users u
      LEFT JOIN orders o ON o.submitted_by = u.id AND o.created_at >= ${dateFilter}
      LEFT JOIN client_activities ca ON ca.user_id = u.id AND ca.created_at >= ${dateFilter}
      LEFT JOIN advertising_clients ac ON ac.assigned_to = u.id
      WHERE u.role IN ('sales_associate', 'sales_manager', 'admin', 'staff')
        AND u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY revenue DESC
      LIMIT 20
    `);
    
    res.json({ leaderboard: result.rows, period });
  } catch (error) {
    console.error('Leaderboard report error:', error);
    res.json({ leaderboard: [], period: 'month' });
  }
});

// ============================================
// EMAIL INTEGRATION ROUTES
// ============================================

// Get email templates
app.get('/api/email/templates', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM email_templates WHERE is_active = true';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY is_system DESC, name';
    
    const result = await adminPool.query(query, params);
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.json({ templates: [] });
  }
});

// Create/update email template
app.post('/api/email/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, name, subject, body, category, variables } = req.body;
    
    let result;
    if (id) {
      // Update existing (can't update system templates)
      result = await adminPool.query(`
        UPDATE email_templates 
        SET name = $1, subject = $2, body = $3, category = $4, variables = $5, updated_at = NOW()
        WHERE id = $6 AND is_system = false
        RETURNING *
      `, [name, subject, body, category, variables, id]);
    } else {
      // Create new
      result = await adminPool.query(`
        INSERT INTO email_templates (name, subject, body, category, variables, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, subject, body, category, variables, req.user.id]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save email template error:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Delete email template (non-system only)
app.delete('/api/email/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await adminPool.query(`
      UPDATE email_templates SET is_active = false WHERE id = $1 AND is_system = false
    `, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete email template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Send email
app.post('/api/email/send', authenticateToken, async (req, res) => {
  try {
    const {
      recipient_email, recipient_name, client_id, contact_id,
      subject, body, template_id, attachments
    } = req.body;
    
    if (!recipient_email || !subject || !body) {
      return res.status(400).json({ error: 'Recipient email, subject, and body are required' });
    }
    
    // Get sender info
    const senderResult = await adminPool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [req.user.id]
    );
    const sender = senderResult.rows[0];
    
    // Log the email first
    const logResult = await adminPool.query(`
      INSERT INTO email_logs (
        sent_by, sent_from, recipient_email, recipient_name,
        client_id, contact_id, subject, body, template_id, attachments, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'queued')
      RETURNING *
    `, [
      req.user.id, sender.email, recipient_email, recipient_name,
      client_id, contact_id, subject, body, template_id, 
      attachments ? JSON.stringify(attachments) : null
    ]);
    
    const emailLog = logResult.rows[0];
    
    // Send via Postmark
    try {
      const sendResult = await emailService.sendEmail({
        From: process.env.POSTMARK_FROM_EMAIL || 'noreply@myadvertisingreport.com',
        To: recipient_email,
        Subject: subject,
        HtmlBody: body,
        ReplyTo: sender.email,
        Tag: 'platform-email',
        Metadata: {
          email_log_id: emailLog.id,
          sent_by: req.user.id
        }
      });
      
      // Update log with success
      await adminPool.query(`
        UPDATE email_logs 
        SET status = 'sent', postmark_message_id = $1, sent_at = NOW()
        WHERE id = $2
      `, [sendResult.MessageID, emailLog.id]);
      
      // Log activity if client_id provided
      if (client_id) {
        try {
          await adminPool.query(`
            INSERT INTO client_activities (client_id, user_id, activity_type, title, description)
            VALUES ($1, $2, 'email_sent', $3, $4)
          `, [client_id, req.user.id, `Email: ${subject}`, `Sent to ${recipient_email}`]);
        } catch (activityErr) {
          console.log('Activity logging failed:', activityErr.message);
        }
      }
      
      res.json({ success: true, message_id: sendResult.MessageID, email_log_id: emailLog.id });
    } catch (sendError) {
      // Update log with failure
      await adminPool.query(`
        UPDATE email_logs 
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [sendError.message, emailLog.id]);
      
      throw sendError;
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

// Get email history
app.get('/api/email/history', authenticateToken, async (req, res) => {
  try {
    const { client_id, contact_id, sent_by, limit = 50 } = req.query;
    
    let query = `
      SELECT el.*, u.name as sender_name, ac.business_name as client_name
      FROM email_logs el
      LEFT JOIN users u ON el.sent_by = u.id
      LEFT JOIN advertising_clients ac ON el.client_id = ac.id
      WHERE 1=1
    `;
    const params = [];
    
    // Non-admins can only see their own emails
    if (req.user.role !== 'admin' && !req.user.is_super_admin) {
      params.push(req.user.id);
      query += ` AND el.sent_by = $${params.length}`;
    } else if (sent_by) {
      params.push(sent_by);
      query += ` AND el.sent_by = $${params.length}`;
    }
    
    if (client_id) {
      params.push(client_id);
      query += ` AND el.client_id = $${params.length}`;
    }
    
    if (contact_id) {
      params.push(contact_id);
      query += ` AND el.contact_id = $${params.length}`;
    }
    
    params.push(parseInt(limit));
    query += ` ORDER BY el.created_at DESC LIMIT $${params.length}`;
    
    const result = await adminPool.query(query, params);
    res.json({ emails: result.rows });
  } catch (error) {
    console.error('Get email history error:', error);
    res.json({ emails: [] });
  }
});

// Get email stats
app.get('/api/email/stats', authenticateToken, async (req, res) => {
  try {
    const { user_id, days = 30 } = req.query;
    
    const effectiveUserId = req.user.role === 'admin' || req.user.is_super_admin
      ? user_id
      : req.user.id;
    
    let userFilter = '';
    const params = [days];
    
    if (effectiveUserId) {
      params.push(effectiveUserId);
      userFilter = ` AND sent_by = $${params.length}`;
    }
    
    const result = await adminPool.query(`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked
      FROM email_logs
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      ${userFilter}
    `, params);
    
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get email stats error:', error);
    res.json({});
  }
});

// ============================================
// ROLE-BASED DASHBOARD ENDPOINTS
// ============================================

// Get dashboard type for current user
app.get('/api/dashboard/my-type', authenticateToken, (req, res) => {
  const email = req.user.email?.toLowerCase();
  let dashboardType = 'simpli';
  
  if (email === 'bill@wsicnews.com') dashboardType = 'radio';
  else if (email === 'admin@wsicnews.com') dashboardType = 'operations';
  else if (email === 'leslie@lakenormanwoman.com') dashboardType = 'creative';
  else if (email === 'erin@lakenormanwoman.com') dashboardType = 'events';
  else if (req.user.is_super_admin) dashboardType = 'super_admin';
  else if (req.user.role === 'admin') dashboardType = 'operations';
  else if (req.user.is_sales || req.user.role === 'sales_associate') dashboardType = 'sales';
  
  res.json({ dashboardType, user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, is_super_admin: req.user.is_super_admin, is_sales: req.user.is_sales }});
});

// Super Admin Dashboard
app.get('/api/dashboard/super-admin', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_super_admin) return res.status(403).json({ error: 'Access denied' });

    const [orderStats, pendingApprovals, recentOrders, revenueByEntity, pendingCommissions, teamActivity, invoiceStats] = await Promise.all([
      adminPool.query(`SELECT status, COUNT(*) as count, COALESCE(SUM(contract_total), 0) as contract_value FROM orders GROUP BY status`),
      adminPool.query(`SELECT COUNT(*) as count FROM orders WHERE status = 'pending_approval'`),
      adminPool.query(`SELECT o.*, ac.business_name as client_name, u.name as submitted_by_name FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id LEFT JOIN users u ON o.submitted_by = u.id WHERE o.created_at >= NOW() - INTERVAL '7 days' ORDER BY o.created_at DESC LIMIT 10`),
      adminPool.query(`SELECT e.name as entity_name, e.code as entity_code, COUNT(DISTINCT o.id) as order_count, COALESCE(SUM(oi.line_total), 0) as revenue FROM entities e LEFT JOIN order_items oi ON oi.entity_id = e.id LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('signed', 'active') GROUP BY e.id, e.name, e.code ORDER BY revenue DESC`),
      adminPool.query(`SELECT COUNT(*) as count, COALESCE(SUM(commission_amount), 0) as total FROM commissions WHERE status = 'pending'`),
      adminPool.query(`SELECT id, name, email, role, last_login, is_sales, is_super_admin FROM users WHERE is_active = true ORDER BY last_login DESC NULLS LAST LIMIT 10`),
      adminPool.query(`SELECT COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft, COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent, COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue, COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid, COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN balance_due END), 0) as outstanding_balance FROM invoices`)
    ]);

    res.json({
      orderStats: orderStats.rows,
      pendingApprovals: parseInt(pendingApprovals.rows[0]?.count || 0),
      recentOrders: recentOrders.rows,
      revenueByEntity: revenueByEntity.rows,
      pendingCommissions: { count: parseInt(pendingCommissions.rows[0]?.count || 0), total: parseFloat(pendingCommissions.rows[0]?.total || 0) },
      teamActivity: teamActivity.rows,
      invoiceStats: invoiceStats.rows[0] || {}
    });
  } catch (error) {
    console.error('Super admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Operations Dashboard (Lalaine)
app.get('/api/dashboard/operations', authenticateToken, async (req, res) => {
  try {
    const [ordersToProcess, invoicesNeedingAction, pendingCommissions, myTasks] = await Promise.all([
      adminPool.query(`SELECT o.*, ac.business_name as client_name, u.name as submitted_by_name,
        (SELECT json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name, 'product_category', oi.product_category, 'entity_id', oi.entity_id, 'e_name', e.name))
        FROM order_items oi LEFT JOIN entities e ON oi.entity_id = e.id WHERE oi.order_id = o.id) as items
        FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id LEFT JOIN users u ON o.submitted_by = u.id
        WHERE o.status IN ('pending_approval', 'approved', 'sent')
        ORDER BY CASE o.status WHEN 'pending_approval' THEN 1 WHEN 'approved' THEN 2 WHEN 'sent' THEN 3 END, o.created_at ASC`),
      adminPool.query(`SELECT i.*, ac.business_name as client_name,
        CASE WHEN i.status = 'draft' THEN 'Send to client' WHEN i.status = 'overdue' THEN 'Follow up' WHEN i.last_payment_error IS NOT NULL THEN 'Payment failed' ELSE 'Review' END as action_needed
        FROM invoices i LEFT JOIN advertising_clients ac ON i.client_id = ac.id
        WHERE i.status IN ('draft', 'overdue') OR i.last_payment_error IS NOT NULL
        ORDER BY CASE WHEN i.last_payment_error IS NOT NULL THEN 1 WHEN i.status = 'overdue' THEN 2 ELSE 3 END, i.due_date ASC LIMIT 20`),
      adminPool.query(`SELECT c.*, u.name as user_name, ac.business_name as client_name FROM commissions c JOIN users u ON c.user_id = u.id LEFT JOIN advertising_clients ac ON c.client_id = ac.id WHERE c.status = 'pending' ORDER BY c.created_at ASC LIMIT 20`),
      adminPool.query(`SELECT t.*, ac.business_name as client_name FROM tasks t LEFT JOIN advertising_clients ac ON t.client_id = ac.id WHERE t.status != 'completed' AND (t.assigned_to = $1 OR t.assigned_role IN ('admin', 'operations')) ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, t.due_date ASC NULLS LAST`, [req.user.id])
    ]);

    const orders = ordersToProcess.rows;
    res.json({
      summary: {
        pendingApproval: orders.filter(o => o.status === 'pending_approval').length,
        readyToSend: orders.filter(o => o.status === 'approved').length,
        awaitingSignature: orders.filter(o => o.status === 'sent').length,
        overdueInvoices: invoicesNeedingAction.rows.filter(i => i.status === 'overdue').length,
        failedPayments: invoicesNeedingAction.rows.filter(i => i.last_payment_error).length,
        pendingCommissions: pendingCommissions.rows.length,
        openTasks: myTasks.rows.length
      },
      ordersToProcess: orders,
      invoicesNeedingAction: invoicesNeedingAction.rows,
      pendingCommissions: pendingCommissions.rows,
      tasks: myTasks.rows
    });
  } catch (error) {
    console.error('Operations dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Radio Dashboard (Bill)
app.get('/api/dashboard/radio', authenticateToken, async (req, res) => {
  try {
    const wsicEntity = await adminPool.query(`SELECT id FROM entities WHERE code = 'WSIC' OR name ILIKE '%wsic%' LIMIT 1`);
    const wsicEntityId = wsicEntity.rows[0]?.id;

    const [broadcastOrders, productionTasks, wsicRevenue, upcomingSpots] = await Promise.all([
      adminPool.query(`SELECT DISTINCT o.*, ac.business_name as client_name, u.name as submitted_by_name,
        (SELECT json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name, 'product_category', oi.product_category, 'line_total', oi.line_total, 'entity_name', e.name))
        FROM order_items oi LEFT JOIN entities e ON oi.entity_id = e.id WHERE oi.order_id = o.id AND (oi.entity_id = $1 OR oi.product_category ILIKE '%broadcast%' OR oi.product_category ILIKE '%radio%')) as items
        FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id LEFT JOIN users u ON o.submitted_by = u.id
        WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND (oi.entity_id = $1 OR oi.product_category ILIKE '%broadcast%' OR oi.product_category ILIKE '%radio%'))
        AND o.status IN ('signed', 'active', 'approved', 'sent') ORDER BY o.contract_start_date ASC LIMIT 30`, [wsicEntityId]),
      adminPool.query(`SELECT t.*, ac.business_name as client_name FROM tasks t LEFT JOIN advertising_clients ac ON t.client_id = ac.id WHERE t.status != 'completed' AND (t.assigned_to = $1 OR t.assigned_role = 'radio' OR t.task_type IN ('production', 'radio_spot', 'commercial')) ORDER BY t.due_date ASC NULLS LAST`, [req.user.id]),
      adminPool.query(`SELECT COALESCE(SUM(oi.line_total), 0) as monthly_revenue, COUNT(DISTINCT o.id) as order_count FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.entity_id = $1 AND o.status IN ('signed', 'active') AND o.contract_start_date <= CURRENT_DATE AND o.contract_end_date >= CURRENT_DATE`, [wsicEntityId]),
      adminPool.query(`SELECT o.*, ac.business_name as client_name FROM orders o JOIN order_items oi ON oi.order_id = o.id LEFT JOIN advertising_clients ac ON o.client_id = ac.id WHERE oi.entity_id = $1 AND o.status IN ('signed', 'active') AND o.contract_start_date >= CURRENT_DATE AND o.contract_start_date <= CURRENT_DATE + INTERVAL '30 days' ORDER BY o.contract_start_date ASC LIMIT 10`, [wsicEntityId])
    ]);

    res.json({
      broadcastOrders: broadcastOrders.rows,
      productionTasks: productionTasks.rows,
      wsicRevenue: wsicRevenue.rows[0] || { monthly_revenue: 0, order_count: 0 },
      upcomingSpots: upcomingSpots.rows,
      summary: { activeOrders: broadcastOrders.rows.filter(o => o.status === 'active').length, pendingProduction: productionTasks.rows.length, upcomingStarts: upcomingSpots.rows.length }
    });
  } catch (error) {
    console.error('Radio dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Creative Dashboard (Leslie)
app.get('/api/dashboard/creative', authenticateToken, async (req, res) => {
  try {
    const lknEntity = await adminPool.query(`SELECT id FROM entities WHERE code = 'LKN' OR name ILIKE '%lake norman woman%' LIMIT 1`);
    const lknEntityId = lknEntity.rows[0]?.id;

    const [creativeTasks, printOrders, adBreakdown, broadcastNeedingCreative] = await Promise.all([
      adminPool.query(`SELECT t.*, ac.business_name as client_name FROM tasks t LEFT JOIN advertising_clients ac ON t.client_id = ac.id WHERE t.status != 'completed' AND (t.assigned_to = $1 OR t.assigned_role IN ('creative', 'editorial') OR t.task_type IN ('creative_brief', 'art_collection', 'copy_writing')) ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, t.due_date ASC NULLS LAST`, [req.user.id]),
      adminPool.query(`SELECT DISTINCT o.*, ac.business_name as client_name, ac.primary_contact_email,
        (SELECT json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name, 'product_category', oi.product_category, 'line_total', oi.line_total, 'entity_name', e.name))
        FROM order_items oi LEFT JOIN entities e ON oi.entity_id = e.id WHERE oi.order_id = o.id AND (oi.entity_id = $1 OR oi.product_category ILIKE '%print%')) as items
        FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id
        WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND (oi.entity_id = $1 OR oi.product_category ILIKE '%print%'))
        AND o.status IN ('signed', 'active') ORDER BY o.contract_start_date ASC LIMIT 30`, [lknEntityId]),
      adminPool.query(`SELECT oi.product_name, COUNT(*) as count, COALESCE(SUM(oi.line_total), 0) as revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.entity_id = $1 AND o.status IN ('signed', 'active') AND oi.product_category ILIKE '%print%' GROUP BY oi.product_name ORDER BY revenue DESC`, [lknEntityId]),
      adminPool.query(`SELECT DISTINCT o.*, ac.business_name as client_name, ac.primary_contact_email FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id JOIN order_items oi ON oi.order_id = o.id WHERE (oi.product_category ILIKE '%broadcast%' OR oi.product_category ILIKE '%radio%') AND o.status IN ('signed', 'active') AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.order_id = o.id AND t.task_type = 'creative_brief' AND t.status = 'completed') ORDER BY o.contract_start_date ASC LIMIT 20`)
    ]);

    res.json({
      tasks: creativeTasks.rows,
      printOrders: printOrders.rows,
      adBreakdown: adBreakdown.rows,
      broadcastNeedingCreative: broadcastNeedingCreative.rows,
      summary: { openTasks: creativeTasks.rows.length, activePrintOrders: printOrders.rows.length, needsCreativeBrief: broadcastNeedingCreative.rows.length }
    });
  } catch (error) {
    console.error('Creative dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Events Dashboard (Erin)
app.get('/api/dashboard/events', authenticateToken, async (req, res) => {
  try {
    const [eventOrders, eventRevenue, upcomingEvents, eventTasks, eventClients] = await Promise.all([
      adminPool.query(`SELECT DISTINCT o.*, ac.business_name as client_name, u.name as submitted_by_name,
        (SELECT json_agg(json_build_object('id', oi.id, 'product_name', oi.product_name, 'product_category', oi.product_category, 'line_total', oi.line_total, 'entity_name', e.name))
        FROM order_items oi LEFT JOIN entities e ON oi.entity_id = e.id WHERE oi.order_id = o.id AND oi.product_category ILIKE '%event%') as items
        FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id LEFT JOIN users u ON o.submitted_by = u.id
        WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_category ILIKE '%event%')
        AND o.status IN ('pending_approval', 'approved', 'sent', 'signed', 'active') ORDER BY o.contract_start_date ASC`),
      adminPool.query(`SELECT TO_CHAR(o.contract_start_date, 'YYYY-MM') as month, COUNT(DISTINCT o.id) as order_count, COALESCE(SUM(oi.line_total), 0) as revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_category ILIKE '%event%' AND o.status IN ('signed', 'active') AND o.contract_start_date >= CURRENT_DATE - INTERVAL '6 months' GROUP BY TO_CHAR(o.contract_start_date, 'YYYY-MM') ORDER BY month DESC`),
      adminPool.query(`SELECT DISTINCT o.*, ac.business_name as client_name FROM orders o JOIN order_items oi ON oi.order_id = o.id LEFT JOIN advertising_clients ac ON o.client_id = ac.id WHERE oi.product_category ILIKE '%event%' AND o.status IN ('signed', 'active') AND o.contract_start_date >= CURRENT_DATE ORDER BY o.contract_start_date ASC LIMIT 10`),
      adminPool.query(`SELECT t.*, ac.business_name as client_name FROM tasks t LEFT JOIN advertising_clients ac ON t.client_id = ac.id WHERE t.status != 'completed' AND (t.assigned_to = $1 OR t.assigned_role = 'event_manager' OR t.task_type ILIKE '%event%') ORDER BY t.due_date ASC NULLS LAST`, [req.user.id]),
      adminPool.query(`SELECT DISTINCT ac.id, ac.business_name, ac.primary_contact_name, ac.primary_contact_email, COUNT(o.id) as order_count, COALESCE(SUM(oi.line_total), 0) as total_revenue FROM advertising_clients ac JOIN orders o ON o.client_id = ac.id JOIN order_items oi ON oi.order_id = o.id WHERE oi.product_category ILIKE '%event%' AND o.status IN ('signed', 'active') GROUP BY ac.id, ac.business_name, ac.primary_contact_name, ac.primary_contact_email ORDER BY total_revenue DESC LIMIT 20`)
    ]);

    res.json({
      eventOrders: eventOrders.rows,
      eventRevenue: eventRevenue.rows,
      upcomingEvents: upcomingEvents.rows,
      tasks: eventTasks.rows,
      eventClients: eventClients.rows,
      summary: { totalEvents: eventOrders.rows.length, upcomingCount: upcomingEvents.rows.length, openTasks: eventTasks.rows.length, totalClients: eventClients.rows.length }
    });
  } catch (error) {
    console.error('Events dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Sales Dashboard
app.get('/api/dashboard/sales', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [myClients, myOrders, myCommissions, recentCommissions] = await Promise.all([
      adminPool.query(`SELECT ac.*, (SELECT COUNT(*) FROM orders o WHERE o.client_id = ac.id AND o.status IN ('signed', 'active')) as active_orders, (SELECT COALESCE(SUM(contract_total), 0) FROM orders o WHERE o.client_id = ac.id AND o.status IN ('signed', 'active')) as total_contract_value FROM advertising_clients ac WHERE ac.sales_associate_id = $1 OR ac.assigned_to = $1 ORDER BY ac.last_activity_at DESC NULLS LAST LIMIT 50`, [userId]),
      adminPool.query(`SELECT o.*, ac.business_name as client_name,
        (SELECT json_agg(json_build_object('product_name', oi.product_name, 'product_category', oi.product_category, 'entity_name', e.name))
        FROM order_items oi LEFT JOIN entities e ON oi.entity_id = e.id WHERE oi.order_id = o.id) as items
        FROM orders o LEFT JOIN advertising_clients ac ON o.client_id = ac.id WHERE o.sales_associate_id = $1 OR o.submitted_by = $1
        ORDER BY CASE o.status WHEN 'draft' THEN 1 WHEN 'pending_approval' THEN 2 WHEN 'approved' THEN 3 WHEN 'sent' THEN 4 WHEN 'signed' THEN 5 WHEN 'active' THEN 6 ELSE 7 END, o.created_at DESC LIMIT 30`, [userId]),
      adminPool.query(`SELECT COALESCE(SUM(CASE WHEN status = 'approved' AND period_year = EXTRACT(YEAR FROM CURRENT_DATE) THEN commission_amount END), 0) as ytd_approved, COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount END), 0) as pending, COALESCE(SUM(CASE WHEN status = 'paid' AND period_year = EXTRACT(YEAR FROM CURRENT_DATE) THEN commission_amount END), 0) as ytd_paid, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count FROM commissions WHERE user_id = $1`, [userId]),
      adminPool.query(`SELECT c.*, ac.business_name as client_name FROM commissions c LEFT JOIN advertising_clients ac ON c.client_id = ac.id WHERE c.user_id = $1 ORDER BY c.created_at DESC LIMIT 10`, [userId])
    ]);

    const orders = myOrders.rows;
    const pipelineSummary = {
      draft: orders.filter(o => o.status === 'draft').length,
      pending_approval: orders.filter(o => o.status === 'pending_approval').length,
      approved: orders.filter(o => o.status === 'approved').length,
      sent: orders.filter(o => o.status === 'sent').length,
      signed: orders.filter(o => o.status === 'signed').length,
      active: orders.filter(o => o.status === 'active').length
    };
    const pipelineValue = orders.filter(o => ['draft', 'pending_approval', 'approved', 'sent'].includes(o.status)).reduce((sum, o) => sum + parseFloat(o.contract_total || 0), 0);

    res.json({
      myClients: myClients.rows,
      myOrders: orders,
      commissions: { ...myCommissions.rows[0], recent: recentCommissions.rows },
      pipelineSummary,
      pipelineValue,
      summary: { totalClients: myClients.rows.length, activeOrders: orders.filter(o => o.status === 'active').length, pipelineOrders: orders.filter(o => ['draft', 'pending_approval', 'approved', 'sent'].includes(o.status)).length }
    });
  } catch (error) {
    console.error('Sales dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Task management
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, task_type, assigned_to, assigned_role, priority, due_date, order_id, invoice_id, client_id } = req.body;
    const result = await adminPool.query(`INSERT INTO tasks (title, description, task_type, assigned_to, assigned_role, priority, due_date, order_id, invoice_id, client_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING *`,
      [title, description, task_type, assigned_to, assigned_role, priority || 'normal', due_date, order_id, invoice_id, client_id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const completedClause = status === 'completed' ? `, completed_at = NOW(), completed_by = '${req.user.id}'` : '';
    const result = await adminPool.query(`UPDATE tasks SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()${completedClause} WHERE id = $3 RETURNING *`, [status, notes, req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { status, assigned_to, task_type } = req.query;
    let query = `SELECT t.*, ac.business_name as client_name, assignee.name as assigned_to_name FROM tasks t LEFT JOIN advertising_clients ac ON t.client_id = ac.id LEFT JOIN users assignee ON t.assigned_to = assignee.id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); query += ` AND t.assigned_to = $${params.length}`; }
    if (task_type) { params.push(task_type); query += ` AND t.task_type = $${params.length}`; }
    query += ` ORDER BY t.created_at DESC LIMIT 100`;
    const result = await adminPool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// ============================================
// EMAIL DASHBOARD & MONITORING
// ============================================

// Ensure email_logs table has all required columns (run once at startup)
const ensureEmailLogsColumns = async () => {
  try {
    // Add missing columns if they don't exist
    const alterQueries = [
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_type VARCHAR(50)`,
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id)`,
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id)`,
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP`,
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP`,
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS metadata JSONB`,
      `ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`
    ];
    
    for (const query of alterQueries) {
      try {
        await adminPool.query(query);
      } catch (err) {
        // Ignore errors (column might already exist or table doesn't exist yet)
        if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
          console.log('Email logs migration note:', err.message);
        }
      }
    }
    console.log('Email logs table columns verified');
  } catch (err) {
    console.error('Email logs migration error:', err.message);
  }
};

// Call migration on first request (lazy init)
let emailLogsMigrated = false;

// Get email dashboard stats
app.get('/api/email/dashboard', authenticateToken, async (req, res) => {
  try {
    // Run migration once
    if (!emailLogsMigrated) {
      await ensureEmailLogsColumns();
      emailLogsMigrated = true;
    }

    // Verify admin access
    if (!req.user.is_super_admin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [stats, recentEmails, byType, byStatus] = await Promise.all([
      // Overall stats (last 30 days)
      adminPool.query(`
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked
        FROM email_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `),
      // Recent emails (last 50)
      adminPool.query(`
        SELECT el.*, 
          ac.business_name as client_name,
          o.order_number,
          u.name as sent_by_name
        FROM email_logs el
        LEFT JOIN advertising_clients ac ON el.client_id = ac.id
        LEFT JOIN orders o ON el.order_id = o.id
        LEFT JOIN users u ON el.sent_by = u.id
        ORDER BY el.created_at DESC
        LIMIT 50
      `),
      // By email type
      adminPool.query(`
        SELECT 
          COALESCE(email_type, 'unknown') as email_type,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM email_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY email_type
        ORDER BY count DESC
      `),
      // By status
      adminPool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM email_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY status
      `)
    ]);

    res.json({
      stats: stats.rows[0] || {},
      recentEmails: recentEmails.rows,
      byType: byType.rows,
      byStatus: byStatus.rows
    });
  } catch (error) {
    console.error('Email dashboard error:', error);
    res.status(500).json({ error: 'Failed to load email dashboard' });
  }
});

// Get emails for a specific order
app.get('/api/email/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await adminPool.query(`
      SELECT el.*, 
        ac.business_name as client_name,
        o.order_number
      FROM email_logs el
      LEFT JOIN advertising_clients ac ON el.client_id = ac.id
      LEFT JOIN orders o ON el.order_id = o.id
      WHERE el.order_id = $1
      ORDER BY el.created_at DESC
    `, [orderId]);
    
    res.json({ emails: result.rows });
  } catch (error) {
    console.error('Get order emails error:', error);
    res.status(500).json({ error: 'Failed to get order emails' });
  }
});

// Resend a failed email
app.post('/api/email/:id/resend', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_super_admin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    // Get the original email
    const emailResult = await adminPool.query(
      'SELECT * FROM email_logs WHERE id = $1',
      [id]
    );
    
    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    const originalEmail = emailResult.rows[0];
    
    // For now, just mark as needing resend - actual resend would require storing the full email body
    await adminPool.query(
      'UPDATE email_logs SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
      ['pending_resend', 'Queued for manual resend', id]
    );
    
    res.json({ 
      success: true, 
      message: 'Email marked for resend',
      note: 'Manual intervention may be required to actually resend'
    });
  } catch (error) {
    console.error('Resend email error:', error);
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

// Test email endpoint - send a test email to verify configuration
app.post('/api/email/test', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_super_admin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Email address required' });
    }

    console.log(`[Email Test] Sending test email to ${to}`);
    
    const result = await emailService.sendTestEmail(to);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Test email sent to ${to}`,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error,
        hint: 'Check POSTMARK_API_KEY environment variable and Postmark sender signatures'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
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

// Training Center & User Profiles - v2
