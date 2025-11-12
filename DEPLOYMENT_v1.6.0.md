# Deployment Guide - Version 1.6.0

## 📦 Build Information

**Version:** 1.6.0
**Build Number:** 9
**Build Date:** November 11, 2025
**File:** `SDINMOTION-v1.6.0-SIGNED.aab`
**File Size:** 5.41 MB (5,408,861 bytes)
**Branch:** `feature/alternative-image-upload`

## 🎯 What's in This Release

### Critical Bug Fix: Image Attachment
✅ **Fixed** - Images now successfully attach to tasks in Bitrix24
- Changed from `UF_TASK_WEBDAV_FILES` to `task.commentitem.add` method
- More reliable two-step process (create task, then attach image)
- Images appear as task comments in Bitrix24

### Technical Changes
- Implemented new `attachFileToTask` method
- Removed deprecated upload methods
- Improved error handling and logging
- Base64 file encoding via URLSearchParams

## 📱 Upload to Google Play Console

### Step 1: Login to Google Play Console
1. Go to https://play.google.com/console
2. Select your app: **SDINMOTION**

### Step 2: Create New Release
1. Click **Production** → **Create new release**
2. Or **Testing** → **Internal testing** → **Create new release**

### Step 3: Upload AAB
1. Click **Upload**
2. Select: `SDINMOTION-v1.6.0-SIGNED.aab`
3. Wait for upload to complete
4. Wait for Google's automated checks

### Step 4: Release Notes
Copy this into Google Play Console:

```
What's New in v1.6.0:

✅ Fixed Photo Attachment Issue
- Photos now successfully attach to fault reports
- More reliable image upload process  
- Images appear directly in task comments

🔧 Bug Fixes
- Resolved issue where tasks were created without photos
- Improved error handling for photo uploads
- Better logging for troubleshooting

📱 Improvements
- Enhanced photo upload reliability
- Optimized file handling (max 10MB)
- Smoother user experience when reporting faults

This update ensures your fault reports with photos are properly recorded in our system.
```

### Step 5: Review and Rollout
1. Review the release details
2. Set rollout percentage (recommend 100% or staged rollout)
3. Click **Review release**
4. Click **Start rollout to Production** (or Testing)

## 🔍 Pre-Flight Checklist

Before uploading to Play Store, verify:

✅ AAB file exists: `SDINMOTION-v1.6.0-SIGNED.aab`
✅ File size: ~5.4 MB
✅ Version code: 9 (incremented from 8)
✅ Version name: 1.6.0
✅ App is signed with upload key
✅ Build is release (not debug)
✅ All features tested on device
✅ Image attachment tested and working
✅ Release notes prepared

## 🧪 Testing Before Upload

### Manual Test Plan
1. Install the AAB on a test device
2. Create a fault report
3. Capture/select a photo
4. Submit the report
5. Check Bitrix24 task
6. Verify photo is attached as comment

### Test Command
```bash
# Install AAB on connected device
bundletool build-apks --bundle=SDINMOTION-v1.6.0-SIGNED.aab --output=app.apks --mode=universal
bundletool install-apks --apks=app.apks
```

## 📊 Version History

| Version | Code | Date | Changes |
|---------|------|------|---------|
| 1.6.0 | 9 | Nov 11, 2025 | Fixed image attachment |
| 1.5.1 | 8 | (Previous) | WIP updates |
| 1.5.0 | 7 | (Previous) | Version updates |
| 1.3.1 | 6 | (Previous) | Minor fixes |
| 1.3.0 | 5 | (Previous) | Feature updates |
| 1.2.0 | 3 | (Previous) | Rebranding |

## 🔐 Security & Compliance

- ✅ App is signed with Google Play App Signing
- ✅ Upload key is secure and backed up
- ✅ HTTPS-only communication
- ✅ No sensitive data in logs
- ✅ Permissions properly declared
- ✅ Privacy policy updated

## 📄 Required Documents

All required documents are in the repository:
- ✅ `privacy-policy.html` - Privacy policy
- ✅ `RELEASE_NOTES_v1.6.0.md` - Detailed release notes
- ✅ `BITRIX24_FILE_ATTACHMENT_FIX.md` - Technical documentation

## 🚀 Post-Deployment

### After Upload
1. Monitor Google Play Console for issues
2. Check crash reports
3. Review user feedback
4. Monitor Bitrix24 tasks for photo attachments

### Rollback Plan (if needed)
If issues are discovered:
1. Go to Play Console → Production
2. Click on previous version (1.5.1)
3. Click **Promote to production**
4. Confirm rollback

### Success Metrics
- Photo attachment rate should increase to ~100%
- Crash rate should remain < 1%
- User ratings should improve
- Support tickets about missing photos should decrease

## 📞 Support

### If Upload Fails
- Check file integrity: Re-build AAB if corrupted
- Verify signing: Ensure upload key is correct
- Check version codes: Must be higher than previous
- Review Google Play Console error messages

### If App Crashes
- Check crash reports in Play Console
- Review logs from device
- Test on multiple devices/Android versions
- Check Bitrix24 webhook permissions

## 🎯 Next Steps

1. ✅ Upload AAB to Play Console
2. ✅ Submit for review
3. ✅ Wait for approval (usually 1-3 days)
4. ✅ Monitor release
5. ✅ Merge feature branch to master
6. ✅ Tag release in git: `git tag v1.6.0`
7. ✅ Plan next release (v1.7.0)

## 📝 Git Commands

```bash
# Merge feature branch
git checkout master
git merge feature/alternative-image-upload
git tag v1.6.0
git push origin master --tags

# Archive old AAB files
mkdir archive
move SDINMOTION-v1.5*.aab archive/
```

---

**Build Status:** ✅ Ready for Deployment
**File Location:** `C:\Users\kamogelot\Downloads\fault-reporting-mobile-app\SDINMOTION-v1.6.0-SIGNED.aab`
**Deployment Target:** Google Play Store Production

**Built with:** ❤️ by SDINMOTION Team

