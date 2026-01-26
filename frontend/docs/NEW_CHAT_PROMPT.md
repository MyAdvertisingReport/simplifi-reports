# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server with all endpoints
│   ├── package.json           ← Dependencies (includes stripe)
│   ├── routes/
│   │   ├── order.js           ← Order API endpoints
│   │   ├── admin.js
│   │   └── email.js
│   └── services/
│       ├── email-service.js   ← Postmark integration
│       └── stripe-service.js  ← Stripe payment processing
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (10k+ lines)
        └── components/
            ├── OrderForm.jsx
            ├── OrderList.jsx
            ├── ApprovalsPage.jsx
            └── ClientSigningPage.jsx  ← 3-step signing flow
```

### 🚨 Git Commands MUST Use Full Paths:
```bash
# ✅ CORRECT
git add backend/server.js frontend/src/components/ClientSigningPage.jsx

# ❌ WRONG
git add server.js ClientSigningPage.jsx
```

---

## 🏗️ Tech Stack

| Layer | Technology | Hosted On |
|-------|------------|-----------|
| Frontend | React + Vite | Vercel |
| Backend | Node.js + Express | Railway |
| Database | PostgreSQL | Supabase |
| Email | Postmark | ✅ Working |
| Payments | Stripe | ✅ Integrated (PCI compliant) |
| Ad Platform | Simpli.fi API | - |
| Domain | myadvertisingreport.com | Vercel |

---

## 📊 Current State (January 24, 2026)

### Working Features
- ✅ User authentication (JWT)
- ✅ Client management with contacts
- ✅ Product/package catalog with entities (WSIC, LKN, LWP)
- ✅ Order creation with sales rep signature
- ✅ Auto-approval (when no price adjustments)
- ✅ Auto-send to client (when auto-approved + contact exists)
- ✅ Approval workflow for price-adjusted orders
- ✅ **Client signing page - Single page 3-step flow**
- ✅ **Payment collection via Stripe Elements (PCI compliant)**
- ✅ **Three billing preferences: Card, ACH, Invoice**
- ✅ **Editable contact info during signing**
- ✅ **Conditional emails based on payment method**
- ✅ Simpli.fi campaign reporting
- ✅ Public client report pages

### Recent Completions (This Session)
- ✅ Redesigned signing page from multi-step to single-page flow
- ✅ Added Stripe Elements for PCI-compliant card collection
- ✅ Invoice option with backup payment (Card or ACH)
- ✅ ACH setup email flow (sends link to complete bank verification)
- ✅ Product/pricing breakdown in confirmation emails
- ✅ Fixed email header backgrounds for Outlook compatibility
- ✅ Contact card editing in Step 1 of signing

---

## 📋 Order Status Flow

```
draft → pending_approval → approved → sent → signed → active
              ↓
         (rejected → draft)

Auto-flow (no price adjustments):
draft → approved → sent (automatic if contact exists)
```

### Status Meanings:
- **draft** - Created but not submitted
- **pending_approval** - Has price adjustments, needs manager review
- **approved** - Manager approved (or auto-approved)
- **sent** - Contract emailed to client
- **signed** - Client signed electronically
- **active** - Campaign running

---

## 💳 Payment Flow

### Three Billing Preferences:
1. **Credit Card (Auto Pay)** - +3.5% fee, collected via Stripe Elements
2. **ACH (Auto Pay)** - No fee, requires bank verification via Stripe Financial Connections
3. **Invoice (Manual Pay)** - Requires backup payment method (Card or ACH)

### Payment Status Values:
- `authorized` - Card payment method saved
- `ach_pending` - ACH selected, awaiting bank verification
- `invoice_pending` - Invoice selected, backup method saved

### Email Flow by Payment Type:
- **Card/Invoice+Card**: Sends "Welcome to the Family" confirmation immediately
- **ACH/Invoice+ACH**: Sends "Complete Your Bank Account Setup" email with action required

---

## 🗄️ Key Database Tables

```sql
-- Orders (with payment fields)
orders (
  id, order_number, client_id, status, monthly_total, contract_total,
  submitted_by, submitted_signature, approved_by, signing_token,
  billing_preference,        -- 'card', 'ach', 'invoice'
  stripe_customer_id,
  stripe_entity_code,        -- 'wsic', 'lkn', 'lwp'
  payment_method_id,
  payment_type,              -- 'card', 'ach'
  payment_status,            -- 'authorized', 'ach_pending', 'invoice_pending'
  client_signature, client_signer_name, client_signer_email, ...
)

-- Items
order_items (id, order_id, product_id, unit_price, original_price, line_total, setup_fee)

-- Clients
advertising_clients (id, business_name, slug, industry, stripe_customer_id)
contacts (id, client_id, first_name, last_name, email, phone, is_primary)

-- Products
products (id, name, category, base_price, entity_id)
entities (id, name, code, logo_url)  -- WSIC, LKN, LWP
```

---

## 🔌 Key API Endpoints

### Orders
```
GET    /api/orders                    - List orders
GET    /api/orders/:id                - Get order details
POST   /api/orders                    - Create order
PUT    /api/orders/:id                - Update order
POST   /api/orders/:id/submit         - Submit with signature
PUT    /api/orders/:id/approve        - Manager approve
PUT    /api/orders/:id/reject         - Manager reject
POST   /api/orders/:id/send-to-client - Generate signing link
GET    /api/orders/pending-approvals  - List pending
```

### Public Signing (No Auth)
```
GET    /api/orders/sign/:token           - Client views contract
POST   /api/orders/sign/:token/setup-intent - Create Stripe SetupIntent
POST   /api/orders/sign/:token/complete  - Submit signature + payment
```

---

## 🎯 Next Up (Priority Order)

### 1. Additional Order Form Types
- **Upload Order** - Sales rep uploads already-signed PDF
- **Change Order (Electronic)** - Modify existing contract with e-signature
- **Change Order (Upload)** - Modify existing with uploaded signed PDF
- **Kill Order (Electronic)** - Cancel contract with e-signature
- **Kill Order (Upload)** - Cancel with uploaded signed PDF

### 2. Billing/Invoice Management System
- Auto-generate invoices based on billing schedule
- Invoice approval queue for admin review
- Send invoices via email with payment link
- Grace period tracking (30 days)
- Auto-charge backup payment method after grace period
- Invoice status: draft → pending_approval → approved → sent → paid/overdue

### 3. ACH Bank Verification
- Implement Stripe Financial Connections page
- Complete ACH setup flow after signing

---

## ⚙️ Environment Variables (Railway)

```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
JWT_SECRET=...
BASE_URL=https://myadvertisingreport.com

# Stripe (per entity)
STRIPE_WSIC_SECRET_KEY=...
STRIPE_WSIC_PUBLISHABLE_KEY=...
STRIPE_LKN_SECRET_KEY=...
STRIPE_LKN_PUBLISHABLE_KEY=...
```

---

## 📝 Quick Reference

### Deploy Command (from repo root):
```bash
git add . && git commit -m "message" && git push origin main
```

### Common File Paths:
| What | Path |
|------|------|
| Main Server | `backend/server.js` |
| Email Service | `backend/services/email-service.js` |
| Client Signing | `frontend/src/components/ClientSigningPage.jsx` |
| Order Form | `frontend/src/components/OrderForm.jsx` |
| Orders List | `frontend/src/components/OrderList.jsx` |
| Main App | `frontend/src/App.jsx` |

### Email Template Notes:
- Use `background-color:` (solid) before `background:` (gradient) for Outlook
- Always use `color: #XXXXXX !important` on header text
- Avoid `rgba()` colors - use solid hex values
