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
        ├── 📄 App.jsx               # Main app (~17k lines)
        ├── 📄 main.jsx              # React entry point
        │
        └── 📁 components/
            ├── 📄 OrderList.jsx              # Orders page - NEEDS SECTIONS VIEW ⭐
            ├── 📄 ClientSigningPage.jsx      # Public signing + Stripe Financial Connections
            ├── 📄 BillingPage.jsx            # Invoice list + Dashboard
            ├── 📄 OrderForm.jsx              # New order form
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            └── 📄 ProductManagement.jsx      # Admin product CRUD
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| **Orders Page Sections** | `OrderList.jsx` ⭐ |
| **Orders Backend** | `order.js` ⭐ |
| **Emails** | `email-service.js` |
| **Dashboards** | `App.jsx` (Dashboard component) |
| **Server/API** | `server.js` |

---

## 📋 OrderList.jsx Key Components

### State Variables
```javascript
const [viewMode, setViewMode] = useState('sections');  // 'sections' or 'table'
const [salesRepFilter, setSalesRepFilter] = useState('');
const [salesUsers, setSalesUsers] = useState([]);
```

### User Detection (JWT Token)
```javascript
const getUserFromStorage = () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;  // { id, email, role, name, iat, exp }
    } catch (e) {}
  }
  return {};
};
```

### Admin Check
```javascript
const isAdmin = 
  currentUser.is_super_admin === true || 
  currentUser.role === 'admin' || 
  currentUser.role === 'manager' ||
  currentUser.email === 'justin@wsicnews.com' || 
  currentUser.email === 'mamie@wsicnews.com';
```

### Order Sections Computed
```javascript
const orderSections = useMemo(() => {
  const sections = {
    needsApproval: { title: '⚠️ Needs Approval', orders: [], color: '#f59e0b', bgColor: '#fef3c7' },
    approved: { title: '✅ Approved - Ready to Send', orders: [], color: '#3b82f6', bgColor: '#dbeafe' },
    sentToClient: { title: '📤 Sent to Client', orders: [], color: '#8b5cf6', bgColor: '#f3e8ff' },
    signed: { title: '✍️ Signed', orders: [], color: '#10b981', bgColor: '#d1fae5' },
    active: { title: '🟢 Active', orders: [], color: '#059669', bgColor: '#dcfce7' },
    drafts: { title: '📝 Drafts', orders: [], color: '#6b7280', bgColor: '#f3f4f6' },
    other: { title: '📁 Other', orders: [], color: '#9ca3af', bgColor: '#f9fafb' }
  };
  // ... grouping logic
  return sections;
}, [filteredOrders]);
```

---

## 📧 Email Service Structure

### email-service.js Key Functions
```javascript
// Initialization (called from server.js)
initEmailLogging(pool)           // Set up DB connection for logging

// Logging (internal)
logEmailToDatabase(...)          // Log all email attempts

// Email functions
sendOrderSubmittedInternal({ order, submittedBy })
sendApprovalRequest({ order, submittedBy, adjustments })
sendOrderApproved({ order, approvedBy, autoSent, sentTo })
sendOrderRejected({ order, rejectedBy, reason })
sendContractToClient({ order, contact, signingUrl })
sendSignatureConfirmation({ order, contact, pdfUrl })
sendContractSignedInternal({ order, contact })
sendInvoiceToClient({ invoice, contact })
sendPaymentReminder({ invoice, contact, reminder_type })
sendPaymentReceipt({ invoice, contact, payment })
```

### Category Configuration
```javascript
const categoryConfig = {
  'Print':       { bg: '#dbeafe', color: '#1e40af', icon: '📰' },
  'Broadcast':   { bg: '#fce7f3', color: '#9d174d', icon: '📻' },
  'Podcast':     { bg: '#f3e8ff', color: '#7c3aed', icon: '🎙️' },
  'Digital':     { bg: '#dcfce7', color: '#166534', icon: '💻' },
  'Events':      { bg: '#fef3c7', color: '#92400e', icon: '🎪' },
  'Web':         { bg: '#e0e7ff', color: '#3730a3', icon: '🌐' },
  'Social':      { bg: '#ffe4e6', color: '#be123c', icon: '📱' },
};
```

---

## 🗄️ Database Tables

### Core Tables
```
users                 - User accounts, roles, is_super_admin
advertising_clients   - Client companies (CRM)
contacts              - Client contacts
orders                - Advertising orders
order_items           - Line items with book_price, book_setup_fee
products              - Available products
entities              - Business entities (WSIC, LKN, LWP)
email_logs            - Email tracking with email_type, order_id ⭐ NEW
```

### Order Items Query (order.js)
```sql
SELECT 
  o.*,
  COALESCE(item_stats.items_json, parent_item_stats.items_json) as items
FROM orders o
LEFT JOIN (
  -- Order's own items
  SELECT order_id, json_agg(...) as items_json
  FROM order_items oi
  GROUP BY order_id
) item_stats ON item_stats.order_id = o.id
LEFT JOIN (
  -- Parent order's items (for kill/change orders)
  SELECT order_id, json_agg(...) as items_json
  FROM order_items oi
  GROUP BY order_id
) parent_item_stats ON parent_item_stats.order_id = o.parent_order_id
```

---

## 🌐 API Endpoints

### Orders
```
GET  /api/orders                      - List orders with items
GET  /api/orders/:id                  - Get order with items
POST /api/orders/:id/status           - Update status
PUT  /api/orders/:id/approve          - Approve order (auto-sends if contact exists)
POST /api/orders/:id/send-to-client   - Send for signing
```

### Email (NEW)
```
GET  /api/email/dashboard             - Email stats (admin only)
GET  /api/email/order/:orderId        - Emails for specific order
POST /api/email/:id/resend            - Mark for resend (admin only)
POST /api/email/test                  - Send test email (admin only)
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

### Orders with No Products
- Some orders show "0 products" because they were created without items
- Kill/Change orders now fetch parent order's items
- This is a **data issue**, not a code bug

### Email Logging
- All emails are logged to `email_logs` table
- Check Railway logs for `[Email]` messages
- Use `/api/email/dashboard` to view stats
