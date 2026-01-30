# WSIC Advertising Platform - Development Roadmap
## Updated: January 30, 2026

---

## 🚨 IMMEDIATE: Bug Fixes from QA Testing

### Priority 1: Critical Issues
| Issue | Status | Files to Check |
|-------|--------|----------------|
| Client email not coming through | 🔴 Needs Fix | `email-service.js` |
| PDF upload errors | 🔴 Needs Fix | Upload endpoints |
| Change Order + Credit Card error | 🔴 Needs Fix | `ClientSigningPage.jsx` |
| Commissions page - Lalaine can't see | 🔴 Needs Fix | `App.jsx`, commission queries |

---

## ✅ COMPLETED

### January 30, 2026 - Orders Page & Book Price Tracking
- [x] Sections view with status grouping
- [x] Order Journey timeline in modal
- [x] Pricing Summary with Book Value vs Actual comparison
- [x] $0 product restriction (admin only for barters/comps)
- [x] Auto-lookup book prices from product catalog
- [x] Journey timestamps (activated_at, completed_at, cancelled_at)
- [x] Fixed single order endpoint returning items
- [x] Database migrations for book_price, book_setup_fee

### January 30, 2026 (Earlier) - Orders & Email Infrastructure
- [x] Email logging to database with email_type, order_id, status
- [x] Email dashboard API endpoints
- [x] Auto-send contract after approval (when primary contact exists)
- [x] Kill/Change orders show parent order's products
- [x] JWT token decode for user detection
- [x] Sales Rep filter dropdown for admins
- [x] Sections/Table toggle buttons
- [x] Fixed `o.created_by` → `o.submitted_by` SQL errors

### January 29, 2026 - Email Design System
- [x] Universal Email Design System principles
- [x] Subject format: `[ACTION] - [CLIENT] - [BRANDS]`
- [x] Brand bubbles in all order emails
- [x] Category bubbles with icons (📰📻🎙️💻🎪🌐📱)
- [x] Removed order numbers from emails (anti-phishing)
- [x] Multi-recipient logic (Justin, Mamie, Lalaine + Bill if WSIC)

### January 29, 2026 - Earlier
- [x] Commission rates configuration
- [x] Edit User feature
- [x] Event Manager role
- [x] ACH with Stripe Financial Connections

---

## 📋 NEXT PHASES

### Phase 2: Role-Based Dashboards
| User | Dashboard Type | Key Focus |
|------|----------------|-----------|
| Justin & Mamie | Macro | All metrics, team performance |
| Bill | Radio | WSIC Broadcast, programming |
| Lalaine | Operational | Action items, processing queue |
| Erin | Events | LKN Woman events, calendar |
| Sales Associates | Personal | Their clients, pipeline, commissions |

### Phase 3: Reporting & Analytics
- [ ] Sales Rep Performance report
- [ ] Pipeline Report
- [ ] Revenue by Product/Brand
- [ ] Commission Reports

### Phase 4: Email System Polish
- [ ] Verify all email types have brand bubbles
- [ ] Invoice emails with brand bubbles
- [ ] Test email delivery to all recipients

---

## 👥 User Dashboard Matrix

| User | Role | Email | Dashboard Type |
|------|------|-------|----------------|
| Justin Ckezepis | Super Admin | justin@wsicnews.com | Macro |
| Mamie Lee | Super Admin | mamie@wsicnews.com | Macro |
| Bill Blakely | Super Admin | bill@wsicnews.com | Radio |
| Lalaine Agustin | Admin | admin@wsicnews.com | Operational |
| Erin Connair | Event Manager | erin@lakenormanwoman.com | Events |
| Sales Reps (10+) | Sales Associate | various | Personal |
| Staff (3) | Staff | various | Minimal |

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

## 🗓️ Session History

### January 30, 2026 (Afternoon) - Orders Enhancements
- Sections view rendering complete
- Order Journey timeline
- Pricing Summary with book value comparison
- $0 product admin restriction
- Book price auto-lookup from catalog
- Database migrations

### January 30, 2026 (Morning) - Orders & Email Infrastructure
- Email logging database infrastructure
- Auto-send on approval
- Orders page: sales rep filter, view toggle
- Kill/Change orders show parent products
- JWT user detection fix

### January 29, 2026 (Late Evening) - Email & Orders
- Universal Email Design System
- Orders page brand/category bubbles
- ACH Financial Connections fix

### January 29, 2026 (Evening) - Commission & Auth
- Commission tracking system
- Edit User feature
- Authentication fixes

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files**
- No code snippets to insert
- User replaces entire file

### Git Workflow
```cmd
cd simplifi-reports
del frontend\src\components\ComponentName.jsx
copy "C:\Users\WSIC BILLING\Downloads\ComponentName.jsx" frontend\src\components\ComponentName.jsx
git add -A
git commit -m "Description"
git push origin main
```

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Orders | ~54 |
| Pending Approval | ~7 |
| Active Orders | ~1 |
| Total Contract Value | ~$442,441.00 |

---

## 🔧 Database Columns Added This Session

### Orders Table
```sql
activated_at TIMESTAMPTZ    -- When order activated
completed_at TIMESTAMPTZ    -- When order completed
cancelled_at TIMESTAMPTZ    -- When order cancelled
```

### Order Items Table
```sql
book_price NUMERIC          -- Original/list price from catalog
book_setup_fee NUMERIC      -- Original setup fee from catalog
```
