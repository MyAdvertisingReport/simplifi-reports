# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server with all endpoints
│   ├── auth.js                ← Authentication & session management
│   ├── package.json           ← Dependencies (includes stripe)
│   ├── routes/
│   │   ├── order.js           ← Order API endpoints
│   │   ├── order-variants.js  ← Upload/Change/Kill order endpoints
│   │   ├── billing.js         ← Invoice management + Auto-generate ⭐
│   │   ├── document.js        ← Document upload/download
│   │   ├── admin.js
│   │   └── email.js
│   └── services/
│       ├── email-service.js   ← Postmark (includes invoice emails)
│       └── stripe-service.js  ← Stripe payment processing
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (10k+ lines)
        └── components/
            ├── BillingPage.jsx         ← Invoice list + Generate Modal + Dashboard ⭐
            ├── InvoiceForm.jsx         ← Create/edit invoices
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
git add backend/routes/billing.js frontend/src/components/BillingPage.jsx

# ❌ WRONG
git add billing.js BillingPage.jsx
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

## 📊 Current State (January 27, 2026)

### ✅ Working Features
- User authentication (JWT + session-based)
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
- Product selector with Broadcast subcategories
- Document upload/download system
- Simpli.fi campaign reporting
- Public client report pages

### ✅ Billing System (Complete)
- **Invoice Management:** Create, edit, approve, send, void
- **Invoice Emails:** Professional template with brand logos, pay button
- **BillingPage:** Expandable rows, client contact, payment method with last 4
- **Financial Dashboard:** Key metrics, AR aging, top clients, status breakdown
- **Payment Recording:** Manual payments, charge card on file
- **Overdue Reminders:** Send reminder emails
- **Auto-Generate Invoices:** Generate from signed orders with category-based billing ⭐

### ✅ Security Features (Updated January 27, 2026)
- bcrypt password hashing (10 salt rounds)
- Account lockout after 5 failed attempts
- Session management with expiration
- Role-based access control (admin, sales_manager, sales_associate)
- Parameterized SQL queries (injection prevention)
- Activity logging for security events
- **Helmet security headers** ✅ NEW
- **Rate limiting on login** (10 attempts/15 min) ✅ NEW
- **JWT validation** (fails in production without secret) ✅ NEW
- **Protected diagnostic endpoints** ✅ NEW

---

## 💰 Invoice Status Flow

```
draft → approved → sent → paid
              ↓
           (void)

Auto-flow for auto-bill clients:
approved → sent → (Stripe charges automatically) → paid
```

### Auto-Generate Invoices Feature:
- **"Generate Invoices" button** in Billing header
- Preview billable orders with billing period & due date
- Select which orders to invoice
- Creates draft invoices with line items
- Skips already-invoiced orders

### Billing Rules by Product Category:
| Category | Billing Period | Due Date |
|----------|---------------|----------|
| Broadcast/Podcast | Previous month | Based on contract start |
| Print | Following month's issue | 15th of billing month |
| Programmatic/Events/Web | Current month (advance) | Based on contract start |

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

### Billing Tables
```sql
invoices (
  id, invoice_number, client_id, order_id, status,
  billing_period_start, billing_period_end,
  issue_date, due_date, subtotal, processing_fee, total,
  amount_paid, balance_due, billing_preference,
  stripe_invoice_id, stripe_invoice_url, payment_method_id,
  notes, created_by, approved_by, sent_at, paid_at, voided_at,
  grace_period_ends_at
)

invoice_items (id, invoice_id, product_id, description, quantity, unit_price, amount)

invoice_payments (id, invoice_id, amount, payment_method, reference, recorded_by)
```

### Order Table (Key Fields)
```sql
orders (
  id, order_number, client_id, status, monthly_total, contract_total,
  order_type,                -- 'new', 'upload', 'change', 'kill', etc.
  parent_order_id,           -- For change/kill orders
  billing_preference,        -- 'card', 'ach', 'invoice'
  stripe_customer_id,
  stripe_entity_code,        -- 'wsic', 'lkn', 'lwp'
  payment_method_id,
  payment_type,              -- 'card', 'ach', 'us_bank_account'
  payment_status,            -- 'authorized', 'ach_pending', 'invoice_pending'
  sales_associate_id         -- UUID → users table
)
```

### Product Categories Table
```sql
product_categories (
  id, name, code,            -- code: 'broadcast', 'podcast', 'print', 'programmatic', 'events', 'web_social'
  description
)
```

---

## 🎯 Next Up (Priority Order)

### 1. 🔥 Client Profile Enhancement (NEXT SESSION)
- Enhanced client model with status (Lead → Prospect → Active → Churned)
- Client detail page with order history, invoice history
- Activity timeline
- Contact management improvements
- Dashboard updates with client metrics

### 2. Stripe Webhooks for Payment Status
- `POST /api/webhooks/stripe` endpoint
- Handle `invoice.paid`, `payment_intent.succeeded`
- Auto-mark invoices as paid
- Send payment confirmation email

### 3. Overdue Invoice Notifications
- Automated emails at 7, 14, 21, 28 days
- Final notice at Day 28 with auto-charge warning
- Day 30: Auto-charge backup payment method

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

## ⚙️ Environment Variables (Railway)

```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
JWT_SECRET=...                    # ⚠️ CRITICAL - Must be set
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
| Auth Routes | `backend/auth.js` |
| Billing Routes | `backend/routes/billing.js` |
| Email Service | `backend/services/email-service.js` |
| BillingPage | `frontend/src/components/BillingPage.jsx` |
| InvoiceForm | `frontend/src/components/InvoiceForm.jsx` |
| Client Signing | `frontend/src/components/ClientSigningPage.jsx` |
| Order Form | `frontend/src/components/OrderForm.jsx` |
| Main App | `frontend/src/App.jsx` |

### Invoice Number Format:
- Pattern: `INV-YYYY-NNNNN`
- Example: `INV-2026-01003`

### Order Status for Billing:
- `signed` = Active and billable
- Use status filter in Generate Invoices modal

### Billing API Endpoints:
```
GET    /api/billing/invoices              - List with filters
GET    /api/billing/invoices/:id          - Full details
POST   /api/billing/invoices              - Create
PUT    /api/billing/invoices/:id          - Update draft
PUT    /api/billing/invoices/:id/approve  - Approve
POST   /api/billing/invoices/:id/send     - Send email
POST   /api/billing/invoices/:id/record-payment
POST   /api/billing/invoices/:id/charge   - Charge on file
PUT    /api/billing/invoices/:id/void
POST   /api/billing/invoices/:id/send-reminder
GET    /api/billing/stats
GET    /api/billing/billable-orders       - Preview for generation
POST   /api/billing/generate-monthly      - Batch create invoices
```

### Stripe Notes:
- Token-based endpoints for client signing (no auth)
- Customer validation before use (recreates if missing)
- Per-entity Stripe accounts (WSIC, LKN, LWP)
- Payment method last 4 fetched from Stripe API on invoice detail

---

## 🔒 Security Documentation
See `SECURITY_AUDIT.md` for:
- Current security posture **(8.5/10)** ✅
- ~~High/Medium priority fixes~~ High priority complete!
- Remaining improvements checklist
- Incident response procedures
