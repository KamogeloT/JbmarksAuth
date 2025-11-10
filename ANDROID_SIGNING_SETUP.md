# Android App Signing Setup Guide

## ✅ What Was Done

Your Android app bundle is now **properly signed** and ready for Google Play Console upload!

### Changes Made:

1. **Created Upload Keystore** (`upload-keystore.jks`)
   - Location: `android/app/upload-keystore.jks`
   - Validity: 10,000 days (~27 years)
   - Algorithm: RSA 2048-bit
   - **Status:** ✅ Created and secured

2. **Added Signing Configuration** 
   - Updated `android/app/build.gradle` with signing config
   - Added keystore credentials to `android/gradle.properties`
   - Configured Java 17 for compatibility

3. **Security Measures**
   - Added keystore files to `.gitignore`
   - Prevented credentials from being committed to Git
   - Kept sensitive files local only

## 📦 Your Signed App Bundle

**File:** `Municipal-Fault-Reporter-v1.0-SIGNED.aab`

- **Location:** Project root folder (opened in File Explorer)
- **Size:** ~5.41 MB
- **Status:** ✅ Properly signed and ready for upload
- **Built:** November 10, 2025

## 🚀 Upload to Google Play Console

### Step-by-Step Instructions:

1. **Go to Google Play Console:** https://play.google.com/console

2. **Navigate to Internal Testing:**
   - Select your app
   - Left sidebar → **Testing** → **Internal testing**
   - Click **"Create new release"**

3. **Enroll in Play App Signing** (First upload only):
   - You'll see a prompt about Play App Signing
   - Click **"Continue"** or **"Opt in"**
   - This lets Google manage your production signing keys
   - ✅ Recommended for security and ease of use

4. **Upload Your Bundle:**
   - Drag `Municipal-Fault-Reporter-v1.0-SIGNED.aab` to the upload area
   - OR click "Browse files" and select it
   - Wait for upload to complete (~30 seconds)

5. **Add Release Notes:**
   ```
   Initial release - Version 1.0
   
   Features:
   - Report Water & Sanitation issues
   - Report Electricity problems
   - Report Road & Stormwater issues
   - Report Refuse & Waste issues
   - Camera photo attachment
   - GPS location capture
   - Report tracking with reference numbers
   - Fixed: Camera photo upload for newly taken photos
   ```

6. **Add Test Users:**
   - Add email addresses of testers
   - They'll receive invitation links
   - Must use their Google accounts

7. **Review and Rollout:**
   - Review all settings
   - Click **"Start rollout to Internal testing"**
   - Wait 10-20 minutes for processing

## 🔐 Important Security Notes

### **KEEP THESE FILES SAFE:**

1. **Upload Keystore:** `android/app/upload-keystore.jks`
   - ⚠️ **BACKUP THIS FILE!**
   - Store in a secure location (USB drive, password manager, etc.)
   - If lost, you cannot update your app!

2. **Keystore Credentials:**
   ```
   Store Password: android123
   Key Alias: upload
   Key Password: android123
   ```
   - ⚠️ **Save these passwords securely!**
   - Store in a password manager
   - Share only with authorized team members

3. **What's Protected:**
   - ✅ `*.jks` and `*.keystore` files are in `.gitignore`
   - ✅ `android/gradle.properties` is in `.gitignore`
   - ✅ Sensitive files won't be committed to Git
   - ✅ Passwords won't appear in Git history

### **Backup Checklist:**

- [ ] Copy `android/app/upload-keystore.jks` to secure backup location
- [ ] Save keystore passwords in password manager
- [ ] Document keystore details (alias, validity dates)
- [ ] Share backup location with team lead (if applicable)

## 🔄 For Future Updates

When releasing version 1.1, 1.2, etc.:

1. **Update version in** `android/app/build.gradle`:
   ```gradle
   versionCode 2        // Increment by 1
   versionName "1.1"    // Your version string
   ```

2. **Rebuild:**
   ```powershell
   npm run build
   npx cap sync
   cd android
   .\gradlew clean bundleRelease
   ```

3. **Upload new bundle** to Google Play Console

## ❌ What NOT to Do

- ❌ Don't commit `*.jks` or `*.keystore` files to Git
- ❌ Don't share your keystore publicly
- ❌ Don't lose your keystore file (BACKUP IT!)
- ❌ Don't change passwords without updating `gradle.properties`
- ❌ Don't create a new keystore for updates (use the same one)

## 📋 Play App Signing vs Manual Signing

### **Play App Signing (What You're Using):**

✅ **Advantages:**
- Google manages production signing keys
- Lost upload key? Google can help
- More secure (Google's infrastructure)
- Easier key management
- Automatic optimization for different devices

📝 **How it Works:**
1. You sign with upload key (`upload-keystore.jks`)
2. Upload to Google Play
3. Google re-signs with production key
4. Google distributes to users

### **What This Means for You:**

- Your `upload-keystore.jks` is only for uploading
- Google manages the actual production signing
- Safer and more convenient
- Recommended by Google

## 🆘 Troubleshooting

### "Upload failed" or "Invalid signature"
- Ensure you're using the newly built `Municipal-Fault-Reporter-v1.0-SIGNED.aab`
- Don't use the old unsigned version
- Check that signing was successful (look for "signReleaseBundle" in build output)

### "Version already exists"
- Increment `versionCode` in `build.gradle`
- Each upload needs a unique versionCode

### "Keystore not found"
- Verify `upload-keystore.jks` exists in `android/app/`
- Check paths in `gradle.properties` are correct

### Build fails with Java errors
- Ensure Java 17 is being used
- Check `gradle.properties` has correct Java path
- Restart Gradle daemon: `.\gradlew --stop`

## 📞 Support

If you encounter issues:
1. Check the build output for errors
2. Verify keystore file exists
3. Ensure passwords are correct
4. Review Google Play Console error messages
5. Refer to `GOOGLE_PLAY_DEPLOYMENT.md` for deployment steps

## 🎉 Summary

✅ **You're all set!**

- App bundle is signed and ready
- Upload to Google Play Console Internal Testing
- Share testing link with your team
- Monitor for crashes and feedback
- Update and iterate!

**Next Steps:**
1. Upload `Municipal-Fault-Reporter-v1.0-SIGNED.aab` to Google Play Console
2. Complete store listing (app icon, screenshots, description)
3. Add internal testers
4. Start testing!

Good luck with your app launch! 🚀

