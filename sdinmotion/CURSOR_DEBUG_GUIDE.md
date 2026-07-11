# 🔧 Debugging & Building with Cursor (No Android Studio GUI)

Complete guide to build, run, and debug your mobile app entirely from Cursor's terminal.

## 📋 Prerequisites

1. **Android Studio** - Install it for SDK tools only (you won't open the GUI)
   - Download: https://developer.android.com/studio
   - During installation, make sure to install Android SDK, SDK Platform, and Android Virtual Device

2. **Enable USB Debugging on Samsung A04:**
   - Settings → About phone → Tap "Build number" 7 times
   - Settings → Developer options → Enable "USB Debugging"
   - Connect phone via USB

3. **ADB Setup** (Verify Android Debug Bridge works):
   ```bash
   # Check if ADB is accessible
   adb devices
   ```
   If you see your Samsung A04 listed, you're ready! 🎉

## 🚀 Build & Run Commands (From Cursor Terminal)

### **Development Workflow**

#### 1️⃣ **Build and Deploy to Your Phone**
```bash
# Build the app and deploy to connected device
npm run mobile:sync
npx cap run android
```

Or use the shortcut:
```bash
npm run mobile:run:android
```

This will:
- Build your React app (`npm run build`)
- Sync to Android project (`npx cap sync`)
- Install and launch on your Samsung A04

#### 2️⃣ **Quick Rebuild After Code Changes**
```bash
# Just rebuild and sync (faster)
npm run mobile:sync

# Then manually launch app on phone, or run:
npx cap run android
```

#### 3️⃣ **Development with Live Reload** (Recommended! 🔥)

For faster debugging, run the app with live reload:

**Step 1:** Start the dev server
```bash
npm run dev
```
Note the URL (usually `http://localhost:3001`)

**Step 2:** Find your computer's IP address
```bash
# Windows
ipconfig
# Look for "IPv4 Address" on your WiFi/Ethernet adapter
# Example: 192.168.1.100
```

**Step 3:** Edit `capacitor.config.ts` temporarily:
```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.municipality.faultreporter',
  appName: 'Municipal Fault Reporter',
  webDir: 'dist',
  
  // Add this for live reload (REMOVE before production build!)
  server: {
    url: 'http://192.168.1.100:3001', // Your computer's IP
    cleartext: true
  }
};

export default config;
```

**Step 4:** Deploy to phone
```bash
npx cap sync
npx cap run android
```

Now any changes you make will instantly reload on your phone! 🚀

⚠️ **IMPORTANT:** Remove the `server` config before building for production!

## 🐛 Debugging Tools

### **1. View Real-Time Logs (ADB Logcat)**

See all app logs directly in Cursor's terminal:

```bash
# View all logs from your app
adb logcat -s Capacitor ReactNativeJS Chromium Console

# Or filter for errors only
adb logcat *:E

# Clear logs first, then view new ones
adb logcat -c && adb logcat
```

**Pro Tip:** Open a separate terminal in Cursor for logs while developing.

### **2. Chrome DevTools (Best for JavaScript Debugging)**

Debug your JavaScript/TypeScript code with full Chrome DevTools:

1. **Enable USB Debugging** on your phone (already done ✓)
2. **Connect phone via USB**
3. **Open Chrome** on your computer and navigate to:
   ```
   chrome://inspect
   ```
4. You'll see your app listed under "Remote Target"
5. Click **"inspect"**

Now you can:
- ✅ Set breakpoints in your code
- ✅ Inspect React components
- ✅ View console logs
- ✅ Check network requests
- ✅ Inspect DOM/CSS
- ✅ Profile performance

### **3. React DevTools**

Install the Chrome extension:
- https://chrome.google.com/webstore/detail/react-developer-tools/

Then use it in `chrome://inspect` when debugging.

### **4. Check if App is Running**
```bash
# List running apps
adb shell ps | grep municipality

# Force stop the app
adb shell am force-stop com.municipality.faultreporter

# Clear app data
adb shell pm clear com.municipality.faultreporter
```

### **5. Install/Uninstall Manually**
```bash
# Uninstall the app
adb uninstall com.municipality.faultreporter

# Install APK manually
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Install and launch
adb install -r android/app/build/outputs/apk/debug/app-debug.apk && \
adb shell am start -n com.municipality.faultreporter/.MainActivity
```

### **6. Screen Recording & Screenshots**
```bash
# Take screenshot
adb exec-out screencap -p > screenshot.png

# Record screen (Ctrl+C to stop)
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

## 📱 Common Debugging Commands

### **Device Info**
```bash
# Check connected devices
adb devices

# Get device info
adb shell getprop ro.product.model
adb shell getprop ro.build.version.release
```

### **App Management**
```bash
# List installed packages
adb shell pm list packages | grep municipality

# Get app info
adb shell dumpsys package com.municipality.faultreporter

# Start app
adb shell am start -n com.municipality.faultreporter/.MainActivity
```

### **File System Access**
```bash
# Browse app's files
adb shell
cd /data/data/com.municipality.faultreporter
ls -la

# Pull file from phone
adb pull /sdcard/Download/myfile.txt

# Push file to phone
adb push myfile.txt /sdcard/Download/
```

## 🏗️ Build for Production (APK)

### **Debug APK (for testing)**
```bash
# Navigate to android folder
cd android

# Build debug APK (Windows)
.\gradlew assembleDebug

# Build debug APK (if bash is available)
./gradlew assembleDebug

cd ..
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### **Release APK (for distribution)**

First time setup - create keystore:
```bash
cd android/app

# Create keystore (do this once)
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

cd ../..
```

Then build:
```bash
cd android
.\gradlew assembleRelease
cd ..
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

### **Install APK on Phone**
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔍 Troubleshooting

### "adb: command not found"

Add Android SDK platform-tools to your PATH:

**Windows:**
1. Press Win + R, type `sysdm.cpl`, press Enter
2. Go to "Advanced" → "Environment Variables"
3. Edit "Path" and add:
   ```
   C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools
   ```

Or temporarily:
```powershell
$env:Path += ";C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools"
```

### "device unauthorized"
- Check your phone screen - allow USB debugging popup
- Run: `adb kill-server && adb start-server`

### "SDK location not found"

Create `android/local.properties`:
```bash
echo sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk > android/local.properties
```

### "Gradle sync failed"

Clean and rebuild:
```bash
cd android
.\gradlew clean
.\gradlew assembleDebug
cd ..
```

### App crashes or white screen

1. **Check logs:**
   ```bash
   adb logcat -s Capacitor *:E
   ```

2. **Rebuild everything:**
   ```bash
   npm run build
   npx cap sync
   npx cap run android
   ```

3. **Clear app data:**
   ```bash
   adb shell pm clear com.municipality.faultreporter
   ```

## ⚡ Pro Tips

### **Faster Development Loop**

1. **Keep dev server running** in one terminal:
   ```bash
   npm run dev
   ```

2. **Use live reload** (edit `capacitor.config.ts` as shown above)

3. **Keep logs running** in another terminal:
   ```bash
   adb logcat -s Capacitor Console
   ```

4. **Use Chrome DevTools** for instant debugging

### **Multiple Devices**

If you have multiple Android devices connected:
```bash
# List devices
adb devices

# Target specific device
adb -s DEVICE_ID logcat
adb -s DEVICE_ID install app.apk
```

### **Wireless Debugging** (Android 11+)

1. Connect phone via USB
2. Run:
   ```bash
   adb tcpip 5555
   adb shell ip addr show wlan0
   # Note the IP address
   adb connect 192.168.1.XXX:5555
   ```
3. Unplug USB cable
4. Continue debugging wirelessly!

## 📂 Project Structure

```
fault-reporting-mobile-app/
├── src/                          # Your React code (edit here)
│   ├── components/
│   │   └── FaultReporting.tsx   # Main camera & GPS logic
│   └── App.tsx
├── dist/                         # Built web assets
├── android/                      # Android native project
│   └── app/build/outputs/        # Built APKs here
├── capacitor.config.ts           # Capacitor config (add live reload here)
└── package.json                  # NPM scripts
```

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Build & run on phone | `npm run mobile:run:android` |
| Build only | `npm run build` |
| Sync to Android | `npx cap sync` |
| View logs | `adb logcat -s Capacitor` |
| Chrome debug | Open `chrome://inspect` |
| Uninstall app | `adb uninstall com.municipality.faultreporter` |
| Build APK | `cd android && .\gradlew assembleDebug` |
| Install APK | `adb install -r path/to/app.apk` |

## 🎉 Your Workflow

**Daily development:**
1. Edit code in `src/`
2. Run: `npm run mobile:sync`
3. App auto-installs and launches
4. View logs: `adb logcat -s Capacitor`
5. Debug in Chrome: `chrome://inspect`

**For live reload:**
1. `npm run dev`
2. Edit `capacitor.config.ts` (add server URL)
3. `npx cap sync && npx cap run android`
4. Now changes instantly reload! 🔥

---

**You're all set!** You can now build, run, and debug entirely from Cursor without ever opening Android Studio! 🚀

