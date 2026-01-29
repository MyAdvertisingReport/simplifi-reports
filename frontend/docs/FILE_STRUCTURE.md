# WSIC Advertising Platform - File Structure
## Updated: January 29, 2026 (Late Night)

---

## 📁 Complete Project Layout

### Mono-Repo Structure
```
simplifi-reports/                    ← Git root (all commands from here)
│
├── 📁 backend/                      ← Railway deployment
│   ├── 📄 server.js                 # Main server (~4,600 lines) ⭐
│   ├── 📄 auth.js                   # Authentication routes & middleware
│   ├── 📄 database.js               # PostgreSQL helpers & caching
│   ├── 📄 simplifi-client.js        # Simpli.fi API integration
│   ├── 📄 report-center-service.js  # Report generation
│   ├── 📄 package.json              # Dependencies
│   │
│   ├── 📁 routes/
│   │   ├── 📄 admin.js              # /api/admin/* - Products, packages
│   │   ├── 📄 order.js              # /api/orders/* - Order CRUD
│   │   ├── 📄 order-variants.js     # Upload, Change, Kill orders
│   │   ├── 📄 billing.js            # /api/billing/* - Invoices ⭐
│   │   ├── 📄 document.js           # Document upload/download
│   │   └── 📄 email.js              # /api/email/*
│   │
│   ├── 📁 services/
│   │   ├── 📄 email-service.js      # Postmark integration ⭐
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
        ├── 📄 App.jsx               # Main app (~16k lines) ⭐
        ├── 📄 main.jsx              # React entry point
        ├── 📄 index.css
        │
        └── 📁 components/
            ├── 📄 BillingPage.jsx            # Invoice list + Dashboard
            ├── 📄 InvoiceForm.jsx            # Create/edit invoices
            ├── 📄 OrderForm.jsx              # New order form
            ├── 📄 OrderTypeSelector.jsx      # 6-type order selection
            ├── 📄 UploadOrderForm.jsx        # Upload pre-signed
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
| **Training Center** | `App.jsx` (TrainingCenterPage ~lines 14573-15084) |
| **Tools Page** | `App.jsx` (ToolsPage ~lines 15085-15370) |
| **User Profiles** | `App.jsx` (UserProfilePage ~lines 14090-14572) |
| **CRM / Clients** | `App.jsx` (~lines 1763-2700), `server.js` |
| **Billing/Invoices** | `BillingPage.jsx`, `billing.js`, `email-service.js` |
| **Orders** | `OrderForm.jsx`, `order.js`, `order-variants.js` |
| **Super Admin** | `App.jsx` (UsersPage, Sidebar), `server.js` |
| **System Diagnostics** | `App.jsx` (SystemDiagnosticsPage), `server.js` |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles
user_sessions         - Active login sessions
user_activity_log     - Security audit trail
super_admin_audit_log - Super Admin action tracking
advertising_clients   - Client companies (CRM) ⭐
contacts              - Client contacts
orders                - Advertising orders
order_items           - Line items in orders
products              - Available products
packages              - Product bundles
entities              - Business entities (WSIC, LKN, LWP)
notes                 - Client notes
documents             - Uploaded PDFs
```

### Billing Tables
```
invoices              - Invoice records
invoice_items         - Line items on invoices
invoice_payments      - Payment history
```

### Training Tables ⭐ NEW
```
training_categories   - Module categories (6 total, 4 active)
training_modules      - Individual modules (33 total, 21 active)
training_progress     - User completion tracking
user_goals            - Monthly KPI targets
user_certifications   - Certification records
```

### User Profile Tables ⭐ NEW
```
user_meeting_notes    - 1-on-1 meeting notes
```

---

## 🌐 API Endpoints

### Training ⭐ NEW
```
GET    /api/training/categories           - List active categories
GET    /api/training/modules              - List modules (?category=)
GET    /api/training/modules/:id          - Single module
GET    /api/training/my-progress          - Current user's progress
POST   /api/training/modules/:id/complete - Mark complete
```

### User Profiles ⭐ NEW
```
GET    /api/users/:id                     - User details
GET    /api/users/:id/stats               - Stats with time filter
GET    /api/users/:id/goals               - Monthly goals
POST   /api/users/:id/goals               - Set goals (admin)
GET    /api/users/:id/training-progress   - Training progress
GET    /api/users/:id/meeting-notes       - 1-on-1 notes
POST   /api/users/:id/meeting-notes       - Add note (admin)
```

### Clients
```
GET    /api/clients                       - List with stats
GET    /api/clients/:id                   - Single client
POST   /api/clients/:id/claim             - Claim open account
POST   /api/clients/:id/reassign          - Reassign to rep
```

### Super Admin
```
GET    /api/super-admin/view-as/:userId    - View As mode
POST   /api/super-admin/view-as/:userId/end - Exit View As
GET    /api/super-admin/audit-log          - Audit trail
```

### Diagnostics
```
GET    /api/diagnostics/public             - Basic status
GET    /api/diagnostics/admin              - Full health (admin)
POST   /api/diagnostics/clear-cache        - Clear cache (admin)
```

### Billing
```
GET    /api/billing/invoices              - List invoices
POST   /api/billing/invoices              - Create invoice
POST   /api/billing/invoices/:id/send     - Send invoice email
POST   /api/billing/invoices/:id/charge   - Charge payment
POST   /api/billing/generate-monthly      - Generate from orders
```

### Orders
```
GET    /api/orders                        - List orders
POST   /api/orders                        - Create order
PUT    /api/orders/:id/approve            - Approve order
PUT    /api/orders/:id/reject             - Reject order
POST   /api/orders/:id/send-to-client     - Send for signing
```

---

## 🎨 App.jsx Sections (~16,000 lines)

| Section | Approximate Lines | Purpose |
|---------|-------------------|---------|
| Imports & Constants | 1-50 | Dependencies, API_BASE |
| useResponsive Hook | 53-91 | Mobile/tablet/desktop |
| AuthContext | 96-212 | Auth state, View As |
| API Helper | 217-280 | api.get/post/put/delete |
| Sidebar | 595-960 | Navigation |
| Dashboard | 1000-1500 | Home page |
| ClientsPage | 1763-2700 | CRM views |
| ClientDetailPage | 2700-3500 | Single client |
| UsersPage | 11685-12680 | Team, Audit Log |
| SystemDiagnosticsPanel | 11186-11670 | Health component |
| SystemDiagnosticsPage | 13236-13310 | /settings/system |
| **UserProfilePage** | **14090-14572** | User profiles ⭐ |
| **TrainingCenterPage** | **14573-15084** | Training ⭐ |
| **ToolsPage** | **15085-15370** | Sales toolbox ⭐ |
| Routes | 15920-16000 | Route definitions |

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

# Simpli.fi
SIMPLIFI_APP_KEY=...
SIMPLIFI_USER_KEY=...

# Stripe (per entity)
STRIPE_WSIC_SECRET_KEY=sk_live_...
STRIPE_LKN_SECRET_KEY=sk_live_...
STRIPE_LWP_SECRET_KEY=sk_live_...
```

---

## 📝 Important Notes

### Training Center
- 4 active categories, 21 modules
- Progress stored per user
- Content in markdown format
- Sales Toolbox + Product Knowledge hidden (in Tools page)

### Tools Page
- 5 categories of resources
- Internal tools (Pricing, Billing) render in-app
- External tools open new tabs
- Links to Google Docs, Drive, Calendly

### User Profiles
- Accessible from Users page (profile icon)
- 3 tabs: Overview, KPIs, Training
- Goal setting for monthly targets
- 1-on-1 meeting notes

### Super Admin Access
- 3 Super Admins: Justin, Mamie, Bill
- System link in sidebar (SA badge)
- View As button in Users table
- Audit Log tab

### Client Status Values
- `lead` - New potential
- `prospect` - Engaged, no contract
- `active` - Has current orders
- `inactive` - Paused
- `churned` - Lost

### Current Data
- 2,812 clients total
- ~122 active, ~2,690 prospect
- 18 team members
- 3 Super Admins
