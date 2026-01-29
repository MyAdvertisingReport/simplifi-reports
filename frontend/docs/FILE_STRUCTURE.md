# WSIC Advertising Platform - File Structure
## Updated: January 29, 2026

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
        ├── 📄 App.jsx               # Main app - ALL pages (~14.3k lines) ⭐
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
| **Super Admin features** | `App.jsx` (UsersPage, Sidebar), `server.js` |
| **System Diagnostics** | `App.jsx` (SystemDiagnosticsPage), `server.js` (/api/diagnostics/*) |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users                 - User accounts, roles, failed login tracking
user_sessions         - Active login sessions
user_activity_log     - Security audit trail
super_admin_audit_log - Super Admin action tracking ⭐ NEW
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

### Super Admin Tables
```sql
-- Audit log for privileged actions
super_admin_audit_log (
  id UUID PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id),
  action_type VARCHAR(50),     -- 'view_as_start', 'view_as_end', etc.
  target_user_id UUID,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
```

---

## 🌐 API Endpoints

### Clients (Protected) ⭐ OPTIMIZED
```
GET    /api/clients                   - List all clients WITH order/invoice stats
GET    /api/clients/:id               - Get single client details
POST   /api/clients                   - Create client
PUT    /api/clients/:id               - Update client
DELETE /api/clients/:id               - Delete client (admin only)
```

### Super Admin (Protected - Super Admins Only)
```
GET    /api/super-admin/view-as/:userId      - Start View As mode
POST   /api/super-admin/view-as/:userId/end  - End View As mode
GET    /api/super-admin/audit-log            - Get audit log
GET    /api/super-admin/list                 - List all Super Admins
```

### Diagnostics
```
GET    /api/diagnostics/public        - Basic status (no auth)
GET    /api/diagnostics/admin         - Full system health (admin required)
POST   /api/diagnostics/clear-cache   - Clear cache (admin required)
GET    /api/diagnostics/test-image    - Test image proxy (no auth)
GET    /api/health                    - Basic health check
GET    /api/health/detailed           - Detailed health check
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

---

## 🎨 App.jsx Sections (~14,300 lines)

| Section | Approximate Lines | Purpose |
|---------|-------------------|---------|
| Imports & Constants | 1-50 | Dependencies, API_BASE |
| useResponsive Hook | 53-91 | Mobile/tablet/desktop detection |
| AuthContext | 96-212 | Auth state, View As functionality |
| API Helper | 217-280 | api.get/post/put/delete |
| Sidebar | 595-960 | Navigation with Super Admin links |
| Dashboard | 1000-1500 | Home page |
| ClientsPage | 1763-2700 | CRM & Client views |
| ClientDetailPage | 2700-3500 | Individual client |
| UsersPage | 11685-12680 | Team, Audit Log tabs |
| SystemDiagnosticsPanel | 11186-11670 | Health dashboard component |
| SystemDiagnosticsPage | 13236-13310 | /settings/system route |
| DiagnosticsPanel | 13550-14050 | Legacy modal (Preferences) |
| Routes | 14230-14270 | All route definitions |

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

### Super Admin Access
- 3 Super Admins: Justin, Mamie, Bill
- Sidebar shows "System" link with SA badge
- Users page shows "Audit Log" tab
- View As button in Users table

### System Diagnostics Components Monitored
| Component | What's Checked |
|-----------|----------------|
| Application Server | Uptime, Node version |
| Database | Connection, client/user counts |
| Simpli.fi Ad Platform | API connection |
| Image Proxy | Safari fix availability |
| Security | Headers, rate limiting |
| Client Configuration | Missing Simpli.fi IDs |

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

### Client Data (2,812 total)
- ~122 Active, ~2,690 Prospect
- 77 WSIC, 157 LKNW, 32 Multi-Platform
- 28 Trade/Barter clients
