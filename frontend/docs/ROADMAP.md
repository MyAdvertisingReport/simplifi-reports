# WSIC Advertising Platform - Development Roadmap
## Updated: January 29, 2026

---

## 🎯 Current Sprint: Orders Import & Multi-Product Display

### ✅ COMPLETED (January 28-29, 2026)

#### Super Admin System (Backend)
- [x] Database: `is_super_admin` column on users
- [x] Database: `super_admin_audit_log` table
- [x] Set 3 Super Admins: Justin, Mamie, Bill
- [x] Backend: `requireSuperAdmin` middleware
- [x] Backend: `logSuperAdminAction()` audit function
- [x] Endpoint: View As, End View As, Audit Log, List Super Admins
- [x] Updated `/api/auth/me` and `/api/users/extended`

#### Client Page Improvements
- [x] Removed Tier badge from client detail pages
- [x] Fixed Assigned Representative to show actual name
- [x] Merged Notes into Activity tab (unified experience)
- [x] Activity tab now has note input section at top
- [x] Removed standalone Notes tab from navigation

#### CRM View Enhancements
- [x] All/Mine/Open toggle available to ALL users
- [x] Sales associates can VIEW all clients (for prospecting)
- [x] View button permissions maintained (own clients only clickable)
- [x] Client View: All/Current/Past toggle (defaults to Current)

#### Add Contact Feature
- [x] Green "Add Contact" button for all users
- [x] Prospect vs Lead type selection modal
- [x] Auto-assignment to user adding contact
- [x] Warning to check Master List first

#### RAB Contact Import
- [x] Extracted ~300 contacts from PDF lead reports
- [x] Generated SQL for Stephanie Sullivan (~280 contacts)
- [x] Generated SQL for Brooke, Taylor, Elizabeth, Jennifer (~19 contacts)
- [x] Proper schema: first_name/last_name, contact_type='decision_maker'

---

## 📋 IN PROGRESS

### 1. 🔥 Import Actual Client Orders (IMMEDIATE)

**Why This Matters:**
- Orders determine true "active" client status
- Revenue tracking depends on order data
- Currently have 2,812 clients but only ~122 confirmed active

**Data Needed:**
- Historical orders from RAB/existing system
- Order items with products
- Contract dates, values, status

**Tasks:**
- [ ] Define order import format/schema
- [ ] Generate SQL or import process
- [ ] Link orders to advertising_clients
- [ ] Update client status based on order presence

---

### 2. 🔥 Multi-Product Campaign Display (HIGH PRIORITY)

**Current State:** Only Programmatic (Simpli.fi) campaigns display

**Products to Add:**

| Product | Brand | Data Source | Status |
|---------|-------|-------------|--------|
| Programmatic | All | Simpli.fi API | ✅ Working |
| Radio Broadcast | WSIC | Manual/Orders | ❌ Needs UI |
| Podcast | WSIC | Manual/Orders | ❌ Needs UI |
| Print Ads | LKNW | Manual/Orders | ❌ Needs UI |
| Events/Sponsorship | All | Manual/Orders | ❌ Needs UI |
| Web/Social | All | Manual/Orders | ❌ Needs UI |

**UI Needs:**
- [ ] Product-type tabs or filters on client campaign view
- [ ] Different display formats per product type
- [ ] Brand-aware product filtering (WSIC vs LKNW products)
- [ ] Order-to-campaign relationship display

---

### 3. Super Admin Frontend (Backend Ready ✅)

#### View As Feature
- [ ] "View As" button (purple eye icon) on Users page
- [ ] View As indicator in sidebar when active
- [ ] "Exit" button to return to normal view
- [ ] All actions logged to audit trail

#### Audit Log Tab
- [ ] New "🔒 Audit Log" tab on Users page (Super Admins only)
- [ ] Filter by action type, admin, date range
- [ ] Displays: who, what, when, target user

#### Visual Indicators
- [ ] Purple "SA" badge next to Super Admin names

---

### 4. Sales KPI Tracking (MEDIUM-HIGH)

#### Activity Types to Track
| Type | Description | Goal |
|------|-------------|------|
| `touchpoint` | Generic contacts | 100/week min |
| `appointment_set` | Meetings scheduled | Track monthly |
| `proposal_sent` | Proposals created | Track monthly |
| `deal_closed` | Closed sales (with $) | Track monthly |

#### Reports Needed
- [ ] Per-rep metrics with time filters
- [ ] 1-on-1 exportable reports
- [ ] Pipeline value tracking

---

### 5. User Management Enhancements (Backend Ready ✅)

#### Stats Display
- [ ] Show client_count, active_client_count, revenue in Users list
- [ ] Bulk assign UI with checkbox selection
- [ ] Transfer all clients button per user

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Clients | 2,812 |
| Active Clients | ~122 (needs verification via orders) |
| Prospect Clients | ~2,690 |
| Open (unassigned) | ~2,135 |
| Claimed/Assigned | ~677 |
| Super Admins | 3 |
| Team Members | 18 |
| RAB Contacts Imported | ~300 |

---

## 🗓️ Future Phases

### Phase 3: Sales Pipeline Enhancement
- Pipeline stages with probabilities
- Expected close dates
- Win/loss tracking
- Sales forecasting

### Phase 4: Reporting & Analytics
- Sales rep performance dashboards
- Revenue by brand/product
- Client lifetime value

### Phase 5: Automation
- Auto-assign leads by territory
- Follow-up reminders
- Automated email sequences

### Phase 6: Client Portal
- Client self-service login
- View orders/invoices
- Make payments

---

## 📅 Session History

### January 29, 2026 - Client UX & Contact Import
- Removed tier badges from client pages
- Fixed Assigned Representative display
- Merged Notes into Activity tab
- All/Mine/Open toggle for all users
- All/Current/Past toggle in Client View
- Add Contact modal (Prospect/Lead)
- RAB contact import SQL (~300 contacts)

### January 28, 2026 (Evening) - Super Admin
- Super Admin role system (3 users)
- View As endpoints (backend)
- Audit logging infrastructure

### January 28, 2026 (Afternoon) - CRM Enhancement
- CRM View redesign with owner filter, sort, claim
- Updated 118 active clients from RAB data

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
