# WSIC Advertising Platform - Development Roadmap
## Updated: January 23, 2026

---

## 🎯 Current Sprint: Order Workflow Complete

### ✅ COMPLETED (This Week)

#### Order Creation & Signature Flow
- [x] Order form with client selection, products, pricing
- [x] Sales rep signature modal on submission
- [x] Price adjustment detection (book value vs custom)
- [x] Auto-approval when no price adjustments
- [x] Auto-send to client when auto-approved (if contact exists)
- [x] Success page with celebratory, sales-focused messaging
- [x] Edit existing orders (View Details works)

#### Approval Workflow
- [x] Pending approvals page for managers
- [x] Badge count in sidebar navigation
- [x] Approve/Reject with notes
- [x] Submitter name display (uses signature as fallback)

#### Client Contract Signing
- [x] Public signing page (`/sign/:token`)
- [x] Contract display with all order details
- [x] Electronic signature capture
- [x] IP address and timestamp recording
- [x] Status updates on signature

#### Orders List
- [x] Reorganized columns (Client first, order # underneath)
- [x] All statuses: draft, pending_approval, approved, sent, signed, active
- [x] Sales rep name display
- [x] Filter and sort capabilities

---

## 🔧 IMMEDIATE FIXES NEEDED

### Email Delivery
- [ ] **Postmark account approval** - Currently can only send to @myadvertisingreport.com
  - Action: Log into Postmark dashboard and complete account verification
  - Once approved, emails will send to any domain

### Database
- [ ] Users table sync - JWT users not in users table causes "submitted_by" to be NULL
  - Current workaround: Using signature as fallback for display
  - Future fix: Sync auth users to users table

---

## 📋 NEXT UP (Priority Order)

### 1. Manual "Send to Client" Button
When order is approved but wasn't auto-sent (no contact at time of approval):
- [ ] Add "Send to Client" button on order detail/edit page
- [ ] Generate signing token and send email on click
- [ ] Update status to "sent"

### 2. PDF Generation
- [ ] Generate PDF after client signs
- [ ] Include: order details, products, signatures, timestamps
- [ ] Email PDF to both client and sales rep
- [ ] Store PDF URL in order record

### 3. Order Detail View
- [ ] Read-only view of submitted orders
- [ ] Show full order history/timeline
- [ ] Display signatures and timestamps
- [ ] Action buttons based on status

### 4. Notifications
- [ ] Email to sales rep when order approved
- [ ] Email to sales rep when client signs
- [ ] Email to client confirming signature
- [ ] SMS notifications (Twilio) - future

---

## 🗓️ UPCOMING FEATURES

### Phase 2: Billing & Payments
- [ ] Stripe integration for payment processing
- [ ] Invoice generation
- [ ] Recurring billing setup
- [ ] Payment status tracking

### Phase 3: Campaign Management
- [ ] Campaign creation from signed orders
- [ ] Simpli.fi campaign sync
- [ ] Creative asset management
- [ ] Campaign performance dashboards

### Phase 4: Reporting Enhancements
- [ ] Custom report builder
- [ ] Scheduled report delivery
- [ ] White-label client reports
- [ ] Performance analytics

---

## 📊 Order Status Flow

```
┌─────────┐     ┌──────────────────┐     ┌──────────┐     ┌──────┐     ┌────────┐     ┌────────┐
│  Draft  │ ──► │ Pending Approval │ ──► │ Approved │ ──► │ Sent │ ──► │ Signed │ ──► │ Active │
└─────────┘     └──────────────────┘     └──────────┘     └──────┘     └────────┘     └────────┘
     │                   │                     │
     │                   ▼                     │
     │              ┌──────────┐               │
     │              │ Rejected │ ──────────────┘
     │              └──────────┘     (back to draft)
     │                   
     ▼
  (no price adjustments = auto-approve + auto-send if contact exists)
```

---

## 🔗 Key Integration Points

| System | Status | Notes |
|--------|--------|-------|
| Postmark (Email) | ⚠️ Pending | Account needs approval for external sends |
| Supabase (DB) | ✅ Working | PostgreSQL database |
| Simpli.fi (Ads) | ✅ Working | Campaign data sync |
| Stripe (Payments) | 🔜 Planned | Phase 2 |
| Twilio (SMS) | 🔜 Planned | Phase 2 |

---

## 📝 Recent Session Notes

### Jan 23, 2026 - Order Workflow Completion
- Fixed "View Details" loading existing orders
- Added sent/signed statuses to OrderList
- Reorganized columns (Client first)
- Updated success page messaging (celebratory, sales-focused)
- Added auto_sent and sent_to capture
- Discovered Postmark pending approval issue
- All order statuses now properly displayed

### Previous Sessions
- See `/mnt/transcripts/` for full session histories
