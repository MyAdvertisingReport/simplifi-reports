# WSIC Advertising Platform - File Structure
## Updated: January 27, 2026

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
│       ├── 📄 add_invoices_table.sql        # Invoice tables
│       ├── 📄 add-documents-and-order-types.sql
│       ├── 📄 add_broadcast_products.sql
│       └── 📄 fix_premium_show_host_price.sql
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
            ├── 📄 BillingPage.jsx            # Invoice list + Generate + Dashboard ⭐
            ├── 📄 InvoiceForm.jsx            # Create/edit invoices
            ├── 📄 OrderForm.jsx              # New order form with product selector
            ├── 📄 OrderList.jsx              # Order listing with filters
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            ├── 📄 UploadOrderForm.jsx        # Upload pre-signed contracts
            ├── 📄 ChangeOrderForm.jsx        # Electronic change orders
            ├── 📄 ChangeOrderUploadForm.jsx  # Upload signed change orders
            ├── 📄 KillOrderForm.jsx          # Electronic kill orders
            ├── 📄 KillOrderUploadForm.jsx    # Upload signed kill orders
            ├── 📄 ApprovalsPage.jsx          # Manager approval queue
            ├── 📄 ClientSigningPage.jsx      # Public 3-step signing
            ├── 📄 AdminDocumentsPage.jsx     # View all documents
            ├── 📄 ProductManagement.jsx      # Admin product CRUD
            ├── 📄 UserManagement.jsx         # Admin user management
            └── 📄 EmailTestPanel.jsx         # Email testing UI
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| **Billing/Invoices** | `BillingPage.jsx`, `InvoiceForm.jsx`, `billing.js`, `email-service.js` |
| **Auto-Generate Invoices** | `BillingPage.jsx`, `billing.js` |
| Client signing flow | `ClientSigningPage.jsx`, `server.js` |
| Email templates | `email-service.js` |
| Payment processing | `server.js`, `stripe-service.js` |
| New order creation | `OrderForm.jsx` |
| Change orders | `ChangeOrderForm.jsx`, `ChangeOrderUploadForm.jsx` |
| Kill orders | `KillOrderForm.jsx`, `KillOrderUploadForm.jsx` |
| Upload orders | `UploadOrderForm.jsx` |
| Order type selection | `OrderTypeSelector.jsx` |
| Document management | `AdminDocumentsPage.jsx`, `document.js` |
| Approval workflow | `server.js`, `ApprovalsPage.jsx` |
| Add new page | `App.jsx` (routes section) |
| API routing issues | `vercel.json`, `server.js` |
| **Security review** | `server.js`, `auth.js`, `SECURITY_AUDIT.md` |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles, failed login tracking
user_sessions         - Active login sessions
user_activity_log     - Security audit trail
advertising_clients   - Client companies (has stripe_customer_id)
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

### Invoice Table Key Fields
```sql
-- Identification
id, invoice_number, client_id, order_id, status

-- Dates
billing_period_start, billing_period_end
issue_date, due_date, sent_at, paid_at, voided_at
grace_period_ends_at  -- For auto-charge timing

-- Financials
subtotal, processing_fee, total
amount_paid, balance_due

-- Payment
billing_preference      -- 'card', 'ach', 'invoice'
payment_method_id       -- Stripe payment method
stripe_invoice_id       -- Stripe invoice ID
stripe_invoice_url      -- Stripe hosted invoice URL

-- Workflow
created_by, approved_by, approved_at
notes
```

### Order Table Key Fields
```sql
-- Identification
id, order_number, client_id, status
order_type              -- 'new', 'upload', 'change', 'change_upload', 'kill', 'kill_upload'
parent_order_id         -- For change/kill orders

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

-- Payment
billing_preference      -- 'card', 'ach', 'invoice'
stripe_entity_code      -- 'wsic', 'lkn', 'lwp'
stripe_customer_id
payment_method_id
payment_type            -- 'card', 'ach', 'us_bank_account'
payment_status          -- 'authorized', 'ach_pending', 'invoice_pending'
```

---

## 🌐 API Endpoints

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
GET    /api/billing/aging-report          - AR aging buckets

# Auto-Generate Invoices (NEW)
GET    /api/billing/billable-orders       - Preview orders ready to invoice
POST   /api/billing/generate-monthly      - Generate invoices for selected orders
```

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
```

### Order Variants (Protected)
```
POST   /api/orders/upload               - Create from uploaded contract
POST   /api/orders/change               - Create electronic change order
POST   /api/orders/change-upload        - Create from uploaded change order
POST   /api/orders/kill                 - Create electronic kill order
POST   /api/orders/kill-upload          - Create from uploaded kill order
```

### Public Signing (No Auth - Token Based)
```
GET    /api/orders/sign/:token                    - Get contract for signing
POST   /api/orders/sign/:token/setup-intent       - Create Stripe SetupIntent
POST   /api/orders/sign/:token/payment-method/card - Save card payment method
POST   /api/orders/sign/:token/payment-method/ach  - Create ACH payment method
POST   /api/orders/sign/:token/complete           - Submit signature + payment
```

### Documents (Protected)
```
GET    /api/documents                   - List all documents
GET    /api/documents/:id               - Get document details
POST   /api/documents/upload            - Upload new document
GET    /api/documents/:id/download      - Download document
```

---

## 📧 Email Functions (email-service.js)

### Order Emails
```javascript
sendContractToClient({ order, contact })          // Contract ready to sign
sendSignatureConfirmation({ order, contact })     // Card payment confirmed
sendAchSetupEmail({ order, contact, achSetupUrl })// ACH needs verification
sendContractSignedInternal({ order, contact })    // Internal notification
sendOrderSubmittedInternal({ order })             // Order submitted
sendApprovalRequest({ order })                    // Needs approval
sendOrderApproved({ order })                      // Approved notification
sendOrderRejected({ order })                      // Rejected notification
```

### Invoice Emails
```javascript
sendInvoiceToClient({ invoice, contact, items })  // Invoice with pay link
sendInvoiceReminder({ invoice, contact })         // Overdue reminder
```

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

### Due Date Logic
- **Print products:** Always due on 15th
- **Other products:** Based on contract start date
  - Started 1st-9th: Due last business day
  - Started 10th-20th: Due 15th
  - Started 21st-31st: Due last business day

### Mixed Orders
- If order has BOTH previous-month and advance products
- Bill entire order at beginning of month (advance timing)

---

## 🎨 Product Selector Flow

```
Step 1: Select Brand
├── 📻 WSIC Radio
├── 📰 Lake Norman Woman
└── 🌟 LiveWorkPlay LKN

Step 2: Select Category (Medium)
├── 📻 Broadcast (has subcategories)
├── 🎙️ Podcast
├── 📅 Events
├── 🌐 Web & Social
├── 💻 Programmatic Digital
└── 📰 Print

Step 3: Select Subcategory (Broadcast only)
├── 🎵 Commercials - Radio spot packages
├── 🌟 Show Sponsor - Title & supporting sponsorships
├── 🎤 Host Your Own Show - Radio show hosting
└── 📅 Community Calendar - Event announcements

Step 4: Select Product
└── [List of products with pricing]
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
STRIPE_WSIC_PUBLISHABLE_KEY=pk_live_...
STRIPE_LKN_SECRET_KEY=sk_live_...
STRIPE_LKN_PUBLISHABLE_KEY=pk_live_...
STRIPE_LWP_SECRET_KEY=sk_live_...
STRIPE_LWP_PUBLISHABLE_KEY=pk_live_...
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
- Sidebar: ~lines 528-760 (includes Billing section)
- Dashboard: ~lines 800-1100
- Client Detail: ~lines 2400-3200

### Invoice Number Format
- Pattern: `INV-YYYY-NNNNN`
- Example: `INV-2026-01003`
- Auto-increments within each year

### Order Status for Billing
- `signed` status = Active and billable
- Orders with status 'signed' appear in Generate Invoices

### Email Template Rules
- Use `background-color:` (solid) BEFORE `background:` (gradient) for Outlook
- Always use `color: #XXXXXX !important` on header text
- Avoid `rgba()` colors - use solid hex values
- Add explicit padding and text colors on all elements

### Stripe Customer Handling
- Customers are validated before use (may be stale/deleted)
- If customer not found in Stripe, a new one is created
- Token-based endpoints don't require authentication
- Payment method last 4 digits fetched from Stripe API
