# Present App - Android Deployment Guide

## Prerequisites

1. **Node.js 18+** (for Bubblewrap CLI)
2. **Android Studio** (latest stable)
3. **Java JDK 11+**
4. **A deployed web server** running your PWA

---

## Step 1: Deploy PWA to Production

### Option A: Railway (Recommended - Free tier)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd D:\Labs\present-app-2.5.0\present
railway init

# Deploy
railway up
```

**Configure Railway:**
- Add `PORT` environment variable (Railway provides this)
- Add `PRESENT_TOKEN` for security
- Set start command: `python server.py --host 0.0.0.0 --port $PORT`

### Option B: Render

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Build command: `pip install -r requirements.txt`
5. Start command: `python server.py --host 0.0.0.0 --port $PORT`
6. Environment:
   - Add `PRESENT_TOKEN=your-secret-token`

### Option C: DigitalOcean App Platform

```bash
# Create app.yaml
cat > app.yaml << 'EOF'
name: present-app
services:
- name: web
  github:
    repo: your-username/present-app
    branch: main
  source_dir: /present
  run_command: python server.py --host 0.0.0.0 --port $PORT
  envs:
  - key: PRESENT_TOKEN
    value: YOUR_SECRET_TOKEN
  http_port: 8080
EOF
```

**After deployment, note your URL:** `https://your-app.onrender.com` or similar

---

## Step 2: Prepare PWA for TWA

### Update manifest.json

```bash
# Update the host in bubblewrap-config.json
cd android-twa
```

Edit `bubblewrap-config.json` and replace `YOUR_DOMAIN.com` with your actual domain.

### Add Digital Asset Links

Create `present/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.present.habittracker",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

**Get fingerprint after building app (Step 3)**

---

## Step 3: Build Android App with Bubblewrap

### Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### Initialize TWA

```bash
cd D:\Labs\present-app-2.5.0\present\android-twa

# Initialize (interactive)
bubblewrap init --manifest=https://your-domain.com/manifest.json
```

**Answer prompts:**
- Application ID: `com.present.habittracker`
- Name: `Present`
- Start URL: `/`
- Icon: Use your existing icons
- Enable notifications: Yes

### Build APK

```bash
# First build (generates keystore)
bubblewrap build

# You'll be prompted to create a keystore password
# SAVE THIS PASSWORD - you'll need it for updates
```

**Output:** `app-release-signed.apk` in project directory

---

## Step 4: Get SHA-256 Fingerprint

```bash
# Extract fingerprint from your keystore
keytool -list -v -keystore app-release-bundle.keystore -alias present-key

# Copy the SHA256 fingerprint (looks like: AA:BB:CC:DD:...)
# Remove colons: AABBCCDD...
```

Update `.well-known/assetlinks.json` with this fingerprint and redeploy your web app.

---

## Step 5: Test on Device

```bash
# Install on connected Android device
adb install app-release-signed.apk

# Or drag APK to emulator
```

### Verify TWA is working:
1. Open app - should show no browser UI
2. Check notifications work
3. Test offline mode
4. Verify camera access (if needed)

**Common issues:**
- **Browser bar visible:** Digital Asset Links not configured correctly
- **App won't open:** Check `assetlinks.json` is accessible at `https://your-domain.com/.well-known/assetlinks.json`
- **White screen:** PWA not loading - check HTTPS and service worker

---

## Step 6: Prepare for Play Store

### Generate App Bundle (Required for Play Store)

```bash
bubblewrap build --skipPwaValidation
```

**Output:** `app-release-bundle.aab`

### Create Play Store Assets

1. **Screenshots** (Required):
   - Phone: 1080x1920 (min 2, max 8)
   - 7" Tablet: 1200x1920 (min 2)
   - 10" Tablet: 1600x2560 (min 2)

2. **Feature Graphic** (Required):
   - Size: 1024x500
   - No text (localized separately)

3. **App Icon** (Already have - use 512x512)

4. **Privacy Policy URL** (Required)
   - Host at `https://your-domain.com/privacy`

5. **Store Listing**:
   - Title: Present - Habit Tracker & Coach
   - Short description (80 chars): Track habits, block time, get AI coaching
   - Full description (4000 chars): See template below

---

## Step 7: Create Play Console Account

1. Go to https://play.google.com/console
2. Pay $25 one-time registration fee
3. Create app → Select defaults
4. Complete store listing:
   - Category: Productivity or Health & Fitness
   - Content rating: Everyone
   - Target age: 18+
   - Privacy policy: Your hosted URL

---

## Step 8: Upload to Play Console

### Internal Testing First

1. Console → Release → Testing → Internal testing
2. Create new release
3. Upload `app-release-bundle.aab`
4. Add release notes
5. Save → Review → Start rollout

### Add Test Users

1. Testers → Create email list
2. Add your email + test accounts
3. Share testing link

**Test for 1-2 weeks, fix issues**

### Production Release

1. Release → Production
2. Create new release
3. Upload final AAB
4. Countries: Choose (Start with your country)
5. Rollout: Start with 10% → 50% → 100%

**Review takes 1-7 days**

---

## Step 9: Post-Launch Monitoring

### Analytics Setup

Add to your PWA (Google Analytics 4):

```html
<!-- In index.html <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Monitor:
- Play Console → Statistics
- Crash reports
- User reviews
- Performance metrics

---

## Step 10: Updates

### Update PWA

```bash
# Deploy new version to your web host
# Users get updates automatically when they open app
```

### Update Android App (Only if changing TWA config)

```bash
cd android-twa

# Edit bubblewrap-config.json
# Increment versionCode: 25000 -> 25001

bubblewrap build

# Upload new AAB to Play Console
```

**Note:** Most updates only need web deployment. Only update Android app if:
- Changing app icon
- Adding permissions
- Updating start URL
- Changing display mode

---

## Troubleshooting

### Digital Asset Links Not Working

```bash
# Verify assetlinks.json is accessible
curl https://your-domain.com/.well-known/assetlinks.json

# Test with Google's tool
# https://developers.google.com/digital-asset-links/tools/generator
```

### App Shows Browser UI

1. Verify assetlinks.json SHA-256 matches your keystore
2. Wait 24-48 hours for Google to index
3. Clear app data and reinstall

### Notifications Not Working

```javascript
// Verify in your PWA
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission().then(permission => {
    console.log('Permission:', permission);
  });
}
```

### App Size Too Large

- Use WebP for images
- Compress assets with `pngquant`/`jpegoptim`
- Enable gzip on server

---

## Maintenance Schedule

| Frequency | Task |
|-----------|------|
| **Weekly** | Monitor crash reports, reviews |
| **Monthly** | Update dependencies, security patches |
| **Quarterly** | Feature releases, Android OS compatibility |
| **Yearly** | Major version, redesign (if needed) |

---

## Costs

| Item | Cost |
|------|------|
| Play Console registration | $25 one-time |
| Server hosting (Railway/Render) | $0-20/month |
| Domain name | $10-15/year |
| SSL certificate | Free (Let's Encrypt) |
| **Total first year** | **$25-$265** |

---

## Next Steps Checklist

- [ ] Deploy PWA to production server
- [ ] Install Bubblewrap CLI
- [ ] Initialize TWA project
- [ ] Build and test APK locally
- [ ] Configure Digital Asset Links
- [ ] Create Play Console account
- [ ] Prepare store assets (screenshots, feature graphic)
- [ ] Upload to internal testing
- [ ] Test with real users (1-2 weeks)
- [ ] Submit to production
- [ ] Monitor crash reports and reviews

---

## Store Listing Template

### Title (50 chars max)
Present - Habit Tracker & AI Coach

### Short Description (80 chars)
Track habits, block time, get AI coaching for productivity & spiritual growth

### Full Description

**Transform Your Daily Routine with Present**

Present combines habit tracking, time blocking, and AI-powered coaching to help you build lasting change.

**HABIT TRACKING**
• Check, count, or measure habits (pages read, minutes practiced)
• Flexible quick-entry for fast logging
• Smart streak system with progress visualization
• Daily goals and weekly reviews

**TIME BLOCKING**
• Visual timeline inspired by productivity apps you love
• Block time for deep work, prayer, study
• Real-time progress tracking with timer
• See conflicts and free slots at a glance

**AI COACH**
• Personal sermons adapted to your progress
• Morning motivation and evening reviews
• Audio messages with multiple voice options
• Guided evening reflection (Examen)
• Scripture memory with spaced repetition

**SMART INSIGHTS**
• Weekly summary with exportable reports
• Track best and weakest habits
• Compare week-over-week progress
• Celebrate milestones and perfect days

**DESIGNED FOR:**
• Professionals building discipline
• Faith-based habit formation
• Students tracking study goals
• Anyone seeking consistent growth

**PRIVACY FIRST**
• Your data stays local by default
• Optional self-hosted sync
• AI messages never leave your server
• No ads, no third-party tracking

Built with care for those who want to stay present, one day at a time.

---

Need help at any step? The community is here: [Your support email/forum]

---

## Additional Resources

- Bubblewrap docs: https://github.com/GoogleChromeLabs/bubblewrap
- TWA guide: https://developer.chrome.com/docs/android/trusted-web-activity/
- Play Console help: https://support.google.com/googleplay/android-developer

---

**Estimated Total Time:**
- Initial setup: 1-2 days
- Play Store submission: 2-4 hours
- Review wait time: 1-7 days
- **Total to launch: 1-2 weeks**
