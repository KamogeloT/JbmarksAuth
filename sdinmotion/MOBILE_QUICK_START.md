# 📱 Quick Start - Mobile App

## ⚡ TL;DR

Your app is now a **native mobile app** for Android & iOS!

## 🚀 Common Commands

```bash
# Install dependencies
npm install

# Build and sync to mobile platforms
npm run mobile:sync

# Open Android Studio
npm run mobile:android

# Open Xcode (macOS only)
npm run mobile:ios

# Run on Android device
npm run mobile:run:android

# Run on iOS simulator (macOS only)
npm run mobile:run:ios
```

## 📱 Test on Your Phone Right Now

### Android (5 minutes):
1. Install [Android Studio](https://developer.android.com/studio)
2. Enable USB Debugging on your phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
3. Connect phone to computer with USB cable
4. Run: `npm run mobile:run:android`
5. ✅ App installs and runs on your phone!

### iOS (10 minutes, macOS only):
1. Install [Xcode](https://apps.apple.com/us/app/xcode/id497799835) from App Store
2. Connect iPhone to Mac with USB cable
3. Run: `npm run mobile:ios`
4. In Xcode: Select your iPhone and click Run (▶️)
5. On iPhone: Trust developer certificate (Settings → General → VPN & Device Management)
6. ✅ App installs and runs on your iPhone!

## 🎯 What's Different?

| Feature | Before (PWA) | Now (Native App) |
|---------|-------------|------------------|
| Platform | Web browser only | Native Android & iOS |
| Camera | HTML5 (limited) | Native camera API |
| GPS | Browser geolocation | High-accuracy GPS |
| Installation | Add to home screen | Install from app stores |
| Offline | Service worker | Full native offline |
| Performance | Good | Excellent |
| App Stores | ❌ No | ✅ Yes |

## 📦 What Got Added?

- `/android/` - Android project
- `/ios/` - iOS project  
- `capacitor.config.ts` - Mobile configuration
- Native camera & GPS in `FaultReporting.tsx`
- Mobile build scripts in `package.json`

## 🔄 Development Workflow

1. **Make changes** to your React code in `src/`
2. **Build and sync**: `npm run mobile:sync`
3. **Test**: Rerun app in Android Studio or Xcode

## 📝 App Details

- **App Name**: Municipal Fault Reporter
- **Package ID**: `com.municipality.faultreporter`
- **Android**: `android/` folder
- **iOS**: `ios/` folder

## 🆘 Quick Fixes

**Android won't build?**
```bash
cd android
./gradlew clean
cd ..
npm run mobile:sync
```

**iOS won't build?**
```bash
cd ios/App
pod install
cd ../..
npm run mobile:sync
```

**Need to reset everything?**
```bash
rm -rf android ios
npm run build
npx cap add android
npx cap add ios
```

## 📖 Full Documentation

See **MOBILE_APP_GUIDE.md** for complete instructions including:
- App Store submission
- Code signing
- Advanced configuration
- Troubleshooting
- Publishing to stores

---

**Ready to publish?** Read `MOBILE_APP_GUIDE.md` for store submission details.

