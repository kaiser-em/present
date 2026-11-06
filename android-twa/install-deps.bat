@echo off
REM Install all dependencies for TWA setup on Windows

echo 🚀 Installing Present TWA Dependencies
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is required. Install from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js: %NODE_VERSION%
echo ✅ npm: %NPM_VERSION%
echo.

echo 📦 Installing Railway CLI...
call npm install -g @railway/cli

echo 📦 Installing Bubblewrap...
call npm install -g @bubblewrap/cli

echo.
echo ✅ All dependencies installed!
echo.
echo 📋 Next steps:
echo 1. Deploy PWA: railway login ^&^& railway up
echo 2. Initialize TWA: bubblewrap init --manifest https://YOUR_URL/manifest.json
echo 3. Build APK: bubblewrap build
echo.
echo See SETUP.md for detailed instructions
pause
