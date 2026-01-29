# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 28, 2026 (Evening)

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

## 🔐 Super Admin System (NEW - January 28, 2026)

### Super Admins (3 users)
| Name | Email | Role |
|------|-------|------|
| Justin Ckezepis | justin@wsicnews.com | admin |
| Mamie Lee | mamie@wsicnews.com | admin |
| Bill Blakely | bill@wsicnews.com | staff |

### Super Admin Capabilities
- **View As**: See the app as any user would see it (read-only)
- **Audit Log**: View all Super Admin actions
- **All Admin powers**: Plus audit trail access

### Backend Endpoints (✅ Working)
```
GET  /api/super-admin/view-as/:userId     - Enter View As mode
POST /api/super-admin/view-as/:userId/end - Exit View As mode
GET  /api/super-admin/audit-log           - Get audit trail
GET  /api/super-admin/list                - List all Super Admins
```

### Audit Log Tracks
- `view_as_start` / `view_as_end` - View As sessions
- `bulk_assign` - Bulk client assignments
- `transfer_clients` - Client transfers between reps
- `user_update`, `user_create`, `user_delete`

---

## 📊 Current State (January 28, 2026)

### CRM Data
- **2,812 total clients** (imported from RAB)
- **122 active clients** (verified from RAB revenue data)
- **2,690 prospects** for sales pipeline
- **~2,135 open/unassigned** clients

### Team
- **18 team members**
- **3 Super Admins** (Justin, Mamie, Bill)
- **4,652 logged activities**

---

## 🎯 IMMEDIATE PRIORITY: Frontend Updates

### 1. Super Admin UI (Backend Ready ✅)

**View As Feature:**
- Purple eye icon button on Users page
- Click → see what that user sees (read-only)
- Small indicator in sidebar when active: `👁️ Viewing as [Name] | Exit`
- All actions logged to audit trail

**Audit Log Tab:**
- New tab on Users page (Super Admins only): `🔒 Audit Log`
- Shows: who, what, when, target user
- Filter by action type

**Visual Indicators:**
- Purple "SA" badge next to Super Admin names

### 2. User Management Enhancements (Backend Ready ✅)

**Stats columns already in API:**
```javascript
// GET /api/users/extended returns:
{
  client_count,           // Total assigned
  active_client_count,    // Status = 'active'
  prospect_client_count,  // Status = 'prospect'/'lead'
  active_orders,          // Orders in signed/active
  total_revenue,          // Revenue from their clients
  recent_activities,      // Last 30 days
  is_super_admin          // Super Admin flag
}
```

**Frontend needs:**
- Display these new stat columns
- Bulk Assign tab with checkbox selection
- Transfer All Clients button

### 3. Sales KPI Tracking (NEW)

**Activity types to track:**
- `touchpoint` - Generic contacts (goal: 100/week)
- `appointment_set` - Meetings scheduled
- `proposal_sent` - Proposals created
- `deal_closed` - Closed sales with $ amount

**Reports needed:**
- Per-rep metrics with time filters
- 1-on-1 exportable reports

### 4. Sales Training Center (NEW)

**In-house training hub with:**
- Sales Process Guide (3 stages)
- Product Knowledge
- Pricing Guide
- FAQs & Objection Handling

---

## 👤 User System

### Users Table
```sql
id (UUID)           -- MUST match Supabase Auth ID
email, name, role   -- 'admin', 'sales_manager', 'sales_associate', 'staff'
is_super_admin      -- Boolean (NEW)
is_sales            -- Boolean (can be assigned clients)
```

### Justin's User ID
```
9a69f143-1dd2-4842-a3e8-fe17a664ba2c
```

---

## 🗄️ Key Database Tables

### advertising_clients
```sql
id, business_name, slug, status, industry
tags[]                -- ['WSIC', 'LKNW', 'Print', etc.]
assigned_to           -- FK to users.id (sales rep)
annual_contract_value
last_activity_at
```

### super_admin_audit_log (NEW)
```sql
id, super_admin_id, action_type
target_user_id, target_user_name
description, metadata (JSONB)
ip_address, user_agent, created_at
```

### client_activities
```sql
id, client_id, user_id
activity_type         -- 'call_logged', 'email_sent', 'meeting_scheduled', etc.
description, metadata, created_at
```

---

## 📝 API Endpoints Reference

### Users & Super Admin
```
GET  /api/auth/me                        - Current user (includes is_super_admin)
GET  /api/users/extended                 - All users with full stats
GET  /api/users/:id/stats                - Individual user details + clients
GET  /api/users/sales                    - Sales team only
POST /api/clients/bulk-assign            - Bulk assign clients
POST /api/users/:id/transfer-clients     - Transfer all clients
GET  /api/super-admin/view-as/:userId    - View As mode
POST /api/super-admin/view-as/:userId/end - Exit View As
GET  /api/super-admin/audit-log          - Audit trail
```

### Clients
```
GET  /api/clients                  - List with stats
POST /api/clients/:id/claim        - Claim open account
POST /api/clients/:id/reassign     - Reassign to different rep
POST /api/clients/:id/release      - Release back to open
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
