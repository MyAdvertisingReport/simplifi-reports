# Claude Instructions - WSIC Advertising Platform
## Read This First Every Session

---

## ⚠️ CRITICAL RULES

### 1. Documentation is Sacred
**These files are our source of truth. Keep them accurate!**

| File | Purpose | When to Update |
|------|---------|----------------|
| ROADMAP.md | Project status, completed features, next tasks | Every session end |
| SESSION_SUMMARY.md | What we did, decisions made, next steps | Every session end |
| FILE_STRUCTURE.md | Complete file/folder layout | When files added/moved |
| NEW_CHAT_PROMPT.md | Template for starting sessions | If process changes |

### 2. Always Request Files First
**NEVER assume file contents from memory.** Always ask user to upload current files before editing.

✅ DO: "Please upload `server.js` so I can see the current code"
❌ DON'T: "Based on what we did last time, the file should look like..."

### 3. Start of Session Checklist
1. [ ] Review uploaded ROADMAP.md
2. [ ] Review uploaded SESSION_SUMMARY.md
3. [ ] Review uploaded FILE_STRUCTURE.md
4. [ ] Summarize current state back to user
5. [ ] Confirm today's goal
6. [ ] Request any additional files needed

### 4. End of Session Checklist
1. [ ] Update ROADMAP.md with completed tasks
2. [ ] Update SESSION_SUMMARY.md with session details
3. [ ] Update FILE_STRUCTURE.md if files changed
4. [ ] Provide all updated docs to user
5. [ ] List files user needs to commit

---

## 🏗️ Project Architecture

### Hosting
- **Frontend:** Vercel (React + Vite)
- **Backend:** Railway (Node.js + Express)
- **Database:** Supabase (PostgreSQL)
- **Email:** Postmark
- **Payments:** Stripe

### Mono-Repo Structure
```
simplifi-reports/          ← Git root
├── backend/               ← Railway
└── frontend/              ← Vercel
```

**All git commands must use full paths from root:**
```bash
git add backend/server.js frontend/src/components/ClientSigningPage.jsx
```

### Key URLs
| Resource | URL |
|----------|-----|
| Production | https://myadvertisingreport.com |
| Backend Direct | https://simplifi-reports-production.up.railway.app |

---

## 💳 Payment Integration Notes

### Stripe Elements (PCI Compliant)
- Card data NEVER touches our server
- Use SetupIntent flow for saving payment methods
- Frontend: Load Stripe.js, mount Card Element
- Backend: Create SetupIntent, return client secret
- After confirmation: Receive payment_method_id only

### Per-Entity Stripe Accounts
- WSIC, LKN, LWP each have separate Stripe accounts
- Select based on primary entity in order items
- Store `stripe_entity_code` on order

### Payment Flow
```
1. Client enters Step 2 → POST /setup-intent
2. Backend creates customer + SetupIntent
3. Frontend mounts Stripe Card Element
4. User enters card → Stripe tokenizes
5. stripe.confirmCardSetup() → payment_method_id
6. POST /complete with payment_method_id
7. Backend attaches to customer, updates order
```

---

## 📧 Email Template Rules

### Outlook Compatibility
```html
<!-- ✅ CORRECT - solid color fallback -->
<div style="background-color: #1e3a8a; background: linear-gradient(...);">

<!-- ❌ WRONG - gradient only -->
<div style="background: linear-gradient(...);">
```

### Text Colors
```html
<!-- ✅ CORRECT - explicit with !important -->
<h1 style="color: #ffffff !important;">

<!-- ❌ WRONG - rgba or missing -->
<h1 style="color: rgba(255,255,255,0.9);">
```

### Email Functions
- `sendContractToClient` - Contract ready to sign
- `sendSignatureConfirmation` - Card payment complete
- `sendAchSetupEmail` - ACH needs bank verification
- Check `billing_preference` to determine which to send

---

## 🧪 Testing Guidelines

### Test Backend Directly
```javascript
fetch('https://simplifi-reports-production.up.railway.app/api/endpoint', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log);
```

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

### Check Railway Logs
Railway Dashboard → Project → Deployments → View Logs

---

## 📁 File Locations Quick Reference

| Task | Files |
|------|-------|
| Client signing | `ClientSigningPage.jsx`, `server.js` |
| Email templates | `email-service.js` |
| Payment processing | `server.js` (setup-intent, complete endpoints) |
| Order workflow | `server.js`, `OrderForm.jsx` |
| Add new page | `App.jsx` (routes at end) |

### App.jsx is HUGE (~10k lines)
Specify section when requesting:
- "Upload App.jsx routes section"
- "Upload the sidebar section of App.jsx"

---

## 🚨 Common Issues & Solutions

### 405 Method Not Allowed
**Cause:** Request going to frontend instead of backend
**Fix:** Check `vercel.json` proxy configuration

### Stripe "Can only create one Element"
**Cause:** Card element created multiple times
**Fix:** Track `cardMounted` state, destroy before recreating

### Email Text Invisible
**Cause:** Gradient background not rendering in Outlook
**Fix:** Add solid `background-color` before gradient

### CORS Errors
**Cause:** Request going to wrong server
**Fix:** Verify `vercel.json` proxy, check Network tab

---

## 📋 Code Style Preferences

### Backend (Node.js)
- Async/await over callbacks
- Console.log with `[Module]` prefix
- Defensive null checks
- Try/catch with user-friendly error messages

### Frontend (React)
- Functional components with hooks
- Inline styles (no CSS modules)
- State at top of component
- useEffect for data fetching

### Stripe Integration
- Never send raw card data
- Always use Elements or Checkout
- Track mounted state for elements
- Clean up on unmount/preference change

---

## 🔄 Git Workflow

After each session:
```bash
cd simplifi-reports
git add backend/... frontend/...
git commit -m "Description of changes"
git push origin main
```

Railway auto-deploys on push.
Vercel auto-deploys on push.

---

## 📞 When Stuck

1. **Check Railway logs** for backend errors
2. **Check browser Network tab** for request/response
3. **Test API directly** against Railway URL
4. **Review vercel.json** for routing issues
5. **Check Stripe dashboard** for payment errors
6. **Ask user to upload** relevant files fresh
