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
        ├── App.jsx            ← Main app (~14.3k lines) ⭐
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

## 🔐 Super Admin System ✅ COMPLETE

### Super Admins (3 users)
| Name | Email | Role |
|------|-------|------|
| Justin Ckezepis | justin@wsicnews.com | admin |
| Mamie Lee | mamie@wsicnews.com | admin |
| Bill Blakely | bill@wsicnews.com | staff |

### Super Admin Features
- **View As**: Impersonate any user (logged in audit)
- **Audit Log**: View all Super Admin actions (Users → Audit Log tab)
- **System Diagnostics**: Monitor system health (Settings → System)
- All admin powers plus audit trail access

### Super Admin UI Locations
| Feature | Location |
|---------|----------|
| View As button | Users page → Actions column (purple eye) |
| Audit Log | Users page → Audit Log tab |
| System Diagnostics | Settings → System (sidebar) |
| SA Badge | Next to Super Admin names everywhere |

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
| System Health | ✅ All Green |

---

## ✅ Recently Completed (January 29, 2026)

### System Diagnostics Page
- ✅ New `/settings/system` route (Super Admin only)
- ✅ Visual health dashboard with 6 system components
- ✅ Overall status banner (green/yellow/red)
- ✅ Expandable component details for technical info
- ✅ Environment configuration panel
- ✅ Mobile compatibility fixes documentation
- ✅ Sidebar "System" link with SA badge

### Super Admin Frontend
- ✅ View As button on Users page
- ✅ View As indicator in sidebar when active
- ✅ Audit Log tab on Users page
- ✅ System Diagnostics page

### Client Page Improvements
- ✅ Removed Tier badge from client pages
- ✅ Fixed Assigned Representative display
- ✅ Merged Notes into Activity tab
- ✅ All/Mine/Open toggle for ALL users
- ✅ Add Contact feature (Prospect/Lead)

---

## 🎯 NEXT PRIORITY: Training Center

### Vision
Build a Training Center that:
1. **Integrates with User Profiles** - Each user has a profile with KPIs, goals, training progress
2. **Role-based Training Paths** - Different training for different roles
3. **Connects to Notion** - Import existing training content
4. **Tracks Completion** - Know who completed what

### User Profile Page (New)
Accessible from Users page, shows:
- Personal info (name, role, email, start date)
- Client metrics (total, active, prospects, leads)
- Order metrics (created, approved, revenue)
- Activity metrics (touchpoints, appointments, proposals)
- Goals & KPIs (monthly targets vs actuals)
- Training progress (assigned, completed, certifications)

### Users Page Actions Update
| Current | Planned |
|---------|---------|
| View Clients | Keep |
| View As (SA) | Keep |
| — | Add "Profile" button |

### Training Content from Notion
- Justin will provide Notion export
- Contains current training materials
- Videos, documents, checklists
- Will need to structure for platform

---

## 👤 User System

### Roles
- `admin` - Full access + Super Admin eligible
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

### Diagnostics (Admin/Super Admin)
```
GET  /api/diagnostics/public             - Basic status (no auth)
GET  /api/diagnostics/admin              - Full system health (admin)
POST /api/diagnostics/clear-cache        - Clear cache (admin)
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

### For Training Center Session:
1. **NEW_CHAT_PROMPT.md** - This file (always upload first)
2. **ROADMAP.md** - Current priorities (updated with Training Center plans)
3. **SESSION_SUMMARY.md** - Last session's work
4. **Notion Training Export** - Current training content (Justin to provide)
5. **App.jsx** - For frontend changes (if needed)

### Optional:
- **server.js** - For backend reference
- **SECURITY_AUDIT.md** - If security work needed

---

## 🔒 Security Status: 8.5/10 ✅

- Helmet security headers ✅
- Rate limiting ✅
- JWT validation ✅
- Super Admin audit logging ✅
- System diagnostics access controlled ✅
- Diagnostic endpoints properly protected ✅
