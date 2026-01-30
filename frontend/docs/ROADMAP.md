# WSIC Advertising Platform - Development Roadmap
## Updated: January 30, 2026

---

## ✅ COMPLETED

### January 30, 2026 - Orders Page & Email Infrastructure
- [x] Email logging to database with email_type, order_id, status
- [x] Email dashboard API endpoints
- [x] Auto-send contract after approval (when primary contact exists)
- [x] Kill/Change orders show parent order's products
- [x] JWT token decode for user detection (not localStorage.user)
- [x] Sales Rep filter dropdown for admins
- [x] Sections/Table toggle buttons
- [x] Fixed `o.created_by` → `o.submitted_by` SQL errors

### January 29, 2026 - Email Design System
- [x] Universal Email Design System principles
- [x] Subject format: `[ACTION] - [CLIENT] - [BRANDS]`
- [x] Brand bubbles in all order emails
- [x] Category bubbles with icons (📰📻🎙️💻🎪🌐📱)
- [x] Removed order numbers from emails (anti-phishing)
- [x] Multi-recipient logic (Justin, Mamie, Lalaine + Bill if WSIC)

### January 29, 2026 - Earlier
- [x] Commission rates configuration
- [x] Edit User feature
- [x] Event Manager role
- [x] ACH with Stripe Financial Connections

---

## 🎯 CURRENT PRIORITY: Orders Page Sections View

### What's Ready
- ✅ `viewMode` state ('sections' or 'table')
- ✅ `orderSections` computed grouping by status
- ✅ Toggle buttons visible in UI
- ❌ **Sectioned view JSX rendering** - NEEDS IMPLEMENTATION

### Section Structure
```javascript
const orderSections = {
  needsApproval: { 
    title: '⚠️ Needs Approval', 
    color: '#f59e0b', 
    bgColor: '#fef3c7',
    statuses: ['pending_approval'] 
  },
  approved: { 
    title: '✅ Approved - Ready to Send', 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    statuses: ['approved'] 
  },
  sentToClient: { 
    title: '📤 Sent to Client', 
    color: '#8b5cf6', 
    bgColor: '#f3e8ff',
    statuses: ['sent'] 
  },
  signed: { 
    title: '✍️ Signed', 
    color: '#10b981', 
    bgColor: '#d1fae5',
    statuses: ['signed'] 
  },
  active: { 
    title: '🟢 Active', 
    color: '#059669', 
    bgColor: '#dcfce7',
    statuses: ['active'] 
  },
  drafts: { 
    title: '📝 Drafts', 
    color: '#6b7280', 
    bgColor: '#f3f4f6',
    statuses: ['draft'] 
  },
  other: { 
    title: '📁 Other', 
    color: '#9ca3af', 
    bgColor: '#f9fafb',
    statuses: ['cancelled', 'completed', 'expired'] 
  }
};
```

### Implementation Pattern
```jsx
{viewMode === 'sections' ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {Object.entries(orderSections).map(([key, section]) => {
      if (section.orders.length === 0) return null;
      return (
        <div key={key} style={{ background: 'white', borderRadius: '12px' }}>
          {/* Section Header */}
          <div style={{ background: section.bgColor, borderBottom: `2px solid ${section.color}` }}>
            <h3>{section.title}</h3>
            <span style={{ background: section.color }}>{section.orders.length}</span>
          </div>
          {/* Orders Table */}
          <table>...</table>
        </div>
      );
    })}
  </div>
) : (
  /* Existing table view */
)}
```

---

## 📋 NEXT PHASES

### Phase 2: Role-Based Dashboards
| User | Dashboard Type | Key Focus |
|------|----------------|-----------|
| Justin & Mamie | Macro | All metrics, team performance |
| Bill | Radio | WSIC Broadcast, programming |
| Lalaine | Operational | Action items, processing queue |
| Erin | Events | LKN Woman events, calendar |
| Sales Associates | Personal | Their clients, pipeline, commissions |

### Phase 3: Email System Polish
- [ ] Verify brand bubbles in all email types
- [ ] Test `/api/email/test` endpoint
- [ ] Check email dashboard for delivery stats
- [ ] Invoice emails with brand bubbles

### Phase 4: Reporting & Analytics
- [ ] Sales Rep Performance report
- [ ] Pipeline Report
- [ ] Revenue by Product/Brand
- [ ] Commission Reports

---

## 👥 User Dashboard Matrix

| User | Role | Email | Dashboard Type |
|------|------|-------|----------------|
| Justin Ckezepis | Super Admin | justin@wsicnews.com | Macro |
| Mamie Lee | Super Admin | mamie@wsicnews.com | Macro |
| Bill Blakely | Super Admin | bill@wsicnews.com | Radio |
| Lalaine Agustin | Admin | admin@wsicnews.com | Operational |
| Erin Connair | Event Manager | erin@lakenormanwoman.com | Events |
| Sales Reps (10+) | Sales Associate | various | Personal |
| Staff (3) | Staff | various | Minimal |

---

## 📧 Email System Status

### Working ✅
- New Order Submitted (with brands, categories)
- Approval Required
- Order Approved
- Order Rejected
- Contract Signed Internal

### Email Logging ✅ NEW
- All emails logged to `email_logs` table
- Dashboard API: `GET /api/email/dashboard`
- Test endpoint: `POST /api/email/test`

### Need Verification 🔍
- Contract to Client (check brand bubbles)
- Invoice to Client
- Payment Reminder
- Payment Receipt

---

## 💰 Commission Rates (Configured)

| Category | Default Rate |
|----------|-------------|
| Print | 30% |
| Broadcast | 30% |
| Podcast | 30% |
| Digital/Programmatic | 18% |
| Web & Social | 30% |
| Events | 20% |
| Other (fallback) | 10% |

---

## 🗓️ Session History

### January 30, 2026 - Orders & Email Infrastructure
- Email logging database infrastructure
- Auto-send on approval
- Orders page: sales rep filter, view toggle
- Kill/Change orders show parent products
- JWT user detection fix

### January 29, 2026 (Late Evening) - Email & Orders
- Universal Email Design System
- Orders page brand/category bubbles
- ACH Financial Connections fix

### January 29, 2026 (Evening) - Commission & Auth
- Commission tracking system
- Edit User feature
- Authentication fixes

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files**
- No code snippets to insert
- User replaces entire file

### Key Files for Orders Work
1. `OrderList.jsx` - Sections view implementation
2. `order.js` - Backend orders route

### Git Workflow
```cmd
cd simplifi-reports
del frontend\src\components\OrderList.jsx
copy "C:\Users\WSIC BILLING\Downloads\OrderList.jsx" frontend\src\components\OrderList.jsx
git add -A
git commit -m "Add sections view rendering"
git push origin main
```

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Orders | 54 |
| Pending Approval | 7 |
| Active Orders | 1 |
| Total Contract Value | $442,441.00 |
| Monthly Revenue | $1,500.00 |
