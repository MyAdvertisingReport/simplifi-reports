# Simpli.fi Reports Platform - Deployment Guide

## Overview

This guide will walk you through deploying the Simpli.fi Reports Platform to production with:
- **Frontend**: Vercel (free tier)
- **Backend**: Railway.app ($5/month)
- **Database**: PostgreSQL on Railway
- **Staging Environment**: Separate instances for testing

---

## Prerequisites

1. **GitHub Account** ✅ (You have this)
2. **Vercel Account** - Sign up at https://vercel.com (use GitHub login)
3. **Railway Account** - Sign up at https://railway.app (use GitHub login)
4. **Your Simpli.fi API Credentials** (you already have these)

---

## Step 1: Prepare Your Local Project

Your project should have this structure:

```
simplifi-reports/
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── simplifi-client.js
│   ├── report-center-service.js
│   ├── package.json
│   └── .env (DO NOT COMMIT - add to .gitignore)
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── index.html
├── .gitignore
├── README.md
└── railway.json (for deployment)
```

### Update your files to latest versions:

1. Copy `App-v70.jsx` → `frontend/src/App.jsx`
2. Copy `server-v22.js` → `backend/server.js`
3. Copy `database-v8.js` → `backend/database.js`
4. Copy `simplifi-client-v13.js` → `backend/simplifi-client.js`
5. Copy `report-center-service-v4.js` → `backend/report-center-service.js`

---

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `simplifi-reports` (or your preference)
3. Make it **Private** (contains API credentials references)
4. Do NOT initialize with README (you'll push existing code)

### Push your code:

```bash
# In your project root folder
cd simplifi-reports

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Simpli.fi Reports Platform"

# Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/simplifi-reports.git

# Push to main branch
git push -u origin main

# Create staging branch
git checkout -b staging
git push -u origin staging

# Go back to main
git checkout main
```

---

## Step 3: Deploy Backend to Railway

### 3.1 Create Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your `simplifi-reports` repository
6. Railway will detect the backend folder

### 3.2 Configure Backend Service

1. In Railway dashboard, click on your service
2. Go to "Settings" → "Root Directory" → Set to `backend`
3. Go to "Variables" tab and add:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-make-it-long-and-random
SIMPLIFI_CLIENT_ID=your-client-id
SIMPLIFI_CLIENT_SECRET=your-client-secret
SIMPLIFI_APP_API_KEY=your-api-key
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
```

### 3.3 Add PostgreSQL Database

1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway automatically creates `DATABASE_URL` variable
3. The backend will use this for production

### 3.4 Deploy

1. Railway auto-deploys when you push to GitHub
2. Check "Deployments" tab for status
3. Once deployed, note your backend URL (e.g., `https://simplifi-reports-production.up.railway.app`)

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Vercel Project

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your `simplifi-reports` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4.2 Add Environment Variables

In Vercel project settings → Environment Variables:

```
VITE_API_URL=https://your-backend.up.railway.app
```

### 4.3 Deploy

1. Click "Deploy"
2. Vercel builds and deploys automatically
3. Note your frontend URL (e.g., `https://simplifi-reports.vercel.app`)

### 4.4 Update Backend CORS

Go back to Railway and update the `FRONTEND_URL` variable with your actual Vercel URL.

---

## Step 5: Set Up Staging Environment

### 5.1 Create Staging Branch Deployments

**Railway (Backend Staging):**
1. In Railway, click "New" → "Service"
2. Select same GitHub repo
3. Set "Branch" to `staging`
4. Set "Root Directory" to `backend`
5. Add same environment variables but with staging database

**Vercel (Frontend Staging):**
1. Vercel automatically creates preview deployments for branches
2. Or create a separate project pointing to `staging` branch

### 5.2 Workflow

```
Development → staging branch → Test on staging → Merge to main → Production
```

---

## Step 6: Database Migration (SQLite → PostgreSQL)

The backend needs to be updated to support PostgreSQL in production while keeping SQLite for local development.

See the `database-postgres.js` file in the deployment package.

---

## Step 7: Add Admin Debug Panel

The deployment includes an admin-only debug panel at `/admin/debug` that shows:
- System health
- API connection status
- Recent errors
- Database stats

---

## Step 8: Set Up Error Monitoring (Optional but Recommended)

### Sentry.io Setup:

1. Sign up at https://sentry.io (free tier)
2. Create a new project (Node.js for backend, React for frontend)
3. Add to backend:

```bash
cd backend
npm install @sentry/node
```

4. Add to frontend:

```bash
cd frontend
npm install @sentry/react
```

5. Add Sentry DSN to environment variables

---

## Deployment Checklist

### Before First Deploy:
- [ ] Update all files to latest versions
- [ ] Create `.gitignore` with sensitive files
- [ ] Create `.env.example` (without real values)
- [ ] Test locally one more time

### Railway (Backend):
- [ ] Connected to GitHub repo
- [ ] Root directory set to `backend`
- [ ] All environment variables added
- [ ] PostgreSQL database added
- [ ] Deployment successful

### Vercel (Frontend):
- [ ] Connected to GitHub repo
- [ ] Root directory set to `frontend`
- [ ] VITE_API_URL set to Railway backend URL
- [ ] Deployment successful

### Post-Deploy:
- [ ] Update Railway FRONTEND_URL with Vercel URL
- [ ] Test login
- [ ] Test API connections
- [ ] Create first admin user
- [ ] Test all features

---

## Rollback Procedure

### If something breaks:

**Option 1: Revert in Git**
```bash
git revert HEAD
git push origin main
```

**Option 2: Railway Rollback**
1. Go to Railway → Deployments
2. Click on previous working deployment
3. Click "Rollback"

**Option 3: Vercel Rollback**
1. Go to Vercel → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## Commands Reference

### Local Development:
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Git Workflow:
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, then commit
git add .
git commit -m "Description of changes"

# Push to staging for testing
git checkout staging
git merge feature/my-feature
git push origin staging

# After testing, merge to production
git checkout main
git merge staging
git push origin main
```

---

## Support

If you encounter issues:
1. Check Railway logs: Dashboard → Service → Logs
2. Check Vercel logs: Dashboard → Project → Functions
3. Check browser console for frontend errors
4. Review this guide's troubleshooting section

---

## Next Steps

1. Follow Steps 1-6 in order
2. Once deployed, create your admin user
3. Add team members
4. Monitor with Sentry (optional)
5. Enjoy your deployed platform! 🎉
