# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 29, 2026

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server with all endpoints ⭐
│   ├── package.json
│   ├── routes/
│   │   ├── order.js           
│   │   ├── billing.js         
│   │   └── ...
│   └── services/
│       ├── email-service.js   
│       └── stripe-service.js  
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~13.7k lines) ⭐
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

## 🗄️ Database Tables

### Key Tables
| Table | Purpose |
|-------|---------|
| `advertising_clients` | Client/business records (NOT `clients`) |
| `contacts` | Contact people (first_name, last_name, NOT name) |
| `users` | Team members |
| `orders` | Advertising orders |
| `invoices` | Billing invoices |
| `client_activities` | Activity timeline |
| `super_admin_audit_log` | Admin action tracking |

### advertising_clients Key Columns
```sql
id, business_name, slug, status, industry, website
assigned_to              -- FK to users.id (sales rep)
primary_contact_name     -- Denormalized for display
tags[]                   -- ['WSIC', 'LKNW', 'Print', etc.]
```

### contacts Key Columns
```sql
id, client_id, first_name, last_name  -- NOT "name"
email, phone, title, contact_type
is_primary               -- Boolean
```

---

## 🔐 Super Admin System

### Super Admins (3 users)
| Name | Email | Role |
|------|-------|------|
| Justin Ckezepis | justin@wsicnews.com | admin |
| Mamie Lee | mamie@wsicnews.com | admin |
| Bill Blakely | bill@wsicnews.com | staff |

### Capabilities
- **View As**: See the app as any user would see it
- **Audit Log**: View all Super Admin actions
- **All Admin powers**: Plus audit trail access

---

## 📊 Current Data State (January 29, 2026)

| Metric | Count |
|--------|-------|
| Total Clients | 2,812 |
| Active Clients | ~122 |
| Prospect Clients | ~2,690 |
| Open (unassigned) | ~2,135 |
| Team Members | 18 |
| Super Admins | 3 |
| RAB Contacts Imported | ~300 |

---

## ✅ Recently Completed (January 28-29, 2026)

### Client Page Updates
- ✅ Removed Tier badge from client detail pages
- ✅ Fixed Assigned Representative to show actual name
- ✅ Merged Notes tab into Activity tab (unified view)
- ✅ Activity tab now has note input at top
- ✅ Removed standalone Notes tab

### CRM View Updates
- ✅ All/Mine/Open toggle for ALL users (not just admins)
- ✅ Sales associates can VIEW all clients for prospecting
- ✅ View button permissions maintained (only own clients clickable)
- ✅ Client View: All/Current/Past toggle (defaults to Current)

### Add Contact Feature
- ✅ Green "Add Contact" button for all users
- ✅ Prospect vs Lead type selection
- ✅ Auto-assignment to current user
- ✅ Warning to check Master List first

### RAB Contact Import
- ✅ SQL scripts generated for contact import
- ✅ ~300 contacts from 5 sales associates
- ✅ Contacts stored with first_name/last_name structure
- ✅ contact_type = 'decision_maker' for imported contacts

---

## 🎯 IMMEDIATE PRIORITY: Orders & Campaign Display

### Next Session Goals

#### 1. Import Actual Client Orders
- Need to import real order data to identify true active clients
- Orders determine "active" vs "prospect" status
- Revenue tracking depends on order data

#### 2. Multi-Product Campaign Display
Currently only Programmatic (Simpli.fi) campaigns display. Need to add:

| Product Type | Data Source | Display Needs |
|--------------|-------------|---------------|
| Programmatic | Simpli.fi API | ✅ Working |
| Radio/Broadcast | Manual entry | Needs UI |
| Print (LKNW) | Manual entry | Needs UI |
| Podcast | Manual entry | Needs UI |
| Events | Manual entry | Needs UI |
| Web/Social | Manual entry | Needs UI |

#### 3. Brand-Specific Views
- WSIC Radio: Broadcast, Podcast, Events
- Lake Norman Woman: Print, Events, Digital
- Multi-Platform: All products

---

## 👤 User System

### Roles
- `admin` - Full access
- `sales_manager` - Team oversight
- `sales_associate` - Own clients only
- `staff` - Limited access

### Justin's User ID
```
9a69f143-1dd2-4842-a3e8-fe17a664ba2c
```

---

## 📝 API Endpoints Reference

### Clients
```
GET  /api/clients                  - List with stats
POST /api/clients/:id/claim        - Claim open account
POST /api/clients/:id/reassign     - Reassign to different rep
```

### Users & Super Admin
```
GET  /api/auth/me                        - Current user
GET  /api/users/extended                 - All users with stats
GET  /api/super-admin/view-as/:userId    - View As mode
POST /api/super-admin/view-as/:userId/end - Exit View As
GET  /api/super-admin/audit-log          - Audit trail
```

### Orders
```
GET  /api/orders                   - List orders
POST /api/orders                   - Create order
GET  /api/orders/:id               - Get order details
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
copy C:\Users\Justin\Downloads\filename.js backend\filename.js
git add backend/filename.js frontend/src/App.jsx
git commit -m "Description"
git push origin main
```

---

## 📚 Session Docs to Upload

1. **NEW_CHAT_PROMPT.md** - This file (always upload first)
2. **ROADMAP.md** - Current priorities
3. **SESSION_SUMMARY.md** - Last session's work
4. **App.jsx** - For frontend changes
5. **server.js** - For backend reference

---

## 🔒 Security Status: 8.5/10 ✅

- Helmet security headers ✅
- Rate limiting ✅
- JWT validation ✅
- Super Admin audit logging ✅
