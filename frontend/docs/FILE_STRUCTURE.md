# WSIC Advertising Platform - File Structure
## Updated: January 26, 2026

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
│   │   ├── 📄 order.js              # /api/orders/* - Order CRUD & variants
│   │   ├── 📄 order-variants.js     # Upload, Change, Kill order endpoints
│   │   ├── 📄 document.js           # Document upload/download API
│   │   └── 📄 email.js              # /api/email/* - Email endpoints
│   │
│   ├── 📁 services/
│   │   ├── 📄 email-service.js      # Postmark integration ⭐
│   │   ├── 📄 stripe-service.js     # Stripe payments
│   │   └── 📄 pdf-generator.py      # Python PDF generation
│   │
│   └── 📁 migrations/
│       ├── 📄 add-documents-and-order-types.sql
│       ├── 📄 add_broadcast_products.sql      # New products
│       └── 📄 fix_premium_show_host_price.sql # Price fix
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
            ├── 📄 OrderForm.jsx              # New order form with product selector ⭐
            ├── 📄 OrderList.jsx              # Order listing with filters
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            ├── 📄 UploadOrderForm.jsx        # Upload pre-signed contracts
            ├── 📄 ChangeOrderForm.jsx        # Electronic change orders ⭐
            ├── 📄 ChangeOrderUploadForm.jsx  # Upload signed change orders
            ├── 📄 KillOrderForm.jsx          # Electronic kill orders
            ├── 📄 KillOrderUploadForm.jsx    # Upload signed kill orders
            ├── 📄 ApprovalsPage.jsx          # Manager approval queue
            ├── 📄 ClientSigningPage.jsx      # Public 3-step signing ⭐
            ├── 📄 AdminDocumentsPage.jsx     # View all documents
            ├── 📄 ProductManagement.jsx      # Admin product CRUD
            ├── 📄 UserManagement.jsx         # Admin user management
            └── 📄 EmailTestPanel.jsx         # Email testing UI
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| Client signing flow | `ClientSigningPage.jsx`, `server.js` (setup-intent, complete, payment-method endpoints) |
| Email templates | `email-service.js` |
| Payment processing | `server.js`, `stripe-service.js` |
| New order creation | `OrderForm.jsx` (has ProductSelectorModal with subcategories) |
| Change orders | `ChangeOrderForm.jsx`, `ChangeOrderUploadForm.jsx` |
| Kill orders | `KillOrderForm.jsx`, `KillOrderUploadForm.jsx` |
| Upload orders | `UploadOrderForm.jsx` |
| Order type selection | `OrderTypeSelector.jsx` |
| Document management | `AdminDocumentsPage.jsx`, `document.js` |
| Approval workflow | `server.js`, `ApprovalsPage.jsx` |
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
documents             - Uploaded PDFs (contracts, change orders, kill orders)
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
billing_preference      -- 'card', 'ach', 'invoice', 'check'
stripe_entity_code      -- 'wsic', 'lkn', 'lwp'
stripe_customer_id      -- Stripe customer ID
stripe_payment_method_id -- Stripe payment method ID
payment_type            -- 'card', 'ach'
payment_status          -- 'authorized', 'ach_pending', 'invoice_pending'

-- Tracking
auto_approved, auto_sent, sent_to, sent_to_client_at
```

### Documents Table
```sql
documents (
  id, order_id, client_id,
  document_type,          -- 'contract', 'change_order', 'kill_order'
  filename, file_path, file_size, mime_type,
  uploaded_by, uploaded_at,
  storage_bucket          -- 'documents'
)
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

### Order Variants (Protected)
```
POST   /api/orders/upload               - Create from uploaded contract
POST   /api/orders/change               - Create electronic change order
POST   /api/orders/change-upload        - Create from uploaded change order
POST   /api/orders/kill                 - Create electronic kill order
POST   /api/orders/kill-upload          - Create from uploaded kill order
```

### Public Signing (No Auth) ⭐
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

### Email
```
GET    /api/email/status                - Check config
POST   /api/email/test                  - Test email
```

---

## 📧 Email Functions (email-service.js)

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

---

## 🎨 Product Selector Flow (OrderForm & ChangeOrderForm)

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
JWT_SECRET=...
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
- Use `background-color:` (solid) BEFORE `background:` (gradient) for Outlook
- Always use `color: #XXXXXX !important` on header text
- Avoid `rgba()` colors - use solid hex values
- Add explicit padding and text colors on all elements

### Stripe Customer Handling
- Customers are validated before use (may be stale/deleted)
- If customer not found in Stripe, a new one is created
- Token-based endpoints don't require authentication
