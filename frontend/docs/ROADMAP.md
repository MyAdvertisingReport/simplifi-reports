# WSIC Advertising Platform - Development Roadmap
## Updated: January 21, 2026 (Session 3)

---

## 🎯 Platform Overview

**Domain:** myadvertisingreport.com  
**Frontend:** Vercel (React + Vite)  
**Backend:** Railway (Node.js + Express)  
**Database:** PostgreSQL (Supabase)  
**Email:** Postmark (transactional) - ✅ WORKING

---

## ✅ COMPLETED FEATURES

### Core Infrastructure
- [x] Authentication system (JWT-based)
- [x] Role-based access (admin, manager, sales_associate)
- [x] PostgreSQL database with Supabase
- [x] Railway deployment with health checks
- [x] Vercel frontend with API proxy to Railway
- [x] Cloudflare DNS + SSL

### Client Management
- [x] Client list with Simpli.fi stats
- [x] Client detail page with Simpli.fi reports
- [x] Tabbed Client Hub (Reports, Orders, Overview, Notes, Documents*, Invoices*)
- [x] Client notes system
- [x] Public report URLs (`/client/:slug/report`)
- [x] Client branding (logo, colors)

### Order System
- [x] Order creation form
- [x] Product/package selection
- [x] Multi-entity support (WSIC, LKNW, LWP, Digital)
- [x] Order list with status badges
- [x] Order editing
- [x] Contract term calculations
- [x] Orders filtered by client (clientId query param)
- [x] Price adjustment tracking (book value vs adjusted)

### Product Management
- [x] Products CRUD
- [x] Packages (product bundles)
- [x] Categories with icons/colors
- [x] Entity-specific pricing

### Simpli.fi Integration
- [x] Campaign data sync
- [x] Performance reports
- [x] Geofence/keyword data
- [x] Stats caching system

### Email Service ✅ WORKING (Fixed Jan 21, 2026)
- [x] Postmark integration configured
- [x] Domain verified (myadvertisingreport.com)
- [x] DKIM + Return-Path DNS records
- [x] Email service module with defensive initialization
- [x] Email routes with proper error handling
- [x] Vercel API proxy configured
- [x] Test email sent successfully

### Order Approval Workflow ✅ NEW (Jan 21, 2026 - Session 3)
- [x] Backend approval endpoints (submit, approve, reject, send-to-client)
- [x] Auto-approval when price = book value
- [x] Pending approval queue for managers
- [x] Price adjustment detection and flagging
- [x] Sales rep signature capture on submission
- [x] Manager approval/rejection with notes/reasons
- [x] Send to client endpoint with signing token generation
- [x] ApprovalsPage component (manager UI with approve/reject actions)

### Client Signing Experience ✅ NEW (Jan 21, 2026 - Session 3)
- [x] Public signing page (`/sign/:token`)
- [x] Contract review display (items, totals, dates)
- [x] Sales rep signature display
- [x] Typed e-signature capture (legally binding)
- [x] Terms of Service agreement checkbox
- [x] Signature confirmation with IP/timestamp/user-agent
- [x] Success page with next steps
- [x] Email notifications to client and internal team

---

## 🔧 CURRENT STATUS

### Just Completed This Session (Session 3)
1. ✅ Database migration for signature fields
2. ✅ Updated order.js with approval workflow endpoints
3. ✅ Pending Approvals page (ApprovalsPage.jsx)
4. ✅ Client Signing page (ClientSigningPage.jsx)
5. ✅ Auto-approval logic (book value = auto-approve)
6. ✅ Sales rep signature on submit
7. ✅ Email integration for all status changes

### Files Created This Session
| File | Purpose |
|------|---------|
| `migrations/001_add_signature_fields.sql` | Database schema for signatures |
| `order.js` (updated) | New approval + signing endpoints |
| `ApprovalsPage.jsx` | Manager approval queue UI |
| `ClientSigningPage.jsx` | Public client signing experience |

### Integration Steps Required
To deploy these changes:

1. **Run Database Migration**
   - Execute `001_add_signature_fields.sql` in Supabase SQL Editor

2. **Update Backend**
   - Replace `routes/order.js` with new version
   - Update `server.js` to pass email service to order routes:
     ```javascript
     const orderRoutes = require('./routes/order');
     orderRoutes.initEmailService(emailService);
     ```

3. **Update Frontend**
   - Add new components to `src/components/`
   - Update `App.jsx` with new routes and sidebar item
   - Import ApprovalsPage and ClientSigningPage

4. **Update App.jsx Routes**
   ```jsx
   <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
   <Route path="/sign/:token" element={<ClientSigningPage />} />
   ```

5. **Update Sidebar**
   - Add "Approvals" link with badge count for managers

---

## 📋 Order Status Flow (Complete)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        ORDER SUBMISSION                                    │
├───────────────────────────────────────────────────────────────────────────┤
│  Sales Rep Creates Order → Signs & Submits                                │
│         │                                                                  │
│  Price at book value? ──YES──► Auto-Approved ──► Ready to Send           │
│         │                                                                  │
│         NO (price adjusted)                                                │
│         ▼                                                                  │
│  Pending Approval ──► Manager Reviews ──► Approved ──► Ready to Send     │
│                              │                                             │
│                              └──► Rejected (returns to draft)              │
├───────────────────────────────────────────────────────────────────────────┤
│  Approved ──► Send to Client (generates signing link)                     │
│         ▼                                                                  │
│  Client receives email with contract link                                  │
│         ▼                                                                  │
│  Client reviews terms & signs ──► Status: Signed                          │
│         ▼                                                                  │
│  Confirmation emails sent to client & internal team                       │
│         ▼                                                                  │
│  Campaign goes Active on start date                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 NEXT UP: Remaining Tasks

### Priority 1: Integration & Testing
1. [ ] Run database migration in Supabase
2. [ ] Deploy backend changes to Railway
3. [ ] Deploy frontend changes to Vercel
4. [ ] Test full approval flow end-to-end
5. [ ] Test client signing flow end-to-end

### Priority 2: PDF Generation
1. [ ] Generate PDF contract after signature
2. [ ] Include both signatures (sales rep + client)
3. [ ] Email PDF copy to client
4. [ ] Store PDF in documents system

### Priority 3: Order Management Enhancements
1. [ ] "Send to Client" button in order detail view
2. [ ] Resend contract email option
3. [ ] View signing status and history
4. [ ] Cancel/expire signing links

---

## 📋 FUTURE PHASES

### Phase: SMS Notifications via Twilio
**Added to roadmap:** January 21, 2026

**Overview:** Send SMS notifications to clients alongside email for contract signing requests.

**Requirements:**
- Twilio account setup
- Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Phone number field already exists in contacts table
- Opt-in tracking for SMS communications

**Implementation:**
- Create `services/sms-service.js`
- Add SMS route endpoints
- Integrate with order workflow
- Add user preference for SMS notifications

**Cost estimate:** ~$0.0079 per SMS + ~$1/month for phone number

### Phase: Stripe Payment Integration
- Collect payment info during signing
- Option for credit card or ACH
- Auto-charge on billing date
- 3.5% CC processing fee pass-through

### Phase: Documents Tab
- File upload to Supabase Storage
- Document categories (contracts, creative, IO sheets)
- Version history
- Auto-attach signed contracts

### Phase: Invoices Tab
- QuickBooks integration
- Invoice generation
- Payment tracking
- Payment history

### Phase: Newsletter System (Replace Mailchimp)
- Brevo integration for marketing emails
- Subscriber management (33k+)
- Campaign builder
- Analytics dashboard
- Multi-brand support (WSIC, LKNW, LWP)

---

## 🔑 Environment Variables

### Railway Backend
```
DATABASE_URL=************
SUPABASE_DATABASE_URL=************
JWT_SECRET=************
SIMPLIFI_APP_KEY=************
SIMPLIFI_USER_KEY=************
POSTMARK_API_KEY=************
ADMIN_EMAIL=justin@wsicnews.com
BASE_URL=https://myadvertisingreport.com

# Future: Twilio SMS
TWILIO_ACCOUNT_SID=************
TWILIO_AUTH_TOKEN=************
TWILIO_PHONE_NUMBER=+1234567890

# Future: Stripe
STRIPE_WSIC_SECRET_KEY=************
STRIPE_LKN_SECRET_KEY=************
```

### Vercel Frontend
```
# No VITE_API_URL needed - vercel.json handles API proxy
```

---

## 📁 Project File Structure

### Backend (Railway - backend/)
```
backend/
├── server.js                 # Main server, all routes registered
├── database.js               # PostgreSQL helpers, caching tables
├── simplifi-client.js        # Simpli.fi API integration
├── report-center-service.js  # Report generation
├── package.json
├── routes/
│   ├── admin.js              # Product management routes
│   ├── order.js              # Order CRUD + approval workflow ✅ UPDATED
│   └── email.js              # Email API routes
└── services/
    ├── email-service.js      # Postmark integration
    └── stripe-service.js     # Stripe payments (future)
```

### Frontend (Vercel - root/)
```
/
├── src/
│   ├── App.jsx               # Main app with all pages/components
│   └── components/
│       ├── OrderForm.jsx     # Order creation/editing
│       ├── OrderList.jsx     # Order listing
│       ├── ProductManagement.jsx
│       ├── UserManagement.jsx
│       ├── EmailTestPanel.jsx
│       ├── ApprovalsPage.jsx  # ✅ NEW - Manager approval queue
│       └── ClientSigningPage.jsx  # ✅ NEW - Public signing page
├── vercel.json               # API proxy config
├── package.json
└── vite.config.js
```

---

## 📝 Email Templates (All Working)

| Template | Trigger | Recipient |
|----------|---------|-----------|
| Order Submitted | Order submitted | Admin/Manager |
| Approval Request | Price adjustments need approval | Manager |
| Order Approved | Manager approves | Submitter |
| Order Rejected | Manager rejects | Submitter |
| Contract to Client | Send to client action | Client contact |
| Signature Confirmation | Client signs | Client |
| Contract Signed (Internal) | Client signs | Admin/Sales |
| Test Email | Manual test | Any |

---

## 📊 Client Hub Tabs Status

| Tab | Status | Description |
|-----|--------|-------------|
| Reports | ✅ Working | Simpli.fi reports (default tab) |
| Orders | ✅ Working | Order history for client |
| Overview | ✅ Working | Client details, assigned rep |
| Notes | ✅ Working | Internal notes |
| Documents | 📜 Coming Soon | Placeholder |
| Invoices | 📜 Coming Soon | Placeholder |

---

## 🔗 Important URLs

| Resource | URL |
|----------|-----|
| Production Site | https://myadvertisingreport.com |
| Railway Backend | https://simplifi-reports-production.up.railway.app |
| Railway Dashboard | https://railway.app |
| Vercel Dashboard | https://vercel.com |
| Postmark Dashboard | https://account.postmarkapp.com |
| Supabase Dashboard | https://app.supabase.com |

---

## 🎨 UI/UX Design Principles

**Important:** Maintain continuity throughout the app:

1. **Card-based layouts** with consistent shadows (`0 1px 3px rgba(0,0,0,0.1)`)
2. **12px border radius** on cards, 8px on buttons/inputs
3. **Status badges** with color coding:
   - Pending: Yellow (`#fef3c7` / `#92400e`)
   - Approved/Success: Green (`#d1fae5` / `#065f46`)
   - Rejected/Error: Red (`#fef2f2` / `#991b1b`)
   - Info: Blue (`#dbeafe` / `#1e40af`)
4. **Sidebar navigation** with expandable sections
5. **Approval badge counts** on sidebar items for managers
6. **Consistent button styles**: Primary (blue/green), Secondary (white/gray border)
7. **Form inputs**: 14px font, 12px padding, subtle borders
8. **Responsive design**: Single column on mobile, grid on desktop
