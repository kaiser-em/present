# Present Android TWA - Installation Guide

**Status:** Node.js not installed yet. Start here.

---

## Step 1: Install Node.js (Required for Bubblewrap)

Download and install from https://nodejs.org/ (LTS version recommended)

Once installed, verify:
```bash
node --version
npm --version
```

---

## Step 2: Deploy PWA to Railway

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Login
railway login

# Go to project root
cd ..

# Initialize
railway init

# Deploy
railway up
```

**Save the URL** you get from `railway domain`

---

## Step 3: Install Bubblewrap

```bash
npm install -g @bubblewrap/cli

# Verify
bubblewrap --version
```

---

## Step 4: Initialize TWA

```bash
cd android-twa

# Interactive setup
bubblewrap init --manifest https://YOUR_RAILWAY_URL/manifest.json
```

**When prompted:**
- Package name: `com.present.habittracker`
- App name: `Present`
- Start URL: `/`
- Display mode: `standalone`
- Notifications: `yes`

---

## Step 5: Build APK

```bash
bubblewrap build
```

**When prompted for keystore password:** Create a strong password and save it.

**Output files:**
- `app-release-signed.apk` - Install on device
- `app-release-bundle.aab` - Upload to Play Store
- `app-release-bundle.keystore` - **BACKUP THIS**

---

## Step 6: Get SHA-256 Fingerprint

```bash
keytool -list -v -keystore app-release-bundle.keystore -alias present-key
```

Find the line: `SHA256: AA:BB:CC:...`

Copy it (remove colons): `AABBCC...`

---

## Step 7: Update Digital Asset Links

Edit `../.well-known/assetlinks.json` and replace:
```
REPLACE_WITH_YOUR_SHA256_FINGERPRINT_AFTER_BUILDING_APK
```

With your actual fingerprint.

---

## Step 8: Redeploy

```bash
cd ..
railway up
```

Verify it's accessible:
```bash
# On Windows PowerShell:
(Invoke-WebRequest -Uri "https://YOUR_RAILWAY_URL/.well-known/assetlinks.json").Content
```

---

## Step 9: Test on Device

```bash
cd android-twa

# Connect device via USB
adb install app-release-signed.apk
```

**What to check:**
- No browser UI visible ✅
- App opens to full screen ✅
- Offline mode works ✅

---

## Next: Play Store

See `DEPLOYMENT.md` for full Play Store submission guide.

