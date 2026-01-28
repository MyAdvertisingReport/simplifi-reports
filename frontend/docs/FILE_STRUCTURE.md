# WSIC Advertising Platform - File Structure
## Updated: January 28, 2026

---

## 📁 Complete Project Layout

### Mono-Repo Structure
```
simplifi-reports/                    ← Git root (all commands from here)
│
├── 📁 backend/                      ← Railway deployment
│   ├── 📄 server.js                 # Main server - ALL API endpoints ⭐
│   ├── 📄 auth.js                   # Authentication routes & middleware
│   ├── 📄 database.js               # PostgreSQL helpers & caching
│   ├── 📄 simplifi-client.js        # Simpli.fi API integration
│   ├── 📄 report-center-service.js  # Report generation
│   ├── 📄 package.json              # Dependencies (includes stripe)
│   │
│   ├── 📁 routes/
│   │   ├── 📄 admin.js              # /api/admin/* - Products, packages
│   │   ├── 📄 order.js              # /api/orders/* - Order CRUD & variants
│   │   ├── 📄 order-variants.js     # Upload, Change, Kill order endpoints
│   │   ├── 📄 billing.js            # /api/billing/* - Invoice management ⭐
│   │   ├── 📄 document.js           # Document upload/download API
│   │   └── 📄 email.js              # /api/email/* - Email endpoints
│   │
│   ├── 📁 services/
│   │   ├── 📄 email-service.js      # Postmark integration (includes invoice emails) ⭐
│   │   ├── 📄 stripe-service.js     # Stripe payments
│   │   └── 📄 pdf-generator.py      # Python PDF generation
│   │
│   └── 📁 migrations/
│       └── 📄 *.sql                 # Database migrations
│
└── 📁 frontend/                     ← Vercel deployment
    ├── 📄 vercel.json               # API proxy to Railway ⭐
    ├── 📄 package.json
    ├── 📄 vite.config.js
    ├── 📄 index.html
    │
    └── 📁 src/
        ├── 📄 App.jsx               # Main app - ALL pages (~12k lines) ⭐
        ├── 📄 main.jsx              # React entry point
        ├── 📄 index.css
        │
        └── 📁 components/
            ├── 📄 BillingPage.jsx            # Invoice list + Generate + Dashboard ⭐
            ├── 📄 InvoiceForm.jsx            # Create/edit invoices
            ├── 📄 OrderForm.jsx              # New order form with product selector
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            ├── 📄 UploadOrderForm.jsx        # Upload pre-signed contracts
            ├── 📄 ChangeOrderForm.jsx        # Electronic change orders
            ├── 📄 KillOrderForm.jsx          # Electronic kill orders
            ├── 📄 ApprovalsPage.jsx          # Manager approval queue
            ├── 📄 ClientSigningPage.jsx      # Public 3-step signing
            ├── 📄 AdminDocumentsPage.jsx     # View all documents
            ├── 📄 ProductManagement.jsx      # Admin product CRUD
            └── 📄 UserManagement.jsx         # Admin user management
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| **CRM / Clients Page** | `App.jsx` (~lines 1763-2700), `server.js` (/api/clients) |
| **Billing/Invoices** | `BillingPage.jsx`, `InvoiceForm.jsx`, `billing.js`, `email-service.js` |
| **Auto-Generate Invoices** | `BillingPage.jsx`, `billing.js` |
| Client signing flow | `ClientSigningPage.jsx`, `server.js` |
| Email templates | `email-service.js` |
| Payment processing | `server.js`, `stripe-service.js` |
| Order creation | `OrderForm.jsx`, `UploadOrderForm.jsx` |
| Change/Kill orders | `ChangeOrderForm.jsx`, `KillOrderForm.jsx` |
| Approval workflow | `server.js`, `ApprovalsPage.jsx` |
| **Security review** | `server.js`, `auth.js`, `SECURITY_AUDIT.md` |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles, failed login tracking
user_sessions         - Active login sessions
user_activity_log     - Security audit trail
advertising_clients   - Client companies (CRM data) ⭐
contacts              - Client contacts (primary contact for invoices)
orders                - Advertising orders
order_items           - Line items in orders
products              - Available products
packages              - Product bundles
product_categories    - Product categories (code field for billing logic)
entities              - Business entities (WSIC, LKN, LWP)
notes                 - Client notes
documents             - Uploaded PDFs
```

### Billing Tables
```
invoices              - Invoice records with full lifecycle
invoice_items         - Line items on invoices
invoice_payments      - Payment history for invoices
```

### advertising_clients Table (CRM) ⭐
```sql
-- Identification
id                    -- UUID primary key
business_name         -- Company name (display name)
slug                  -- URL-friendly identifier (unique)

-- CRM Fields
status                -- 'lead', 'prospect', 'active', 'inactive', 'churned'
tier                  -- 'bronze', 'silver', 'gold', 'platinum'
industry              -- Industry/vertical
tags                  -- Array: ['WSIC', 'LKNW', 'Print', 'Commercials', 'Trade/Barter']
source                -- 'WSIC Radio', 'Lake Norman Woman', 'Multi-Platform'

-- Financial
billing_terms         -- 'net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'
annual_contract_value -- Calculated yearly value
client_since          -- Date became client

-- Contact Info
phone, address_line1, address_line2, city, state, zip, website
primary_contact_id    -- FK to contacts table

-- Integrations
simpli_fi_client_id   -- Simpli.fi organization ID (for programmatic clients)
qbo_customer_id_wsic  -- QuickBooks customer ID (WSIC entity)
qbo_customer_id_lkn   -- QuickBooks customer ID (LKN entity)
stripe_customer_id    -- Stripe customer ID

-- Assignment
assigned_to           -- FK to users table (sales rep)
created_by            -- FK to users table

-- Timestamps
created_at, updated_at, last_activity_at
notes                 -- General notes field
```

---

## 🌐 API Endpoints

### Clients (Protected) ⭐ OPTIMIZED
```
GET    /api/clients                   - List all clients WITH order/invoice stats
                                        Returns: total_orders, active_orders, total_revenue,
                                                 total_invoices, open_invoices, open_balance
                                        (Single query via JOINs - no individual calls needed)
GET    /api/clients/:id               - Get single client details
POST   /api/clients                   - Create client
PUT    /api/clients/:id               - Update client
DELETE /api/clients/:id               - Delete client (admin only)
```

### Billing (Protected)
```
GET    /api/billing/invoices              - List invoices with filters
GET    /api/billing/invoices/:id          - Get invoice with items, contact, payment info
POST   /api/billing/invoices              - Create invoice
PUT    /api/billing/invoices/:id          - Update draft invoice
PUT    /api/billing/invoices/:id/approve  - Approve invoice
POST   /api/billing/invoices/:id/send     - Send invoice email
POST   /api/billing/invoices/:id/record-payment - Record manual payment
POST   /api/billing/invoices/:id/charge   - Charge payment method on file
PUT    /api/billing/invoices/:id/void     - Void invoice
POST   /api/billing/invoices/:id/send-reminder - Send overdue reminder
GET    /api/billing/stats                 - Dashboard statistics
GET    /api/billing/billable-orders       - Preview orders ready to invoice
POST   /api/billing/generate-monthly      - Generate invoices for selected orders
```

### Orders (Protected)
```
GET    /api/orders                      - List orders (supports ?clientId filter)
GET    /api/orders/:id                  - Get order details
POST   /api/orders                      - Create order
PUT    /api/orders/:id                  - Update order
DELETE /api/orders/:id                  - Delete (draft only)
POST   /api/orders/:id/submit           - Submit with signature
PUT    /api/orders/:id/approve          - Manager approves
PUT    /api/orders/:id/reject           - Manager rejects
POST   /api/orders/:id/send-to-client   - Send contract link
```

### Public Signing (No Auth - Token Based)
```
GET    /api/orders/sign/:token                    - Get contract for signing
POST   /api/orders/sign/:token/setup-intent       - Create Stripe SetupIntent
POST   /api/orders/sign/:token/payment-method/card - Save card
POST   /api/orders/sign/:token/payment-method/ach  - Create ACH
POST   /api/orders/sign/:token/complete           - Submit signature
```

---

## 🎨 Clients Page - Dual Views ⭐

### CRM View (Sales Pipeline)
- Shows ALL clients (270 total)
- Filters: Status dropdown, Tier dropdown, Search
- Columns: Client, Status, Tier, Industry, Total Revenue, Active Orders, Open Balance, Last Activity
- Sticky header for scrolling

### Client View (Operations)
- Shows only ACTIVE clients (97 currently)
- Filters: Brand dropdown (All/WSIC/LKNW/Multi-Platform)
- Columns: Client, Brand, Products, Revenue, Orders, Balance
- Brand badges: 📻 WSIC (blue), 📰 LKNW (pink)
- Sticky header for scrolling

### Performance Note 🔥
- `/api/clients` returns all stats in ONE query via SQL JOINs
- Eliminates need for 500+ individual API calls
- Page loads in <1 second

---

## 💰 Billing Logic

### Product Category Billing Rules
```
Category Code        | Billing Type
---------------------|------------------
broadcast, podcast   | Previous month (services rendered)
print                | 15th of month BEFORE issue month
programmatic, events,| Following month (advance billing)
web_social           |
```

---

## ⚙️ Environment Variables

### Railway (Backend)
```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
JWT_SECRET=...                    # ⚠️ MUST be set in production
BASE_URL=https://myadvertisingreport.com
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

# Stripe (per entity)
STRIPE_WSIC_SECRET_KEY=sk_live_...
STRIPE_LKN_SECRET_KEY=sk_live_...
STRIPE_LWP_SECRET_KEY=sk_live_...
```

---

## 📝 Important Notes

### App.jsx Sections (~12,000 lines)
- Routes: end of file
- Sidebar: ~lines 528-760
- Dashboard: ~lines 800-1100
- **ClientsPage: ~lines 1763-2700** ⭐
- Client Detail: ~lines 2700-3500

### Client Status Values
- `lead` - New potential client
- `prospect` - Engaged, no contract yet
- `active` - Has current contract/orders
- `inactive` - Paused or dormant
- `churned` - Lost/cancelled

### Brand Tags
- `WSIC` - WSIC Radio client
- `LKNW` - Lake Norman Woman client
- Both = Multi-Platform client

### Client Data (270 total)
- 95 Active, 175 Prospect
- 77 WSIC, 157 LKNW, 32 Multi-Platform
- 28 Trade/Barter clients
