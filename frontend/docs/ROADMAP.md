# WSIC Advertising Platform - Development Roadmap
## Updated: January 29, 2026

---

## 🎯 Current Sprint: Training Center & User Profiles

### ✅ COMPLETED (January 29, 2026)

#### System Diagnostics Dashboard
- [x] New `/settings/system` page (Super Admin only)
- [x] Visual health tree with 6 system components
- [x] Overall status banner (green/yellow/red)
- [x] Expandable component details
- [x] Environment configuration panel
- [x] Mobile compatibility fixes documentation
- [x] Sidebar navigation with SA badge
- [x] Fixed diagnostics authentication bug (token from localStorage)
- [x] Removed old diagnostics from Preferences page

#### Super Admin System (Complete)
- [x] Database: `is_super_admin` column on users
- [x] Database: `super_admin_audit_log` table
- [x] Set 3 Super Admins: Justin, Mamie, Bill
- [x] Backend: `requireSuperAdmin` middleware
- [x] Backend: `logSuperAdminAction()` audit function
- [x] Endpoints: View As, End View As, Audit Log
- [x] Frontend: View As button on Users page
- [x] Frontend: Audit Log tab on Users page
- [x] Frontend: System Diagnostics page
- [x] Sidebar: View As indicator when active

#### Client Page Improvements (Complete)
- [x] Removed Tier badge from client detail pages
- [x] Fixed Assigned Representative to show actual name
- [x] Merged Notes into Activity tab
- [x] All/Mine/Open toggle for ALL users
- [x] Client View: All/Current/Past toggle
- [x] Add Contact feature (Prospect/Lead)

#### RAB Contact Import (Complete)
- [x] ~300 contacts imported from PDF lead reports
- [x] Proper schema: first_name/last_name structure

---

## 🔥 NEXT PRIORITY: Training Center

### Phase 1: User Profile Pages

**Goal:** Create comprehensive user dashboard accessible from Users page

**User Profile Will Show:**
| Section | Data |
|---------|------|
| Overview | Name, role, email, start date, manager |
| Clients | Total, Active, Prospects, Leads, Churned |
| Orders | Created, Approved, Pending, Rejected, Revenue |
| Activities | Touchpoints, Appointments, Proposals (30/90/all time) |
| Goals & KPIs | Monthly targets vs actuals |
| Training | Assigned courses, completion %, certifications |

**Users Page Actions Update:**
| Current | New |
|---------|-----|
| View Clients | Keep |
| View As (SA only) | Keep |
| — | Add "Profile" button |

### Phase 2: Training Center Structure

**Import from Notion:**
- Current training materials and structure
- Video tutorials (links/embeds)
- Written guides and SOPs
- Quizzes/assessments

**Training Categories:**
| Category | Audience | Content Type |
|----------|----------|--------------|
| Onboarding | New hires | Videos, Docs, Checklist |
| Platform Training | All users | Interactive walkthroughs |
| Sales Process | Sales team | Videos, Scripts, Examples |
| Product Knowledge | Sales team | Docs, Quizzes |
| Admin Training | Admins | Videos, Docs |

### Phase 3: Training Integration

**Connect Training to Users:**
- Assign training modules to users
- Track completion status
- Due dates and reminders
- Manager visibility into team progress

**Role-Based Training Paths:**
| Role | Required Training |
|------|-------------------|
| Sales Associate | Onboarding, Platform, Sales, Products |
| Sales Manager | Above + Team Management |
| Admin | All modules |
| Staff | Onboarding, Platform basics |

---

## 📋 IN PROGRESS

### Order Import System
**Why This Matters:**
- Orders determine true "active" client status
- Revenue tracking depends on order data
- Currently have 2,812 clients but only ~122 confirmed active

**Excel Templates Created:**
- [x] Print Orders Template
- [x] Broadcast Orders Template
- [x] Podcast Orders Template
- [x] Events Orders Template
- [x] Web/Social Orders Template
- [x] Import Instructions document

**Pending:**
- [ ] Assistant fills templates from QuickBooks
- [ ] Generate SQL import scripts
- [ ] Import to database
- [ ] Update client statuses

### Multi-Product Campaign Display
**Current State:** Only Programmatic (Simpli.fi) campaigns display

| Product | Brand | Status |
|---------|-------|--------|
| Programmatic | All | ✅ Working |
| Radio Broadcast | WSIC | ⏳ Templates ready |
| Podcast | WSIC | ⏳ Templates ready |
| Print Ads | LKNW | ⏳ Templates ready |
| Events/Sponsorship | All | ⏳ Templates ready |
| Web/Social | All | ⏳ Templates ready |

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
| System Health | ✅ All Green |

---

## 🗓️ Future Phases

### Phase 4: Sales KPI Tracking
- Activity type tracking (touchpoints, appointments, proposals, deals)
- Per-rep metrics with time filters
- 1-on-1 exportable reports
- Pipeline value tracking

### Phase 5: Reporting & Analytics
- Sales rep performance dashboards
- Revenue by brand/product
- Client lifetime value
- Training effectiveness metrics

### Phase 6: Automation
- Auto-assign leads by territory
- Follow-up reminders
- Automated email sequences
- Training assignment automation

### Phase 7: Client Portal
- Client self-service login
- View orders/invoices
- Make payments
- Access reports

---

## 📅 Session History

### January 29, 2026 (Evening) - System Diagnostics
- System Diagnostics page (/settings/system)
- Visual health dashboard with expandable components
- Fixed diagnostics authentication bug
- Prepared Training Center roadmap

### January 29, 2026 (Afternoon) - Client UX & Contact Import
- Removed tier badges from client pages
- Fixed Assigned Representative display
- Merged Notes into Activity tab
- All/Mine/Open toggle for all users
- Add Contact modal (Prospect/Lead)
- RAB contact import SQL (~300 contacts)

### January 28, 2026 - Super Admin & CRM
- Super Admin role system (3 users)
- View As endpoints (backend)
- Audit logging infrastructure
- CRM View redesign
- Imported 2,800+ clients from RAB

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
