# WSIC Advertising Platform - Development Roadmap
## Updated: January 27, 2026

---

## 🎯 Current Sprint: Billing System Phase 2

### ✅ COMPLETED (January 27, 2026)

#### Billing/Invoice Management System - Phase 1
- [x] Database schema (invoices, invoice_items, invoice_payments tables)
- [x] Backend API (13 endpoints for full CRUD + workflow)
- [x] Invoice creation (manual + from order)
- [x] Invoice approval workflow
- [x] Send invoice email with Stripe payment link
- [x] Professional email template with brand logos
- [x] Record manual payments
- [x] Charge payment method on file
- [x] Void invoices
- [x] Send overdue reminders
- [x] Edit draft invoices

#### BillingPage UI
- [x] Expandable invoice rows with full details
- [x] Client contact info display (name, email, phone)
- [x] Payment method with last 4 digits
- [x] Backup payment method for invoice clients
- [x] Single "Approve & Send" workflow
- [x] Relational confirmation dialogs
- [x] Status-based action buttons

#### Financial Dashboard
- [x] Key metrics (This Month, Collected, Collection Rate, Avg Value)
- [x] Accounts Receivable Aging (Current through 90+ days)
- [x] Top Clients by Revenue
- [x] Invoice Status Breakdown

### ✅ COMPLETED (January 26, 2026)

#### Product Selector Improvements
- [x] Broadcast subcategories: Commercials, Show Sponsor, Host Your Own Show, Community Calendar
- [x] Brand → Category → Subcategory → Product flow in OrderForm
- [x] Same flow added to ChangeOrderForm
- [x] Client search simplified (name only) in Change/Kill order forms

#### New Products Added
- [x] Bible Minute - $1,000/month (Broadcast → Commercials)
- [x] Premium Radio Show Host - $2,500/month (Broadcast → Host Your Own Show)
- [x] Radio Show Host - $2,000/month (Broadcast → Host Your Own Show)
- [x] Sunday Morning Sermon - $1,500/month (Broadcast → Host Your Own Show)

#### Client Signing Payment Flow Fixes
- [x] Token-based payment endpoints (no auth required)
- [x] Fixed SQL query errors (non-existent columns)
- [x] Stripe customer validation (recreate if missing)
- [x] Detailed logging for debugging

---

## 📋 NEXT UP (Priority Order)

### 1. 🔥 Auto-Generate Invoices from Active Orders (RECOMMENDED NEXT)

#### Monthly Invoice Generation
- [ ] Scheduled job/endpoint to trigger monthly billing
- [ ] Query active orders with billing_frequency = 'monthly'
- [ ] Create invoice with line items from order_items
- [ ] Handle pro-rated first month
- [ ] Skip orders already invoiced for the period
- [ ] Support quarterly billing frequency

#### Batch Processing
- [ ] Admin UI to trigger invoice generation
- [ ] Preview before generating
- [ ] Bulk approve generated invoices
- [ ] Summary report of generated invoices

### 2. Stripe Webhooks for Payment Status

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

### 3. Overdue Invoice Notifications

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

### 4. CSV Export

#### Invoice Export
- [ ] Export filtered invoice list to CSV
- [ ] Include all relevant fields
- [ ] Date range selection
- [ ] Status filtering

#### Financial Reports
- [ ] Revenue by month CSV
- [ ] Aging report CSV
- [ ] Client revenue report CSV

### 5. Year-over-Year Dashboard Comparisons

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
                                    ┌─────────────────┐
                                    │  Auto-Generate  │
                                    │  from Orders    │
                                    └────────┬────────┘
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

### Phase 3: ACH Bank Verification
- [ ] Build `/ach-setup/:token` page
- [ ] Stripe Financial Connections integration
- [ ] Handle verification webhooks
- [ ] Update payment_status on completion

### Phase 4: Contract PDF Generation
- [ ] Auto-generate PDF from signed orders
- [ ] Include signatures, terms, all details
- [ ] Store in documents table
- [ ] Email PDF to client after signing

### Phase 5: Campaign Management
- [ ] Campaign creation from signed orders
- [ ] Simpli.fi campaign sync
- [ ] Creative asset management
- [ ] Campaign performance dashboards

### Phase 6: Client Portal
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
| Supabase (DB) | ✅ Working | Invoice tables created |
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

## 🔧 Technical Debt / Improvements

- [ ] Stripe webhook handling for payment events
- [ ] Scheduled job runner for auto-invoicing
- [ ] Better error handling throughout
- [ ] Unit tests for billing flows
- [ ] API rate limiting
- [ ] Audit logging for compliance

---

## 📅 Session History

### January 27, 2026 - Billing System Phase 1
- Built complete invoice management system
- Created BillingPage with expandable rows
- Added Financial Dashboard (replaced Aging Report)
- Invoice emails with brand detection
- Edit invoice functionality
- Payment method display with last 4 digits

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
