# WSIC Advertising Platform - Development Roadmap
## Updated: January 29, 2026 (Evening)

---

## ✅ COMPLETED

### Commission System (January 29, 2026 - Evening)
- [x] Commission rates table with user-specific rates
- [x] Default commission rates (Print 30%, Broadcast 30%, Digital 18%, Events 20%)
- [x] Commissions page with Approvals tab
- [x] Split commission functionality
- [x] Commission rate configuration UI
- [x] YTD summary and monthly breakdown

### User Management Enhancements (January 29, 2026)
- [x] Edit User feature (pencil icon on Users page)
- [x] Role dropdown with Event Manager, Staff options
- [x] Password reset capability for admins
- [x] Change Password moved to sidebar
- [x] Removed Preferences page

### Event Manager Role (January 29, 2026)
- [x] Added `event_manager` to role constraint
- [x] Created Erin Connair account
- [x] Set up 20% events commission rate

### Authentication Fixes (January 29, 2026)
- [x] Fixed rate limiter for Railway (`trust proxy`)
- [x] Fixed login endpoint (direct SQL)
- [x] Fixed change password endpoint (direct SQL)
- [x] Fixed user update endpoint (direct SQL)
- [x] Fixed user creation (UUID default)

### Training Center & Tools (January 29, 2026 - Earlier)
- [x] Training Center with 4 categories, 21 modules
- [x] Tools Page (`/tools`) with 5 resource categories
- [x] User Profile goals and 1-on-1 meeting notes

### Super Admin System (January 28-29, 2026)
- [x] View As functionality with audit logging
- [x] System Diagnostics page
- [x] Audit Log tab on Users page

---

## 🎯 CURRENT PRIORITY

### Phase 1: Order Testing & Data Import
**Goal:** Verify order system works and import real client data

**Testing Checklist:**
- [ ] New Order (Electronic) - Full signing flow
- [ ] Upload Order (Pre-Signed) - PDF upload
- [ ] Change Order - Modify existing order
- [ ] Kill Order - Cancel existing order
- [ ] Client signing page works
- [ ] Commission auto-generates on approval

**Data Import:**
- [ ] Import Print orders from template
- [ ] Import Broadcast orders from template
- [ ] Import Podcast orders from template
- [ ] Import Events orders from template
- [ ] Import Web/Social orders from template
- [ ] Update client statuses based on orders

**Excel Templates Ready:**
- `Print_Orders_Template.xlsx`
- `Broadcast_Orders_Template.xlsx`
- `Podcast_Orders_Template.xlsx`
- `Events_Orders_Template.xlsx`
- `WebSocial_Orders_Template.xlsx`

---

## 📋 NEXT PHASES

### Phase 2: Reporting & Analytics
**Goal:** Sales performance visibility

**Reports Needed:**
- Sales Rep Performance (deals, revenue, commission)
- Pipeline Report (prospects by stage)
- Activity Report (calls, meetings, proposals)
- Revenue by Product/Brand
- Commission Reports by period

### Phase 3: Email Integration Enhancement
**Goal:** Better email functionality from platform

**Features:**
- Email templates for common scenarios
- Send from client detail page
- Log emails as activities
- Track opens/clicks (via Postmark)

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Clients | 2,812 |
| Active Clients | ~122 |
| Prospect Clients | ~2,690 |
| Open (unassigned) | ~2,135 |
| Team Members | 19 (including Erin) |
| Super Admins | 3 |
| Training Modules | 21 active |
| System Health | ✅ All Green |

---

## 💰 Commission Rates (Configured)

| Category | Default Rate |
|----------|-------------|
| Print | 30% |
| Broadcast | 30% |
| Podcast | 30% |
| Digital/Programmatic | 18% |
| Web & Social | 30% |
| Events | 20% |
| Other (fallback) | 10% |

**Special Rates:**
- Erin Connair: 20% on Events (with split rules)

---

## 👥 User Roles

| Role | Access Level |
|------|--------------|
| Admin | Full access |
| Sales Manager | View all clients, approve orders |
| Sales Associate | View assigned clients only |
| Event Manager | Events focus, CRM access |
| Staff | Non-sales access |

---

## 🗓️ Session History

### January 29, 2026 (Evening) - Commission & Auth
- Commission tracking system
- Erin Connair event_manager setup
- Edit User feature
- Authentication fixes (trust proxy, direct SQL)
- Change Password in sidebar

### January 29, 2026 (Late Night) - Training & Tools
- Training Center: 4 categories, 21 modules
- Tools Page: 5 categories of resources
- User Profiles: Goal setting + 1-on-1 notes

### January 29, 2026 (Evening) - System Diagnostics
- System Diagnostics page (/settings/system)
- Visual health dashboard

### January 28, 2026 - Super Admin & CRM
- Super Admin role system
- View As endpoints
- Imported 2,800+ clients

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files**
- No code snippets to insert
- User replaces entire file

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

### Password Reset (if needed)
```cmd
cd simplifi-reports\backend
npm install bcrypt
node -e "require('bcrypt').hash('NewPassword123!', 10, (err, hash) => console.log(hash));"
```
Then update via Supabase SQL Editor.
