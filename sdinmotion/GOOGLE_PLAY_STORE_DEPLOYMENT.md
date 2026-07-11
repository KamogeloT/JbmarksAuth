# Google Play Store Deployment Guide

## 📱 Complete Step-by-Step Guide

---

## ✅ Prerequisites

### 1. Google Play Console Account
- **Cost:** $25 one-time registration fee
- **Sign up:** https://play.google.com/console/signup
- **Required:** Google account

### 2. App Information Ready
- ✅ App name: SDINMOTION
- ✅ Package name: `com.jbmarks.faultreporter`
- ✅ Privacy policy URL: https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
- ✅ Support email: admin@t3ssystems.co.za
- ✅ Support phone: 0661327845

---

## 🔐 Step 1: Create App Signing Key (If Not Done)

### Option A: Generate New Keystore

```bash
cd android/app
keytool -genkey -v -keystore sdinmotion-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias sdinmotion-key \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD
```

**Important:** Save the keystore file and passwords securely!

### Option B: Use Existing Keystore

If you already have a keystore, skip this step.

---

## 📝 Step 2: Configure Signing in build.gradle

**File:** `android/app/build.gradle`

Add signing configuration (if not already present):

```gradle
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
}
```

**Create `android/gradle.properties` file:**

```properties
MYAPP_UPLOAD_STORE_FILE=../app/sdinmotion-release-key.jks
MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
MYAPP_UPLOAD_KEY_ALIAS=sdinmotion-key
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

**⚠️ Security:** Add `gradle.properties` to `.gitignore` (never commit passwords!)

---

## 🏗️ Step 3: Build Release AAB (Android App Bundle)

### Using Android Studio (Recommended)

1. **Open Android Studio:**
   ```bash
   open -a "Android Studio" android/
   ```

2. **Wait for Gradle Sync:**
   - Android Studio will sync dependencies
   - Wait for "Gradle sync finished"

3. **Build AAB:**
   - Build → Generate Signed Bundle / APK
   - Select **Android App Bundle**
   - Click **Next**
   - Select your keystore file
   - Enter passwords
   - Click **Next**
   - Select **release** build variant
   - Click **Finish**

4. **Find Your AAB:**
   - Location: `android/app/release/app-release.aab`
   - Or check Android Studio's notification

### Using Command Line

```bash
cd android
./gradlew bundleRelease
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

---

## 🌐 Step 4: Create App in Google Play Console

### 4.1 Access Play Console

1. Go to: https://play.google.com/console
2. Sign in with your Google account
3. Accept terms if prompted

### 4.2 Create New App

1. Click **Create app**
2. Fill in:
   - **App name:** SDINMOTION
   - **Default language:** English
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** Check all applicable boxes
3. Click **Create app**

---

## 📋 Step 5: Complete Store Listing

### 5.1 App Access

1. Go to: **Policy** → **App access**
2. Select: **All functionality available without restrictions**
3. Click **Save**

### 5.2 Privacy Policy

1. Go to: **Policy** → **App content** → **Privacy policy**
2. Enter URL: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
3. Click **Save**

### 5.3 App Details

Go to: **Store presence** → **Main store listing**

**Required Fields:**

**Short description (80 chars max):**
```
Report municipal faults instantly. Water, electricity, roads, waste issues.
```

**Full description:**
```
SDINMOTION is the official mobile app for JBmarks Local Municipality. Report municipal service issues quickly and easily. Take photos, use GPS location, and track your reports. Categories include Water, Electricity, Roads, and Waste. Works offline. Your reports are automatically routed to the correct department for quick resolution. For support please admin@t3ssystems.co.za or 0661327845
```

**App icon:**
- Upload 512x512 PNG icon (JBmarks logo)
- Location: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`

**Feature graphic:**
- 1024x500 PNG (optional but recommended)
- Shows app features/screenshots

**Screenshots:**
- **Phone:** At least 2 screenshots
  - Minimum: 320px width
  - Maximum: 3840px width
  - Aspect ratio: 16:9 or 9:16
- **Tablet:** (Optional)
  - Same requirements

**How to create screenshots:**
1. Run app on Android device/emulator
2. Take screenshots of:
   - Home page
   - Report form
   - Report history
3. Upload to Play Console

**Contact details:**
- **Email:** admin@t3ssystems.co.za
- **Phone:** 0661327845
- **Website:** (Optional) Your website URL

---

## 📤 Step 6: Upload AAB

### 6.1 Create Release

1. Go to: **Production** (or **Internal testing** / **Closed testing** for testing first)
2. Click **Create new release**
3. Click **Upload** under "Android App Bundles"
4. Select your `app-release.aab` file
5. Wait for upload to complete

### 6.2 Release Notes

**What's new in this version:**
```
Initial release of SDINMOTION app. Report municipal faults for Water, Electricity, Roads, and Waste services. Take photos, use GPS location, and track your reports.
```

### 6.3 Review Release

- Check all information is correct
- Review warnings/errors (if any)
- Click **Save**

---

## ✅ Step 7: Complete Content Rating

1. Go to: **Policy** → **App content** → **Content rating**
2. Click **Start questionnaire**
3. Answer questions about your app:
   - **Category:** Utility/Productivity
   - **Does your app collect user data?** Yes
   - **What data?** Name, email, phone, location, photos
   - **How is data used?** For municipal service reporting
4. Submit questionnaire
5. Wait for rating (usually instant)

---

## 🔍 Step 8: Complete App Content

### 8.1 Target Audience

1. Go to: **Policy** → **App content** → **Target audience**
2. Select: **Everyone** (or appropriate age group)
3. Click **Save**

### 8.2 Data Safety

1. Go to: **Policy** → **App content** → **Data safety**
2. Click **Start**
3. Answer questions:
   - **Does your app collect data?** Yes
   - **Data types:** Personal info, location, photos
   - **How is data used?** App functionality, customer support
   - **Is data shared?** Yes (with municipality)
   - **Data security:** Data is encrypted in transit
4. Click **Save**

---

## 📱 Step 9: Set Up App Access

1. Go to: **Policy** → **App access**
2. Select: **All functionality available without restrictions**
3. Click **Save**

---

## 🎯 Step 10: Review and Submit

### Pre-Submission Checklist

**Store Listing:**
- [ ] App name set
- [ ] Short description added
- [ ] Full description added
- [ ] App icon uploaded (512x512)
- [ ] Screenshots uploaded (at least 2)
- [ ] Contact details added

**Policy:**
- [ ] Privacy policy URL added
- [ ] Content rating completed
- [ ] Data safety form completed
- [ ] App access configured

**Release:**
- [ ] AAB uploaded
- [ ] Release notes added
- [ ] Version number correct
- [ ] Build number correct

**Testing (Recommended):**
- [ ] Test on Internal testing track first
- [ ] Verify app works correctly
- [ ] Check all features

### Submit for Review

1. Go to: **Production** → **Releases**
2. Review your release
3. Click **Review release**
4. Review all information
5. Click **Start rollout to Production**
6. Confirm submission

---

## ⏱️ Timeline

- **Upload:** 5-10 minutes
- **Processing:** 10-30 minutes
- **Review:** 1-7 days (typically 1-3 days)
- **Publication:** Automatic after approval

---

## 📊 After Submission

### Check Status

1. Go to: **Production** → **Releases**
2. Status will show:
   - **In review** - Being reviewed
   - **Rejected** - Issues found (check email)
   - **Published** - Live on Play Store!

### If Rejected

1. Check email for rejection reason
2. Fix issues
3. Upload new AAB
4. Resubmit

---

## 🔗 Quick Links

- **Google Play Console:** https://play.google.com/console
- **Play Console Help:** https://support.google.com/googleplay/android-developer
- **App Signing:** https://support.google.com/googleplay/android-developer/answer/9842756

---

## 📝 Important Notes

1. **Keystore Security:**
   - Never lose your keystore file!
   - Keep passwords secure
   - Back up keystore file

2. **Version Numbers:**
   - Current version: 1.7.9
   - Current version code: 19
   - Increment for each release

3. **Testing First:**
   - Use Internal testing track first
   - Test thoroughly before production

4. **Privacy Policy:**
   - Must be publicly accessible
   - Must use HTTPS
   - Already hosted: https://kamogelot.github.io/sdinmotionapp/privacy-policy.html

---

## 🎉 Success!

Once approved, your app will be:
- ✅ Available on Google Play Store
- ✅ Searchable by name
- ✅ Downloadable worldwide (or selected countries)

**Good luck with your submission!** 🚀
