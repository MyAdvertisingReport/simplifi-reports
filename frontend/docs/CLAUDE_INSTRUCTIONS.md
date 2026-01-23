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

✅ DO: "Please upload `routes/order.js` so I can see the current code"
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

### API Routing
Frontend uses `vercel.json` to proxy `/api/*` requests to Railway:
```json
{ "source": "/api/:path*", "destination": "https://simplifi-reports-production.up.railway.app/api/:path*" }
```
**No `VITE_API_URL` needed when using this proxy.**

### Key URLs
| Resource | URL |
|----------|-----|
| Production | https://myadvertisingreport.com |
| Backend Direct | https://simplifi-reports-production.up.railway.app |

---

## 🧪 Testing Guidelines

### Test Backend Directly
When debugging, test the Railway backend directly to isolate frontend vs backend issues:
```javascript
fetch('https://simplifi-reports-production.up.railway.app/api/endpoint', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log);
```

### Check Railway Logs
Railway Dashboard → Project → Deployments → View Logs
- Look for `✓` success messages
- Look for `⚠` warnings
- Look for stack traces on errors

### Email Testing
Postmark is pending approval - only send to `@myadvertisingreport.com` addresses:
```javascript
fetch('/api/email/test', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ to: 'billing@myadvertisingreport.com' })
}).then(r => r.json()).then(console.log);
```

---

## 📁 File Locations Quick Reference

### When Working On...

| Task | Files to Request |
|------|-----------------|
| Email features | `routes/email.js`, `services/email-service.js` |
| Order workflow | `routes/order.js`, `components/OrderForm.jsx`, `App.jsx` |
| New frontend page | `App.jsx` (specify which section) |
| API issues | `vercel.json`, `server.js` |
| Database | `database.js` |
| Authentication | `server.js` (lines 165-230) |

### App.jsx is HUGE
~10,000+ lines. When requesting, ask for specific sections:
- "Upload App.jsx lines 9043-9200 (SettingsPage)"
- "Upload the ClientDetailPage section of App.jsx"

---

## 🚨 Common Issues & Solutions

### 405 Method Not Allowed
**Cause:** Request going to frontend instead of backend
**Check:** `vercel.json` has API proxy rule
**Fix:** Ensure proxy rule comes BEFORE catch-all

### Blank Page / "t is not iterable"
**Cause:** API returning unexpected data format
**Check:** Test API endpoint directly against Railway
**Fix:** Add defensive checks for null/undefined data

### Email Not Sending
**Check:** 
1. `/api/email/status` returns `configured: true`
2. Railway logs show `✓ Postmark email client initialized`
3. Postmark account is active
4. Sending to approved domain (if pending approval)

### CORS Errors
**Cause:** Usually means request going to wrong server
**Check:** Network tab to see actual URL being called
**Fix:** Verify `vercel.json` proxy configuration

---

## 📋 Code Style Preferences

### Backend (Node.js)
- Use async/await over callbacks
- Add console.log with `[Module]` prefix for debugging
- Defensive null checks on API responses
- Export functions at end of file

### Frontend (React)
- Functional components with hooks
- Inline styles (project doesn't use CSS modules)
- State at top of component
- useEffect for data fetching

### Error Handling
```javascript
// Backend
try {
  const result = await someOperation();
  res.json(result);
} catch (error) {
  console.error('[Module] Operation failed:', error);
  res.status(500).json({ 
    error: 'User-friendly message',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// Frontend
try {
  const data = await api.get('/api/endpoint');
  setData(data);
} catch (error) {
  console.error('Failed to load:', error);
  setError(error.message);
}
```

---

## 🔄 Git Workflow

After each session, user should:
```bash
git add .
git commit -m "Description of changes"
git push
```

Railway auto-deploys on push to main.
Vercel auto-deploys on push to main.

---

## 📞 When Stuck

1. **Check Railway logs** for backend errors
2. **Check browser Network tab** for request/response details
3. **Test API directly** against Railway URL
4. **Review vercel.json** for routing issues
5. **Ask user to upload** the relevant files fresh
