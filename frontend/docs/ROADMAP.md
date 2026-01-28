# WSIC Advertising Platform - Development Roadmap
## Updated: January 27, 2026

---

## 🎯 Current Sprint: CRM & Client Management

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

#### BillingPage UI
- [x] Expandable invoice rows with full details
- [x] Client contact info display (name, email, phone)
- [x] Payment method with last 4 digits
- [x] Backup payment method for invoice clients
- [x] Single "Approve & Send" workflow
- [x] Professional confirmation dialogs with context
- [x] Status-based action buttons
- [x] **Generate Invoices Modal** with order preview ⭐

#### Auto-Generate Invoices Feature
- [x] Preview billable orders for selected month
- [x] Category-based billing periods (Radio=previous, Print=15th before, Digital=advance)
- [x] Mixed order handling (bills at beginning of month)
- [x] Due date logic (15th or last business day based on contract start)
- [x] Skip already-invoiced orders
- [x] Batch invoice creation with summary
- [x] Professional confirmation with client list

#### Financial Dashboard
- [x] Key metrics (This Month, Collected, Collection Rate, Avg Value)
- [x] Accounts Receivable Aging (Current through 90+ days)
- [x] Top Clients by Revenue
- [x] Invoice Status Breakdown

#### Security Audit
- [x] Comprehensive security review
- [x] Documentation of strengths and vulnerabilities
- [x] Prioritized fix recommendations
- [x] Implementation checklist

---

## 📋 NEXT UP (Priority Order)

### 1. 🔥 Client Profile Enhancement (RECOMMENDED NEXT)

#### Enhanced Client Model
- [ ] Add client status field (Lead → Prospect → Active → Churned)
- [ ] Add industry/vertical field
- [ ] Add annual contract value calculation
- [ ] Add client since date
- [ ] Add client tier (Bronze, Silver, Gold, Platinum)
- [ ] Custom tags for segmentation

#### Client Detail Page Redesign
- [ ] Header with key client info and status badge
- [ ] Quick stats: Total revenue, Active orders, Open invoices
- [ ] Tabbed interface:
  - Overview (summary + activity)
  - Orders (full order history)
  - Invoices (invoice history)
  - Contacts (all contacts)
  - Notes (client notes)
  - Campaigns (Simpli.fi data)
- [ ] Activity timeline showing all interactions

#### Dashboard Updates
- [ ] Total clients by status
- [ ] Revenue by client (top 10)
- [ ] New clients this month
- [ ] Client health indicators

#### Contact Management Improvements
- [ ] Multiple contacts per client
- [ ] Contact roles (Primary, Billing, Marketing)
- [ ] Contact preferences (email, phone)

### 2. Security Improvements

#### ✅ High Priority (COMPLETED - January 27, 2026)
- [x] Add `helmet` middleware for security headers
- [x] Add `express-rate-limit` for login endpoint
- [x] Remove JWT secret fallback (`|| 'dev-secret'`)
- [x] Protect diagnostic endpoints with auth

#### Medium Priority
- [ ] Strengthen password policy (12+ chars, complexity)
- [ ] Add input validation library (`express-validator`)
- [ ] Fix CORS to reject unknown origins
- [ ] Add API request logging

### 3. Stripe Webhooks for Payment Status

#### Webhook Endpoints
- [ ] `POST /api/webhooks/stripe` - Main webhook handler
- [ ] Verify webhook signatures
- [ ] Handle `invoice.paid` event
- [ ] Handle `invoice.payment_failed` event
- [ ] Handle `payment_intent.succeeded` event

#### Auto-Update Invoice Status
- [ ] Mark invoice as paid when Stripe payment succeeds
- [ ] Record payment in invoice_payments table
- [ ] Send payment confirmation email
- [ ] Handle partial payments

### 4. Overdue Invoice Notifications

#### Automated Email Schedule
- [ ] 7 days overdue - Friendly reminder
- [ ] 14 days overdue - Second notice
- [ ] 21 days overdue - Urgent notice
- [ ] 28 days overdue - Final notice (auto-charge warning)
- [ ] 30 days - Auto-charge backup payment method

#### Notification Tracking
- [ ] Track reminder emails sent
- [ ] Prevent duplicate reminders
- [ ] Admin view of notification history

### 5. CSV Export

#### Invoice Export
- [ ] Export filtered invoice list to CSV
- [ ] Include all relevant fields
- [ ] Date range selection
- [ ] Status filtering

#### Financial Reports
- [ ] Revenue by month CSV
- [ ] Aging report CSV
- [ ] Client revenue report CSV

### 6. Year-over-Year Dashboard Comparisons

#### Time Period Comparisons
- [ ] This month vs same month last year
- [ ] YTD vs last year YTD
- [ ] This quarter vs same quarter last year

#### Visual Indicators
- [ ] Growth/decline percentages
- [ ] Trend arrows (up/down)
- [ ] Comparison charts

---

## 📊 Invoice Status Flow

```
                                    ┌─────────────────────┐
                                    │  Auto-Generate from │
                                    │   Signed Orders     │
                                    └─────────┬───────────┘
                                              │
                                              ▼
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌────────┐     ┌────────┐
│  Draft  │ ──► │ Approved │ ──► │   Sent   │ ──► │  Paid  │     │  Void  │
└─────────┘     └──────────┘     └──────────┘     └────────┘     └────────┘
     │               │                 │                              ▲
     │               │                 │                              │
     ▼               ▼                 ▼                              │
  (Edit)        (Approve          (Overdue)                      (Void from
              & Send)           after due date                   any status)
                                      │
                                      ▼
                               ┌─────────────┐
                               │   Overdue   │
                               │  Reminders  │
                               └──────┬──────┘
                                      │
                                      ▼ (Day 30)
                               ┌─────────────┐
                               │ Auto-Charge │
                               │   Backup    │
                               └─────────────┘
```

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
| Supabase (DB) | ✅ Working | All tables created |
| Simpli.fi (Ads) | ✅ Working | Campaign data sync |
| Stripe (Payments) | ✅ Working | Payment links, charge on file |
| Stripe Webhooks | 📋 Next | Auto-mark paid |

---

## 📧 Email Templates Status

| Email Type | Status | Notes |
|------------|--------|-------|
| Contract to Client | ✅ Working | With brand logos |
| Signature Confirmation | ✅ Working | Card payment confirmed |
| ACH Setup | ✅ Working | Action required |
| Invoice to Client | ✅ Working | With pay button |
| Invoice Reminder | ✅ Working | Overdue notice |
| Payment Confirmation | 📋 Planned | After webhook integration |
| Auto-Charge Notice | 📋 Planned | Day 30 warning |

---

## 🔒 Security Status

**Current Score: 8.5/10** ⬆️ (was 7.5)

### Strengths
- ✅ bcrypt password hashing
- ✅ Account lockout after failed attempts
- ✅ Parameterized SQL queries
- ✅ Role-based access control
- ✅ Stripe for PCI-compliant payments
- ✅ Activity logging
- ✅ **Helmet security headers** (NEW)
- ✅ **Rate limiting on login** (NEW)
- ✅ **JWT validation in production** (NEW)
- ✅ **Protected diagnostic endpoints** (NEW)

### Remaining Improvements
- ⚠️ CORS still allows unknown origins (logging)
- ⚠️ Password policy could be stronger

See `SECURITY_AUDIT.md` for full details and implementation guide.

---

## 🔧 Technical Debt / Improvements

- [ ] Stripe webhook handling for payment events
- [ ] Scheduled job runner for auto-invoicing
- [ ] Better error handling throughout
- [ ] Unit tests for billing flows
- [ ] API rate limiting
- [ ] Audit logging for compliance
- [ ] Security header implementation

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

---

## 📅 Session History

### January 27, 2026 - Billing Phase 2 + Security Audit
- Built auto-generate invoices from signed orders
- Category-based billing logic (Radio, Print, Digital)
- Professional confirmation dialogs
- Payment method last 4 digit display fix
- Comprehensive security audit (7.5/10)
- Documentation updates

### January 27, 2026 - Billing System Phase 1
- Built complete invoice management system
- Created BillingPage with expandable rows
- Added Financial Dashboard
- Invoice emails with brand detection
- Edit invoice functionality

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
