# WSIC Advertising Platform - File Structure
## Updated: January 24, 2026

---

## 📁 Complete Project Layout

### Mono-Repo Structure
```
simplifi-reports/                    ← Git root (all commands from here)
│
├── 📁 backend/                      ← Railway deployment
│   ├── 📄 server.js                 # Main server - ALL API endpoints ⭐
│   ├── 📄 database.js               # PostgreSQL helpers & caching
│   ├── 📄 simplifi-client.js        # Simpli.fi API integration
│   ├── 📄 report-center-service.js  # Report generation
│   ├── 📄 package.json              # Dependencies (includes stripe)
│   │
│   ├── 📁 routes/
│   │   ├── 📄 admin.js              # /api/admin/* - Products, packages
│   │   ├── 📄 order.js              # /api/orders/* - Order CRUD
│   │   └── 📄 email.js              # /api/email/* - Email endpoints
│   │
│   ├── 📁 services/
│   │   ├── 📄 email-service.js      # Postmark integration ⭐
│   │   └── 📄 stripe-service.js     # Stripe payments
│   │
│   └── 📁 migrations/
│       └── 📄 fix-signing-columns.sql
│
└── 📁 frontend/                     ← Vercel deployment
    ├── 📄 vercel.json               # API proxy to Railway ⭐
    ├── 📄 package.json
    ├── 📄 vite.config.js
    ├── 📄 index.html
    │
    └── 📁 src/
        ├── 📄 App.jsx               # Main app - ALL pages (~10k lines) ⭐
        ├── 📄 main.jsx              # React entry point
        ├── 📄 index.css
        │
        └── 📁 components/
            ├── 📄 OrderForm.jsx         # Order create/edit form
            ├── 📄 OrderList.jsx         # Order listing with filters
            ├── 📄 ApprovalsPage.jsx     # Manager approval queue
            ├── 📄 ClientSigningPage.jsx # Public 3-step signing ⭐ UPDATED
            ├── 📄 ProductManagement.jsx # Admin product CRUD
            ├── 📄 UserManagement.jsx    # Admin user management
            └── 📄 EmailTestPanel.jsx    # Email testing UI
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| Client signing flow | `ClientSigningPage.jsx`, `server.js` (setup-intent, complete endpoints) |
| Email templates | `email-service.js` |
| Payment processing | `server.js`, `stripe-service.js` |
| Order workflow | `server.js`, `OrderForm.jsx`, `OrderList.jsx` |
| Approval system | `server.js`, `ApprovalsPage.jsx` |
| Add new page | `App.jsx` (routes section) |
| API routing issues | `vercel.json`, `server.js` |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles
advertising_clients   - Client companies (has stripe_customer_id)
contacts              - Client contacts
orders                - Advertising orders ⭐
order_items           - Line items in orders
products              - Available products
packages              - Product bundles
product_categories    - Product categories
entities              - Business entities (WSIC, LKN, LWP)
notes                 - Client notes
```

### Order Table Key Fields
```sql
-- Identification
id, order_number, client_id, status

-- Financials
monthly_total, contract_total, term_months
contract_start_date, contract_end_date

-- Sales Rep Signature
submitted_by, submitted_signature, submitted_signature_date
submitted_ip_address, has_price_adjustments

-- Approval
approved_by, approved_at, approval_notes, rejected_reason

-- Client Signing
signing_token, signing_token_expires_at
client_signature, client_signature_date
client_signer_name, client_signer_email, client_signer_title
client_signer_ip, client_signer_user_agent

-- Payment (NEW)
billing_preference      -- 'card', 'ach', 'invoice'
stripe_entity_code      -- 'wsic', 'lkn', 'lwp'
stripe_customer_id      -- Stripe customer ID
payment_method_id       -- Stripe payment method ID
payment_type            -- 'card', 'ach'
payment_status          -- 'authorized', 'ach_pending', 'invoice_pending'

-- Tracking
auto_approved, auto_sent, sent_to, sent_to_client_at
```

---

## 🌐 API Endpoints

### Orders (Protected)
```
GET    /api/orders                      - List orders
GET    /api/orders/:id                  - Get order details
POST   /api/orders                      - Create order
PUT    /api/orders/:id                  - Update order
DELETE /api/orders/:id                  - Delete (draft only)
POST   /api/orders/:id/submit           - Submit with signature
PUT    /api/orders/:id/approve          - Manager approves
PUT    /api/orders/:id/reject           - Manager rejects
POST   /api/orders/:id/send-to-client   - Send contract link
GET    /api/orders/pending-approvals    - List pending
GET    /api/orders/pending-approvals/count - Count for badge
```

### Public Signing (No Auth)
```
GET    /api/orders/sign/:token          - Get contract for signing
POST   /api/orders/sign/:token/setup-intent - Create Stripe SetupIntent
POST   /api/orders/sign/:token/complete - Submit signature + payment
```

### Email
```
GET    /api/email/status                - Check config
POST   /api/email/test                  - Test email
```

---

## 📧 Email Functions (email-service.js)

```javascript
sendContractToClient({ order, contact })      // Contract ready to sign
sendSignatureConfirmation({ order, contact }) // Card payment confirmed
sendAchSetupEmail({ order, contact, achSetupUrl }) // ACH needs verification
sendContractSignedInternal({ order, contact })    // Internal notification
sendOrderSubmittedInternal({ order })         // Order submitted
sendApprovalRequest({ order })                // Needs approval
sendOrderApproved({ order })                  // Approved notification
sendOrderRejected({ order })                  // Rejected notification
```

---

## 🎨 ClientSigningPage.jsx Structure

```jsx
// States
currentStep (1, 2, or 3)
step1Complete, step2Complete
billingPreference ('card', 'ach', 'invoice', or null)
backupPaymentMethod ('card' or 'ach')
stripe, elements, cardElement, cardMounted
paymentMethodId, clientSecret
signerName, signerEmail, signerTitle, signerPhone
signature, agreedToTerms

// Key Functions
loadContract()           // Fetch order data
initializeStripe()       // Create SetupIntent, load Stripe
mountCardElement()       // Mount Stripe Card Element
handleConfirmProducts()  // Step 1 → Step 2
handleConfirmPayment()   // Step 2 → Step 3 (validates payment)
handleSubmitSignature()  // Final submit

// Render Sections
Loading state
Error state
Success state (Card vs ACH variants)
Main signing page:
  - Step indicator
  - Step 1: Products + Contact card
  - Step 2: Payment options + Stripe Element
  - Step 3: Signature form
```

---

## ⚙️ Environment Variables

### Railway (Backend)
```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
JWT_SECRET=...
BASE_URL=https://myadvertisingreport.com

# Stripe (per entity)
STRIPE_WSIC_SECRET_KEY=sk_live_...
STRIPE_WSIC_PUBLISHABLE_KEY=pk_live_...
STRIPE_LKN_SECRET_KEY=sk_live_...
STRIPE_LKN_PUBLISHABLE_KEY=pk_live_...
```

### Vercel (Frontend)
```
# No env vars needed - uses vercel.json proxy
```

---

## 📝 Important Notes

### vercel.json Proxy
API requests proxy to Railway:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://simplifi-reports-production.up.railway.app/api/:path*" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Public Routes (No Auth Required)
- `/sign/:token` - Client signing page
- `/client/:slug/report` - Public report
- `/ach-setup/:token` - ACH verification (TODO)

### App.jsx Sections
~10,000+ lines. Request specific sections:
- Routes: end of file
- Sidebar: ~lines 528-710
- Dashboard: ~lines 741-1050
- Client Detail: ~lines 2350-3100

### Email Template Rules
- Use `background-color:` (solid) BEFORE `background:` (gradient)
- Use `color: #XXXXXX !important` on header text
- Avoid `rgba()` - use solid hex colors
- Add explicit padding and text colors on all elements
