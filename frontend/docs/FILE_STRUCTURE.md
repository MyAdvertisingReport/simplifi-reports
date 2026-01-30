# WSIC Advertising Platform - File Structure
## Updated: January 30, 2026

---

## 📁 Complete Project Layout

### Mono-Repo Structure
```
simplifi-reports/                    ← Git root (all commands from here)
│
├── 📁 backend/                      ← Railway deployment
│   ├── 📄 server.js                 # Main server (~6,300 lines) ⭐
│   ├── 📄 auth.js                   # Authentication routes & middleware
│   ├── 📄 database.js               # PostgreSQL helpers & caching
│   ├── 📄 simplifi-client.js        # Simpli.fi API integration
│   ├── 📄 package.json              # Dependencies
│   │
│   ├── 📁 routes/
│   │   ├── 📄 admin.js              # /api/admin/* - Products, packages
│   │   ├── 📄 order.js              # /api/orders/* - Order CRUD ⭐
│   │   ├── 📄 order-variants.js     # Upload, Change, Kill orders
│   │   ├── 📄 billing.js            # /api/billing/* - Invoices
│   │   └── 📄 email.js              # /api/email/*
│   │
│   └── 📁 services/
│       ├── 📄 email-service.js      # Universal Email Design System ⭐
│       └── 📄 stripe-service.js     # Stripe payments + Financial Connections
│
└── 📁 frontend/                     ← Vercel deployment
    ├── 📄 vercel.json               # API proxy to Railway
    ├── 📄 package.json
    │
    └── 📁 src/
        ├── 📄 App.jsx               # Main app (~17k lines) - Commissions here
        ├── 📄 main.jsx              # React entry point
        │
        └── 📁 components/
            ├── 📄 OrderList.jsx              # Orders page with sections view ⭐
            ├── 📄 ClientSigningPage.jsx      # Public signing + Stripe ⭐
            ├── 📄 BillingPage.jsx            # Invoice list + Dashboard
            ├── 📄 OrderForm.jsx              # New order form
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            └── 📄 ProductManagement.jsx      # Admin product CRUD
```

---

## 🔑 Key Files by Task

| Task | Files Needed |
|------|--------------|
| **Client email issue** | `email-service.js` ⭐ |
| **PDF upload errors** | `order.js`, upload endpoints |
| **Change Order + CC error** | `ClientSigningPage.jsx` ⭐ |
| **Commissions page** | `App.jsx` (search "Commission") |
| **Orders page** | `OrderList.jsx` |
| **Order backend** | `order.js` |

---

## 📋 OrderList.jsx Key Components

### View Modes
```javascript
const [viewMode, setViewMode] = useState('sections');  // 'sections' or 'table'
```

### Order Sections
```javascript
const orderSections = {
  needsApproval: { title: '⚠️ Needs Approval', color: '#f59e0b', statuses: ['pending_approval'] },
  approved: { title: '✅ Approved - Ready to Send', color: '#3b82f6', statuses: ['approved'] },
  sentToClient: { title: '📤 Sent to Client', color: '#8b5cf6', statuses: ['sent'] },
  signed: { title: '✍️ Signed', color: '#10b981', statuses: ['signed'] },
  active: { title: '🟢 Active', color: '#059669', statuses: ['active'] },
  drafts: { title: '📝 Drafts', color: '#6b7280', statuses: ['draft'] },
  other: { title: '📁 Other', color: '#9ca3af', statuses: ['cancelled', 'completed', 'expired'] }
};
```

### Order Modal Features
- Product cards with brand/category bubbles
- Book Price vs Actual Price comparison
- Order Journey timeline
- Pricing Summary with discount display

---

## 📧 Email Service Structure

### email-service.js Key Functions
```javascript
// Initialization
initEmailLogging(pool)           // Set up DB connection

// Order emails
sendOrderSubmittedInternal({ order, submittedBy })
sendApprovalRequest({ order, submittedBy, adjustments })
sendOrderApproved({ order, approvedBy, autoSent, sentTo })
sendOrderRejected({ order, rejectedBy, reason })
sendContractToClient({ order, contact, signingUrl })  // ⭐ Check this for client email issue
sendSignatureConfirmation({ order, contact, pdfUrl })
sendContractSignedInternal({ order, contact })

// Billing emails
sendInvoiceToClient({ invoice, contact })
sendPaymentReminder({ invoice, contact, reminder_type })
sendPaymentReceipt({ invoice, contact, payment })
```

---

## 🗄️ Database Tables

### Core Tables
```
users                 - User accounts, roles, is_super_admin
advertising_clients   - Client companies (CRM)
contacts              - Client contacts
orders                - Advertising orders (with journey timestamps)
order_items           - Line items (with book_price, book_setup_fee)
products              - Product catalog (default_rate, setup_fee)
entities              - Business entities (WSIC, LKN, LWP)
commissions           - Commission records
email_logs            - Email tracking
```

### Order Items Query (order.js)
```sql
SELECT 
  o.*,
  COALESCE(item_stats.items_json, parent_item_stats.items_json) as items
FROM orders o
LEFT JOIN (
  SELECT order_id, json_agg(json_build_object(
    'product_name', oi.product_name,
    'book_price', oi.book_price,
    'unit_price', oi.unit_price,
    'book_setup_fee', oi.book_setup_fee,
    'setup_fee', oi.setup_fee,
    ...
  )) as items_json
  FROM order_items oi
  GROUP BY order_id
) item_stats ON item_stats.order_id = o.id
```

### Journey Timestamp Fields (orders table)
```
created_at              - Order created
submitted_signature_date - Sales rep submitted
approved_at             - Admin approved
sent_to_client_at       - Sent for signing
client_signature_date   - Client signed
activated_at            - Contract activated (NEW)
completed_at            - Contract completed (NEW)
cancelled_at            - Contract cancelled (NEW)
```

---

## 🌐 API Endpoints

### Orders
```
GET  /api/orders                      - List orders with items
GET  /api/orders/:id                  - Get single order with items
POST /api/orders                      - Create order
PUT  /api/orders/:id                  - Update order
PUT  /api/orders/:id/status           - Update status (sets journey timestamps)
PUT  /api/orders/:id/approve          - Approve order (auto-sends if contact exists)
POST /api/orders/:id/send-to-client   - Send for signing
```

### Email
```
GET  /api/email/dashboard             - Email stats (admin only)
GET  /api/email/order/:orderId        - Emails for specific order
POST /api/email/:id/resend            - Mark for resend
POST /api/email/test                  - Send test email
```

### Commissions
```
GET  /api/commissions                 - List commissions
GET  /api/commissions/pending         - Pending approvals
PUT  /api/commissions/:id/approve     - Approve commission
```

### Users
```
GET  /api/users/sales                 - Get sales users (for filter dropdown)
```

---

## ⚙️ Environment Variables

### Railway (Backend)
```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
JWT_SECRET=...
BASE_URL=https://myadvertisingreport.com
ADMIN_EMAIL=justin@wsicnews.com

# Stripe (per entity)
STRIPE_WSIC_SECRET_KEY=sk_live_...
STRIPE_LKN_SECRET_KEY=sk_live_...
STRIPE_LWP_SECRET_KEY=sk_live_...
```

---

## 📝 Important Notes

### User Detection
- User data is in **JWT token**, NOT `localStorage.user`
- Must decode token: `JSON.parse(atob(token.split('.')[1]))`
- Returns: `{ id, email, role, name, iat, exp }`

### $0 Product Restriction
- Only Admins/Managers can add $0 products
- Sales Associates blocked with error message
- Used for barters, comp items, etc.

### Book Price Auto-Lookup
- When items added, backend looks up `products.default_rate`
- Sets `book_price` automatically
- Shows discount comparison in order modal

### Email Debugging
Check Railway logs for:
```
[Email] Attempting to send "Subject" to email@example.com
[Email] ✓ Sent successfully: abc123
[Email] ✗ Failed to send: Error message
```
