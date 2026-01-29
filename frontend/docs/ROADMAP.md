# WSIC Advertising Platform - Development Roadmap
## Updated: January 29, 2026 (Late Evening)

---

## ✅ COMPLETED

### Email Design System (January 29, 2026 - Late Evening)
- [x] Universal Email Design System principles
- [x] Subject format: `[ACTION] - [CLIENT] - [BRANDS]`
- [x] Brand bubbles in all order emails
- [x] Category bubbles with icons (📰📻🎙️💻🎪🌐📱)
- [x] Removed order numbers from all emails (anti-phishing)
- [x] Multi-recipient logic (Justin, Mamie, Lalaine + Bill if WSIC)
- [x] Product details table with book price vs adjusted price

### Orders Page Visual Updates (January 29, 2026)
- [x] Brand bubbles column in orders table
- [x] Category bubbles with icons
- [x] Removed order numbers from UI display
- [x] Order modal shows client name as header
- [x] Clear approval reasons (book price → adjusted price, discount %)

### ACH Payment Fix (January 29, 2026)
- [x] Stripe Financial Connections integration
- [x] Instant bank verification via online banking
- [x] Removed manual routing/account entry

### Commission System (January 29, 2026 - Earlier)
- [x] Commission rates configuration
- [x] Approvals workflow with split support
- [x] YTD tracking and reporting

### User Management (January 29, 2026)
- [x] Edit User feature
- [x] Event Manager role for Erin
- [x] Change Password in sidebar
- [x] Auth fixes (trust proxy, direct SQL)

---

## 🎯 CURRENT PRIORITY: Role-Based Dashboards

### Phase 1: Dashboard Customization
**Goal:** Each user type sees a dashboard relevant to their role

#### Super Admin Dashboard (Justin, Mamie)
- [ ] All metrics overview
- [ ] Team performance summary
- [ ] Revenue by brand/category
- [ ] Pending approvals count
- [ ] Recent activity feed

#### Radio/Programming Dashboard (Bill)
- [ ] WSIC Broadcast orders only
- [ ] Station programming calendar
- [ ] Radio spot inventory
- [ ] Broadcast revenue metrics

#### Operational Dashboard (Lalaine)
- [ ] Action items queue:
  - Orders to process
  - Contracts awaiting signature
  - Invoices to send
  - Payments pending
  - Failed payments to follow up
- [ ] Today's tasks checklist
- [ ] Commissions to approve

#### Event Manager Dashboard (Erin)
- [ ] Upcoming events calendar
- [ ] Event orders (LKN Woman focus)
- [ ] Event revenue tracking
- [ ] Event client list

#### Sales Associate Dashboard (All Sales Reps)
- [ ] My clients only
- [ ] My pipeline
- [ ] My commissions (YTD, pending)
- [ ] My activity metrics
- [ ] CRM quick actions

---

## 📋 NEXT PHASES

### Phase 2: Email System Polish
- [ ] Verify brand bubbles appear in all email types
- [ ] Ensure `order.items` populated when emails sent
- [ ] Test complete order flow with real data
- [ ] Invoice emails with brand bubbles

### Phase 3: Order Testing Complete
- [ ] New Order (Electronic) - Full flow
- [ ] Upload Order (Pre-Signed)
- [ ] Change Order
- [ ] Kill Order
- [ ] Commission auto-generation

### Phase 4: Reporting & Analytics
- [ ] Sales Rep Performance report
- [ ] Pipeline Report
- [ ] Revenue by Product/Brand
- [ ] Commission Reports

---

## 👥 User Dashboard Matrix

| User | Role | Dashboard Type | Key Focus |
|------|------|----------------|-----------|
| Justin Ckezepis | Super Admin | Macro | Everything |
| Mamie Lee | Super Admin | Macro | Everything |
| Bill Blakely | Super Admin | Radio | WSIC Broadcast, Programming |
| Lalaine Agustin | Admin | Operational | Action items, processing |
| Erin Connair | Event Manager | Events | LKN Woman events |
| Sales Reps (10+) | Sales Associate | Personal | Their book of business |
| Staff (3) | Staff | Minimal | Non-sales access |

---

## 📧 Email System Status

### Working ✅
- New Order Submitted (with brands, categories, product details)
- Approval Required
- Order Approved
- Order Rejected
- Contract Signed Internal

### Need Verification 🔍
- Contract to Client (brand bubbles showing?)
- Invoice to Client
- Payment Reminder
- Payment Receipt

### Email Recipients
| Email Type | Recipients |
|------------|------------|
| Order Submitted | Justin, Mamie, Lalaine + Bill (if WSIC) |
| Approval Required | Justin, Mamie, Lalaine, Bill |
| Order Approved | Order submitter |
| Contract Signed | Justin, Mamie, Lalaine + Sales Rep |

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

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Clients | 2,815 |
| Active Clients | ~122 |
| Team Members | 19 |
| Super Admins | 3 (Justin, Mamie, Bill) |
| Training Modules | 21 active |
| System Health | ✅ All Green |

---

## 🗓️ Session History

### January 29, 2026 (Late Evening) - Email & Orders
- Universal Email Design System
- Orders page brand/category bubbles
- Clear approval reasons
- ACH Financial Connections fix
- Anti-phishing measures (no order numbers)

### January 29, 2026 (Evening) - Commission & Auth
- Commission tracking system
- Edit User feature
- Authentication fixes

### January 29, 2026 (Earlier) - Training & Tools
- Training Center: 4 categories, 21 modules
- Tools Page: 5 categories of resources

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files**
- No code snippets to insert
- User replaces entire file

### Key Files for Dashboard Work
1. `App.jsx` - Dashboard components
2. `server.js` - Dashboard data endpoints
3. `email-service.js` - Email templates

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
