# WSIC Advertising Platform - File Structure
## Updated: January 21, 2026 (Session 3)

---

## 📁 Complete Project Layout

### Frontend Repository (Vercel)
```
wsic-advertising-frontend/
├── 📄 vercel.json              # API proxy to Railway ⭐ IMPORTANT
├── 📄 package.json
├── 📄 vite.config.js
├── 📄 index.html
│
├── 📁 src/
│   ├── 📄 App.jsx              # Main app - ALL pages & components ⭐
│   ├── 📄 main.jsx             # React entry point
│   ├── 📄 index.css
│   │
│   └── 📁 components/
│       ├── 📄 OrderForm.jsx        # Order create/edit form
│       ├── 📄 OrderList.jsx        # Order listing with filters
│       ├── 📄 ProductManagement.jsx # Admin product CRUD
│       ├── 📄 UserManagement.jsx   # Admin user management
│       ├── 📄 EmailTestPanel.jsx   # Email testing UI
│       ├── 📄 ApprovalsPage.jsx    # ✅ NEW - Manager approval queue
│       └── 📄 ClientSigningPage.jsx # ✅ NEW - Public client signing
│
├── 📁 public/
│   └── 📄 favicon.svg
│
└── 📁 docs/                    # Documentation (keep these updated!)
    ├── 📄 ROADMAP.md
    ├── 📄 SESSION_SUMMARY.md
    ├── 📄 FILE_STRUCTURE.md
    └── 📄 NEW_CHAT_PROMPT.md
```

### Backend Repository (Railway)
```
wsic-advertising-backend/
├── 📄 server.js                # Main server ⭐ IMPORTANT
├── 📄 database.js              # PostgreSQL helpers & caching
├── 📄 simplifi-client.js       # Simpli.fi API integration
├── 📄 report-center-service.js # Report generation
├── 📄 package.json
├── 📄 .env                     # Environment variables (not in git)
│
├── 📁 routes/
│   ├── 📄 admin.js             # /api/admin/* - Products, packages
│   ├── 📄 order.js             # /api/orders/* - Order CRUD + Approval ⭐ UPDATED
│   └── 📄 email.js             # /api/email/* - Email endpoints
│
├── 📁 services/
│   ├── 📄 email-service.js     # Postmark integration
│   └── 📄 stripe-service.js    # Stripe payments (future)
│
├── 📁 migrations/              # ✅ NEW
│   └── 📄 001_add_signature_fields.sql
│
└── 📁 uploads/                 # File uploads (logos, etc.)
```

---

## 🔑 Key Files Reference

| Task | Files Needed |
|------|--------------|
| Email functionality | `routes/email.js`, `services/email-service.js` |
| Order workflow | `routes/order.js`, `components/OrderForm.jsx` |
| Approval system | `routes/order.js`, `components/ApprovalsPage.jsx` |
| Client signing | `routes/order.js`, `components/ClientSigningPage.jsx` |
| Add new page | `src/App.jsx` |
| API routing issues | `vercel.json`, `server.js` |
| Database changes | `database.js`, `migrations/*.sql` |

---

## 🗄️ Database Tables (Supabase)

### Core Tables
```
users               - User accounts, roles
advertising_clients - Client companies
contacts            - Client contacts
orders              - Advertising orders ⭐ UPDATED
order_items         - Line items in orders
products            - Available products
packages            - Product bundles
product_categories  - Product categories
entities            - Business entities
notes               - Client notes
```

### Order Signature Fields (NEW)
```sql
submitted_signature, submitted_signature_date, submitted_ip_address
approved_by, approved_at, approval_notes, rejected_reason
signing_token, signing_token_expires_at
signed_by_name, signed_by_email, signed_by_title
signed_at, signed_ip_address, signed_user_agent
has_price_adjustments, sent_to_client_at, sent_to_client_by
```

---

## 🌐 API Endpoints

### Orders
```
GET  /api/orders            - List orders
GET  /api/orders/:id        - Get order details
POST /api/orders            - Create order
PUT  /api/orders/:id        - Update order
DELETE /api/orders/:id      - Delete (draft only)
```

### Approval Workflow ⭐ NEW
```
POST /api/orders/:id/submit         - Submit with signature
PUT  /api/orders/:id/approve        - Manager approves
PUT  /api/orders/:id/reject         - Manager rejects
POST /api/orders/:id/send-to-client - Send contract link
GET  /api/orders/pending-approvals  - List pending
GET  /api/orders/pending-approvals/count - Count for badge
```

### Public Signing ⭐ NEW
```
GET  /api/orders/sign/:token  - Get contract
POST /api/orders/sign/:token  - Submit signature
```

### Email
```
GET  /api/email/status      - Check config
POST /api/email/test        - Test email
```

---

## 📝 Notes

### vercel.json
API proxy MUST come before SPA catch-all:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://simplifi-reports-production.up.railway.app/api/:path*" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Public Routes (No Auth)
- `/sign/:token` - Client signing
- `/client/:slug/report` - Public report

### App.jsx
~10,000+ lines. Specify section when requesting.

### New Components
- **ApprovalsPage.jsx** - Manager approval queue at `/approvals`
- **ClientSigningPage.jsx** - Client signing at `/sign/:token`
