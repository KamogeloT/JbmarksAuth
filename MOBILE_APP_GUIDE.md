# 📱 Mobile App Build & Deployment Guide

Your fault reporting app has been converted into a **native mobile application** using Capacitor! This guide will help you build and deploy it to Android and iOS devices.

## 🎯 What Changed?

Your app is now a **true native mobile app** that can:
- ✅ Run on Android and iOS devices
- ✅ Use native device camera (not just HTML5)
- ✅ Access high-accuracy GPS/geolocation
- ✅ Be published to Google Play Store and Apple App Store
- ✅ Work offline and install like any other mobile app
- ✅ Access all native device features

## 📋 Prerequisites

### For Android Development:
1. **Android Studio** - [Download here](https://developer.android.com/studio)
2. **Java JDK 17+** - Included with Android Studio
3. **Android SDK** - Installed via Android Studio

### For iOS Development (macOS only):
1. **macOS** computer (iOS development requires Mac)
2. **Xcode 14+** - [Download from App Store](https://apps.apple.com/us/app/xcode/id497799835)
3. **CocoaPods** - Install with: `sudo gem install cocoapods`
4. **Apple Developer Account** - Required for device testing and App Store

## 🚀 Quick Start

### Build for Web (Testing)
```bash
npm run dev
```
Visit `http://localhost:3001` in your browser

### Build and Sync to Mobile Platforms
```bash
npm run mobile:sync
```
This builds your React app and copies it to Android and iOS projects

## 📱 Android Development

### 1. Open Android Project
```bash
npm run mobile:android
```
This will open Android Studio with your project

### 2. Configure Android Studio
- First time: Wait for Gradle sync to complete (5-10 minutes)
- Install any suggested SDK components
- Connect an Android device or create an emulator

### 3. Run on Device/Emulator
**Option A: From Android Studio**
- Click the green "Run" button (▶️)
- Select your device or emulator

**Option B: From Command Line**
```bash
npm run mobile:run:android
```

### 4. Build Release APK
In Android Studio:
1. Go to **Build** → **Generate Signed Bundle / APK**
2. Choose **APK** → **Next**
3. Create a keystore (first time) or select existing
4. Select **release** build variant
5. Click **Finish**

Your APK will be in: `android/app/build/outputs/apk/release/`

### 5. Publish to Google Play Store
1. Create a [Google Play Console account](https://play.google.com/console) ($25 one-time fee)
2. Build a signed AAB (Android App Bundle):
   - **Build** → **Generate Signed Bundle / APK**
   - Choose **Android App Bundle** → **Release**
3. Upload to Google Play Console
4. Fill out store listing, screenshots, etc.
5. Submit for review

**App Details:**
- Package Name: `com.municipality.faultreporter`
- App Name: Municipal Fault Reporter

## 🍎 iOS Development

### 1. Install CocoaPods (First Time)
```bash
sudo gem install cocoapods
cd ios/App
pod install
cd ../..
```

### 2. Open iOS Project
```bash
npm run mobile:ios
```
This will open Xcode with your project

### 3. Configure Xcode
1. Select your development team:
   - Click on "App" project in the file navigator
   - Under "Signing & Capabilities"
   - Select your Apple Developer team
2. Update Bundle Identifier if needed: `com.municipality.faultreporter`

### 4. Run on Simulator
**Option A: From Xcode**
- Select a simulator from the device dropdown
- Click the "Run" button (▶️)

**Option B: From Command Line**
```bash
npm run mobile:run:ios
```

### 5. Run on Physical Device
1. Connect your iPhone/iPad via USB
2. Select your device from the device dropdown
3. Click "Run"
4. First time: Trust developer certificate on device (Settings → General → VPN & Device Management)

### 6. Build for App Store
1. In Xcode: **Product** → **Archive**
2. Wait for archive to complete
3. Click **Distribute App**
4. Choose **App Store Connect**
5. Follow the wizard

### 7. Publish to Apple App Store
1. Create an [Apple Developer account](https://developer.apple.com) ($99/year)
2. Create app in [App Store Connect](https://appstoreconnect.apple.com)
3. Upload build from Xcode
4. Fill out app information, screenshots, etc.
5. Submit for review

**App Details:**
- Bundle ID: `com.municipality.faultreporter`
- App Name: Municipal Fault Reporter

## 🔧 Development Workflow

### Making Changes
1. Edit your React code in `src/` folder
2. Build and sync:
   ```bash
   npm run mobile:sync
   ```
3. Rerun the app in Android Studio or Xcode

### Hot Reload (Development Only)
For faster development, you can use live reload:
```bash
npm run dev
```
Then configure Capacitor to use your local server (see below)

### Using Local Dev Server in App
Edit `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  // ... other config
  server: {
    url: 'http://192.168.1.100:3001', // Your computer's local IP
    cleartext: true
  }
};
```
⚠️ **Remove this before building for production!**

## 🎨 Native Features Implemented

### 📷 Camera
- Users can take photos or choose from gallery
- Native camera API (better than HTML5)
- Photos are automatically attached to reports

**Permissions Required:**
- Android: `CAMERA`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
- iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`

### 📍 Geolocation
- High-accuracy GPS positioning
- Automatically captures location for reports
- Works better than browser geolocation

**Permissions Required:**
- Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- iOS: `NSLocationWhenInUseUsageDescription`

### 📄 File System
- Save reports locally
- Offline functionality
- Report history

## 🔐 Permissions

Permissions are already configured in:
- **Android**: `android/app/src/main/AndroidManifest.xml`
- **iOS**: `ios/App/App/Info.plist`

Current permissions:
- Camera access
- Photo library access
- Location services (GPS)
- Internet access
- File storage

## 📦 App Assets

### App Icons
Replace default icons in:
- **Android**: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- **iOS**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Use a tool like [App Icon Generator](https://www.appicon.co/) to create all sizes.

### Splash Screen
Update splash screens in:
- **Android**: `android/app/src/main/res/drawable*/splash.png`
- **iOS**: `ios/App/App/Assets.xcassets/Splash.imageset/`

## 🐛 Troubleshooting

### Android Issues

**"SDK location not found"**
```bash
# Create local.properties in android/ folder
echo "sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk" > android/local.properties
```

**"Gradle sync failed"**
- Open Android Studio
- File → Invalidate Caches → Invalidate and Restart
- Clean and rebuild: Build → Clean Project → Rebuild Project

**"App not installing"**
```bash
# Clear and reinstall
adb uninstall com.municipality.faultreporter
npm run mobile:run:android
```

### iOS Issues

**"CocoaPods not found"**
```bash
sudo gem install cocoapods
cd ios/App && pod install && cd ../..
```

**"Code signing error"**
- Select your Apple Developer team in Xcode
- Change Bundle Identifier to something unique
- Try a different device or simulator

**"Module not found" errors**
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

### General Issues

**"White screen" or "App crashes"**
1. Check browser console for errors (when testing in browser)
2. Check Android Studio Logcat or Xcode Console for native logs
3. Rebuild:
   ```bash
   npm run build
   npx cap sync
   ```

**Capacitor plugins not working**
```bash
# Reinstall and sync
npm install
npm run mobile:sync
```

## 📝 Important Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration |
| `android/` | Android native project |
| `ios/` | iOS native project |
| `dist/` | Built web assets (copied to native projects) |
| `src/components/FaultReporting.tsx` | Uses native Camera & Geolocation |

## 🔄 Updating the App

When you make changes to your code:

1. **Edit code** in `src/` folder
2. **Build**: `npm run build`
3. **Sync**: `npx cap sync`
4. **Test**: Rerun in Android Studio or Xcode

Or use the shortcut:
```bash
npm run mobile:sync
```

## 📊 App Performance

### App Size
- Android APK: ~10-15 MB
- iOS IPA: ~15-20 MB
- Can be optimized further with ProGuard/R8 (Android) and App Thinning (iOS)

### Optimization Tips
1. **Images**: Compress images before including
2. **Dependencies**: Remove unused npm packages
3. **Code splitting**: Use dynamic imports for large features
4. **Minification**: Production builds are automatically minified

## 🎯 Next Steps

1. **Test thoroughly** on real devices
2. **Update app icon** and splash screen
3. **Configure deep linking** (optional)
4. **Set up push notifications** (optional)
5. **Add analytics** (Firebase, Mixpanel, etc.)
6. **Create store listings** with screenshots
7. **Submit to app stores**

## 🆘 Need Help?

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Docs**: https://developer.android.com/docs
- **iOS Docs**: https://developer.apple.com/documentation
- **Stack Overflow**: Tag questions with `capacitor`, `android`, or `ios`

## 📱 Testing on Your Device

### Android (Easiest)
1. Enable Developer Mode on your Android phone
2. Enable USB Debugging
3. Connect via USB
4. Run: `npm run mobile:run:android`

### iOS (Requires Mac)
1. Connect iPhone via USB
2. Trust computer on device
3. Run: `npm run mobile:run:ios`
4. Trust developer certificate on device

---

**🎉 Congratulations!** Your web app is now a fully native mobile application ready for Android and iOS!

