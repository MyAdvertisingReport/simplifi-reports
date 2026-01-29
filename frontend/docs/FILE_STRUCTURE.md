# WSIC Advertising Platform - File Structure
## Updated: January 29, 2026 (Late Evening)

---

## 📁 Complete Project Layout

### Mono-Repo Structure
```
simplifi-reports/                    ← Git root (all commands from here)
│
├── 📁 backend/                      ← Railway deployment
│   ├── 📄 server.js                 # Main server (~5,800 lines) ⭐
│   ├── 📄 auth.js                   # Authentication routes & middleware
│   ├── 📄 database.js               # PostgreSQL helpers & caching
│   ├── 📄 simplifi-client.js        # Simpli.fi API integration
│   ├── 📄 package.json              # Dependencies
│   │
│   ├── 📁 routes/
│   │   ├── 📄 admin.js              # /api/admin/* - Products, packages
│   │   ├── 📄 order.js              # /api/orders/* - Order CRUD
│   │   ├── 📄 order-variants.js     # Upload, Change, Kill orders
│   │   ├── 📄 billing.js            # /api/billing/* - Invoices ⭐
│   │   └── 📄 email.js              # /api/email/*
│   │
│   └── 📁 services/
│       ├── 📄 email-service.js      # Universal Email Design System ⭐
│       └── 📄 stripe-service.js     # Stripe payments + Financial Connections
│
└── 📁 frontend/                     ← Vercel deployment
    ├── 📄 vercel.json               # API proxy to Railway ⭐
    ├── 📄 package.json
    │
    └── 📁 src/
        ├── 📄 App.jsx               # Main app (~17k lines) ⭐
        ├── 📄 main.jsx              # React entry point
        │
        └── 📁 components/
            ├── 📄 OrderList.jsx              # Orders page with brand bubbles ⭐
            ├── 📄 ClientSigningPage.jsx      # Public signing + Stripe Financial Connections ⭐
            ├── 📄 BillingPage.jsx            # Invoice list + Dashboard
            ├── 📄 OrderForm.jsx              # New order form
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            └── 📄 ProductManagement.jsx      # Admin product CRUD
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| **Emails** | `email-service.js` ⭐ |
| **Orders Page** | `OrderList.jsx` ⭐ |
| **Dashboards** | `App.jsx` (Dashboard component) |
| **ACH Payments** | `ClientSigningPage.jsx`, `server.js` |
| **Commissions** | `App.jsx` (CommissionsPage), `server.js` |
| **User Management** | `App.jsx` (UsersPage), `server.js` |

---

## 📧 Email Service Structure

### email-service.js Key Functions
```javascript
// Helper functions
buildBrandBubbles(items)      // Creates HTML for brand bubbles
buildCategoryBubbles(items)   // Creates HTML for category bubbles with icons
getCategoryStyle(category)    // Returns { bg, color, icon } for category

// Email functions (all follow Universal Design System)
sendOrderSubmittedInternal({ order, submittedBy })
sendApprovalRequest({ order, submittedBy, adjustments })
sendOrderApproved({ order, approvedBy })
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

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles, is_super_admin
advertising_clients   - Client companies (CRM) ⭐
contacts              - Client contacts
orders                - Advertising orders
order_items           - Line items with book_price, book_setup_fee ⭐
products              - Available products (default_rate, setup_fee)
entities              - Business entities (WSIC, LKN, LWP)
```

### Order Items Fields (for approval display)
```sql
order_items:
  id, order_id, entity_id, product_id
  product_name, product_category
  quantity, unit_price, line_total
  book_price          -- Original catalog price ⭐
  book_setup_fee      -- Original setup fee ⭐
  setup_fee           -- Adjusted setup fee
  discount_percent    -- Discount applied
```

### Commission Tables
```
commission_rates          - User-specific rates
commission_rate_defaults  - Company-wide default rates
commissions               - Individual commission records with split support
```

---

## 🌐 API Endpoints

### ACH / Financial Connections ⭐ NEW
```
POST /api/orders/sign/:token/setup-intent/ach   - Create SetupIntent for Financial Connections
POST /api/orders/sign/:token/payment-method/ach - Save verified payment method
```

### Orders
```
GET  /api/orders                      - List orders with items
GET  /api/orders/:id                  - Get order with items
POST /api/orders/:id/status           - Update status (triggers emails)
POST /api/orders/:id/send-to-client   - Send for signing
```

### Commissions
```
GET  /api/commissions                 - List commissions
GET  /api/commissions/pending         - Pending approvals
POST /api/commissions/:id/approve     - Approve commission
POST /api/commissions/:id/split       - Split commission
```

---

## 🎨 App.jsx Sections (~17,000 lines)

| Section | Approximate Lines | Purpose |
|---------|-------------------|---------|
| Imports & Constants | 1-50 | Dependencies, API_BASE |
| AuthContext | 96-212 | Auth state, View As |
| API Helper | 217-280 | api.get/post/put/delete |
| Sidebar | 598-1050 | Navigation + Change Password |
| **Dashboard** | 1050-1500 | Home page (needs role customization) |
| ClientsPage | 1763-2700 | CRM views |
| UsersPage | 11716-12751 | Team + Edit User |
| CommissionsPage | 16157-16650 | Commissions |
| TrainingCenterPage | 14573-15084 | Training |
| ToolsPage | 15085-15370 | Sales toolbox |

---

## 👥 User Roles & Dashboard Requirements

| Role | Users | Dashboard Type |
|------|-------|----------------|
| Super Admin | Justin, Mamie, Bill | Macro (all metrics) |
| Admin | Lalaine | Operational (action items) |
| Event Manager | Erin | Events (calendar, LKN events) |
| Sales Associate | 10+ reps | Personal (their clients) |
| Staff | Chelsea, CJ, Reese | Minimal |

### Dashboard Customization Points
```javascript
// In Dashboard component, check user role:
const { user } = useAuth();

if (user.email === 'bill@wsicnews.com') {
  // Show Radio/Programming dashboard
} else if (user.is_super_admin) {
  // Show Macro dashboard
} else if (user.role === 'admin') {
  // Show Operational dashboard (Lalaine)
} else if (user.role === 'event_manager') {
  // Show Events dashboard (Erin)
} else if (user.role === 'sales_associate') {
  // Show Personal CRM dashboard
}
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
STRIPE_WSIC_PUBLISHABLE_KEY=pk_live_...
STRIPE_LKN_SECRET_KEY=sk_live_...
STRIPE_LWP_SECRET_KEY=sk_live_...
```

---

## 📝 Important Notes

### Email Design System
- Subject: `[ACTION] - [CLIENT] - [BRANDS]`
- NEVER include order numbers (anti-phishing)
- Always include brand bubbles
- Always include category bubbles with icons
- See `EMAIL_DESIGN_SYSTEM.md` for full principles

### Order Items for Approval Display
When order needs approval, compare:
- `book_price` vs `unit_price` → shows discount
- `book_setup_fee` vs `setup_fee` → shows waiver

### ACH Payments
- Uses Stripe Financial Connections
- Customer verifies via online banking login
- No manual routing/account number entry
- Handles instant verification + micro-deposit fallback
