# Quick Start Deployment Guide

## What You Need
- Your GitHub account (✅ you have this)
- Your Simpli.fi API credentials (✅ you have these)
- 30 minutes of time

---

## STEP 1: Organize Your Local Project (5 min)

Create this folder structure on your computer:

```
simplifi-reports/
├── backend/
│   ├── server.js          (copy from server-v22.js or server-production.js)
│   ├── database.js         (copy from database-v8.js)
│   ├── simplifi-client.js  (copy from simplifi-client-v13.js)
│   ├── report-center-service.js (copy from report-center-service-v4.js)
│   ├── package.json        (copy from backend-package.json)
│   └── .env               (create with your credentials - see below)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        (copy from App-v70.jsx)
│   │   ├── main.jsx       (your existing file)
│   │   └── index.css      (your existing file)
│   ├── public/
│   │   └── index.html     (your existing file)
│   ├── package.json       (copy from frontend-package.json)
│   └── vite.config.js     (copy from vite.config.js)
├── .gitignore             (copy from .gitignore)
├── .env.example           (copy from .env.example)
├── railway.json           (copy from railway.json)
└── README.md              (copy from README.md)
```

### Create backend/.env file:
```
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key-make-it-long-and-random-at-least-32-chars
SIMPLIFI_CLIENT_ID=your-actual-client-id
SIMPLIFI_CLIENT_SECRET=your-actual-client-secret
SIMPLIFI_APP_API_KEY=your-actual-api-key
FRONTEND_URL=http://localhost:5173
```

---

## STEP 2: Test Locally First (5 min)

Open TWO terminal windows:

**Terminal 1 (Backend):**
```bash
cd simplifi-reports/backend
npm install
npm start
```
Should see: "Server running on port 3001"

**Terminal 2 (Frontend):**
```bash
cd simplifi-reports/frontend
npm install
npm run dev
```
Should see: "Local: http://localhost:5173"

Open http://localhost:5173 and verify everything works.

---

## STEP 3: Push to GitHub (5 min)

1. Go to https://github.com/new
2. Create new repository named `simplifi-reports`
3. Make it **Private**
4. Do NOT check "Add README" or any other options
5. Click "Create repository"

Now in your terminal (from simplifi-reports folder):

```bash
# Initialize git
git init

# Add all files (except .env which is in .gitignore)
git add .

# Create first commit
git commit -m "Initial commit"

# Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/simplifi-reports.git

# Push to GitHub
git push -u origin main
```

You may be prompted to login to GitHub - use your username and a Personal Access Token (not your password).

---

## STEP 4: Deploy Backend to Railway (10 min)

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway
4. Click "New Project" → "Deploy from GitHub repo"
5. Select your `simplifi-reports` repository
6. Click on the created service

### Configure the service:
1. Go to **Settings** tab
2. Find "Root Directory" → change to `backend`
3. Find "Start Command" → set to `node server.js`

### Add environment variables:
Go to **Variables** tab and add each one:

```
NODE_ENV = production
PORT = 3001
JWT_SECRET = (generate a random 32+ character string)
SIMPLIFI_CLIENT_ID = (your actual client ID)
SIMPLIFI_CLIENT_SECRET = (your actual client secret)
SIMPLIFI_APP_API_KEY = (your actual API key)
FRONTEND_URL = https://your-app.vercel.app
```

### Add PostgreSQL Database:
1. Click "New" in the project
2. Select "Database" → "PostgreSQL"
3. Wait for it to provision
4. Railway automatically adds DATABASE_URL

### Get your backend URL:
1. Go to **Settings** tab
2. Under "Networking" → "Generate Domain"
3. Copy the URL (like `simplifi-reports-production.up.railway.app`)

---

## STEP 5: Deploy Frontend to Vercel (5 min)

1. Go to https://vercel.com
2. Click "Login" → "Continue with GitHub"
3. Click "Add New" → "Project"
4. Select your `simplifi-reports` repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
6. Click "Environment Variables" and add:
   ```
   VITE_API_URL = https://your-railway-url.up.railway.app
   ```
7. Click "Deploy"

### Get your frontend URL:
After deploy, copy your Vercel URL (like `simplifi-reports.vercel.app`)

---

## STEP 6: Final Configuration (2 min)

1. Go back to Railway
2. Update the `FRONTEND_URL` variable with your Vercel URL
3. Railway will auto-redeploy

---

## STEP 7: Create Your Admin User

You'll need to create the first admin user. Run this locally:

```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password-here', 10);
console.log('Password hash:', hash);
"
```

Then you can either:
- Use the existing add-admin.js script locally connected to production
- Or manually insert via Railway's database panel

---

## DONE! 🎉

Your app is now live at your Vercel URL!

---

## Troubleshooting

### "Cannot connect to API"
- Check Railway logs for errors
- Verify VITE_API_URL in Vercel matches Railway URL
- Check FRONTEND_URL in Railway matches Vercel URL

### "Database error"
- Make sure PostgreSQL is provisioned in Railway
- Check that DATABASE_URL variable exists

### "Login not working"
- Verify JWT_SECRET is set in Railway
- Check that an admin user exists in database

---

## Updating the App

To push updates:

```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

Railway and Vercel will automatically redeploy!

---

## Setting Up Staging (Optional)

```bash
# Create staging branch
git checkout -b staging
git push origin staging
```

Then create separate Railway/Vercel projects pointing to `staging` branch.
