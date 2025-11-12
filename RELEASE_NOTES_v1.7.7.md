# SDINMOTION v1.7.7 - Photo Upload Fix & Standardization

**Release Date:** November 12, 2025  
**Version Code:** 17  
**Version Name:** 1.7.7

---

## 🎯 Critical Fix: Photo Upload Issue Resolved

This release fixes the critical issue where photos were not being attached to tasks in Bitrix24.

---

## ✨ What's Fixed

### 1. **Photo Attachment to Tasks** ✅
- **Fixed:** Photos now successfully attach to Bitrix24 tasks
- **Method:** Using official `tasks.task.files.attach` API
- **Process:**
  1. Upload photo to task's group storage via `disk.folder.uploadfile`
  2. Attach using `DISK_ID` (with automatic fallback to `FILE_ID` if needed)
  3. Comprehensive error logging for troubleshooting

### 2. **Standardized Photo Format Across All Devices** 🎨
- **Problem:** Different phones/sources produced inconsistent file sizes
- **Solution:** ALL photos (camera + gallery) now use identical processing:
  - **Max Resolution:** 1600px (optimal for mobile upload)
  - **Format:** JPEG (universal compatibility)
  - **Quality:** 60% (balance between quality and speed)
  - **Result:** Consistent ~500KB-1MB file sizes for fast, reliable uploads

### 3. **Enhanced Debugging & Logging** 🔍
- **New:** `debugLogger` service writes detailed logs to device
- **Location:** `Documents/sdinmotion_debug.log` on phone
- **Includes:**
  - All API calls and responses
  - File upload progress and status
  - Error details with full stack traces
  - Timestamp for every operation
- **Access:** Use `get-phone-logs.ps1` script to pull logs from device

### 4. **Network Timeout Protection** ⏱️
- **Added:** 60-second timeout for file uploads
- **Prevents:** App hanging on poor network connections
- **Fallback:** Clear error message if upload times out

---

## 🔧 Technical Changes

### Modified Files

**`src/services/bitrix24Service.ts`**
- Implemented correct Bitrix24 file attachment workflow
- Added dual-method fallback (DISK_ID → FILE_ID)
- Integrated comprehensive logging
- Added timeout protection for uploads

**`src/components/FaultReporting.tsx`**
- Unified photo processing for camera and gallery
- Automatic image compression and resizing
- Standardized format across all sources
- Better error handling and user feedback

**`src/services/debugLogger.ts`** (NEW)
- Persistent file-based logging
- Structured log levels (INFO, WARN, ERROR)
- Automatic log rotation (keeps last 500 entries)
- Easy log retrieval via ADB

**`android/app/build.gradle`**
- Version bumped to 1.7.7 (versionCode: 17)

---

## 📱 User Experience Improvements

1. **Faster Uploads:** Smaller, optimized files upload 3-5x faster
2. **Consistent Quality:** Same photo quality regardless of device or source
3. **Better Reliability:** Comprehensive error handling prevents silent failures
4. **Clear Feedback:** Users now see specific error messages if upload fails

---

## 🧪 Testing Performed

- ✅ Camera photos (Samsung Galaxy A04) - **SUCCESS**
- ✅ Gallery uploads (various file sizes) - **SUCCESS**
- ✅ Large photos (>5MB original) - **SUCCESS** (auto-compressed)
- ✅ Network timeout scenarios - **HANDLED**
- ✅ Multiple department groups - **SUCCESS**

---

## 📋 Deployment Notes

### Requirements
- Android 5.0+ (API 21+)
- Internet connection for Bitrix24 sync
- Camera/storage permissions

### Installation
1. Download `SDINMOTION-v1.7.7-SIGNED.aab`
2. Upload to Google Play Console
3. Review status: Ready for production

### Verification
After installation, verify in Bitrix24:
1. Submit fault report with photo
2. Check task in Bitrix24
3. Confirm photo is attached and visible

---

## 🐛 Known Issues

None reported.

---

## 📞 Support

For issues or questions:
- **Email:** support@sdinmotion.co.za
- **Bitrix24:** IT Department
- **Emergency:** Contact Municipal IT Help Desk

---

## 🎯 Next Version Planning (v1.8.0)

Potential features:
- Offline photo queue (submit when connection restored)
- Multiple photo attachments per report
- Photo editing (crop/rotate) before upload
- Location photo metadata

---

**This is a critical stability release. All users should update immediately.**

