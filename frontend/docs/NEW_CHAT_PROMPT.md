# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 29, 2026 (Late Night)

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server (~4,600 lines) ⭐
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
        ├── App.jsx            ← Main app (~16k lines) ⭐
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
| `training_categories` | Training module categories |
| `training_modules` | Individual training content |
| `training_progress` | User completion tracking |
| `user_goals` | Monthly KPI targets |
| `user_meeting_notes` | 1-on-1 meeting notes |

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

---

## 📚 Training Center ✅ COMPLETE

### Structure
| Category | Modules | Status |
|----------|---------|--------|
| Getting Started | 5 | ✅ Active |
| The Sales Process | 5 | ✅ Active |
| Programmatic Mastery | 6 | ✅ Active |
| Using the Platform | 5 | ✅ Active |
| Sales Toolbox | 6 | ❌ Hidden (moved to Tools) |
| Product Knowledge | 6 | ❌ Hidden (moved to Tools) |

**Total Active: 21 learning modules**

### Features
- Progress tracking per user
- Required vs optional modules
- Markdown content rendering
- "Mark as Complete" functionality
- Searchable modules

---

## 🛠️ Tools Page (Sales Toolbox) ✅ COMPLETE

### Route: `/tools`

| Category | Resources |
|----------|-----------|
| Sales Resources | Pricing Guide, Sales FAQs, Email Templates, Proposal Template |
| Marketing Materials | Media Kit, Editorial Calendar, 10 Reasons, One-Sheet Library |
| Booking & Scheduling | Good Morning LKN, Home Ad Show |
| Digital Advertising | Programmatic explainers, Geofencing, Sample Reports |
| Internal Resources | Billing Guide, Leads Sheet, Post-Sales Checklist |

- Internal tools (Pricing, Billing) render in-app
- External tools open in new tabs

---

## 👤 User Profiles ✅ ENHANCED

### Route: `/users/:id/profile`

### Tabs
| Tab | Content |
|-----|---------|
| Overview | Client metrics, Order summary, Activity stats |
| Goals & KPIs | Monthly targets with progress bars, 1-on-1 meeting notes |
| Training | Completion %, modules completed, recent activity |

### Goal Setting (Admin only)
- Appointments target
- Proposals target
- Closed Deals target
- New Clients target
- Revenue target
- Notes

### 1-on-1 Meeting Notes (Admin only)
- Meeting date
- Title
- Notes
- Action items

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
| Training Modules | 21 active |
| System Health | ✅ All Green |

---

## ✅ Recently Completed (January 29, 2026)

### Training Center
- ✅ 6 categories with 33 total modules
- ✅ Full content from Notion export
- ✅ Progress tracking per user
- ✅ Mark as Complete functionality
- ✅ Reorganized: Tools content moved to Tools page

### Tools Page (Sales Toolbox)
- ✅ New `/tools` route
- ✅ 5 categories of quick-access resources
- ✅ Internal tools render in-app
- ✅ External tools open in new tabs
- ✅ Sidebar navigation added

### User Profile Enhancements
- ✅ Goal setting modal (Admin only)
- ✅ 1-on-1 meeting notes section
- ✅ Meeting notes API endpoints
- ✅ `user_meeting_notes` table created

### System Diagnostics
- ✅ `/settings/system` route (Super Admin only)
- ✅ Visual health dashboard
- ✅ Component monitoring

---

## 🎯 NEXT PRIORITY

### High Priority
1. **Commission Tracking** - Auto-calculate commissions from closed deals
2. **Reporting/Analytics** - Sales performance reports, pipeline reports
3. **Email Integration** - Send emails directly from the platform

### In Progress
- **Client Order Data Import** - Assistant filling templates from QuickBooks

---

## 📝 API Endpoints Reference

### Training
```
GET  /api/training/categories           - List active categories
GET  /api/training/modules              - List modules (optional ?category=)
GET  /api/training/modules/:id          - Get single module
GET  /api/training/my-progress          - Current user's progress
POST /api/training/modules/:id/complete - Mark module complete
```

### User Profiles
```
GET  /api/users/:id                     - Get user details
GET  /api/users/:id/stats               - User stats with time filter
GET  /api/users/:id/goals               - User's monthly goals
POST /api/users/:id/goals               - Set/update goals (admin)
GET  /api/users/:id/training-progress   - User's training progress
GET  /api/users/:id/meeting-notes       - User's 1-on-1 notes
POST /api/users/:id/meeting-notes       - Add meeting note (admin)
```

### Super Admin
```
GET  /api/super-admin/view-as/:userId    - View As mode
POST /api/super-admin/view-as/:userId/end - Exit View As
GET  /api/super-admin/audit-log          - Audit trail
```

### Diagnostics
```
GET  /api/diagnostics/public             - Basic status (no auth)
GET  /api/diagnostics/admin              - Full system health (admin)
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
del backend\server.js
del frontend\src\App.jsx
copy "C:\Users\WSIC BILLING\Downloads\server.js" backend\server.js
copy "C:\Users\WSIC BILLING\Downloads\App.jsx" frontend\src\App.jsx
git add -A
git commit -m "Description"
git push origin main
```

---

## 📚 Session Docs to Upload

1. **NEW_CHAT_PROMPT.md** - This file (always upload first)
2. **ROADMAP.md** - Current priorities
3. **SESSION_SUMMARY.md** - Last session's work
4. **FILE_STRUCTURE.md** - Project structure reference

### Optional:
- **App.jsx** - For frontend changes
- **server.js** - For backend reference
- **SECURITY_AUDIT.md** - If security work needed

---

## 🔒 Security Status: 8.5/10 ✅

- Helmet security headers ✅
- Rate limiting ✅
- JWT validation ✅
- Super Admin audit logging ✅
- System diagnostics access controlled ✅
