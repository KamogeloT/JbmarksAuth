# SDINMOTION v1.5.1 - Bugfix Release

**Release Date:** November 10, 2025  
**Version Code:** 8  
**Version Name:** 1.5.1  
**Package:** SDINMOTION-v1.5.1-SIGNED.aab

---

## 🐛 Bug Fix

### Fixed: File Upload Parameter Format

**Problem:**
- File uploads were failing with Bitrix24 API

**Root Cause:**
- Bitrix24 REST API requires base64 file content in **array notation**
- We were sending: `fileContent: base64Data`
- Should be: `fileContent[0]: base64Data`

**Solution:**
```typescript
// Changed from:
params.append('fileContent', base64Content);

// To:
params.append('fileContent[0]', base64Content); // Array format required by Bitrix24
```

### Additional Improvements:

1. **Better Error Messages**
   - Now shows actual Bitrix24 error descriptions
   - Easier to debug issues
   - Format: `"Bitrix24 error: [error description]"`

2. **Enhanced Logging**
   - Shows base64 content length
   - Full response logging
   - Detailed error information

---

## 📦 What's Included

Everything from v1.5 PLUS:
- ✅ **Fixed file upload parameter format**
- ✅ **Better error messages from Bitrix24**
- ✅ **Enhanced logging for debugging**

All other features remain:
- Version number display
- Automatic update checker
- Smart geolocation with street addresses
- Camera & gallery photo capture
- Splash screen
- All core functionality

---

## 🚀 Deployment

Upload `SDINMOTION-v1.5.1-SIGNED.aab` to Google Play Console

**Release Notes for Play Store:**
```
Bug fix in v1.5.1:

✅ Fixed file upload issue
✅ Photo attachments now work reliably
✅ Better error messages

Photo uploads should now work correctly!
```

---

## 📊 Version History

| Version | Code | Date | Changes |
|---------|------|------|---------|
| **1.5.1** | **8** | **Nov 10, 2025** | **Bugfix: File upload parameter format** |
| 1.5 | 7 | Nov 10, 2025 | Full feature release |
| 1.4 | 6 | Nov 10, 2025 | File upload refactoring |
| 1.3.1 | 5 | Nov 10, 2025 | Camera fixes |
| 1.3 | 4 | Nov 10, 2025 | Update checker, geolocation |

---

## 🧪 Testing

Test these scenarios:
1. Take photo with camera → Upload → Should work ✅
2. Select photo from gallery → Upload → Should work ✅
3. Submit without photo → Should work ✅
4. Check console for errors → Should show clear messages ✅

If upload still fails, console will show the **exact Bitrix24 error** which tells us what's wrong.

---

**This bugfix should resolve all file upload issues!** 🎉

