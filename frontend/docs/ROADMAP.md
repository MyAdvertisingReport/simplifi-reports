# WSIC Advertising Platform - Development Roadmap
## Updated: January 26, 2026

---

## 🎯 Current Sprint: Order Variants Complete, Payment Flow Fixed

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

#### Fillable PDF Templates
- [x] Contract template (3 pages with payment fields)
- [x] Change order template (1 page)
- [x] Kill order template (1 page)

### ✅ COMPLETED (January 24-25, 2026)

#### Order Variants System
- [x] OrderTypeSelector - 3-column layout with 6 order types
- [x] Upload Order form - Pre-signed PDF upload
- [x] Change Order (Electronic) - E-signature flow
- [x] Change Order (Upload) - Upload signed change order
- [x] Kill Order (Electronic) - E-signature cancellation
- [x] Kill Order (Upload) - Upload signed cancellation
- [x] AdminDocumentsPage - View all uploaded documents
- [x] Document upload/download API endpoints
- [x] Database migrations for documents table

#### Contract Term/Renewal Fields
- [x] New/Renewal toggle on Change Order forms
- [x] Contract term length selection (6/12/18/24 months)
- [x] Auto-calculated end dates
- [x] Start date picker

#### Payment Collection During Upload
- [x] Payment method selection in Upload forms
- [x] Credit Card, ACH, Check, Invoice options
- [x] Stripe integration for card/ACH collection
- [x] Client creation modal in upload forms

### ✅ COMPLETED (January 24, 2026)

#### Client Signing Page Redesign
- [x] Single-page 3-step flow (Review → Payment → Sign)
- [x] Step indicator with visual progress
- [x] Editable contact card in Step 1
- [x] Three billing preferences (Card, ACH, Invoice)
- [x] Invoice backup payment selection (Card or ACH)
- [x] Proper amount calculations with CC fee display

#### Stripe Payment Integration (PCI Compliant)
- [x] Stripe Elements for card collection
- [x] SetupIntent flow for secure tokenization
- [x] Per-entity Stripe accounts (WSIC, LKN, LWP)
- [x] Customer creation and payment method attachment

#### Email System
- [x] Contract email with brand logos
- [x] Confirmation email with product breakdown
- [x] ACH setup email (action required)
- [x] Outlook compatibility fixes

---

## 📋 NEXT UP (Priority Order)

### 1. 🔥 Billing/Invoice Management System (RECOMMENDED NEXT)

#### Invoice Generation
- [ ] Auto-generate invoices on billing cycle
- [ ] Support billing frequencies (monthly, quarterly)
- [ ] Calculate amounts from active orders
- [ ] Include setup fees on first invoice
- [ ] Apply CC processing fee when applicable

#### Invoice Approval Queue
- [ ] Admin view of pending invoices
- [ ] Edit invoice line items before sending
- [ ] Bulk approve/send functionality
- [ ] Invoice status: draft → approved → sent → paid/overdue

#### Invoice Delivery
- [ ] Send invoice email with Stripe payment link
- [ ] Stripe hosted invoice page
- [ ] Payment confirmation emails
- [ ] Receipt generation

#### Grace Period & Auto-Charge
- [ ] Track days since invoice sent
- [ ] Warning emails at 15, 25, 30 days
- [ ] Auto-charge backup payment after 30 days
- [ ] Payment failure handling
- [ ] Late fee calculation

#### Billing Dashboard
- [ ] Outstanding invoices view
- [ ] Payment history
- [ ] Revenue reporting
- [ ] Aging report (30/60/90 days)

### 2. ACH Bank Verification
- [ ] Stripe Financial Connections integration
- [ ] Bank verification page (`/ach-setup/:token`)
- [ ] Verification status webhooks
- [ ] Update payment_status on completion
- [ ] Send confirmation when verified

### 3. Contract PDF Generation
- [ ] Auto-generate PDF from signed orders
- [ ] Include all order details, signatures, terms
- [ ] Store in documents table
- [ ] Email PDF to client after signing

---

## 📊 Order Status Flow

```
                                    ┌─────────────────┐
                                    │  Upload Order   │
                                    │  (pre-signed)   │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────┐     ┌──────────────────┐     ┌──────────┐     ┌──────┐     ┌────────┐     ┌────────┐
│  Draft  │ ──► │ Pending Approval │ ──► │ Approved │ ──► │ Sent │ ──► │ Signed │ ──► │ Active │
└─────────┘     └──────────────────┘     └──────────┘     └──────┘     └────────┘     └────────┘
     │                   │                                                   │
     │                   ▼                                                   │
     │              ┌──────────┐                                             │
     │              │ Rejected │ ◄──────────────────────────────────────────┘
     │              └──────────┘     (back to draft)                  (Change/Kill Orders)
     │
     ▼
  (no price adjustments = auto-approve + auto-send)
```

### Order Types:
| Type | Description | Flow |
|------|-------------|------|
| New Order (Electronic) | Standard e-signature | Full signing flow |
| Upload Order | Pre-signed PDF | Skip to signed, collect payment |
| Change Order (Electronic) | Modify existing | E-signature for changes |
| Change Order (Upload) | Upload signed changes | Direct update |
| Kill Order (Electronic) | Cancel with e-sign | Cancellation signature |
| Kill Order (Upload) | Upload cancellation | Direct cancellation |

---

## 🗓️ Future Phases

### Phase 3: Campaign Management
- [ ] Campaign creation from signed orders
- [ ] Simpli.fi campaign sync
- [ ] Creative asset management
- [ ] Campaign performance dashboards
- [ ] Automated campaign start/end dates

### Phase 4: Reporting Enhancements
- [ ] Custom report builder
- [ ] Scheduled report delivery
- [ ] White-label client reports
- [ ] Performance analytics
- [ ] Revenue forecasting

### Phase 5: Client Portal
- [ ] Client self-service login
- [ ] View their orders/invoices
- [ ] Make payments
- [ ] Download reports
- [ ] Update contact info

---

## 🔗 Key Integration Points

| System | Status | Notes |
|--------|--------|-------|
| Postmark (Email) | ✅ Working | All email types functional |
| Supabase (DB) | ✅ Working | PostgreSQL database |
| Simpli.fi (Ads) | ✅ Working | Campaign data sync |
| Stripe (Payments) | ✅ Working | Card collection working, ACH needs verification page |
| Twilio (SMS) | 📋 Planned | Phase 3 |

---

## 🔧 Technical Debt / Improvements

- [ ] Stripe webhook handling for payment events
- [ ] Better error handling throughout
- [ ] Unit tests for critical flows
- [ ] API rate limiting
- [ ] Audit logging for compliance
- [ ] Users table sync with JWT auth

---

## 📅 Session History

### January 26, 2026 - UI Improvements & Payment Fixes
- Added Broadcast subcategories (Commercials, Show Sponsor, Host Your Own Show, Community Calendar)
- Added 4 new products (Bible Minute, Premium/Standard Radio Show Host, Sunday Morning Sermon)
- Simplified client search in Change/Kill order forms
- Fixed client signing payment flow (token-based endpoints, customer validation)
- Created fillable PDF templates for offline use

### January 25, 2026 - Order Variants & Upload Forms
- Built Upload Order form with payment collection
- Added contract term/renewal fields to Change Order forms
- Fixed inline ACH collection on ClientSigningPage
- Created client creation modal for upload forms

### January 24, 2026 - Payment Integration & Signing Redesign
- Redesigned ClientSigningPage to single-page 3-step flow
- Integrated Stripe Elements for PCI-compliant card collection
- Added billing preference options (Card/ACH/Invoice)
- Created ACH setup email flow
- Fixed email header backgrounds for Outlook

### January 23, 2026 - Order Workflow Completion
- Fixed "View Details" loading existing orders
- Added sent/signed statuses to OrderList
- Updated success page messaging

### January 21, 2026 - Approval Workflow
- Created ApprovalsPage component
- Built ClientSigningPage (original version)
- Added signature capture and verification
