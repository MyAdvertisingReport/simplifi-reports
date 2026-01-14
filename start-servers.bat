@echo off
echo ========================================
echo   Starting Simpli.fi Reports
echo   (Frontend + Backend)
echo ========================================
echo.

set BACKEND=C:\Users\WSIC BILLING\Desktop\simplifi-reports\backend
set FRONTEND=C:\Users\WSIC BILLING\Desktop\simplifi-reports\frontend

echo Starting Backend in new window...
start "Backend" cmd /k cd /d "%BACKEND%" ^&^& npm start

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Frontend in new window...
start "Frontend" cmd /k cd /d "%FRONTEND%" ^&^& npm run dev

echo.
echo ========================================
echo   Both servers starting!
echo   
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo ========================================
echo.
echo You can close this window.
pause
