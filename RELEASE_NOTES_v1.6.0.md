# Release Notes - Version 1.6.0 (Build 9)

**Release Date:** November 11, 2025
**Build Number:** 9
**Version Name:** 1.6.0

## 🎉 What's New

### 🔧 Critical Bug Fix - Image Attachment
**Fixed:** Images now successfully attach to tasks in Bitrix24

**Problem Solved:**
- Tasks were being created without attached photos
- Photos captured via camera or gallery were not appearing in Bitrix24 tasks

**Technical Solution:**
- Implemented two-step file attachment process
- Changed from `UF_TASK_WEBDAV_FILES` to `task.commentitem.add` API
- Photos now attach reliably as task comments
- More robust error handling and logging

### 📸 How It Works Now
1. User captures/selects photo
2. App creates task in Bitrix24
3. Photo automatically attaches as a comment on the task
4. Visual confirmation in Bitrix24 task view

## 🐛 Bug Fixes

- ✅ **Fixed image upload failure** - Photos now consistently attach to tasks
- ✅ **Improved error handling** - Task still created even if photo upload has issues
- ✅ **Better logging** - Detailed console logs for troubleshooting

## 🔄 Technical Improvements

- Implemented two-step task creation process
- Added `attachFileToTask` method using Bitrix24's recommended approach
- Base64 file encoding with proper URLSearchParams formatting
- Graceful degradation: tasks succeed even if image fails
- Enhanced logging at each step of the process

## 📱 Compatibility

- **Android:** 5.0+ (API level 21+)
- **Target SDK:** Android 14 (API level 34)
- **Bitrix24:** REST API webhook integration

## 🔒 Security

- Secure file handling with base64 encoding
- HTTPS-only communication with Bitrix24
- No local storage of sensitive image data

## 🎯 User Experience

- Smoother photo upload experience
- Clear error messages if issues occur
- Task creation doesn't fail if photo upload fails
- Better feedback during submission process

## 🚀 Performance

- Optimized file size handling (max 10MB)
- Efficient base64 conversion
- Rate-limited API calls to prevent throttling

## 📋 Known Issues

None reported in this release.

## 🔮 Coming Soon

- Offline mode improvements
- Multiple photo attachments
- Photo compression options
- Enhanced photo preview

## 📝 Deployment Notes

**For Developers:**
- Feature branch: `feature/alternative-image-upload`
- Main fix commit: `393697c`
- Documentation: `BITRIX24_FILE_ATTACHMENT_FIX.md`

**For Administrators:**
- Ensure Bitrix24 webhook has `task` permission enabled
- No configuration changes required
- Existing tasks unaffected

## 🆘 Support

If you encounter any issues:
1. Check task in Bitrix24 - photo should appear as comment
2. Review console logs in browser DevTools
3. Verify webhook permissions in Bitrix24 settings

---

**Previous Version:** 1.5.1 (Build 8)
**Current Version:** 1.6.0 (Build 9)
**Next Planned Version:** 1.7.0 (Multiple photo support)

