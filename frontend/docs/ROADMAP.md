# WSIC Advertising Platform - Development Roadmap
## Updated: January 28, 2026 (Afternoon)

---

## 🎯 Current Sprint: User Management & Diagnostics

### ✅ COMPLETED (January 28, 2026 - Afternoon)

#### CRM View Redesign
- [x] Owner filter toggle (All | Open | Mine)
- [x] Sort options (A-Z, Revenue, Recently Active, Needs Attention)
- [x] Claim button for open accounts
- [x] Activity count column
- [x] Last touch color coding (green/yellow/red)
- [x] Remove tier references
- [x] Replace Source with Industry column
- [x] Status dot instead of letter avatar
- [x] Backend: Add assigned_to_name, activity_count to /api/clients

#### Active Clients Verification
- [x] Analyze RAB Master Sheet for actual revenue
- [x] Identify 118 active clients with contracts
- [x] Update status to 'active' for verified clients
- [x] Add annual_contract_value from RAB totals
- [x] Update tags with brand + product types

#### User ID Fix
- [x] Identified Auth ID vs Database ID mismatch
- [x] Recreated user with correct Supabase Auth ID
- [x] "Mine" filter now works correctly

---

## 📋 NEXT UP (Priority Order)

### 1. 🔥 Sales Associate User Management (HIGH)

#### User List View (Admin)
- [ ] Users page showing all team members
- [ ] Per-user metrics: clients assigned, active orders, revenue
- [ ] Activity count per user
- [ ] Filter: All Users | Sales Only | By Role

#### Individual User View
- [ ] Click user → see their assigned clients
- [ ] See their orders, invoices, activities
- [ ] Performance metrics (closed deals, revenue)

#### Client Assignment
- [ ] Assign client to different rep
- [ ] Bulk assign selected clients
- [ ] Transfer all clients from one rep to another
- [ ] "Claim" functionality already working ✅

#### API Endpoints Needed
```
GET  /api/users                    - List all users with stats
GET  /api/users/:id/clients        - Get user's assigned clients
GET  /api/users/:id/stats          - Get user performance metrics
PUT  /api/clients/:id/assign       - Assign client to user
POST /api/clients/bulk-assign      - Bulk assign multiple clients
```

### 2. 🔥 Admin Diagnostics Dashboard (HIGH)

#### User-Friendly Health View
- [ ] Simple status: ✅ All Systems Go / ⚠️ Issues Detected
- [ ] Color-coded indicators (non-technical)
- [ ] Plain English explanations

#### System Components
- [ ] Database: Connected/Disconnected
- [ ] API: Responding/Slow/Down
- [ ] Email: Working/Issues
- [ ] Payments: Working/Issues
- [ ] Simpli.fi: Connected/Issues

#### Monitoring
- [ ] Recent errors (last 24h) - simplified view
- [ ] Slow queries alert
- [ ] Failed login attempts
- [ ] API usage metrics

#### Quick Actions
- [ ] Clear cache button
- [ ] Test email button
- [ ] Refresh connections button
- [ ] Export logs button

### 3. Duplicate Client Cleanup (MEDIUM)

#### Identification
- [ ] Query to find duplicate/similar names
- [ ] UI to review potential duplicates
- [ ] Side-by-side comparison view

#### Merge Functionality
- [ ] Select primary record
- [ ] Merge activities, orders, contacts
- [ ] Delete duplicate record
- [ ] Audit log of merges

#### Known Duplicates (~20-30 pairs)
- Randy Marion (2 entries)
- Whitlyn's Boutique (2 entries)
- 15 to Fit Method Pilates (2 entries)
- 100% Chiropractic / 100% Chiropractice
- G&M Milling / GM Milling
- Customer Driven Staffing variations

---

## 📊 Current Data State

| Metric | Count |
|--------|-------|
| Total Clients | 2,812 |
| Active Clients | 122 |
| Prospect Clients | 2,690 |
| Open (unassigned) | ~2,135 |
| Claimed/Assigned | ~677 |
| Team Members | 18 |
| Activities Logged | 4,652 |

---

## 🗓️ Future Phases

### Phase 3: Sales Pipeline Enhancement
- [ ] Pipeline stages with probabilities
- [ ] Expected close dates
- [ ] Win/loss tracking
- [ ] Sales forecasting
- [ ] Commission tracking

### Phase 4: Reporting & Analytics
- [ ] Sales rep performance dashboards
- [ ] Revenue by brand/product
- [ ] Client lifetime value
- [ ] Churn analysis
- [ ] Activity reports

### Phase 5: Automation
- [ ] Auto-assign leads by territory
- [ ] Follow-up reminders
- [ ] Activity due dates
- [ ] Automated email sequences
- [ ] Stripe webhooks for payment status

### Phase 6: Client Portal
- [ ] Client self-service login
- [ ] View orders/invoices
- [ ] Make payments
- [ ] Download reports
- [ ] Update contact info

---

## 🔧 Technical Debt

### High Priority
- [ ] Fix CORS to reject unknown origins
- [ ] Strengthen password policy (12+ chars)
- [ ] Add Stripe webhook signature verification

### Medium Priority
- [ ] Input validation library
- [ ] API request logging
- [ ] Better error messages

### Low Priority
- [ ] Unit tests
- [ ] API documentation
- [ ] Performance monitoring

---

## 📅 Session History

### January 28, 2026 (Afternoon) - CRM Enhancement
- CRM View redesign with owner filter, sort, claim
- Updated 118 active clients from RAB data
- Fixed user ID mismatch (Auth ID vs DB ID)
- Added activity count and last touch indicators

### January 28, 2026 (Morning) - CRM Import
- Imported 2,800+ clients from RAB
- Imported 4,652 activities
- Built dual-view Clients page
- Performance optimization (single query)

### January 27, 2026 - Billing & Security
- Auto-generate invoices feature
- Security audit improvements (7.5→8.5)
- Added helmet, rate limiting

---

## ⚙️ Development Preferences

### File Delivery
- **Always provide complete files**
- No code snippets to insert
- User replaces entire file

### Git Workflow
```cmd
cd simplifi-reports
copy C:\Users\Justin\Downloads\file.js backend\file.js
git add backend/file.js
git commit -m "Description"
git push origin main
```
