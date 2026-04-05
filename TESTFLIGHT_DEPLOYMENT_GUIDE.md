# TestFlight Deployment Guide

## 📱 Pre-Deployment Checklist

### ✅ Current Configuration
- **Bundle Identifier**: `jbmarks.JbmrksIOs`
- **Marketing Version**: 1.0
- **Build Number**: 1
- **Development Team**: R4K5T5B397
- **Code Sign Style**: Automatic
- **Deployment Target**: iOS 26.1

### ✅ Required Items
- [x] App icon configured
- [x] Entitlements file exists
- [x] Privacy descriptions (Camera, Photo Library)
- [x] Push notifications configured
- [x] OAuth deep linking configured

---

## 🚀 Step-by-Step Deployment Process

### Step 1: Verify App Store Connect Setup

1. **Log in to App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Create App Record (if not exists)**
   - Click "My Apps" → "+" → "New App"
   - Platform: iOS
   - Name: JBmarks (or your preferred name)
   - Primary Language: English
   - Bundle ID: `jbmarks.JbmrksIOs`
   - SKU: `jbmarks-ios` (unique identifier)
   - User Access: Full Access

3. **Verify App Information**
   - App Information tab
   - Pricing and Availability
   - App Privacy (required for submission)

---

### Step 2: Prepare Build in Xcode

1. **Open Project**
   ```bash
   cd /Users/kamogelotshukudu/projects/JBMARKS/JbmrksIOs
   open JbmrksIOs.xcworkspace
   ```

2. **Select Target**
   - Select "JbmrksIOs" scheme
   - Select "Any iOS Device" or a connected device (not simulator)

3. **Update Version/Build (if needed)**
   - In Xcode, select the project in navigator
   - Select "JbmrksIOs" target
   - Go to "General" tab
   - Update:
     - **Version**: 1.0 (or increment if needed)
     - **Build**: 1 (increment for each new build)

4. **Verify Signing**
   - Go to "Signing & Capabilities" tab
   - Ensure "Automatically manage signing" is checked
   - Team: R4K5T5B397
   - Bundle Identifier: `jbmarks.JbmrksIOs`

---

### Step 3: Create Archive

1. **Clean Build Folder**
   - Menu: Product → Clean Build Folder (Shift + Cmd + K)

2. **Create Archive**
   - Menu: Product → Archive
   - Wait for build to complete (may take a few minutes)
   - Organizer window will open automatically

3. **Verify Archive**
   - In Organizer, verify:
     - App name: JbmrksIOs
     - Version: 1.0
     - Build: 1
     - Distribution: App Store Connect

---

### Step 4: Upload to App Store Connect

1. **In Organizer Window**
   - Select your archive
   - Click "Distribute App"

2. **Distribution Method**
   - Select "App Store Connect"
   - Click "Next"

3. **Distribution Options**
   - Select "Upload"
   - Click "Next"

4. **Distribution Options (Advanced)**
   - ✅ Include bitcode (if available)
   - ✅ Upload symbols (for crash reports)
   - Click "Next"

5. **App Thinning**
   - Select "All compatible device variants"
   - Click "Next"

6. **Review**
   - Review summary
   - Click "Upload"

7. **Wait for Upload**
   - Upload progress will be shown
   - This may take 10-30 minutes depending on app size
   - You'll see "Upload Successful" when done

---

### Step 5: Process Build in App Store Connect

1. **Wait for Processing**
   - Go to App Store Connect → My Apps → Your App
   - Click "TestFlight" tab
   - Wait for build to appear (usually 10-30 minutes)
   - Status will show "Processing" → "Ready to Submit"

2. **If Build Fails Processing**
   - Check email for details
   - Common issues:
     - Missing compliance (export compliance)
     - Invalid entitlements
     - Missing privacy descriptions

---

### Step 6: Configure TestFlight

1. **Add Test Information**
   - Go to TestFlight tab
   - Click on your build
   - Add "What to Test" notes:
     ```
     This is the initial TestFlight build of JBmarks iOS app.
     
     Key Features:
     - OAuth authentication with Bitrix24
     - Task management (Create, Read, Update, Delete)
     - Calendar events viewing
     - Activity feed with posts and comments
     - Chat functionality
     - File attachments
     
     Please test:
     - Login flow
     - Task creation and management
     - Calendar event viewing
     - Feed interactions
     - Chat messaging
     ```

2. **Add Internal Testers**
   - Go to "Internal Testing" section
   - Click "+" to add testers
   - Add email addresses of team members
   - They'll receive an email invitation

3. **Add External Testers (Optional)**
   - Go to "External Testing" section
   - Create a new group (e.g., "Beta Testers")
   - Add testers (up to 10,000)
   - Submit for Beta App Review (required for external testing)

---

### Step 7: Submit for Beta App Review (External Testing Only)

**Note**: Internal testing doesn't require review. External testing does.

1. **Complete App Information**
   - App Information tab
   - Screenshots (required for review)
   - Description
   - Keywords
   - Support URL
   - Marketing URL (optional)

2. **App Privacy**
   - Complete privacy questionnaire
   - Required for external testing

3. **Submit for Review**
   - Go to External Testing
   - Select your build
   - Click "Submit for Review"
   - Answer compliance questions

---

## 🔧 Troubleshooting

### Build Errors

**Error: "No signing certificate found"**
- Solution: Go to Xcode → Preferences → Accounts → Add your Apple ID
- Download certificates: Click "Download Manual Profiles"

**Error: "Bundle identifier already exists"**
- Solution: Use a unique bundle identifier or use existing app record

**Error: "Invalid entitlements"**
- Solution: Check `JbmrksIOs.entitlements` file
- Ensure push notifications are properly configured

### Upload Errors

**Error: "ITMS-90035: Invalid Signature"**
- Solution: Clean build folder and rebuild
- Ensure correct provisioning profile

**Error: "ITMS-90111: Invalid Toolchain"**
- Solution: Update Xcode to latest version
- Ensure using latest SDK

### Processing Errors

**Error: "Missing Compliance"**
- Solution: Answer export compliance questions in App Store Connect
- Usually: "No, this app does not use encryption"

**Error: "Missing Privacy Descriptions"**
- Solution: Already configured in Info.plist:
  - Camera usage description ✅
  - Photo library usage description ✅

---

## 📋 Quick Command Reference

### Build and Archive via Command Line

```bash
# Navigate to project
cd /Users/kamogelotshukudu/projects/JBMARKS/JbmrksIOs

# Clean build
xcodebuild clean -workspace JbmrksIOs.xcworkspace -scheme JbmrksIOs

# Create archive
xcodebuild archive \
  -workspace JbmrksIOs.xcworkspace \
  -scheme JbmrksIOs \
  -configuration Release \
  -archivePath ./build/JbmrksIOs.xcarchive \
  CODE_SIGN_IDENTITY="Apple Development" \
  DEVELOPMENT_TEAM="R4K5T5B397"

# Export for App Store
xcodebuild -exportArchive \
  -archivePath ./build/JbmrksIOs.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath ./build/export
```

### Create ExportOptions.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>R4K5T5B397</string>
    <key>uploadBitcode</key>
    <true/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

---

## ✅ Post-Deployment Checklist

- [ ] Build uploaded successfully
- [ ] Build processed in App Store Connect
- [ ] TestFlight build appears
- [ ] Internal testers added
- [ ] Test invitations sent
- [ ] Testers can install app
- [ ] App functions correctly in TestFlight
- [ ] Crash reports monitored (if any)

---

## 📱 Testing on TestFlight

### For Testers

1. **Install TestFlight App**
   - Download TestFlight from App Store (if not installed)

2. **Accept Invitation**
   - Check email for TestFlight invitation
   - Click "Start Testing" or open link in TestFlight app

3. **Install App**
   - Tap "Install" in TestFlight
   - Wait for download
   - Open app and test

4. **Provide Feedback**
   - Use TestFlight feedback feature
   - Report bugs via TestFlight
   - Rate the build

---

## 🎯 Next Steps After TestFlight

1. **Collect Feedback**
   - Monitor TestFlight feedback
   - Review crash reports
   - Gather user feedback

2. **Fix Issues**
   - Address critical bugs
   - Improve based on feedback
   - Create new build

3. **Prepare for App Store**
   - Complete App Store listing
   - Prepare screenshots
   - Write app description
   - Set pricing

4. **Submit for Review**
   - When ready, submit for App Store review
   - Follow App Store Review Guidelines

---

## 📞 Support

If you encounter issues:
1. Check App Store Connect status page
2. Review Xcode build logs
3. Check email for detailed error messages
4. Consult Apple Developer documentation

---

## 🎉 Success!

Once your build is live on TestFlight:
- Share TestFlight link with testers
- Monitor feedback and crash reports
- Iterate based on testing results
- Prepare for App Store submission

**Good luck with your TestFlight deployment!** 🚀
