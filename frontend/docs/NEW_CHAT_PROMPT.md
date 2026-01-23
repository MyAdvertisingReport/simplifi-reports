# New Chat Prompt Template
## Copy everything below this line to start a new session

---

# WSIC Advertising Platform - Development Session

## ⚠️ CRITICAL: Documentation Protocol

**START OF SESSION:**
1. Review all uploaded documents BEFORE making any changes
2. Confirm you understand current state by summarizing back to me
3. Ask for any missing files you need

**END OF SESSION:**
1. Update ROADMAP.md with completed tasks and current status
2. Update SESSION_SUMMARY.md with what we accomplished
3. Update FILE_STRUCTURE.md if any files added/moved
4. Provide the updated documents for me to save

**This documentation is our source of truth. Keep it accurate!**

---

## 📁 Uploaded Files
*(List files you're uploading)*

- [ ] ROADMAP.md - Project status and upcoming tasks
- [ ] SESSION_SUMMARY.md - What we did last session
- [ ] FILE_STRUCTURE.md - Complete file/folder layout
- [ ] *(Add specific files needed for today's task)*

---

## 🎯 Today's Goal
*(Describe what you want to accomplish)*

Example: "Continue building order workflow - add approval flow when pricing is changed from book value"

---

## 📍 Current State
*(Brief summary - or say "see SESSION_SUMMARY.md")*

- Last session: [what was done]
- Current blocker: [if any]
- Next task per roadmap: [task name]

---

## 🔗 Quick Reference

| Resource | Value |
|----------|-------|
| Production URL | https://myadvertisingreport.com |
| Backend API | https://simplifi-reports-production.up.railway.app |
| Frontend Host | Vercel |
| Backend Host | Railway |
| Database | Supabase (PostgreSQL) |
| Email | Postmark |

---

## 📋 Files You May Need to Request

### Backend (ask me to upload from `backend/`)
- `server.js` - Main server, route registration
- `routes/order.js` - Order endpoints
- `routes/email.js` - Email endpoints
- `services/email-service.js` - Postmark integration
- `database.js` - DB helpers

### Frontend (ask me to upload from `src/`)
- `App.jsx` - Main app, all pages
- `components/OrderForm.jsx` - Order creation
- `components/OrderList.jsx` - Order listing

### Config (root)
- `vercel.json` - Frontend routing/proxy
- `package.json` - Dependencies

---

**Ready? Please review my uploaded files and confirm what we're working on today.**
