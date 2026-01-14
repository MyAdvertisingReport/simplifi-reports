@echo off
REM ============================================
REM Simpli.fi Reports - Deployment Preparation Script
REM ============================================
REM This script reorganizes your project for deployment
REM Run this from your project root folder (simplifi-reports)
REM ============================================

echo.
echo ============================================
echo  Simpli.fi Reports - Deployment Prep Script
echo ============================================
echo.

REM Check if we're in the right folder
if not exist "backend" (
    echo ERROR: 'backend' folder not found!
    echo Please run this script from your simplifi-reports root folder.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: 'frontend' folder not found!
    echo Please run this script from your simplifi-reports root folder.
    pause
    exit /b 1
)

REM Create deployment-files folder if user hasn't already
if not exist "deployment-files" (
    echo Creating deployment-files folder...
    mkdir deployment-files
    echo.
    echo IMPORTANT: Before continuing, please download these files
    echo from Claude and save them to the 'deployment-files' folder:
    echo.
    echo   - App-v70.jsx
    echo   - server-production.js
    echo   - database-v8.js
    echo   - simplifi-client-v13.js
    echo   - report-center-service-v4.js
    echo   - backend-package.json
    echo   - frontend-package.json
    echo   - vite.config.js
    echo   - .gitignore
    echo   - .env.example
    echo   - railway.json
    echo   - QUICK_START.md
    echo   - DEPLOYMENT_GUIDE.md
    echo.
    pause
)

REM Verify deployment files exist
echo Checking for deployment files...
set MISSING=0

if not exist "deployment-files\App-v70.jsx" (
    echo   MISSING: App-v70.jsx
    set MISSING=1
)
if not exist "deployment-files\server-production.js" (
    echo   MISSING: server-production.js
    set MISSING=1
)
if not exist "deployment-files\database-v8.js" (
    echo   MISSING: database-v8.js
    set MISSING=1
)
if not exist "deployment-files\simplifi-client-v13.js" (
    echo   MISSING: simplifi-client-v13.js
    set MISSING=1
)
if not exist "deployment-files\backend-package.json" (
    echo   MISSING: backend-package.json
    set MISSING=1
)
if not exist "deployment-files\frontend-package.json" (
    echo   MISSING: frontend-package.json
    set MISSING=1
)
if not exist "deployment-files\.gitignore" (
    echo   MISSING: .gitignore
    set MISSING=1
)

if %MISSING%==1 (
    echo.
    echo Please download the missing files to 'deployment-files' folder and run again.
    pause
    exit /b 1
)

echo All required files found!
echo.

REM Create backup
echo Creating backup of current files...
if not exist "backup" mkdir backup
if not exist "backup\backend" mkdir backup\backend
if not exist "backup\frontend" mkdir backup\frontend
if not exist "backup\frontend\src" mkdir backup\frontend\src

if exist "backend\server.js" copy "backend\server.js" "backup\backend\server.js" >nul
if exist "backend\database.js" copy "backend\database.js" "backup\backend\database.js" >nul
if exist "backend\simplifi-client.js" copy "backend\simplifi-client.js" "backup\backend\simplifi-client.js" >nul
if exist "backend\package.json" copy "backend\package.json" "backup\backend\package.json" >nul
if exist "frontend\src\App.jsx" copy "frontend\src\App.jsx" "backup\frontend\src\App.jsx" >nul
if exist "frontend\package.json" copy "frontend\package.json" "backup\frontend\package.json" >nul
echo Backup created in 'backup' folder.
echo.

REM Update backend files
echo Updating backend files...
copy "deployment-files\server-production.js" "backend\server.js" >nul
echo   Updated: backend\server.js
copy "deployment-files\database-v8.js" "backend\database.js" >nul
echo   Updated: backend\database.js
copy "deployment-files\simplifi-client-v13.js" "backend\simplifi-client.js" >nul
echo   Updated: backend\simplifi-client.js

REM Copy report-center-service if exists
if exist "deployment-files\report-center-service-v4.js" (
    copy "deployment-files\report-center-service-v4.js" "backend\report-center-service.js" >nul
    echo   Updated: backend\report-center-service.js
)

copy "deployment-files\backend-package.json" "backend\package.json" >nul
echo   Updated: backend\package.json

REM Copy railway.json to backend
if exist "deployment-files\railway.json" (
    copy "deployment-files\railway.json" "backend\railway.json" >nul
    echo   Updated: backend\railway.json
)
echo.

REM Update frontend files
echo Updating frontend files...
copy "deployment-files\App-v70.jsx" "frontend\src\App.jsx" >nul
echo   Updated: frontend\src\App.jsx
copy "deployment-files\frontend-package.json" "frontend\package.json" >nul
echo   Updated: frontend\package.json

if exist "deployment-files\vite.config.js" (
    copy "deployment-files\vite.config.js" "frontend\vite.config.js" >nul
    echo   Updated: frontend\vite.config.js
)
echo.

REM Update root files
echo Updating root configuration files...
copy "deployment-files\.gitignore" ".gitignore" >nul
echo   Updated: .gitignore

if exist "deployment-files\.env.example" (
    copy "deployment-files\.env.example" ".env.example" >nul
    echo   Updated: .env.example
)

if exist "deployment-files\QUICK_START.md" (
    copy "deployment-files\QUICK_START.md" "QUICK_START.md" >nul
    echo   Updated: QUICK_START.md
)

if exist "deployment-files\DEPLOYMENT_GUIDE.md" (
    copy "deployment-files\DEPLOYMENT_GUIDE.md" "DEPLOYMENT_GUIDE.md" >nul
    echo   Updated: DEPLOYMENT_GUIDE.md
)
echo.

REM Create/update backend .env if it doesn't exist
if not exist "backend\.env" (
    echo Creating backend\.env template...
    (
        echo NODE_ENV=development
        echo PORT=3001
        echo JWT_SECRET=change-this-to-a-random-32-character-string
        echo SIMPLIFI_CLIENT_ID=your-client-id-here
        echo SIMPLIFI_CLIENT_SECRET=your-client-secret-here
        echo SIMPLIFI_APP_API_KEY=your-api-key-here
        echo FRONTEND_URL=http://localhost:5173
    ) > "backend\.env"
    echo   Created: backend\.env (UPDATE WITH YOUR CREDENTIALS!)
) else (
    echo   Skipped: backend\.env already exists
)
echo.

REM Ensure data directory exists for SQLite
if not exist "backend\data" (
    mkdir "backend\data"
    echo   Created: backend\data directory
)

REM Ensure uploads directory exists
if not exist "backend\uploads" (
    mkdir "backend\uploads"
    echo   Created: backend\uploads directory
)
echo.

echo ============================================
echo  REORGANIZATION COMPLETE!
echo ============================================
echo.
echo Your project structure is now:
echo.
echo   simplifi-reports\
echo   ├── backend\
echo   │   ├── server.js (updated)
echo   │   ├── database.js (updated)
echo   │   ├── simplifi-client.js (updated)
echo   │   ├── report-center-service.js
echo   │   ├── package.json (updated)
echo   │   ├── railway.json (new)
echo   │   ├── .env (your credentials)
echo   │   ├── data\
echo   │   └── uploads\
echo   ├── frontend\
echo   │   ├── src\
echo   │   │   └── App.jsx (updated)
echo   │   ├── package.json (updated)
echo   │   └── vite.config.js (updated)
echo   ├── backup\ (your old files)
echo   ├── deployment-files\ (source files)
echo   ├── .gitignore (new)
echo   ├── .env.example (new)
echo   ├── QUICK_START.md (new)
echo   └── DEPLOYMENT_GUIDE.md (new)
echo.
echo ============================================
echo  NEXT STEPS:
echo ============================================
echo.
echo 1. UPDATE backend\.env with your actual Simpli.fi credentials
echo.
echo 2. TEST LOCALLY:
echo    - Open terminal in backend folder: npm install ^&^& npm start
echo    - Open terminal in frontend folder: npm install ^&^& npm run dev
echo    - Open http://localhost:5173
echo.
echo 3. If everything works, follow QUICK_START.md for deployment!
echo.
pause
