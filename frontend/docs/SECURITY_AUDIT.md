# WSIC Advertising Platform - Security Audit
## Last Updated: January 27, 2026
## Next Review Due: April 2026

---

## 📊 Security Score: 7.5/10 (Good)

| Category | Score | Status |
|----------|-------|--------|
| Authentication | 8/10 | ✅ Strong |
| Data Protection | 8/10 | ✅ Strong |
| API Security | 6/10 | ⚠️ Needs Work |
| Payment Security | 9/10 | ✅ Excellent |
| Infrastructure | 7/10 | ⚠️ Needs Work |

---

# 🏢 PRACTICAL SECTION
*For business stakeholders and non-technical team members*

## What This Means for Your Business

### ✅ Your Customer Data is Protected
- **Passwords are encrypted** using industry-standard methods (bcrypt)
- **Payment information is never stored** on our servers - Stripe handles all card/bank data
- **Login attempts are monitored** - accounts lock after 5 failed attempts
- **User activity is logged** for audit purposes

### ✅ Payment Processing is Secure
- **PCI Compliant** - We use Stripe Elements, meaning card numbers never touch our servers
- **Bank account data** is handled by Stripe Financial Connections
- **Only last 4 digits** of payment methods are visible to staff

### ✅ Access is Controlled
- **Role-based permissions** - Only admins can access sensitive functions
- **Individual user accounts** - No shared logins
- **Session management** - Users are logged out after inactivity

### ⚠️ Areas We're Improving
- Adding extra protection against automated login attacks
- Improving browser security headers
- Strengthening password requirements

---

## Privacy & Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Encrypted passwords | ✅ Yes | bcrypt with salt |
| No plain-text storage | ✅ Yes | All sensitive data hashed |
| Payment data offloaded | ✅ Yes | Stripe handles all card/ACH |
| User activity logging | ✅ Yes | Login, changes tracked |
| Role-based access | ✅ Yes | Admin, Manager, Associate |
| Session timeout | ✅ Yes | 8 hours standard, 30 days remember me |
| Failed login protection | ✅ Yes | Lockout after 5 attempts |
| HTTPS only | ✅ Yes | Forced by hosting providers |

---

## Who Can Access What

| Feature | Sales Associate | Sales Manager | Admin |
|---------|-----------------|---------------|-------|
| View own clients | ✅ | ✅ | ✅ |
| View all clients | ❌ | ✅ | ✅ |
| Create orders | ✅ | ✅ | ✅ |
| Approve orders | ❌ | ✅ | ✅ |
| View invoices | ✅ | ✅ | ✅ |
| Send invoices | ❌ | ❌ | ✅ |
| Charge cards | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Manage products | ❌ | ❌ | ✅ |

---

## If Something Goes Wrong

### Suspected Unauthorized Access
1. Contact your administrator immediately
2. Admin can view login history in activity logs
3. Admin can lock any user account
4. Admin can force password reset

### Lost Password
1. Contact administrator for password reset
2. User will be logged out of all sessions
3. New password required on next login

### Client Reports Data Breach
1. We only store: name, email, phone, address
2. We do NOT store: full card numbers, bank account numbers
3. Payment data is with Stripe (their security policies apply)

---

# 🔧 TECHNICAL SECTION
*For developers and IT administrators*

## Authentication System Analysis

### Strengths ✅
```javascript
// Password hashing with bcrypt (10 rounds)
const SALT_ROUNDS = 10;
const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS);

// Secure token generation
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Account lockout after failed attempts
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
```

### Vulnerabilities ⚠️

#### 1. JWT Secret Fallback (HIGH)
**Location:** `server.js` lines 196, 239
```javascript
// CURRENT (VULNERABLE)
jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', ...)

// FIXED
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set');
  process.exit(1);
}
jwt.verify(token, process.env.JWT_SECRET, ...)
```

#### 2. No Rate Limiting on Login (HIGH)
**Location:** `server.js` line 223
```javascript
// ADD THIS
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  message: { error: 'Too many login attempts' }
});
app.post('/api/auth/login', loginLimiter, async (req, res) => { ... });
```

---

## SQL Injection Prevention ✅

All queries use parameterized statements:
```javascript
// CORRECT - Parameters bound separately
await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email.toLowerCase().trim()]
);

// NEVER DO THIS
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**Verified in:** server.js, auth.js, billing.js, order.js

---

## API Endpoint Security

### Protected Routes ✅
All admin/user routes require authentication:
```javascript
app.get('/api/users', authenticateToken, requireAdmin, ...)
app.get('/api/clients', authenticateToken, ...)
app.post('/api/billing/invoices', authenticateToken, ...)
```

### Public Routes (Intentional)
| Route | Purpose | Security |
|-------|---------|----------|
| `/api/health` | Health check | No sensitive data |
| `/api/auth/login` | Login | Rate limit needed |
| `/api/public/client/:token` | Client reports | Token-based |
| `/api/orders/sign/:token` | Contract signing | Token-based |

### Unprotected Routes (NEEDS FIX) ⚠️
| Route | Risk | Fix |
|-------|------|-----|
| `/api/diagnostics/*` | Exposes system info | Add auth |
| `/api/proxy/image` | SSRF potential | Validate URLs |

---

## CORS Configuration

### Current (Permissive) ⚠️
```javascript
// CURRENT - Allows unknown origins
} else {
  console.log('CORS blocked origin:', origin);
  callback(null, true); // Allow anyway
}

// FIXED - Reject unknown origins
} else {
  callback(new Error('Not allowed by CORS'));
}
```

---

## Security Headers (MISSING) ⚠️

### Add Helmet Middleware
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

This adds:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)

---

## Password Policy

### Current Requirements
- Minimum 8 characters
- No complexity requirements

### Recommended Requirements
```javascript
const validatePassword = (password) => {
  if (password.length < 12) 
    return 'Password must be at least 12 characters';
  if (!/[A-Z]/.test(password)) 
    return 'Must contain uppercase letter';
  if (!/[a-z]/.test(password)) 
    return 'Must contain lowercase letter';
  if (!/[0-9]/.test(password)) 
    return 'Must contain a number';
  if (!/[!@#$%^&*]/.test(password)) 
    return 'Must contain special character';
  return null;
};
```

---

## Stripe Security ✅

### PCI Compliance
- Card numbers handled by Stripe Elements (never touch our servers)
- Bank accounts via Stripe Financial Connections
- Only payment method IDs stored in our database

### Webhook Security (TODO)
```javascript
// IMPLEMENT THIS
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/api/webhooks/stripe', 
  express.raw({type: 'application/json'}), 
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      // Handle event...
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);
```

---

## Environment Variables

### Required (MUST be set in production)
| Variable | Status | Notes |
|----------|--------|-------|
| `JWT_SECRET` | ⚠️ Check | Must be 32+ random chars |
| `DATABASE_URL` | ✅ | Railway/Supabase |
| `STRIPE_*_SECRET_KEY` | ✅ | Per entity |
| `POSTMARK_API_KEY` | ✅ | Email service |

### Security Recommendations
1. Rotate `JWT_SECRET` every 6-12 months
2. Use different secrets per environment
3. Never commit secrets to git
4. Use `.env.example` with placeholders

---

## Implementation Checklist

### ✅ Immediate (This Week)
- [ ] Remove JWT secret fallback
- [ ] Add rate limiting to login
- [ ] Install and configure helmet
- [ ] Protect diagnostic endpoints

### 📋 Short Term (This Month)
- [ ] Fix CORS to reject unknown origins
- [ ] Strengthen password policy
- [ ] Add input validation (express-validator)
- [ ] Implement signed URLs for uploads

### 📅 Long Term (This Quarter)
- [ ] Add Stripe webhook signature verification
- [ ] Implement API request logging
- [ ] Set up security monitoring/alerting
- [ ] Annual penetration testing

---

## Quick Win Code

### Install Security Packages
```bash
npm install helmet express-rate-limit express-validator
```

### Add to server.js (after express init)
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers
app.use(helmet());

// General rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api/', apiLimiter);

// Login rate limiting (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts' }
});
app.post('/api/auth/login', loginLimiter, ...);

// Validate JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET not configured');
  process.exit(1);
}
```

---

## Incident Response

### If Breach Suspected
1. Check `user_activity_log` table for anomalies
2. Force logout all sessions: `DELETE FROM user_sessions`
3. Reset affected user passwords
4. Review server logs on Railway
5. Notify affected clients if data exposed

### Logging Queries
```sql
-- Recent failed logins
SELECT * FROM user_activity_log 
WHERE action = 'login_failed' 
ORDER BY created_at DESC LIMIT 50;

-- All activity for a user
SELECT * FROM user_activity_log 
WHERE user_id = 'xxx' 
ORDER BY created_at DESC;

-- Unusual IP addresses
SELECT ip_address, COUNT(*) 
FROM user_sessions 
GROUP BY ip_address 
ORDER BY COUNT(*) DESC;
```

---

## Audit History

| Date | Auditor | Score | Key Findings |
|------|---------|-------|--------------|
| Jan 27, 2026 | Claude | 7.5/10 | JWT fallback, no rate limiting, missing headers |

---

*This document should be reviewed at the start and end of each development session.*
*Next comprehensive audit recommended: April 2026*
