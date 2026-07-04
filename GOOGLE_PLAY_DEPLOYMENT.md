# Google Play Console Deployment Guide

## App Bundle Information

- **File:** `android/app/build/outputs/bundle/release/app-release.aab`
- **Size:** ~5.35 MB
- **Version:** 1.0 (versionCode: 1)
- **Package ID:** `com.municipality.faultreporter`
- **App Name:** Municipal Fault Reporter

## Deployment Steps

### Step 1: Create Google Play Developer Account
1. Go to https://play.google.com/console
2. Pay the one-time $25 registration fee (if not already registered)
3. Complete the account setup

### Step 2: Create Your App
1. Click "Create app"
2. Fill in app details:
   - **App name:** Municipal Fault Reporter
   - **Default language:** English (South Africa)
   - **App or game:** App
   - **Free or paid:** Free

### Step 3: Complete Store Listing
Fill in required information:
- **App name:** Municipal Fault Reporter
- **Short description:** Report municipal faults and issues to JBmarks Local Municipality
- **Full description:** (Use detailed description below)
- **App icon:** 512x512 PNG
- **Feature graphic:** 1024x500 PNG
- **Screenshots:** At least 2 phone screenshots (recommended: 4-8)
- **App category:** Productivity or Government
- **Contact details:** Your support email and phone
- **Privacy policy URL:** (Required for apps that access personal data)

#### Suggested Full Description:
```
Municipal Fault Reporter - Official JBmarks Local Municipality App

Report municipal issues quickly and easily with the official JBmarks Local Municipality fault reporting mobile app.

KEY FEATURES:
✓ Report Water & Sanitation Issues
✓ Report Electricity Problems
✓ Report Road & Stormwater Issues
✓ Report Refuse & Waste Issues
✓ Attach photos from camera or gallery
✓ GPS location capture
✓ Track your reports with reference numbers
✓ View report history
✓ Instant submission to municipality departments

HOW IT WORKS:
1. Select the type of issue (Water, Electricity, Roads, or Waste)
2. Fill in your details and describe the problem
3. Add a photo and location
4. Submit your report
5. Receive a reference number for tracking

Your reports are automatically routed to the correct municipal department for fast resolution.

Powered by SDinMotion
```

### Step 4: Set Up Internal Testing Track (Recommended First)

1. **Navigate to:** Testing → Internal testing
2. **Create new release**
3. **Upload the AAB:**
   - Drag and drop: `app-release.aab`
   - OR click "Browse files" and select it
4. **Release name:** 1.0 (Internal Testing)
5. **Release notes:** 
   ```
   Initial testing release
   - Water, Electricity, Roads, and Waste fault reporting
   - Photo attachment from camera or gallery
   - GPS location capture
   - Report tracking
   - Fixed camera photo upload issue
   ```
6. **Create test user list:**
   - Add email addresses of testers (up to 100 for internal testing)
7. **Save and review**
8. **Start rollout to Internal testing**

### Step 5: Share Testing Link
After rollout:
1. Get the internal testing link from the release page
2. Share with testers (they need to be logged into Google Play with authorized email)
3. Testers can install via the link

### Step 6: Move to Production (After Testing)

Once internal testing is successful:
1. **Navigate to:** Production → Create new release
2. **Promote from internal testing** OR upload the same AAB
3. **Complete content rating questionnaire**
4. **Complete target audience and content**
5. **Set up pricing & distribution** (select countries)
6. **Submit for review**

## App Signing Options

### Option A: Play App Signing (Recommended)
- Google manages your app signing key
- Easier and more secure
- Google will prompt you on first upload
- Just click "Continue" and Google handles everything

### Option B: Your Own Keystore
If you want to manage your own keys, you'll need to:
1. Generate a keystore (see instructions below)
2. Configure signing in `android/app/build.gradle`
3. Sign the bundle before uploading

## Generating Your Own Keystore (Optional)

If you choose Option B, run this command:

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Then update `android/app/build.gradle` with signing configuration.

## Requirements Checklist

### App Store Assets Needed:
- [ ] App icon: 512x512 PNG (no transparency)
- [ ] Feature graphic: 1024x500 PNG
- [ ] Phone screenshots: Minimum 2, recommended 4-8 (16:9 or 9:16 aspect ratio)
- [ ] Privacy policy URL (required since app collects user data)
- [ ] App description (short and full)
- [ ] Content rating questionnaire completed
- [ ] Target audience defined
- [ ] Countries selected for distribution

### Account Requirements:
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Payment profile set up (even for free apps)
- [ ] Developer details completed

## Current App Bundle Status

✅ **App bundle built and ready:** `app-release.aab`
✅ **Version:** 1.0.0
✅ **Latest fixes:** Camera photo upload issue resolved
✅ **iOS sync:** Completed (ready for Mac/Xcode)

## Testing Instructions for Testers

Send this to your testers after setting up internal testing:

1. Check your email for the Google Play testing invitation
2. Click the invitation link (must be logged into authorized Google account)
3. Click "Accept Invitation"
4. Click "Download it on Google Play"
5. Install the app
6. Test all features and report any issues

## Support & Monitoring

After deployment, monitor:
- Crash reports in Play Console
- User reviews and ratings
- Pre-launch report (automated testing by Google)
- Android vitals (performance metrics)

## Next Version Updates

To release version 1.1:
1. Update version in `android/app/build.gradle`:
   ```gradle
   versionCode 2
   versionName "1.1"
   ```
2. Run: `npm run build && npx cap sync`
3. Build: `cd android && .\gradlew bundleRelease`
4. Upload new AAB to Play Console
5. Add release notes describing changes

## Troubleshooting

### "Upload failed" errors:
- Check that versionCode is incremented from previous release
- Verify package name is unique (not already used)
- Ensure bundle is not corrupted

### "App not compatible with device":
- Check minSdkVersion (currently set to minimum)
- Verify device meets requirements
- Check if APK/AAB architecture matches device

### Testing link not working:
- Ensure tester email is added to authorized list
- Tester must be logged into correct Google account
- Link may take 5-10 minutes to activate after release

## Resources

- Google Play Console: https://play.google.com/console
- Android Publisher Guide: https://support.google.com/googleplay/android-developer
- App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Release Checklist: https://developer.android.com/distribute/best-practices/launch/launch-checklist

