# Present Android App - Quick Start (30 Minutes)

The fastest path from your PWA to Play Store.

---

## ⚡ Speed Run (30 min to APK)

### 1. Deploy PWA (10 min)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
cd D:\Labs\present-app-2.5.0\present
railway login
railway init
railway up

# Get your URL
railway domain
# Example output: https://present-app-production.up.railway.app
```

✅ **Save this URL** - you'll need it in step 2

---

### 2. Build Android App (15 min)

```bash
# Install Bubblewrap
npm install -g @bubblewrap/cli

# Create TWA
cd android-twa
bubblewrap init --manifest https://YOUR_RAILWAY_URL/manifest.json
```

**Interactive prompts (just press Enter for most):**
- Package name: `com.present.habittracker` ✅
- App name: `Present` ✅
- Start URL: `/` ✅
- Icon: Accept defaults ✅
- Notifications: `y` ✅
- Display mode: `standalone` ✅

```bash
# Build APK
bubblewrap build

# When prompted for keystore password, create a strong one
# WRITE IT DOWN - you'll need it for updates
```

✅ **Output:** `app-release-signed.apk`

---

### 3. Configure Digital Asset Links (5 min)

```bash
# Get your SHA-256 fingerprint
keytool -list -v -keystore app-release-bundle.keystore -alias present-key

# Copy the SHA256 line, remove colons
# Example: AA:BB:CC → AABBCC
```

**Update `.well-known/assetlinks.json`:**

Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT_AFTER_BUILDING_APK` with your fingerprint.

**Redeploy:**

```bash
cd ..
railway up
```

**Verify it's accessible:**
```bash
curl https://YOUR_RAILWAY_URL/.well-known/assetlinks.json
```

---

### 4. Test on Your Phone (5 min)

```bash
# Connect Android device via USB
adb install app-release-signed.apk

# Or email APK to yourself and install
```

**Open the app. It should:**
- ✅ Show no browser UI
- ✅ Display your PWA full-screen
- ✅ Work offline
- ✅ Show notifications (if you granted permission)

---

## 🎯 Done! What You Have Now

- ✅ Production PWA hosted on Railway
- ✅ Android APK ready to install
- ✅ No browser chrome (true native feel)
- ✅ Working notifications
- ✅ Offline support

---

## 🚀 Next: Play Store (1-2 hours)

### Prep Checklist

- [ ] Take 8 screenshots (phone + tablet)
- [ ] Create 1024×500 feature graphic
- [ ] Write privacy policy page
- [ ] Pay $25 Play Console fee
- [ ] Generate AAB: `bubblewrap build`
- [ ] Upload to Internal Testing first
- [ ] Test for 1-2 weeks
- [ ] Submit to Production

**Full guide:** See `DEPLOYMENT.md` Step 6-8

---

## 🔥 Pro Tips

### Update Your PWA Only

```bash
# 99% of updates only need this
git commit -am "New feature"
railway up
```

Users get updates instantly. No app store approval needed.

### Only Update Android App When:

- Changing app icon
- Adding permissions (camera, location)
- Changing package name
- Updating TWA config

```bash
# Edit bubblewrap-config.json, increment versionCode
bubblewrap build
# Upload new AAB to Play Console
```

---

## 🐛 Troubleshooting

**Browser bar still visible?**
```bash
# Wait 24-48h for Google to index assetlinks.json
# Or clear app data and reinstall
```

**App won't install?**
```bash
# Enable "Install from unknown sources" in Android settings
```

**White screen on open?**
```bash
# Check PWA loads in browser: https://YOUR_RAILWAY_URL
# Check service worker is registered
```

**Notifications not working?**
```javascript
// Add to your PWA
if ('Notification' in window) {
  Notification.requestPermission();
}
```

---

## 📊 File Structure After Setup

```
present/
├── android-twa/
│   ├── app-release-signed.apk       ← Install this
│   ├── app-release-bundle.aab       ← Upload to Play Store
│   ├── bubblewrap-config.json
│   └── app-release-bundle.keystore  ← BACK THIS UP!
├── .well-known/
│   └── assetlinks.json              ← Must be accessible
├── Procfile                          ← Railway needs this
└── railway.json                      ← Railway config
```

---

## 💾 Backup Your Keystore

**CRITICAL:** Without your keystore, you can't update your app.

```bash
# Backup NOW
cp android-twa/app-release-bundle.keystore ~/Backups/
cp android-twa/app-release-bundle.keystore ~/Dropbox/

# Or commit to PRIVATE git repo (NOT public!)
```

**Store password in password manager.**

---

## 🎉 Success Metrics

After 1 week of testing:
- App installs without issues
- No browser UI visible
- Offline mode works
- Notifications arrive
- No crashes

→ **You're ready for Play Store**

---

## 💡 Cost Breakdown

| Item | Cost |
|------|------|
| Railway hosting | $0/month (hobby tier) |
| Domain (optional) | $12/year |
| Play Console | $25 one-time |
| SSL certificate | Free (Let's Encrypt) |
| **Total Year 1** | **$25-37** |

---

## ⏱️ Time Investment

- Initial setup: 30 minutes (this guide)
- Play Store assets: 1-2 hours
- Testing: 1-2 weeks
- Updates: 5 minutes (web only)

**Total to launch: ~2 weeks** (mostly waiting for review)

---

## 📞 Need Help?

**Common issues:**
- https://github.com/GoogleChromeLabs/bubblewrap/issues
- https://stackoverflow.com/questions/tagged/trusted-web-activity

**Railway support:**
- https://railway.app/discord

**Your PWA issues:**
- Test at: https://www.pwabuilder.com/

---

Ready to go? Start with step 1! 🚀
