# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 29, 2026 (Late Evening)

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server (~5,800 lines) ⭐
│   ├── package.json
│   ├── routes/
│   │   ├── order.js           
│   │   ├── billing.js         
│   │   └── ...
│   └── services/
│       ├── email-service.js   ← Universal Email Design System ⭐
│       └── stripe-service.js  
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~17k lines) ⭐
        └── components/
            ├── OrderList.jsx  ← Orders page with brand bubbles ⭐
            ├── ClientSigningPage.jsx ← Stripe Financial Connections
            └── ...
```

### 🚨 Git Commands MUST Use Full Paths:
```bash
# ✅ CORRECT
git add backend/server.js frontend/src/App.jsx

# ❌ WRONG
git add server.js App.jsx
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
| Ad Platform | Simpli.fi API | ✅ Working |
| Domain | myadvertisingreport.com | Vercel |

---

## 📧 UNIVERSAL EMAIL DESIGN SYSTEM ⭐ NEW

### Anti-Phishing Principles
1. **NEVER use Order Numbers** in emails - backend only
2. **Subject Format**: `[ACTION] - [CLIENT NAME] - [BRANDS]`
3. **Always include Brand Bubbles** (dark blue #1e3a8a)
4. **Always include Category Bubbles** with icons
5. **Single clear CTA button**

### Subject Line Examples
```
New Order Submitted - ABC Company - WSIC + Lake Norman Woman
⚠️ Approval Required - ABC Company - WSIC
✓ Approved - ABC Company - WSIC + Lake Norman Woman
🎉 Contract Signed - ABC Company - WSIC
```

### Category Icons
- 📰 Print (blue)
- 📻 Broadcast (pink)  
- 🎙️ Podcast (purple)
- 💻 Digital (green)
- 🎪 Events (amber)
- 🌐 Web (indigo)
- 📱 Social (rose)

---

## 🗄️ Database Tables

### Key Tables
| Table | Purpose |
|-------|---------|
| `advertising_clients` | Client/business records |
| `contacts` | Contact people (first_name, last_name) |
| `users` | Team members |
| `orders` | Advertising orders |
| `order_items` | Line items with `book_price`, `book_setup_fee` |
| `invoices` | Billing invoices |
| `commissions` | Commission records with split support |

### Order Items Fields (for approval display)
```sql
order_items:
  - book_price         -- Original product price
  - book_setup_fee     -- Original setup fee
  - unit_price         -- Adjusted price (what client pays)
  - setup_fee          -- Adjusted setup fee
  - discount_percent   -- Discount applied
```

### User Roles
```sql
CHECK (role IN ('admin', 'sales_manager', 'sales_associate', 'staff', 'sales', 'event_manager'))
```

---

## 👥 Team Structure & Dashboard Requirements

### Super Admins (Macro Dashboard)
| User | Email | Dashboard Focus |
|------|-------|-----------------|
| Justin Ckezepis | justin@wsicnews.com | All metrics, team performance, revenue, approvals |
| Mamie Lee | mamie@wsicnews.com | All metrics, team performance, revenue, approvals |
| Bill Blakely | bill@wsicnews.com | Radio/Programming focused (WSIC Broadcast) |

### Admin (Operational Dashboard)
| User | Email | Dashboard Focus |
|------|-------|-----------------|
| Lalaine Agustin | admin@wsicnews.com | Orders to process, pending payments, action items |

### Event Manager (Events Dashboard)
| User | Email | Dashboard Focus |
|------|-------|-----------------|
| Erin Connair | erin@lakenormanwoman.com | Events calendar, event orders, LKN Woman events |

### Sales Associates (Sales Dashboard)
- Their clients only
- Their pipeline
- Their commissions
- CRM capabilities

### Staff
- Chelsea Bren, CJ Schrader, Reese Smith
- Non-sales access, specialized views

---

## 💰 Commission System ✅ COMPLETE

### Default Rates
| Category | Rate |
|----------|------|
| Print | 30% |
| Broadcast | 30% |
| Podcast | 30% |
| Digital/Programmatic | 18% |
| Web & Social | 30% |
| Events | 20% |
| Default | 10% |

---

## 🎯 CURRENT PRIORITIES

### 1. Email System Fine-Tuning (In Progress)
- [ ] Verify brand bubbles show on all email types
- [ ] Ensure `order.items` is populated when emails are sent
- [ ] Test all email templates with real orders

### 2. Role-Based Dashboards (Next)
- [ ] **Bill's Dashboard** - WSIC Radio/Programming focus
- [ ] **Lalaine's Dashboard** - Operational action items
- [ ] **Erin's Dashboard** - Events Manager view
- [ ] **Sales Associate Dashboard** - Personal CRM

### 3. Order Testing
- [ ] New Order (Electronic) - Full signing flow
- [ ] ACH with Stripe Financial Connections
- [ ] Commission auto-generates on approval

---

## ✅ Completed This Session (January 29, 2026 - Late Evening)

### Email System Updates
- Universal Email Design System principles
- Subject lines: `[ACTION] - [CLIENT] - [BRANDS]` format
- Brand bubbles in all order-related emails
- Category bubbles with icons (📰📻🎙️💻🎪🌐📱)
- Removed order numbers from all emails
- Multiple recipients: Justin, Mamie, Lalaine + Bill (if WSIC)
- Product details table in order submitted emails

### Orders Page Updates
- Brand bubbles column in orders table
- Category bubbles with icons under product count
- Removed order numbers from display
- Order detail modal shows client name (not order number)
- Clear approval reasons showing:
  - Book price vs adjusted price
  - Discount percentage
  - Setup fee waivers

### ACH Payment Fix
- Implemented Stripe Financial Connections
- Instant bank verification via customer's online banking
- Replaced manual routing/account number entry

---

## 📝 API Endpoints Reference

### Email Recipients Logic
```javascript
// Order Submitted - always these three + conditional Bill
const recipients = [
  'justin@wsicnews.com',
  'mamie@wsicnews.com', 
  'admin@wsicnews.com'  // Lalaine
];
if (includesWSIC) {
  recipients.push('bill@wsicnews.com');
}
```

### Key Endpoints
```
GET  /api/orders                         - List orders with items
POST /api/orders/:id/status              - Update status (triggers emails)
GET  /api/orders/:id                     - Get order with items
POST /api/orders/sign/:token/setup-intent/ach - ACH Financial Connections
```

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files** - Do NOT provide code snippets
- Claude creates full updated file for download
- User replaces entire file in project

### Git Workflow
```cmd
cd simplifi-reports
del backend\server.js
del frontend\src\App.jsx
del frontend\src\components\OrderList.jsx
del backend\services\email-service.js
copy "C:\Users\WSIC BILLING\Downloads\server.js" backend\server.js
copy "C:\Users\WSIC BILLING\Downloads\App.jsx" frontend\src\App.jsx
copy "C:\Users\WSIC BILLING\Downloads\OrderList.jsx" frontend\src\components\OrderList.jsx
copy "C:\Users\WSIC BILLING\Downloads\email-service.js" backend\services\email-service.js
git add -A
git commit -m "Description"
git push origin main
```

---

## 📚 Files to Upload for Next Session

### Required
1. **NEW_CHAT_PROMPT.md** - This file (always first)
2. **ROADMAP.md** - Current priorities
3. **SESSION_SUMMARY.md** - Last session's work
4. **EMAIL_DESIGN_SYSTEM.md** - Email principles

### Code Files (for dashboard work)
- **App.jsx** - For dashboard customization
- **server.js** - For backend reference
- **email-service.js** - For email fine-tuning
- **OrderList.jsx** - For orders page reference

---

## 🔒 Security Notes

- Order numbers: NEVER in client/public emails (phishing prevention)
- Passwords hashed with bcrypt (10 rounds)
- JWT authentication with 24h expiry
- Stripe Financial Connections for secure bank verification
- No card/bank data stored locally (Stripe handles all)
