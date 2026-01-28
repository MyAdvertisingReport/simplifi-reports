# WSIC Advertising Platform - Development Roadmap
## Updated: January 28, 2026

---

## 🎯 Current Sprint: Data Entry & CRM Enhancement

### ✅ COMPLETED (January 28, 2026)

#### CRM / Client Management - Phase 1
- [x] Import 266 clients from RAB Master Sheet
- [x] Add CRM fields to advertising_clients table (status, tier, tags, source)
- [x] Dual-view Clients page (CRM View + Client View)
- [x] Brand filtering (WSIC, LKNW, Multi-Platform)
- [x] Product/inventory type tagging
- [x] Trade/Barter client identification
- [x] Status assignment based on current revenue (Jan-Feb 2025)
- [x] Sticky table headers for scrolling
- [x] Update /api/clients to return all CRM fields
- [x] Fix invoice API parameter (clientId → client_id)
- [x] **🔥 Performance optimization: Single query for all client stats** ⭐
  - Eliminated 500+ API calls per page load
  - Stats (orders, invoices, balance) now included via SQL JOINs
  - Page loads in <1 second instead of 5-10 seconds

### ✅ COMPLETED (January 27, 2026)

#### Billing System - Phase 1 & 2
- [x] Database schema (invoices, invoice_items, invoice_payments tables)
- [x] Backend API (15 endpoints for full CRUD + workflow)
- [x] Invoice creation (manual + from order)
- [x] Invoice approval workflow
- [x] Send invoice email with Stripe payment link
- [x] Professional email template with brand logos
- [x] Record manual payments
- [x] Charge payment method on file
- [x] Void invoices
- [x] Send overdue reminders
- [x] Edit draft invoices
- [x] **Auto-Generate Invoices from Signed Orders** ⭐

#### Security Audit & Improvements
- [x] Comprehensive security review (8.5/10)
- [x] Add `helmet` middleware for security headers
- [x] Add `express-rate-limit` for login endpoint
- [x] Remove JWT secret fallback
- [x] Protect diagnostic endpoints with auth

---

## 📋 NEXT UP (Priority Order)

### 1. 🔥 Data Entry & Verification (CURRENT PRIORITY)

#### Client Data Entry
- [ ] Verify imported client names are spelled correctly
- [ ] Confirm brand associations (WSIC/LKNW) are accurate
- [ ] Add primary contacts for all active clients
- [ ] Add billing contacts where different from primary

#### Order Entry
- [ ] Add orders for active clients using Upload Order form
- [ ] Link orders to correct products
- [ ] Set contract terms (start date, duration)
- [ ] Collect payment methods during signing

#### Billing Setup
- [ ] Set billing preferences per client
- [ ] Connect payment methods
- [ ] Verify QuickBooks customer IDs (if applicable)

### 2. CRM Notes Import

#### RAB CRM Export
- [ ] Get activity/notes export from RAB system
- [ ] Import historical notes to client records
- [ ] Link activity timeline to clients

### 3. Sales Associate Features

#### User Assignment
- [ ] Map salesperson names (from RAB sheet) to user accounts
- [ ] Add assigned_to field population
- [ ] Filter clients by assigned rep

#### Sales Dashboard
- [ ] Sales rep performance metrics
- [ ] Pipeline by rep
- [ ] Commission tracking (future)

### 4. Client Detail Page Enhancement

#### Tabbed Interface
- [ ] Overview tab (summary + quick stats)
- [ ] Orders tab (full order history)
- [ ] Invoices tab (invoice history)
- [ ] Contacts tab (all contacts)
- [ ] Notes tab (activity timeline)
- [ ] Campaigns tab (Simpli.fi data)

#### Activity Timeline
- [ ] Show all client interactions
- [ ] Log order creation, invoice sends, payments
- [ ] Manual activity notes

### 5. Stripe Webhooks for Payment Status

#### Webhook Endpoints
- [ ] `POST /api/webhooks/stripe` - Main webhook handler
- [ ] Verify webhook signatures
- [ ] Handle `invoice.paid` event
- [ ] Handle `invoice.payment_failed` event

#### Auto-Update Invoice Status
- [ ] Mark invoice as paid when Stripe payment succeeds
- [ ] Record payment in invoice_payments table
- [ ] Send payment confirmation email

### 6. Overdue Invoice Notifications

#### Automated Email Schedule
- [ ] 7 days overdue - Friendly reminder
- [ ] 14 days overdue - Second notice
- [ ] 21 days overdue - Urgent notice
- [ ] 28 days overdue - Final notice (auto-charge warning)
- [ ] 30 days - Auto-charge backup payment method

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Clients | 270 |
| Active Clients | 95 |
| Prospect Clients | 175 |
| WSIC Radio Clients | 77 |
| Lake Norman Woman Clients | 157 |
| Multi-Platform Clients | 32 |
| Trade/Barter Clients | 28 |
| Clients with Orders | TBD |
| Clients with Contacts | TBD |

---

## 🗓️ Future Phases

### Phase 3: Sales Pipeline / CRM
- [ ] Lead tracking and management
- [ ] Opportunity stages with probabilities
- [ ] Win/loss tracking
- [ ] Sales associate quotas
- [ ] Pipeline forecasting

### Phase 4: ACH Bank Verification
- [ ] Build `/ach-setup/:token` page
- [ ] Stripe Financial Connections integration
- [ ] Handle verification webhooks
- [ ] Update payment_status on completion

### Phase 5: Contract PDF Generation
- [ ] Auto-generate PDF from signed orders
- [ ] Include signatures, terms, all details
- [ ] Store in documents table
- [ ] Email PDF to client after signing

### Phase 6: Campaign Management
- [ ] Campaign creation from signed orders
- [ ] Simpli.fi campaign sync
- [ ] Creative asset management
- [ ] Campaign performance dashboards

### Phase 7: Client Portal
- [ ] Client self-service login
- [ ] View their orders/invoices
- [ ] Make payments online
- [ ] Download reports
- [ ] Update contact info

---

## 🔗 Key Integration Points

| System | Status | Notes |
|--------|--------|-------|
| Postmark (Email) | ✅ Working | Invoice emails functional |
| Supabase (DB) | ✅ Working | All tables created, 270 clients |
| Simpli.fi (Ads) | ✅ Working | Campaign data sync |
| Stripe (Payments) | ✅ Working | Payment links, charge on file |
| Stripe Webhooks | 📋 Next | Auto-mark paid |
| QuickBooks | 📋 Planned | Customer sync |

---

## 🔒 Security Status

**Current Score: 8.5/10** ✅

### Implemented
- ✅ bcrypt password hashing
- ✅ Account lockout after failed attempts
- ✅ Parameterized SQL queries
- ✅ Role-based access control
- ✅ Stripe for PCI-compliant payments
- ✅ Activity logging
- ✅ Helmet security headers
- ✅ Rate limiting on login
- ✅ JWT validation in production
- ✅ Protected diagnostic endpoints

### Remaining
- ⚠️ CORS still allows unknown origins (logging only)
- ⚠️ Password policy could be stronger

---

## 📅 Session History

### January 28, 2026 - CRM Import & Performance Optimization
- Imported 266 clients from RAB Master Sheet
- Built dual-view Clients page (CRM View + Client View)
- Added brand filtering (WSIC/LKNW/Multi-Platform)
- Fixed invoice API parameter bug
- Added sticky table headers
- **🔥 Major optimization: Eliminated 500+ API calls**
  - `/api/clients` now returns order/invoice stats via JOINs
  - Page load: 5-10 seconds → <1 second
- Created assistant data entry prompt

### January 27, 2026 - Billing Phase 2 + Security Audit
- Built auto-generate invoices from signed orders
- Category-based billing logic (Radio, Print, Digital)
- Professional confirmation dialogs
- Payment method last 4 digit display fix
- Comprehensive security audit (7.5→8.5/10)

### January 27, 2026 - Billing System Phase 1
- Built complete invoice management system
- Created BillingPage with expandable rows
- Added Financial Dashboard
- Invoice emails with brand detection

### January 26, 2026 - UI Improvements & Payment Fixes
- Added Broadcast subcategories
- Added 4 new products
- Fixed client signing payment flow
- Created fillable PDF templates

### January 25, 2026 - Order Variants & Upload Forms
- Built Upload Order form with payment collection
- Added contract term/renewal fields
- Fixed inline ACH collection

### January 24, 2026 - Payment Integration & Signing Redesign
- Redesigned ClientSigningPage to single-page 3-step flow
- Integrated Stripe Elements for PCI-compliant card collection
- Added billing preference options

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files** - Do NOT provide code snippets to insert
- Claude should create the full updated file for download
- User will replace the entire file in their project

### Git Workflow
- User uses **simple Windows cmd prompt** for git commands
- Standard deploy workflow:
```cmd
cd simplifi-reports
copy [downloaded file] backend\routes\filename.js
git add backend/routes/filename.js
git commit -m "Description of change"
git push origin main
```
