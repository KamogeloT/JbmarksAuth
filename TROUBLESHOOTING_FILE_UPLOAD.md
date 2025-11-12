# Troubleshooting File Upload Issues

## 🔍 Common Errors and Solutions

### Error 1: "HTTP error 403" or "Access Denied"

**Cause:** Webhook missing required permissions

**Solution:**
1. Go to Bitrix24 → **Settings** → **Developer** → **Webhooks**
2. Click on your webhook
3. Ensure these permissions are enabled:
   - ✅ **task** (required for task operations)
   - ✅ **disk** (required for file uploads)
   - ✅ **im** (optional, for instant messages)
4. Save and try again

### Error 2: "HTTP error 413" or "File too large"

**Cause:** File exceeds 10MB limit

**Solution:**
- Current limit: 10MB
- Compress image before uploading
- Or increase limit in `bitrix24Service.ts`:
```typescript
const maxSize = 20 * 1024 * 1024; // Change to 20MB
```

### Error 3: "Bitrix24 error: WRONG_AUTH_TYPE"

**Cause:** Webhook URL is incorrect or expired

**Solution:**
1. Regenerate webhook in Bitrix24
2. Update `.env` file with new webhook URL
3. Rebuild app: `npm run build && npx cap sync`

### Error 4: "Network error" or "Failed to fetch"

**Cause:** CORS, network, or connectivity issue

**Solution:**
1. Check internet connection
2. Verify webhook URL is accessible
3. Test in browser: `https://your-portal/rest/1/TOKEN/user.current.json`
4. Check if Bitrix24 is down: https://status.bitrix24.com/

### Error 5: "Failed to attach file"

**Cause:** API method not supported or wrong parameters

**Solution:** 
✅ **Already Fixed!** The updated code now tries 2 methods:
1. Direct attachment via `task.commentitem.add`
2. Upload to disk first, then attach

---

## 🔧 Quick Fixes

### Fix 1: Verify Webhook URL

```bash
# Test webhook in browser or Postman
https://your-bitrix-portal.bitrix24.com/rest/1/YOUR_TOKEN/user.current.json
```

**Expected:** JSON response with user data
**If fails:** Regenerate webhook

### Fix 2: Check Webhook Permissions

Required permissions:
```
✅ task  - Create and modify tasks
✅ disk  - Upload files
```

Optional but recommended:
```
✅ im    - Instant messages (for alternative upload method)
✅ user  - User operations
```

### Fix 3: Test File Size

```javascript
// In browser console
console.log('File size:', file.size / 1024 / 1024, 'MB');
```

If > 10MB, compress the image first.

### Fix 4: Enable Detailed Logging

Check browser console (F12) for these logs:

```
✅ Good logs:
📎 Attaching file to task 123
✅ File converted to base64, length: 50000
🚀 Method 1: Trying task.commentitem.add...
📊 Method 1 response status: 200
✅ File attached successfully

❌ Error logs:
❌ HTTP error 403: Access denied
❌ Bitrix24 error: WRONG_AUTH_TYPE
⚠️ Method 1 failed, trying alternative...
```

---

## 🎯 Testing the Fix

### Step 1: Rebuild the App

```bash
cd C:\Users\kamogelot\Downloads\fault-reporting-mobile-app
npm run build
npx cap sync android
```

### Step 2: Test on Device

```bash
# Run on connected device
npx cap run android

# Or build and install APK
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Monitor Console

1. Connect device via USB
2. Open Chrome: `chrome://inspect`
3. Click "Inspect" next to your device
4. Submit a fault report with photo
5. Watch console logs

### Step 4: Verify in Bitrix24

1. Log in to Bitrix24
2. Go to **Tasks**
3. Open the created task
4. Check for photo in comments

---

## 🔄 Alternative Upload Methods

### Method 1: Direct Comment Attachment (Current)
```
task.commentitem.add with FILES parameter
```
**Pros:** Simple, one step
**Cons:** Requires specific webhook permissions

### Method 2: Upload Then Attach (Fallback)
```
1. disk.folder.uploadfile → get fileId
2. task.commentitem.add with UF_FORUM_MESSAGE_DOC
```
**Pros:** More compatible with different Bitrix24 versions
**Cons:** Two API calls

### Method 3: Update Task Description (Not Recommended)
```
tasks.task.update with DESCRIPTION containing image link
```
**Pros:** Works without special permissions
**Cons:** Image not properly attached, just a link

---

## 📝 Console Log Reference

### Successful Upload
```
📎 Attaching file to task 123
📄 File details: {name: "photo.jpg", size: 1234567, type: "image/jpeg"}
✅ File converted to base64, length: 1647422
🚀 Method 1: Trying task.commentitem.add...
📊 Method 1 response status: 200
📥 Method 1 result: {result: 456, time: {...}}
✅ File attached successfully via task.commentitem.add (Method 1)
```

### Failed - Permission Issue
```
📎 Attaching file to task 123
✅ File converted to base64, length: 1647422
🚀 Method 1: Trying task.commentitem.add...
📊 Method 1 response status: 403
⚠️ Method 1 HTTP error 403: {"error":"insufficient_scope","error_description":"The request requires higher privileges than provided by the access token"}
Trying alternative method...
```

### Failed - File Too Large
```
📎 Attaching file to task 123
📄 File details: {name: "photo.jpg", size: 15728640, type: "image/jpeg"}
❌ File too large: 15.00MB (max 10MB)
```

---

## 🆘 Still Not Working?

### Option 1: Check Bitrix24 Status
Visit: https://status.bitrix24.com/

### Option 2: Test Webhook Manually
```bash
curl -X POST "https://your-portal/rest/1/TOKEN/task.commentitem.add.json" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "TASKID=123&FIELDS[POST_MESSAGE]=Test"
```

### Option 3: Contact Bitrix24 Support
- Bitrix24 Helpdesk: https://helpdesk.bitrix24.com/
- Forum: https://www.bitrix24.com/forum/

### Option 4: Use Alternative Method
Temporarily disable photo upload and add it manually in Bitrix24.

---

## ✅ Verification Checklist

Before reporting as "not working":

- [ ] Webhook URL is correct and accessible
- [ ] Webhook has `task` and `disk` permissions
- [ ] File size is under 10MB
- [ ] Internet connection is stable
- [ ] Bitrix24 is not down
- [ ] App is rebuilt and synced: `npm run build && npx cap sync`
- [ ] Tested on actual device (not just emulator)
- [ ] Console logs reviewed for specific error
- [ ] Task is actually created (photo might be only thing failing)

---

**Last Updated:** November 12, 2025
**Version:** 1.6.0

