# WSIC Advertising Platform - File Structure
## Updated: January 29, 2026 (Evening)

---

## 📁 Complete Project Layout

### Mono-Repo Structure
```
simplifi-reports/                    ← Git root (all commands from here)
│
├── 📁 backend/                      ← Railway deployment
│   ├── 📄 server.js                 # Main server (~5,700 lines) ⭐
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
        ├── 📄 App.jsx               # Main app (~17k lines) ⭐
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
| **Commissions** | `App.jsx` (CommissionsPage), `server.js` |
| **User Management** | `App.jsx` (UsersPage), `server.js` |
| **Orders** | `OrderForm.jsx`, `order.js`, `order-variants.js` |
| **Billing/Invoices** | `BillingPage.jsx`, `billing.js` |
| **Training** | `App.jsx` (TrainingCenterPage), `server.js` |
| **Tools** | `App.jsx` (ToolsPage) |
| **CRM / Clients** | `App.jsx` (~lines 1763-2700), `server.js` |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles
user_sessions         - Active login sessions
advertising_clients   - Client companies (CRM) ⭐
contacts              - Client contacts
orders                - Advertising orders
order_items           - Line items in orders
products              - Available products
entities              - Business entities (WSIC, LKN, LWP)
```

### Commission Tables ⭐ NEW
```
commission_rates          - User-specific rates
commission_rate_defaults  - Company-wide default rates
commissions               - Individual commission records
  - is_split, split_with_user_id, split_percentage
  - parent_commission_id, split_reason
```

### Billing Tables
```
invoices              - Invoice records
invoice_items         - Line items on invoices
invoice_payments      - Payment history
```

### Training Tables
```
training_categories   - Module categories
training_modules      - Individual modules
training_progress     - User completion tracking
user_goals            - Monthly KPI targets
user_meeting_notes    - 1-on-1 meeting notes
```

### Audit Tables
```
user_activity_log         - Security audit trail
super_admin_audit_log     - Super Admin action tracking
```

---

## 🌐 API Endpoints

### Commissions ⭐ NEW
```
GET    /api/commissions                  - List commissions
GET    /api/commissions/summary          - YTD summary  
GET    /api/commissions/pending          - Pending approvals
GET    /api/commissions/rates            - Rate config
POST   /api/commissions/rates            - Add/update rate
POST   /api/commissions/:id/approve      - Approve
POST   /api/commissions/:id/split        - Split commission
POST   /api/commissions/:id/paid         - Mark paid
PUT    /api/commissions/:id              - Update
DELETE /api/commissions/:id              - Cancel
```

### Users
```
GET    /api/users                        - List users
GET    /api/users/:id                    - Get user
PUT    /api/users/:id                    - Update user (admin)
PUT    /api/auth/change-password         - Change own password
POST   /api/auth/login                   - Login
```

### Clients
```
GET    /api/clients                      - List with stats
GET    /api/clients/:id                  - Single client
POST   /api/clients/:id/claim            - Claim open account
POST   /api/clients/:id/reassign         - Reassign to rep
```

### Orders
```
GET    /api/orders                       - List orders
POST   /api/orders                       - Create order
PUT    /api/orders/:id/approve           - Approve order
POST   /api/orders/:id/send-to-client    - Send for signing
```

### Training
```
GET    /api/training/categories          - List categories
GET    /api/training/modules             - List modules
POST   /api/training/modules/:id/complete - Mark complete
```

---

## 🎨 App.jsx Sections (~17,000 lines)

| Section | Approximate Lines | Purpose |
|---------|-------------------|---------|
| Imports & Constants | 1-50 | Dependencies, API_BASE |
| useResponsive Hook | 53-91 | Mobile/tablet/desktop |
| AuthContext | 96-212 | Auth state, View As |
| API Helper | 217-280 | api.get/post/put/delete |
| Sidebar | 598-1050 | Navigation + Change Password |
| Dashboard | 1050-1500 | Home page |
| ClientsPage | 1763-2700 | CRM views |
| UsersPage | 11716-12751 | Team + Edit User |
| **CommissionsPage** | **16157-16650** | Commissions ⭐ |
| TrainingCenterPage | 14573-15084 | Training |
| ToolsPage | 15085-15370 | Sales toolbox |
| Routes | 17150-17200 | Route definitions |

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

### Authentication
- Uses bcrypt for password hashing (10 rounds)
- JWT tokens with 24h expiry
- Direct SQL queries (not dbHelper) for auth endpoints
- `trust proxy` enabled for Railway rate limiting

### User Roles
- `admin` - Full access
- `sales_manager` - View all, approve orders
- `sales_associate` - View assigned only
- `event_manager` - Events focus (Erin)
- `staff` - Non-sales access

### Commission System
- Auto-calculates on order approval
- Split support for team sales
- Approval workflow for admins

### Client Status Values
- `lead` - New potential
- `prospect` - Engaged, no contract
- `active` - Has current orders
- `inactive` - Paused
- `churned` - Lost
