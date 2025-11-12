# Debug Android App via USB Cable

## 🎯 Best Way to Debug - Chrome Remote Debugging

### Step 1: Enable USB Debugging on Your Phone

1. **Open Settings** on your Android phone
2. Go to **About Phone** (usually at bottom)
3. Tap **Build Number** 7 times (enables Developer Mode)
4. You'll see: "You are now a developer!"
5. Go back to **Settings** → **System** → **Developer Options**
6. Enable **USB Debugging** (toggle ON)
7. If asked, allow USB debugging for your computer

### Step 2: Connect Phone to Computer

1. Connect phone via **USB cable**
2. On phone: Tap **"Allow USB Debugging"** popup
3. Check **"Always allow from this computer"** (optional)
4. Tap **OK**

### Step 3: Verify Connection

Open PowerShell/Terminal:
```bash
cd C:\Users\kamogelot\Downloads\fault-reporting-mobile-app
adb devices
```

**Expected output:**
```
List of devices attached
ABC123XYZ    device
```

If you see "unauthorized", check phone for popup.

### Step 4: Install & Run App

```bash
# Build and install debug APK
cd android
./gradlew installDebug

# Launch app
adb shell am start -n com.municipality.faultreporter/.MainActivity

# Or combined command
./gradlew installDebug && adb shell am start -n com.municipality.faultreporter/.MainActivity
```

### Step 5: Open Chrome DevTools

1. Open **Google Chrome** on computer
2. Go to: `chrome://inspect`
3. You'll see your phone under "Remote Target"
4. Find: **"com.municipality.faultreporter"**
5. Click **"inspect"**

**Screenshot of what you'll see:**
```
Remote Target #ABC123XYZ
  ↳ com.municipality.faultreporter
    [inspect] [focus tab] [reload] [close]
```

### Step 6: Monitor Logs & Test

1. In DevTools, click **Console** tab
2. On your phone, open the app
3. Create a fault report with photo
4. Watch the console logs in real-time!

**You'll see:**
```
📎 Attaching file to task 123
📄 File details: {name: "IMG_20251112.jpg", size: 2456789, type: "image/jpeg"}
✅ File converted to base64, length: 3275720
🚀 Method 1: Trying task.commentitem.add...
📊 Method 1 response status: 200
✅ File attached successfully via task.commentitem.add (Method 1)
```

---

## 🔍 What to Look For

### ✅ Success Logs
```
✅ Task created successfully, ID: 123
📎 Attaching file to task 123
✅ File converted to base64
🚀 Method 1: Trying task.commentitem.add...
📊 Method 1 response status: 200
✅ File attached successfully
```

### ❌ Error Logs
```
❌ HTTP error 403: Access denied
⚠️ Method 1 failed: insufficient_scope
Trying alternative method...
```

### 🐛 Common Issues

**Issue 1: "adb not found"**
```bash
# Add to PATH or use full path
C:\Users\kamogelot\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
```

**Issue 2: "No devices found"**
- Check USB cable (use data cable, not charge-only)
- Enable USB debugging on phone
- Try different USB port
- Restart adb: `adb kill-server && adb start-server`

**Issue 3: "Chrome can't see device"**
- Make sure app is running on phone
- Refresh `chrome://inspect` page
- Check "Discover USB devices" is enabled

---

## 📱 Alternative: View Logs Without Chrome

### Method A: Logcat (All logs)
```bash
# View all app logs
adb logcat | findstr "fault-reporting"

# Or save to file
adb logcat > logs.txt
```

### Method B: System Web Inspector
```bash
# On phone, enable Web Inspector
# Settings → Developer Options → Enable WebView debugging

# Then use chrome://inspect
```

---

## 🧪 Testing Workflow

### Test 1: Basic Upload
1. Open app on phone
2. Create water fault report
3. Take/select photo
4. Submit
5. Check console logs
6. Verify in Bitrix24

### Test 2: Large File
1. Select large photo (>5MB)
2. Watch logs for size validation
3. Should succeed if <10MB

### Test 3: Network Error
1. Turn off WiFi/mobile data briefly
2. Try to upload
3. Turn network back on
4. Check error handling

### Test 4: Multiple Uploads
1. Submit 3 reports with photos
2. Watch for rate limiting
3. Verify all attach successfully

---

## 📊 Console Commands

While debugging in Chrome DevTools, you can run:

```javascript
// Check localStorage
localStorage.getItem('fault_reports')

// Clear storage
localStorage.clear()

// Get app version
document.querySelector('[name="version"]')?.content

// Check webhook URL (be careful, sensitive data)
// Don't share this!
```

---

## 🎯 Quick Debug Commands

### Build & Install & Launch
```bash
cd C:\Users\kamogelot\Downloads\fault-reporting-mobile-app
npm run build
npx cap sync android
cd android
./gradlew installDebug
adb shell am start -n com.municipality.faultreporter/.MainActivity
```

### View Logs
```bash
# Open Chrome
start chrome chrome://inspect

# Or view in terminal
adb logcat -s Capacitor:V,Console:V
```

### Capture Screenshot
```bash
# Take screenshot from device
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Or use Chrome DevTools → More Tools → Screenshot
```

---

## 🔧 Troubleshooting

### "App crashes on launch"
```bash
# View crash log
adb logcat -s AndroidRuntime:E

# Clear app data
adb shell pm clear com.municipality.faultreporter
```

### "Can't take photo"
```bash
# Check camera permission
adb shell pm grant com.municipality.faultreporter android.permission.CAMERA
```

### "Network error"
```bash
# Check internet permission
adb shell pm grant com.municipality.faultreporter android.permission.INTERNET
```

---

## ✅ Best Practices

1. **Keep Chrome DevTools open** - Don't close it while testing
2. **Preserve logs** - Enable "Preserve log" in Console
3. **Filter console** - Use filter: "Attaching file" to focus
4. **Take screenshots** - Document errors with screenshots
5. **Copy error messages** - Right-click → Copy message

---

## 📝 Reporting Issues

When reporting issues, include:

1. **Console logs** (copy from Chrome DevTools)
2. **Network tab** (show failed requests)
3. **App version** (from About screen or build.gradle)
4. **Android version** (Settings → About Phone)
5. **File size** (of photo being uploaded)

---

**Pro Tip:** Leave Chrome DevTools open on your computer screen while testing on your phone. You'll see logs in real-time! 🚀

