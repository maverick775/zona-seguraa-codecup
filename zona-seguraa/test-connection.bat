@echo off
REM Supabase Connection Test - Windows Batch File
REM Run this script to test your Supabase connection

echo.
echo ==========================================
echo   Supabase Connection Test - Zona SeguRAA
echo ==========================================
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ❌ ERROR: .env.local file not found!
    echo.
    echo Please create .env.local with your Supabase credentials:
    echo NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
    echo SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
    echo.
    pause
    exit /b 1
)

REM Check if node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Run the test
echo 🚀 Running Supabase connection test...
echo.
node scripts/test-supabase-connection.js

echo.
echo Test completed. Check the results above.
pause
