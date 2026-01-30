# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 30, 2026

---

## 🚨 IMMEDIATE PRIORITY: Bug Fixes from QA Testing

### Issues to Diagnose & Fix

#### 1. Client Email Not Coming Through
- **Status**: Client not receiving email during order process
- **Need to check**: `email-service.js` → `sendContractToClient()`
- **Verify**: Postmark delivery, correct email address, spam folders

#### 2. PDF Upload Errors
- **Status**: Getting error when trying to upload PDFs
- **Likely files**: Upload order flow, document handling
- **Need to check**: File upload endpoint, file size limits, PDF validation

#### 3. Change Order + Credit Card Error
- **Status**: Error when adding credit card during electronic signature change order
- **Likely files**: `ClientSigningPage.jsx`, Stripe integration
- **Need to check**: Change order flow, payment method creation

#### 4. Commissions Page - Lalaine Can't See Anything
- **Status**: Lalaine (admin@wsicnews.com) can't see commissions
- **Need to check**: User role permissions, commission query filters
- **User details**: Admin role, should have full access

---

## ✅ Recently Completed (January 30, 2026)

### Orders Page
- [x] Sections view with status grouping
- [x] Order modal with product details
- [x] Order Journey timeline
- [x] Pricing Summary with Book Value comparison
- [x] $0 product restriction (admin only)
- [x] Auto-lookup book prices from product catalog
- [x] Journey timestamps (activated_at, completed_at, cancelled_at)

### Database Columns Added
```sql
-- Orders table
activated_at, completed_at, cancelled_at

-- Order items table  
book_price, book_setup_fee
```

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server (~6,300 lines) ⭐
│   ├── package.json
│   ├── routes/
│   │   ├── order.js           ← Order CRUD, items query ⭐
│   │   ├── billing.js         
│   │   └── ...
│   └── services/
│       ├── email-service.js   ← Universal Email Design System ⭐
│       └── stripe-service.js  ← Payment processing
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~17k lines) - has Commissions
        └── components/
            ├── OrderList.jsx  ← Orders page ⭐
            ├── ClientSigningPage.jsx ← Public signing + payments ⭐
            └── ...
```

### 🚨 Git Commands MUST Use Full Paths:
```bash
# ✅ CORRECT
git add backend/routes/order.js frontend/src/components/OrderList.jsx

# ❌ WRONG
git add order.js OrderList.jsx
```

---

## 🗂️ Tech Stack

| Layer | Technology | Hosted On |
|-------|------------|-----------|
| Frontend | React + Vite | Vercel |
| Backend | Node.js + Express | Railway |
| Database | PostgreSQL | Supabase |
| Auth | JWT + bcrypt | Custom |
| Email | Postmark | ✅ Working |
| Payments | Stripe | Financial Connections |
| Domain | myadvertisingreport.com | Vercel |

---

## 👥 User Roles & Permissions

| Role | Orders | Commissions | $0 Products |
|------|--------|-------------|-------------|
| Super Admin | All | All | ✅ Allowed |
| Admin | All | All | ✅ Allowed |
| Manager | All | All | ✅ Allowed |
| Sales Associate | Own only | Own only | ❌ Blocked |
| Staff | Own only | Limited | ❌ Blocked |

### Key Users
| Name | Email | Role |
|------|-------|------|
| Justin Ckezepis | justin@wsicnews.com | Super Admin |
| Mamie Lee | mamie@wsicnews.com | Super Admin |
| Lalaine Agustin | admin@wsicnews.com | Admin |
| Bill Blakely | bill@wsicnews.com | Super Admin |

---

## 🔍 Debugging References

### User Detection (JWT Token)
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
// payload = { id, email, role, name, iat, exp }
```

### Admin Check Pattern
```javascript
const isAdmin = 
  currentUser.is_super_admin === true || 
  currentUser.role === 'admin' || 
  currentUser.role === 'manager';
```

### Email Logging
Check Railway logs for:
```
[Email] Attempting to send "Subject" to email@example.com
[Email] ✓ Sent successfully: abc123 to email@example.com
[Email] ✗ Failed to send: Error message
```

---

## 📧 Email Recipients Logic

```javascript
const recipients = [
  'justin@wsicnews.com',
  'mamie@wsicnews.com', 
  'admin@wsicnews.com'  // Lalaine
];
if (includesWSIC) {
  recipients.push('bill@wsicnews.com');
}
```

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files** - Do NOT provide code snippets
- Claude creates full updated file for download
- User replaces entire file in project

### Git Workflow
```cmd
cd simplifi-reports
del frontend\src\components\ComponentName.jsx
copy "C:\Users\WSIC BILLING\Downloads\ComponentName.jsx" frontend\src\components\ComponentName.jsx
git add -A
git commit -m "Description of changes"
git push origin main
```

---

## 📚 Files to Upload for This Session

### Required
1. **NEW_CHAT_PROMPT.md** - This file (always first)

### For Bug Fixes
2. **email-service.js** - For client email issue
3. **ClientSigningPage.jsx** - For change order + credit card issue
4. **App.jsx** - For commissions page issue (search for "Commission")
5. **order.js** - For upload order / PDF issue

### Supporting Docs
- **ORDER_TESTING_GUIDE.md** - QA testing procedures
- **FILE_STRUCTURE.md** - Full project layout

---

## 🔑 Key Endpoints

### Orders
```
POST /api/orders                      - Create order
PUT  /api/orders/:id                  - Update order
PUT  /api/orders/:id/approve          - Approve (auto-sends if contact exists)
POST /api/orders/:id/send-to-client   - Send for signing
```

### Email
```
GET  /api/email/dashboard             - Email stats
POST /api/email/test                  - Send test email
```

### Commissions
```
GET  /api/commissions                 - List commissions
GET  /api/commissions/pending         - Pending approvals
```

---

## 🗄️ Database Quick Reference

### Key Tables
| Table | Purpose |
|-------|---------|
| `orders` | Order records with journey timestamps |
| `order_items` | Line items with book_price, book_setup_fee |
| `commissions` | Commission records |
| `email_logs` | Email delivery tracking |
| `products` | Product catalog (default_rate, setup_fee) |
