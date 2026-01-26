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
│   │   ├── order-variants.js  ← Upload/Change/Kill order endpoints
│   │   ├── document.js        ← Document upload/download
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
            ├── OrderForm.jsx           ← New order with product selector
            ├── OrderTypeSelector.jsx   ← 6 order type selection
            ├── UploadOrderForm.jsx     ← Upload pre-signed contracts
            ├── ChangeOrderForm.jsx     ← Electronic change orders
            ├── ChangeOrderUploadForm.jsx
            ├── KillOrderForm.jsx       ← Electronic kill orders
            ├── KillOrderUploadForm.jsx
            ├── ClientSigningPage.jsx   ← 3-step signing flow
            ├── AdminDocumentsPage.jsx  ← Document management
            └── ApprovalsPage.jsx       ← Manager approval queue
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
| Payments | Stripe | ✅ Working (Card + ACH) |
| Ad Platform | Simpli.fi API | - |
| Domain | myadvertisingreport.com | Vercel |

---

## 📊 Current State (January 26, 2026)

### ✅ Working Features
- User authentication (JWT)
- Client management with contacts
- Product/package catalog with entities (WSIC, LKN, LWP)
- **6 Order Types:** New, Upload, Change (Electronic/Upload), Kill (Electronic/Upload)
- Order creation with sales rep signature
- Auto-approval (when no price adjustments)
- Auto-send to client (when auto-approved + contact exists)
- Approval workflow for price-adjusted orders
- **Client signing page - Single page 3-step flow**
- **Payment collection via Stripe Elements (PCI compliant)**
- **Three billing preferences: Card, ACH, Invoice**
- **Editable contact info during signing**
- **Conditional emails based on payment method**
- Product selector with Broadcast subcategories
- Document upload/download system
- Simpli.fi campaign reporting
- Public client report pages

### Recent Completions (January 26, 2026)
- ✅ Broadcast subcategories (Commercials, Show Sponsor, Host Your Own Show, Community Calendar)
- ✅ New products: Bible Minute, Premium/Standard Radio Show Host, Sunday Morning Sermon
- ✅ Fixed payment flow authentication issues
- ✅ Token-based payment endpoints for client signing
- ✅ Stripe customer validation (recreates if missing)
- ✅ Fillable PDF templates for offline use

---

## 📋 Order Status Flow

```
draft → pending_approval → approved → sent → signed → active
              ↓
         (rejected → draft)

Auto-flow (no price adjustments):
draft → approved → sent (automatic if contact exists)
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

## 💳 Payment Flow

### Three Billing Preferences:
1. **Credit Card (Auto Pay)** - +3.5% fee, collected via Stripe Elements
2. **ACH (Auto Pay)** - No fee, requires bank verification
3. **Invoice (Manual Pay)** - Requires backup payment method

### Payment Endpoints (No Auth - Token Based):
```
POST /api/orders/sign/:token/setup-intent      - Create SetupIntent
POST /api/orders/sign/:token/payment-method/card - Save card
POST /api/orders/sign/:token/payment-method/ach  - Create ACH
POST /api/orders/sign/:token/complete          - Submit signature
```

---

## 🗄️ Key Database Tables

```sql
-- Orders (with payment fields)
orders (
  id, order_number, client_id, status, monthly_total, contract_total,
  order_type,                -- 'new', 'upload', 'change', 'kill', etc.
  parent_order_id,           -- For change/kill orders
  billing_preference,        -- 'card', 'ach', 'invoice'
  stripe_customer_id,
  stripe_entity_code,        -- 'wsic', 'lkn', 'lwp'
  stripe_payment_method_id,
  payment_status,            -- 'authorized', 'ach_pending', 'invoice_pending'
  ...
)

-- Documents
documents (id, order_id, client_id, document_type, filename, file_path, ...)

-- Products (new additions)
products: Bible Minute, Premium Radio Show Host, Radio Show Host, Sunday Morning Sermon
```

---

## 🎯 Next Up (Priority Order)

### 1. 🔥 Billing/Invoice Management System (RECOMMENDED)
- Auto-generate invoices on billing cycle
- Invoice approval queue for admin review
- Send invoices via email with Stripe payment link
- Grace period tracking (30 days)
- Auto-charge backup payment method after grace period
- Invoice status: draft → approved → sent → paid/overdue
- Billing dashboard with aging reports

### 2. ACH Bank Verification
- Build `/ach-setup/:token` page
- Stripe Financial Connections integration
- Handle verification webhooks

### 3. Contract PDF Generation
- Auto-generate PDF from signed orders
- Include signatures, terms, all details

---

## ⚙️ Environment Variables (Railway)

```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
JWT_SECRET=...
BASE_URL=https://myadvertisingreport.com
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

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
| Change Order | `frontend/src/components/ChangeOrderForm.jsx` |
| Kill Order | `frontend/src/components/KillOrderForm.jsx` |
| Main App | `frontend/src/App.jsx` |

### Product Selector Subcategories (Broadcast):
- 🎵 Commercials - Radio spot packages, Bible Minute
- 🌟 Show Sponsor - Presenting, Supporting, Friend of Show
- 🎤 Host Your Own Show - Premium/Standard Radio Show Host, Sunday Morning Sermon
- 📅 Community Calendar - Event announcements

### Stripe Notes:
- Token-based endpoints for client signing (no auth)
- Customer validation before use (recreates if missing)
- Per-entity Stripe accounts (WSIC, LKN, LWP)
