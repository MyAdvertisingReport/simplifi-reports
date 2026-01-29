# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat
## Last Updated: January 29, 2026 (Evening)

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server (~5,700 lines) ⭐
│   ├── package.json
│   ├── routes/
│   │   ├── order.js           
│   │   ├── billing.js         
│   │   └── ...
│   └── services/
│       ├── email-service.js   
│       └── stripe-service.js  
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~17k lines) ⭐
        └── components/
            ├── BillingPage.jsx
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
| Payments | Stripe | ✅ Working |
| Ad Platform | Simpli.fi API | ✅ Working |
| Domain | myadvertisingreport.com | Vercel |

---

## 🗄️ Database Tables

### Key Tables
| Table | Purpose |
|-------|---------|
| `advertising_clients` | Client/business records |
| `contacts` | Contact people (first_name, last_name) |
| `users` | Team members |
| `orders` | Advertising orders |
| `invoices` | Billing invoices |
| `commissions` | Commission records with split support |
| `commission_rates` | User-specific rates |
| `commission_rate_defaults` | Company-wide rates |
| `training_modules` | Training content |
| `training_progress` | User completion tracking |

### User Roles
```sql
CHECK (role IN ('admin', 'sales_manager', 'sales_associate', 'staff', 'sales', 'event_manager'))
```

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

### Features
- Approvals tab on Commissions page
- Split commission modal
- Rate configuration UI
- YTD summary

---

## 👥 Key User Accounts

| User | Email | Role |
|------|-------|------|
| Justin Ckezepis | justin@wsicnews.com | admin (Super Admin) |
| Mamie Lee | mamie@wsicnews.com | admin (Super Admin) |
| Lalaine Agustin | admin@wsicnews.com | admin |
| Erin Connair | erin@lakenormanwoman.com | event_manager |

**Password Reset Process:**
```cmd
cd simplifi-reports\backend
node -e "require('bcrypt').hash('NewPassword', 10, (err, hash) => console.log(hash));"
```
Then in Supabase SQL:
```sql
UPDATE users SET password_hash = 'HASH' WHERE email = 'EMAIL';
```

---

## 🎯 CURRENT PRIORITY: Order Testing & Data Import

### Testing Checklist
- [ ] New Order (Electronic) - Full signing flow
- [ ] Upload Order (Pre-Signed) - PDF upload
- [ ] Change Order - Modify existing
- [ ] Kill Order - Cancel existing
- [ ] Commission auto-generates

### Data Import
- Excel templates ready for: Print, Broadcast, Podcast, Events, Web/Social
- Import to update client statuses

---

## ✅ Recently Completed (January 29, 2026)

### Commission System
- Commission rates configuration
- Approvals workflow with split support
- YTD tracking and reporting

### User Management
- Edit User feature on Users page
- Event Manager role for Erin
- Change Password in sidebar
- Removed Preferences page

### Auth Fixes
- Trust proxy for Railway rate limiter
- Direct SQL for login/update endpoints
- UUID auto-generation for new users

---

## 📝 API Endpoints Reference

### Commissions
```
GET  /api/commissions                    - List commissions
GET  /api/commissions/summary            - YTD summary
GET  /api/commissions/pending            - Pending approvals
GET  /api/commissions/rates              - Rate configuration
POST /api/commissions/rates              - Add/update rate
POST /api/commissions/:id/approve        - Approve commission
POST /api/commissions/:id/split          - Split commission
POST /api/commissions/:id/paid           - Mark as paid
```

### Users
```
GET  /api/users                          - List users
GET  /api/users/:id                      - Get user
PUT  /api/users/:id                      - Update user (admin)
PUT  /api/auth/change-password           - Change own password
```

### Orders
```
GET  /api/orders                         - List orders
POST /api/orders                         - Create order
PUT  /api/orders/:id/approve             - Approve order
POST /api/orders/:id/send-to-client      - Send for signing
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
copy "C:\Users\WSIC BILLING\Downloads\server.js" backend\server.js
copy "C:\Users\WSIC BILLING\Downloads\App.jsx" frontend\src\App.jsx
git add -A
git commit -m "Description"
git push origin main
```

---

## 📚 Session Docs to Upload

1. **NEW_CHAT_PROMPT.md** - This file (always upload first)
2. **ROADMAP.md** - Current priorities
3. **SESSION_SUMMARY.md** - Last session's work
4. **ORDER_IMPORT_INSTRUCTIONS.md** - For data import work

### For Order Testing
- Order templates (Excel files)
- Sample test data

### Optional
- **App.jsx** - For frontend changes
- **server.js** - For backend reference

---

## 🔒 Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWT authentication with 24h expiry
- Rate limiting on login (10 attempts/15 min)
- Trust proxy enabled for Railway
- Super Admin audit logging enabled
