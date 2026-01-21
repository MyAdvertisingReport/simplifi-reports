// ============================================================
// AUTHENTICATION API ROUTES
// Handles login, logout, session management, user CRUD
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Pool } = require('pg');

// Constants
const SALT_ROUNDS = 10;
const SESSION_DURATION_HOURS = 8;  // Regular session
const REMEMBER_ME_DAYS = 30;       // "Remember me" session
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Database pool
let pool = null;

const initPool = (connectionString) => {
  if (!pool && connectionString) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Auth routes connecting to database');
  }
};

// Middleware to ensure pool is available
const ensurePool = (req, res, next) => {
  if (!pool) {
    const connString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (connString) {
      initPool(connString);
    }
  }
  if (!pool) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  next();
};

router.use(ensurePool);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Generate secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash password
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// Get session expiration time
const getSessionExpiration = (rememberMe = false) => {
  const now = new Date();
  if (rememberMe) {
    now.setDate(now.getDate() + REMEMBER_ME_DAYS);
  } else {
    now.setHours(now.getHours() + SESSION_DURATION_HOURS);
  }
  return now;
};

// Check if account is locked
const isAccountLocked = (user) => {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
};

// Log user activity
const logActivity = async (userId, action, entityType = null, entityId = null, details = null, ipAddress = null) => {
  try {
    await pool.query(
      `INSERT INTO user_activity_log (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// ============================================================
// AUTH MIDDLEWARE (for protecting routes)
// ============================================================

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.session_token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find valid session
    const result = await pool.query(
      `SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, u.is_active
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW() AND u.is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Update last activity
    await pool.query(
      'UPDATE user_sessions SET last_activity_at = NOW() WHERE token = $1',
      [token]
    );

    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based access middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Export middleware for use in other routes
router.authenticate = authenticate;
router.requireRole = requireRole;

// ============================================================
// LOGIN / LOGOUT ROUTES
// ============================================================

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const unlockTime = new Date(user.locked_until);
      return res.status(401).json({ 
        error: `Account is temporarily locked. Try again after ${unlockTime.toLocaleTimeString()}.` 
      });
    }

    // Verify password
    const validPassword = await verifyPassword(password, user.password_hash);

    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      }

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [newAttempts, lockUntil, user.id]
      );

      await logActivity(user.id, 'login_failed', null, null, { attempts: newAttempts }, ipAddress);

      if (lockUntil) {
        return res.status(401).json({ 
          error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.` 
        });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Successful login - reset failed attempts and create session
    const token = generateToken();
    const expiresAt = getSessionExpiration(rememberMe);

    // Create session
    await pool.query(
      `INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at, remember_me)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, token, ipAddress, req.headers['user-agent'], expiresAt, rememberMe]
    );

    // Update user record
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    await logActivity(user.id, 'login_success', null, null, { rememberMe }, ipAddress);

    // Return user info and token
    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.session_token;
    
    await pool.query('DELETE FROM user_sessions WHERE token = $1', [token]);
    await logActivity(req.user.user_id, 'logout', null, null, null, req.ip);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /api/auth/logout-all - Logout all sessions for current user
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.user_id]);
    await logActivity(req.user.user_id, 'logout_all', null, null, null, req.ip);

    res.json({ message: 'All sessions logged out' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to logout all sessions' });
  }
});

// ============================================================
// SESSION ROUTES
// ============================================================

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      id: req.user.user_id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// GET /api/auth/sessions - Get user's active sessions
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ip_address, user_agent, created_at, last_activity_at, expires_at, remember_me
       FROM user_sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_activity_at DESC`,
      [req.user.user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// ============================================================
// PASSWORD MANAGEMENT
// ============================================================

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Get user with password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.user_id]
    );

    const validPassword = await verifyPassword(currentPassword, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const newHash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.user_id]
    );

    await logActivity(req.user.user_id, 'password_changed', null, null, null, req.ip);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================================
// USER MANAGEMENT (Admin only)
// ============================================================

// GET /api/auth/users - List all users
router.get('/users', authenticate, requireRole('admin', 'sales_manager'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_active, last_login_at, created_at
       FROM users
       ORDER BY last_name, first_name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /api/auth/users - Create new user (Admin only)
router.post('/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'sales_associate' } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const validRoles = ['sales_associate', 'sales_manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [email.toLowerCase().trim(), passwordHash, firstName.trim(), lastName.trim(), role]
    );

    await logActivity(req.user.user_id, 'user_created', 'user', result.rows[0].id, { email, role }, req.ip);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/auth/users/:id - Update user (Admin only)
router.put('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, isActive } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email.toLowerCase().trim());
    }
    if (firstName !== undefined) {
      paramCount++;
      updates.push(`first_name = $${paramCount}`);
      values.push(firstName.trim());
    }
    if (lastName !== undefined) {
      paramCount++;
      updates.push(`last_name = $${paramCount}`);
      values.push(lastName.trim());
    }
    if (role !== undefined) {
      const validRoles = ['sales_associate', 'sales_manager', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }
    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    paramCount++;
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, role, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logActivity(req.user.user_id, 'user_updated', 'user', id, req.body, req.ip);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/auth/users/:id/reset-password - Reset user's password (Admin only)
router.post('/users/:id/reset-password', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await hashPassword(newPassword);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate all sessions for this user
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);

    await logActivity(req.user.user_id, 'password_reset_admin', 'user', id, null, req.ip);

    res.json({ message: 'Password reset successfully. User must log in again.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ============================================================
// SESSION CLEANUP (call periodically)
// ============================================================

const cleanupExpiredSessions = async () => {
  try {
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE expires_at < NOW()'
    );
    if (result.rowCount > 0) {
      console.log(`Cleaned up ${result.rowCount} expired sessions`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};

// Export cleanup function
router.cleanupExpiredSessions = cleanupExpiredSessions;

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
module.exports.initPool = initPool;
