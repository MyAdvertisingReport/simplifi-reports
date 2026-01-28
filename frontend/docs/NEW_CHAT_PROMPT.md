# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 28, 2026 (Afternoon)

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server with all endpoints ⭐
│   ├── auth.js                ← Authentication & session management
│   ├── package.json
│   ├── routes/
│   │   ├── order.js           ← Order API endpoints
│   │   ├── billing.js         ← Invoice management ⭐
│   │   └── ...
│   └── services/
│       ├── email-service.js   ← Postmark emails
│       └── stripe-service.js  ← Stripe payments
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~12k lines) ⭐
        └── components/
            ├── BillingPage.jsx
            └── ...
```

### 🚨 Git Commands MUST Use Full Paths:
```bash
# ✅ CORRECT
git add backend/server.js frontend/src/App.jsx

# ❌ WRONG
git add server.js App.jsx
```

---

## 🏗️ Tech Stack

| Layer | Technology | Hosted On |
|-------|------------|-----------|
| Frontend | React + Vite | Vercel |
| Backend | Node.js + Express | Railway |
| Database | PostgreSQL | Supabase |
| Auth | Supabase Auth + JWT | - |
| Email | Postmark | ✅ Working |
| Payments | Stripe | ✅ Working |
| Ad Platform | Simpli.fi API | ✅ Working |
| Domain | myadvertisingreport.com | Vercel |

---

## 📊 Current State (January 28, 2026)

### ✅ CRM System
- **2,812 total clients** (imported from RAB)
- **122 active clients** (verified from RAB revenue data)
- **2,690 prospects** for sales pipeline

### ✅ CRM View Features
- **Dual views:** CRM View (sales pipeline) + Client View (operations)
- **Owner filter toggle:** All | Open | Mine
- **Sort options:** A-Z, Revenue, Recently Active, Needs Attention
- **Claim button:** Sales reps can claim open accounts
- **Activity count:** Shows logged activities per client
- **Last touch indicator:** Color-coded (green/yellow/red)
- **Status badges:** Prospect, Lead, Active, Inactive

### ✅ Working Features
- User authentication (Supabase Auth + JWT)
- Role-based access (admin, sales_manager, sales_associate)
- 6 Order Types with signing workflow
- Invoice management with auto-generate
- Payment collection (Card + ACH via Stripe)
- Client public report pages
- Simpli.fi campaign reporting

---

## 👤 User System

### Current Users Table
```sql
-- Key fields
id (UUID)           -- MUST match Supabase Auth ID
email               -- Unique
name                -- Display name
role                -- 'admin', 'sales_manager', 'sales_associate'
first_name, last_name
password_hash       -- bcrypt
```

### Important: Auth ID Matching
The `users.id` MUST match the Supabase Auth user ID for "Mine" filters to work.
Browser stores auth ID in localStorage, compares against `assigned_to` field.

### Justin's User ID
```
9a69f143-1dd2-4842-a3e8-fe17a664ba2c
```

---

## 🎯 NEXT SESSION PRIORITIES

### 1. 🔥 Sales Associate User Management (HIGH PRIORITY)

**Admin needs to:**
- View all users with their assigned client counts
- Toggle between: All Users | Individual User view
- See each rep's: clients, active orders, revenue, activities
- Assign/reassign clients between reps
- Bulk assign open accounts

**Suggested UI:**
```
Users Management
├── User list with stats
│   ├── Justin (Admin) - 6 clients, $X revenue
│   ├── Stephanie (Sales) - 45 clients, $X revenue
│   └── ...
├── Click user → see their clients
└── Bulk actions: Assign selected to rep
```

### 2. 🔥 Admin Diagnostics Dashboard (HIGH PRIORITY)

**For non-technical users, need:**
- Simple health status (✅ All Systems Go / ⚠️ Issues)
- Database connection status
- API status indicators
- Recent errors (simplified)
- Storage/usage metrics
- One-click common fixes

**Current diagnostics are too technical** - need user-friendly version

### 3. Duplicate Client Cleanup
- ~20-30 duplicate pairs identified
- Need merge functionality
- Preserve activities when merging

---

## 🗄️ Key Database Tables

### advertising_clients
```sql
id, business_name, slug, status, tier, industry
tags[]                -- ['WSIC', 'LKNW', 'Print', etc.]
assigned_to           -- FK to users.id (sales rep)
annual_contract_value -- From RAB data
last_activity_at
primary_contact_name
```

### users
```sql
id                    -- MUST match Supabase Auth ID
email, name, role
first_name, last_name
password_hash
```

### client_activities
```sql
id, client_id, user_id
activity_type         -- 'call_logged', 'email_sent', 'meeting_scheduled', etc.
description, metadata
created_at
```

---

## 📈 Current Metrics

| Metric | Count |
|--------|-------|
| Total Clients | 2,812 |
| Active Clients | 122 |
| Prospect Clients | 2,690 |
| Open (unassigned) | ~2,135 |
| Team Members | 18 |
| Activities Logged | 4,652 |

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files** - Do NOT provide code snippets
- Claude creates full updated file for download
- User replaces entire file in project

### Git Workflow
```cmd
cd simplifi-reports
copy C:\Users\Justin\Downloads\filename.js backend\filename.js
git add backend/filename.js
git commit -m "Description"
git push origin main
```

---

## 📝 Quick Reference

### Key File Paths
| What | Path |
|------|------|
| Main Server | `backend/server.js` |
| Main App | `frontend/src/App.jsx` |
| Billing | `backend/routes/billing.js` |

### App.jsx Sections (approx lines)
| Section | Lines |
|---------|-------|
| ClientsPage | 1763-2500 |
| Client Detail | 2700-3500 |
| Routes | end of file |

### Client Status Values
- `prospect` - In pipeline, no contract
- `lead` - Qualified lead
- `active` - Has contract/orders
- `inactive` - Paused
- `churned` - Lost

### API Endpoints for Users
```
GET  /api/users              - List all users (admin)
GET  /api/users/:id          - Get user details
GET  /api/users/sales        - Get sales team only
POST /api/clients/:id/claim  - Claim open account
PUT  /api/clients/:id/assign - Assign to different rep
```

---

## 🔒 Security Status: 8.5/10 ✅

See SECURITY_AUDIT.md for details.
