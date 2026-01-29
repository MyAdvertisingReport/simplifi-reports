# WSIC Advertising Platform - Development Roadmap
## Updated: January 28, 2026 (Evening)

---

## 🎯 Current Sprint: User Management & Sales Tools

### ✅ COMPLETED (January 28, 2026)

#### Morning/Afternoon: CRM View Redesign
- [x] Owner filter toggle (All | Open | Mine)
- [x] Sort options (A-Z, Revenue, Recently Active, Needs Attention)
- [x] Claim button for open accounts
- [x] Activity count column
- [x] Last touch color coding (green/yellow/red)
- [x] Backend: Add assigned_to_name, activity_count to /api/clients
- [x] Active Clients verification from RAB (118 clients)
- [x] User ID fix (Auth ID vs Database ID mismatch)

#### Evening: Super Admin System
- [x] Database: Added `is_super_admin` column to users
- [x] Database: Created `super_admin_audit_log` table
- [x] Set Super Admins: Justin, Mamie, Bill
- [x] Backend: `requireSuperAdmin` middleware
- [x] Backend: `logSuperAdminAction()` audit function
- [x] Endpoint: `GET /api/super-admin/view-as/:userId`
- [x] Endpoint: `POST /api/super-admin/view-as/:userId/end`
- [x] Endpoint: `GET /api/super-admin/audit-log`
- [x] Endpoint: `GET /api/super-admin/list`
- [x] Updated `/api/auth/me` to return `is_super_admin`
- [x] Updated `/api/users/extended` with full stats + `is_super_admin`

---

## 📋 IN PROGRESS

### 1. 🔥 Super Admin Frontend (IMMEDIATE - Next Session)

#### View As Feature
- [ ] "View As" button (purple eye icon) on Users page
- [ ] Clicking shows what that user sees (read-only)
- [ ] View As indicator in sidebar (small purple pill)
- [ ] "Exit" button to return to normal view
- [ ] All View As actions logged to audit trail

#### Audit Log Tab
- [ ] New "🔒 Audit Log" tab on Users page (Super Admins only)
- [ ] Shows recent Super Admin actions
- [ ] Filter by action type, admin, date range
- [ ] Displays: who, what, when, target user

#### Visual Indicators
- [ ] Purple "SA" badge next to Super Admin names in user list
- [ ] Super Admin indicator in user profile

---

### 2. 🔥 Sales Associate User Management (HIGH PRIORITY)

#### User List View (Admin) - Backend ✅ Frontend Needed
- [ ] Stats columns: Clients, Active, Orders, Revenue, Activity (30d)
- [ ] "View Clients" button per user
- [ ] Filter: All Users | Sales Only | By Role
- [ ] Search by name/email

#### Individual User View
- [ ] Click user → see their assigned clients
- [ ] Stats cards: Total, Active, Prospects, Orders, Revenue
- [ ] Client table with reassign dropdowns
- [ ] "Transfer All Clients" button

#### Bulk Assignment - Backend ✅ Frontend Needed
- [ ] Bulk Assign tab on Users page
- [ ] Checkbox selection for multiple clients
- [ ] "Select All Visible" / "Clear" buttons
- [ ] Dropdown to pick target rep
- [ ] "Assign X Clients" action button

#### API Endpoints (All Ready ✅)
```
GET  /api/users/extended           - Full stats per user
GET  /api/users/:id/stats          - Individual user details
POST /api/clients/bulk-assign      - Bulk assign clients
POST /api/users/:id/transfer-clients - Transfer all clients
```

---

### 3. 🔥 Sales KPI Tracking & Reports (HIGH PRIORITY)

#### Activity Types to Track
| Type | Description | Goal |
|------|-------------|------|
| `touchpoint` | Generic contact (calls, emails, drop-ins) | 100/week min |
| `appointment_set` | Meetings scheduled | Track monthly |
| `proposal_sent` | Proposals created/sent | Track monthly |
| `deal_closed` | Closed sales (with $ amount) | Track monthly |

#### KPI Dashboard (For Managers)
- [ ] Per-rep metrics with time filters (weekly/monthly/quarterly/yearly)
- [ ] Touchpoint counts vs goals
- [ ] Appointments set
- [ ] Proposals sent
- [ ] Deals closed (count + revenue)
- [ ] Pipeline value

#### 1-on-1 Reports
- [ ] Exportable rep performance summary
- [ ] Activity breakdown by type
- [ ] Trend charts over time

---

### 4. 📚 Sales Training Center (MEDIUM-HIGH)

#### In-House Training Hub
- [ ] Dedicated "Training" section in app
- [ ] Sales Process Guide (from Notion)
- [ ] Product Knowledge library
- [ ] Pricing Guide (2026)
- [ ] Sales FAQs
- [ ] Tools & Resources links

#### Content Sections (from Sales Process Guide)
- [ ] Stage 1: Finding the Decision Maker
- [ ] Stage 2: Qualifying & Proposals
- [ ] Stage 3: Closing & Onboarding
- [ ] Best Practices
- [ ] Objection Handling

---

### 5. Admin Diagnostics Dashboard (MEDIUM)

#### User-Friendly Health View
- [ ] Simple status: ✅ All Systems Go / ⚠️ Issues Detected
- [ ] Color-coded indicators (non-technical)
- [ ] Plain English explanations

#### System Components
- [ ] Database: Connected/Disconnected
- [ ] API: Responding/Slow/Down
- [ ] Email: Working/Issues
- [ ] Payments: Working/Issues
- [ ] Simpli.fi: Connected/Issues

#### Quick Actions
- [ ] Test email button
- [ ] Refresh connections button
- [ ] View recent errors (simplified)

---

### 6. Duplicate Client Cleanup (MEDIUM)

#### Known Duplicates (~20-30 pairs)
- Randy Marion (2 entries)
- Whitlyn's Boutique (2 entries)
- 15 to Fit Method Pilates (2 entries)
- 100% Chiropractic / 100% Chiropractice
- G&M Milling / GM Milling
- Customer Driven Staffing variations

#### Merge Functionality
- [ ] Side-by-side comparison view
- [ ] Select primary record
- [ ] Merge activities, orders, contacts
- [ ] Audit log of merges

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Clients | 2,812 |
| Active Clients | 122 |
| Prospect Clients | 2,690 |
| Open (unassigned) | ~2,135 |
| Claimed/Assigned | ~677 |
| Super Admins | 3 |
| Team Members | 18 |
| Activities Logged | 4,652 |

---

## 🗓️ Future Phases

### Phase 3: Sales Pipeline Enhancement
- [ ] Pipeline stages with probabilities
- [ ] Expected close dates
- [ ] Win/loss tracking
- [ ] Sales forecasting
- [ ] Commission tracking

### Phase 4: Reporting & Analytics
- [ ] Sales rep performance dashboards
- [ ] Revenue by brand/product
- [ ] Client lifetime value
- [ ] Churn analysis

### Phase 5: Automation
- [ ] Auto-assign leads by territory
- [ ] Follow-up reminders
- [ ] Activity due dates
- [ ] Automated email sequences

### Phase 6: Client Portal
- [ ] Client self-service login
- [ ] View orders/invoices
- [ ] Make payments
- [ ] Download reports

---

## 📅 Session History

### January 28, 2026 (Evening) - Super Admin
- Super Admin role system (3 users)
- View As endpoints (backend)
- Audit logging infrastructure
- Enhanced user stats endpoint

### January 28, 2026 (Afternoon) - CRM Enhancement
- CRM View redesign with owner filter, sort, claim
- Updated 118 active clients from RAB data
- Fixed user ID mismatch

### January 28, 2026 (Morning) - CRM Import
- Imported 2,800+ clients from RAB
- Built dual-view Clients page

### January 27, 2026 - Billing & Security
- Auto-generate invoices feature
- Security audit improvements (7.5→8.5)

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files**
- No code snippets to insert
- User replaces entire file

### Git Workflow
```cmd
cd simplifi-reports
copy C:\Users\Justin\Downloads\file.js backend\file.js
git add backend/file.js
git commit -m "Description"
git push origin main
```
