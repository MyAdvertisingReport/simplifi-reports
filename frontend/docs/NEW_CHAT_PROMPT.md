# WSIC Advertising Platform - New Chat Context
## Upload this file at the START of every new Claude chat

---

## ⚠️ CRITICAL: MONO-REPO FILE STRUCTURE

**This is a MONO-REPO. All git commands use full paths from root:**

```
simplifi-reports/              ← Git root (push from here)
├── backend/                   ← Railway deployment
│   ├── server.js              ← Main server with all endpoints ⭐
│   ├── auth.js                ← Authentication & session management
│   ├── package.json           ← Dependencies (includes stripe)
│   ├── routes/
│   │   ├── order.js           ← Order API endpoints
│   │   ├── order-variants.js  ← Upload/Change/Kill order endpoints
│   │   ├── billing.js         ← Invoice management + Auto-generate ⭐
│   │   ├── document.js        ← Document upload/download
│   │   ├── admin.js
│   │   └── email.js
│   └── services/
│       ├── email-service.js   ← Postmark (includes invoice emails)
│       └── stripe-service.js  ← Stripe payment processing
│
└── frontend/                  ← Vercel deployment
    └── src/
        ├── App.jsx            ← Main app (~12k lines) - includes ClientsPage ⭐
        └── components/
            ├── BillingPage.jsx         ← Invoice list + Generate Modal + Dashboard
            ├── InvoiceForm.jsx         ← Create/edit invoices
            ├── OrderForm.jsx           ← New order with product selector
            ├── OrderTypeSelector.jsx   ← 6 order type selection
            ├── UploadOrderForm.jsx     ← Upload pre-signed contracts
            ├── ChangeOrderForm.jsx     ← Electronic change orders
            ├── ChangeOrderUploadForm.jsx
            ├── KillOrderForm.jsx       ← Electronic kill orders
            ├── KillOrderUploadForm.jsx
            ├── ClientSigningPage.jsx   ← 3-step signing flow
            ├── AdminDocumentsPage.jsx  ← Document management
            └── ApprovalsPage.jsx       ← Manager approval queue
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
| Email | Postmark | ✅ Working |
| Payments | Stripe | ✅ Working (Card + ACH) |
| Ad Platform | Simpli.fi API | - |
| Domain | myadvertisingreport.com | Vercel |

---

## 📊 Current State (January 28, 2026)

### ✅ Working Features
- User authentication (JWT + session-based)
- **CRM with 270 clients imported** ⭐ NEW
- **Dual-view Clients page (CRM View + Client View)** ⭐ NEW
- Client management with contacts
- Product/package catalog with entities (WSIC, LKN, LWP)
- **6 Order Types:** New, Upload, Change (Electronic/Upload), Kill (Electronic/Upload)
- Order creation with sales rep signature
- Auto-approval (when no price adjustments)
- Auto-send to client (when auto-approved + contact exists)
- Approval workflow for price-adjusted orders
- **Client signing page - Single page 3-step flow**
- **Payment collection via Stripe Elements (PCI compliant)**
- **Three billing preferences: Card, ACH, Invoice**
- Product selector with Broadcast subcategories
- Document upload/download system
- Simpli.fi campaign reporting
- Public client report pages

### ✅ CRM System (NEW - January 28, 2026)
- **270 clients imported** from RAB Master Sheet
- **Dual-view Clients page:**
  - CRM View: All clients, status/tier filters, pipeline focus
  - Client View: Active clients only, brand filters, operations focus
- **Client fields:** status, tier, tags, source, billing_terms
- **Brand tagging:** WSIC, LKNW, Multi-Platform
- **Product tagging:** Print, Commercials, Show Sponsor, etc.
- **Trade/Barter flagging** for barter clients
- **Sticky table headers** for scrolling
- **🔥 Performance optimized:** Single SQL query returns all client stats (orders, invoices, balances)

### ✅ Billing System (Complete)
- **Invoice Management:** Create, edit, approve, send, void
- **Invoice Emails:** Professional template with brand logos, pay button
- **BillingPage:** Expandable rows, client contact, payment method with last 4
- **Financial Dashboard:** Key metrics, AR aging, top clients, status breakdown
- **Payment Recording:** Manual payments, charge card on file
- **Overdue Reminders:** Send reminder emails
- **Auto-Generate Invoices:** Generate from signed orders with category-based billing

### ✅ Security Features (Updated January 27, 2026)
- bcrypt password hashing (10 salt rounds)
- Account lockout after 5 failed attempts
- Session management with expiration
- Role-based access control (admin, sales_manager, sales_associate)
- Parameterized SQL queries (injection prevention)
- Activity logging for security events
- **Helmet security headers** ✅
- **Rate limiting on login** (10 attempts/15 min) ✅
- **JWT validation** (fails in production without secret) ✅
- **Protected diagnostic endpoints** ✅

---

## 👥 Client Data Summary

| Metric | Count |
|--------|-------|
| Total Clients | 270 |
| Status: Active | 95 |
| Status: Prospect | 175 |
| Source: WSIC Radio | 77 |
| Source: Lake Norman Woman | 157 |
| Source: Multi-Platform | 32 |
| Trade/Barter Clients | 28 |

---

## 🎨 Clients Page - Dual Views

### CRM View (Sales Pipeline)
- Shows ALL 270 clients
- Filters: Status (Lead/Prospect/Active/Inactive/Churned), Tier
- Columns: Client, Status, Tier, Industry, Revenue, Active Orders, Open Balance, Last Activity
- Use for: Sales pipeline management, prospecting

### Client View (Operations)
- Shows only ACTIVE clients (97 total)
- Filters: Brand (All/WSIC Radio/Lake Norman Woman/Multi-Platform)
- Columns: Client, Brand, Products, Revenue, Orders, Balance
- Brand badges: 📻 WSIC (blue), 📰 LKNW (pink)
- Use for: Day-to-day operations, order management

---

## 💰 Invoice Status Flow

```
draft → approved → sent → paid
              ↓
           (void)
```

### Billing Rules by Product Category:
| Category | Billing Period | Due Date |
|----------|---------------|----------|
| Broadcast/Podcast | Previous month | Based on contract start |
| Print | Following month's issue | 15th of billing month |
| Programmatic/Events/Web | Current month (advance) | Based on contract start |

---

## 💳 Payment Flow

### Three Billing Preferences:
1. **Credit Card (Auto Pay)** - +3.5% fee, collected via Stripe Elements
2. **ACH (Auto Pay)** - No fee, requires bank verification
3. **Invoice (Manual Pay)** - Requires backup payment method

---

## 🗄️ Key Database Tables

### advertising_clients (CRM) ⭐
```sql
id, business_name, slug, status, tier, industry
tags[]                -- ['WSIC', 'LKNW', 'Print', 'Commercials', 'Trade/Barter']
source                -- 'WSIC Radio', 'Lake Norman Woman', 'Multi-Platform'
billing_terms, annual_contract_value, client_since
phone, address fields, website
simpli_fi_client_id, stripe_customer_id
assigned_to, created_by, last_activity_at
```

### orders
```sql
id, order_number, client_id, status, order_type
monthly_total, contract_total, term_months
contract_start_date, contract_end_date
billing_preference, stripe_entity_code, payment_method_id
```

### invoices
```sql
id, invoice_number, client_id, order_id, status
billing_period_start, billing_period_end
subtotal, processing_fee, total, balance_due
billing_preference, payment_method_id
```

---

## 🎯 Next Up (Priority Order)

### 1. 🔥 Data Entry & Verification (CURRENT PRIORITY)
- Use ASSISTANT_DATA_ENTRY_PROMPT.md to guide data entry
- Verify imported clients are accurate
- Add orders for active clients
- Enter contact information
- Set up billing preferences

### 2. CRM Notes Import
- Get RAB CRM export
- Import notes and activity history
- Link to client records

### 3. Sales Associate Features
- Map salesperson names to user IDs
- Assign clients to sales reps
- Filter by assigned rep
- Sales dashboard metrics

### 4. Stripe Webhooks for Payment Status
- `POST /api/webhooks/stripe` endpoint
- Auto-mark invoices as paid
- Send payment confirmation email

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files** - Do NOT provide code snippets to insert
- Claude should create the full updated file for download
- User will replace the entire file in their project

### Git Workflow
- User uses **simple Windows cmd prompt** for git commands
- Standard deploy workflow:
```cmd
cd simplifi-reports
copy [downloaded file] backend\server.js
git add backend/server.js
git commit -m "Description of change"
git push origin main
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
| Main Server | `backend/server.js` |
| Main App (incl. ClientsPage) | `frontend/src/App.jsx` |
| Billing Routes | `backend/routes/billing.js` |
| Email Service | `backend/services/email-service.js` |
| BillingPage | `frontend/src/components/BillingPage.jsx` |
| Client Signing | `frontend/src/components/ClientSigningPage.jsx` |
| Order Form | `frontend/src/components/OrderForm.jsx` |

### App.jsx Key Sections:
| Section | Lines (approx) |
|---------|----------------|
| Sidebar | 528-760 |
| Dashboard | 800-1100 |
| **ClientsPage** | 1763-2700 |
| Client Detail | 2700-3500 |
| Routes | end of file |

### Client Status Values:
- `lead` - New potential client
- `prospect` - Engaged, no contract yet
- `active` - Has current contract/orders
- `inactive` - Paused or dormant
- `churned` - Lost/cancelled

### Brand Tags:
- `WSIC` - WSIC Radio client
- `LKNW` - Lake Norman Woman client
- Both = Multi-Platform client

---

## 🔒 Security Documentation
See `SECURITY_AUDIT.md` for:
- Current security posture **(8.5/10)** ✅
- Implementation checklist
- Incident response procedures
