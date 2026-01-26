# WSIC Advertising Platform - Development Roadmap
## Updated: January 24, 2026

---

## 🎯 Current Sprint: Payment Integration & Order Variants

### ✅ COMPLETED (January 24, 2026)

#### Client Signing Page Redesign
- [x] Single-page 3-step flow (Review → Payment → Sign)
- [x] Step indicator with visual progress
- [x] Editable contact card in Step 1
- [x] Three billing preferences (Card, ACH, Invoice)
- [x] Invoice backup payment selection (Card or ACH)
- [x] No pre-selection on payment options
- [x] Proper amount calculations (monthly, setup fees, first month total)
- [x] CC fee display (+3.5%) when applicable

#### Stripe Payment Integration (PCI Compliant)
- [x] Stripe Elements for card collection (no raw card data on server)
- [x] SetupIntent flow for secure card tokenization
- [x] Per-entity Stripe accounts (WSIC, LKN, LWP)
- [x] Customer creation and payment method attachment
- [x] ACH placeholder with bank verification email flow

#### Email System Improvements
- [x] Contract email with brand logos in header
- [x] Confirmation email with product/pricing breakdown
- [x] ACH setup email (action required messaging)
- [x] Fixed Outlook compatibility (solid background-color fallbacks)
- [x] Warm, relational messaging (no order numbers to clients)
- [x] Conditional email based on payment method selected

#### Success Page Variants
- [x] Card payment: Green "You're All Set!" confirmation
- [x] ACH payment: Blue "Almost There!" with action required warning

### ✅ COMPLETED (Previous Sessions)

#### Order Creation & Signature Flow
- [x] Order form with client selection, products, pricing
- [x] Sales rep signature modal on submission
- [x] Price adjustment detection (book value vs custom)
- [x] Auto-approval when no price adjustments
- [x] Auto-send to client when auto-approved (if contact exists)
- [x] Success page with celebratory messaging
- [x] Edit existing orders

#### Approval Workflow
- [x] Pending approvals page for managers
- [x] Badge count in sidebar navigation
- [x] Approve/Reject with notes
- [x] Submitter name display

#### Orders List
- [x] Reorganized columns (Client first, order # underneath)
- [x] All statuses: draft, pending_approval, approved, sent, signed, active
- [x] Sales rep name display
- [x] Filter and sort capabilities

---

## 📋 NEXT UP (Priority Order)

### 1. Additional Order Form Types
Create variants of the order form for different scenarios:

#### Upload Order (Already Signed)
- [ ] New order type selector in OrderForm
- [ ] File upload field for signed PDF
- [ ] Skip signing flow - goes directly to "signed" status
- [ ] Still collects payment info
- [ ] Store PDF in order record

#### Change Order (Electronic)
- [ ] Select existing signed order to modify
- [ ] Show original vs new line items comparison
- [ ] Calculate price difference (+/- monthly)
- [ ] New signing flow for changes only
- [ ] Link to parent order
- [ ] Update campaign when signed

#### Change Order (Upload)
- [ ] Select existing order
- [ ] Upload signed change order PDF
- [ ] Same comparison view
- [ ] Skip signing flow

#### Kill Order (Electronic)
- [ ] Select existing order to cancel
- [ ] Show cancellation terms
- [ ] Effective date selection
- [ ] E-signature for cancellation
- [ ] Update order status to "cancelled"
- [ ] Trigger campaign pause/end

#### Kill Order (Upload)
- [ ] Upload signed cancellation document
- [ ] Same cancellation flow without e-sign

### 2. Billing & Invoice Management System

#### Invoice Generation
- [ ] Auto-generate invoices on billing cycle
- [ ] Support different billing frequencies (monthly, quarterly)
- [ ] Calculate amounts based on active orders
- [ ] Include setup fees on first invoice
- [ ] Apply CC processing fee when applicable

#### Invoice Approval Queue
- [ ] Admin view of pending invoices
- [ ] Edit invoice line items before sending
- [ ] Bulk approve/send functionality
- [ ] Invoice status tracking (draft → approved → sent → paid/overdue)

#### Invoice Delivery
- [ ] Send invoice email with payment link
- [ ] Stripe hosted invoice page
- [ ] Payment confirmation emails
- [ ] Receipt generation

#### Grace Period & Auto-Charge
- [ ] Track days since invoice sent
- [ ] Warning emails at 15, 25, 30 days
- [ ] Auto-charge backup payment after 30 days
- [ ] Late fee calculation (if applicable)
- [ ] Payment failure handling

#### Billing Dashboard
- [ ] Outstanding invoices view
- [ ] Payment history
- [ ] Revenue reporting
- [ ] Aging report (30/60/90 days)

### 3. ACH Bank Verification
- [ ] Stripe Financial Connections integration
- [ ] Bank verification page (`/ach-setup/:token`)
- [ ] Verification status webhooks
- [ ] Update payment_status on completion
- [ ] Send confirmation when verified

---

## 📊 Order Status Flow (Updated)

```
                                    ┌─────────────┐
                                    │   Upload    │
                                    │   Order     │
                                    └──────┬──────┘
                                           │
                                           ▼
┌─────────┐     ┌──────────────────┐     ┌──────────┐     ┌──────┐     ┌────────┐     ┌────────┐
│  Draft  │ ──► │ Pending Approval │ ──► │ Approved │ ──► │ Sent │ ──► │ Signed │ ──► │ Active │
└─────────┘     └──────────────────┘     └──────────┘     └──────┘     └────────┘     └────────┘
     │                   │                     │                            │
     │                   ▼                     │                            │
     │              ┌──────────┐               │                            │
     │              │ Rejected │ ──────────────┘                            │
     │              └──────────┘     (back to draft)                        │
     │                                                                      │
     ▼                                                                      ▼
  (no price adjustments = auto-approve + auto-send)              ┌──────────────────┐
                                                                 │  Change Order    │
                                                                 │  or Kill Order   │
                                                                 └──────────────────┘
```

### New Order Types:
- **Standard Order** - Full signing flow
- **Upload Order** - Pre-signed PDF, skip to signed
- **Change Order** - Modify existing order
- **Kill Order** - Cancel existing order

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
| Stripe (Payments) | ✅ Integrated | Card collection working, ACH pending verification flow |
| Twilio (SMS) | 📋 Planned | Phase 3 |

---

## 📝 Technical Debt / Improvements

- [ ] Users table sync with JWT auth
- [ ] PDF generation for signed contracts
- [ ] Stripe webhook handling for payment events
- [ ] Better error handling in signing flow
- [ ] Unit tests for critical flows
- [ ] API rate limiting
- [ ] Audit logging for compliance

---

## 📅 Session History

### January 24, 2026 - Payment Integration & Signing Redesign
- Redesigned ClientSigningPage to single-page 3-step flow
- Integrated Stripe Elements for PCI-compliant card collection
- Added billing preference options (Card/ACH/Invoice)
- Created ACH setup email flow
- Fixed email header backgrounds for Outlook
- Added product breakdown to confirmation emails
- Added editable contact card to signing flow

### January 23, 2026 - Order Workflow Completion
- Fixed "View Details" loading existing orders
- Added sent/signed statuses to OrderList
- Updated success page messaging
- Discovered and resolved Postmark issues

### January 21, 2026 - Approval Workflow
- Created ApprovalsPage component
- Built ClientSigningPage (original version)
- Added signature capture and verification
- Implemented email notifications
