# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 30, 2026

---

## 🎯 IMMEDIATE PRIORITY: Orders Page Fixes

### Current Issues to Resolve

#### 1. Sections View Not Rendering
- **Status**: Toggle buttons show, but clicking "Sections" does nothing
- **Root Cause**: `viewMode === 'sections'` conditional rendering not implemented
- **Files**: `OrderList.jsx`
- **Solution Needed**: Add the sectioned view JSX that groups orders by status

#### 2. Some Orders Missing Products/Brands
- **Status**: Some rows show "0 products" and "—" for brands
- **Root Cause**: These orders genuinely have no items in `order_items` table
- **Note**: NOT a code bug - data issue from test orders created without products
- **Parent order items**: Kill/Change orders now show parent order's products ✅

#### 3. Completed Features ✅
- Sales Rep filter dropdown (admin only) ✅
- Sections/Table toggle buttons visible ✅
- Brand bubbles with correct colors ✅
- Category icons showing ✅
- Admin sees all orders, sales reps see only theirs ✅
- JWT token decode for user detection ✅

### Order Sections Needed
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

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server (~6,300 lines) ⭐
│   ├── package.json
│   ├── routes/
│   │   ├── order.js           ← Order CRUD, items query ⭐
│   │   ├── billing.js         
│   │   └── ...
│   └── services/
│       ├── email-service.js   ← Universal Email Design System
│       └── stripe-service.js  
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~17k lines)
        └── components/
            ├── OrderList.jsx  ← Orders page - NEEDS SECTIONS VIEW ⭐
            ├── ClientSigningPage.jsx
            └── ...
```

### 🚨 Git Commands MUST Use Full Paths:
```bash
# ✅ CORRECT
git add backend/routes/order.js frontend/src/components/OrderList.jsx

# ❌ WRONG
git add order.js OrderList.jsx
```

---

## 🏗️ Tech Stack

| Layer | Technology | Hosted On |
|-------|------------|-----------|
| Frontend | React + Vite | Vercel |
| Backend | Node.js + Express | Railway |
| Database | PostgreSQL | Supabase |
| Auth | JWT + bcrypt | Custom |
| Email | Postmark | ✅ Working |
| Payments | Stripe | ✅ Working (Financial Connections) |
| Domain | myadvertisingreport.com | Vercel |

---

## 🗄️ Database Tables

### Key Tables for Orders
| Table | Purpose |
|-------|---------|
| `orders` | Order records with status, client_id, submitted_by |
| `order_items` | Line items with product details, entity_id |
| `entities` | Business entities (WSIC, LKN, LWP) |
| `products` | Product catalog |
| `users` | Team members (for sales_associate filter) |

### Order Items Query (in order.js)
```sql
-- Items are fetched via LEFT JOIN with json_agg
-- Kill/Change orders also get parent_item_stats for parent order's items
COALESCE(item_stats.items_json, parent_item_stats.items_json) as items
```

### User Detection (in OrderList.jsx)
```javascript
// User data is stored in JWT token, not localStorage.user
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
// payload = { id, email, role, name, iat, exp }
```

---

## 👥 User Roles

| Role | Orders Access |
|------|---------------|
| Super Admin (is_super_admin) | All orders |
| Admin (role='admin') | All orders |
| Manager (role='manager') | All orders |
| Sales Associate | Own orders only |
| Staff | Own orders only |

### Admin Detection in OrderList.jsx
```javascript
const isAdmin = 
  currentUser.is_super_admin === true || 
  currentUser.role === 'admin' || 
  currentUser.role === 'manager' ||
  currentUser.email === 'justin@wsicnews.com' || 
  currentUser.email === 'mamie@wsicnews.com';
```

---

## 📧 Email System (Reference)

### Recipients Logic
```javascript
const recipients = [
  'justin@wsicnews.com',
  'mamie@wsicnews.com', 
  'admin@wsicnews.com'  // Lalaine
];
if (includesWSIC) {
  recipients.push('bill@wsicnews.com');
}
```

### Category Icons
- 📰 Print (blue) | 📻 Broadcast (pink) | 🎙️ Podcast (purple)
- 💻 Digital (green) | 🎪 Events (amber) | 🌐 Web (indigo) | 📱 Social (rose)

---

## ✅ Completed This Session (January 30, 2026)

### Orders Page
- [x] Admin sees all orders (JWT token decode working)
- [x] Sales Rep filter dropdown for admins
- [x] Sections/Table toggle buttons visible
- [x] Brand bubbles with entity-specific colors
- [x] Category bubbles with icons
- [x] Kill/Change orders show parent's products
- [x] `viewMode` and `orderSections` state ready

### Server Fixes
- [x] Fixed `o.created_by` → `o.submitted_by` in sales performance report
- [x] Fixed same in leaderboard report
- [x] Email logging infrastructure added
- [x] Auto-send on approval (when primary contact exists)

### Still Needed
- [ ] **Sections view rendering** (main priority)
- [ ] Orders with no items - data cleanup or handling

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files** - Do NOT provide code snippets
- Claude creates full updated file for download
- User replaces entire file in project

### Git Workflow
```cmd
cd simplifi-reports
del frontend\src\components\OrderList.jsx
copy "C:\Users\WSIC BILLING\Downloads\OrderList.jsx" frontend\src\components\OrderList.jsx
git add -A
git commit -m "Add sections view to orders page"
git push origin main
```

---

## 📚 Files to Upload for Next Session

### Required
1. **NEW_CHAT_PROMPT.md** - This file (always first)
2. **OrderList.jsx** - Current version for sections view work
3. **order.js** - Backend orders route (for reference)

### Optional (if needed)
- **App.jsx** - For dashboard work
- **server.js** - For backend reference
- **email-service.js** - For email work

---

## 🔒 Security Notes

- Order numbers: NEVER in client/public emails
- JWT authentication with 24h expiry
- User data in JWT token payload (not localStorage.user)
- Stripe Financial Connections for secure bank verification
