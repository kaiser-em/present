@echo off
REM Complete TWA build and deployment script for Windows

setlocal enabledelayedexpansion

set RAILWAY_URL=%1

if "%RAILWAY_URL%"=="" (
    echo ❌ Usage: build-twa.bat https://your-railway-url.up.railway.app
    pause
    exit /b 1
)

echo 🚀 Building Present TWA
echo URL: %RAILWAY_URL%
echo.

cd /d "%~dp0"

echo 📝 Updating bubblewrap configuration...
powershell -Command "(Get-Content bubblewrap-config.json) -replace 'YOUR_DOMAIN.com', '%RAILWAY_URL%' | Set-Content bubblewrap-config.json"
echo ✅ Config updated
echo.

echo 🔨 Building APK...
call bubblewrap build

echo.
echo ✅ Build complete!
echo.
echo 📦 Output files:
if exist app-release-signed.apk (
    echo   ✅ APK ready for testing
)
if exist app-release-bundle.aab (
    echo   ✅ AAB ready for Play Store
)
if exist app-release-bundle.keystore (
    echo   ✅ Keystore ready ^(BACKUP THIS!^)
)
echo.

echo 🔑 Extracting SHA-256 fingerprint...
for /f "tokens=*" %%i in ('keytool -list -v -keystore app-release-bundle.keystore -alias present-key 2^>nul ^| find "SHA256:" ^| findstr /r "SHA256:"') do (
    set FINGERPRINT=%%i
)

if "%FINGERPRINT%"=="" (
    echo ⚠️  Could not extract fingerprint. You may need to run:
    echo   keytool -list -v -keystore app-release-bundle.keystore -alias present-key
) else (
    echo ✅ Fingerprint found
    echo.
    echo 📋 Update .well-known\assetlinks.json with this fingerprint value
)

echo.
echo 🎯 Next steps:
echo 1. Update .well-known\assetlinks.json with the SHA-256 fingerprint
echo 2. Redeploy PWA: cd .. ^&^& railway up
echo 3. Test on device: adb install app-release-signed.apk
echo 4. For Play Store: Upload app-release-bundle.aab to Play Console
echo.
pause
