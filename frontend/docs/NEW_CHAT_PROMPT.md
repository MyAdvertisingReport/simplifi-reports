# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js
│   ├── routes/
│   │   ├── order.js           ← Order API endpoints
│   │   ├── admin.js
│   │   └── email.js
│   └── services/
│       └── email-service.js   ← Postmark integration
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (10k+ lines)
        └── components/
            ├── OrderForm.jsx
            ├── OrderList.jsx
            ├── ApprovalsPage.jsx
            └── ClientSigningPage.jsx
```

### 🚨 Git Commands MUST Use Full Paths:
```bash
# ✅ CORRECT
git add backend/routes/order.js frontend/src/components/OrderForm.jsx

# ❌ WRONG
git add routes/order.js src/components/OrderForm.jsx
```

---

## 🏗️ Tech Stack

| Layer | Technology | Hosted On |
|-------|------------|-----------|
| Frontend | React + Vite | Vercel |
| Backend | Node.js + Express | Railway |
| Database | PostgreSQL | Supabase |
| Email | Postmark | ⚠️ Pending approval (can only send to @myadvertisingreport.com) |
| Ad Platform | Simpli.fi API | - |
| Domain | myadvertisingreport.com | Vercel |

---

## 📊 Current State (Jan 23, 2026)

### Working Features
- ✅ User authentication (JWT)
- ✅ Client management with contacts
- ✅ Product/package catalog with entities (WSIC, LKN, LWP)
- ✅ Order creation with sales rep signature
- ✅ Auto-approval (when no price adjustments)
- ✅ Auto-send to client (when auto-approved + contact exists)
- ✅ Approval workflow for price-adjusted orders
- ✅ Client contract signing (public URL)
- ✅ Simpli.fi campaign reporting
- ✅ Public client report pages

### Known Issues
- ⚠️ Postmark needs account approval for external emails
- ⚠️ Users table not synced with auth - using signature as fallback for names

---

## 📋 Order Status Flow

```
draft → pending_approval → approved → sent → signed → active
              ↓
         (rejected → draft)

Auto-flow (no price adjustments):
draft → approved → sent (automatic if contact exists)
```

### Status Meanings:
- **draft** - Created but not submitted
- **pending_approval** - Has price adjustments, needs manager review
- **approved** - Manager approved (or auto-approved)
- **sent** - Contract emailed to client
- **signed** - Client signed electronically
- **active** - Campaign running

---

## 🗄️ Key Database Tables

```sql
-- Orders
orders (id, order_number, client_id, status, monthly_total, contract_total,
        submitted_by, submitted_signature, approved_by, signing_token, ...)

-- Items
order_items (id, order_id, product_id, unit_price, original_price, line_total, setup_fee)

-- Clients
advertising_clients (id, business_name, slug, industry)
contacts (id, client_id, first_name, last_name, email, is_primary)

-- Products
products (id, name, category, base_price, entity_id)
entities (id, name, code)  -- WSIC, LKN, LWP
```

---

## 🔌 Key API Endpoints

### Orders
```
GET    /api/orders                    - List orders
GET    /api/orders/:id                - Get order details
POST   /api/orders                    - Create order
PUT    /api/orders/:id                - Update order
POST   /api/orders/:id/submit         - Submit with signature
PUT    /api/orders/:id/approve        - Manager approve
PUT    /api/orders/:id/reject         - Manager reject
POST   /api/orders/:id/send-to-client - Generate signing link
GET    /api/orders/pending-approvals  - List pending
```

### Public (No Auth)
```
GET    /api/orders/sign/:token        - Client views contract
POST   /api/orders/sign/:token        - Client signs
```

---

## 🎯 Current Priority

### Immediate
1. Get Postmark account approved for external email delivery
2. Add manual "Send to Client" button for approved orders without contacts

### Next Up
- PDF generation after client signature
- Order detail view with full history
- Email notifications (approval, signature)

---

## ⚙️ Environment Variables (Railway)

```
DATABASE_URL=postgresql://...
POSTMARK_API_KEY=...
POSTMARK_FROM_EMAIL=orders@myadvertisingreport.com
JWT_SECRET=...
BASE_URL=https://myadvertisingreport.com
```

---

## 📝 Quick Reference

### Deploy Command (from repo root):
```bash
git add . && git commit -m "message" && git push origin main
```

### Common File Paths:
| What | Path |
|------|------|
| Order API | `backend/routes/order.js` |
| Order Form | `frontend/src/components/OrderForm.jsx` |
| Orders List | `frontend/src/components/OrderList.jsx` |
| Approvals | `frontend/src/components/ApprovalsPage.jsx` |
| Email Service | `backend/services/email-service.js` |
| Main App | `frontend/src/App.jsx` |

### App.jsx is HUGE (10k+ lines)
When asking about App.jsx, specify what section:
- Authentication: lines ~85-145
- Sidebar: lines ~528-710
- Dashboard: lines ~741-1050
- Client Detail: lines ~2350-3100
- Routes: lines ~10185-end
