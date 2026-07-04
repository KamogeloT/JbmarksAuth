# Quick Build Commands Reference

## Build App Bundle for Google Play Console

```powershell
# Full build process
npm run build
npx cap sync android
cd android
.\gradlew clean bundleRelease
cd ..
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

## Build APK for Direct Installation

```powershell
# For testing on device without Play Store
cd android
.\gradlew assembleRelease
cd ..
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

## Build Debug Version

```powershell
# For development/testing
npm run build
npx cap sync android
cd android
.\gradlew bundleDebug
# or
.\gradlew assembleDebug
cd ..
```

## iOS Build (on Mac)

```bash
# After pulling latest code from GitHub
npm install
npm run build
npx cap sync ios
npx cap open ios
# Then build in Xcode
```

## Version Update Process

1. **Update version numbers** in `android/app/build.gradle`:
```gradle
versionCode 2        // Increment by 1 for each release
versionName "1.1"    // Your version string
```

2. **Rebuild:**
```powershell
npm run build
npx cap sync
cd android
.\gradlew clean bundleRelease
```

## Useful Gradle Commands

```powershell
cd android

# Clean build artifacts
.\gradlew clean

# List all tasks
.\gradlew tasks

# Build release bundle
.\gradlew bundleRelease

# Build release APK
.\gradlew assembleRelease

# Build debug versions
.\gradlew bundleDebug
.\gradlew assembleDebug

# Check dependencies
.\gradlew dependencies

# Build multiple variants
.\gradlew assemble
```

## Development Workflow

### After Code Changes

```powershell
# 1. Build web assets
npm run build

# 2. Sync to native platforms
npx cap sync

# 3. Open in Android Studio (optional)
npx cap open android

# 4. Or build directly
cd android
.\gradlew bundleRelease
```

### Quick Development Testing

```powershell
# Run in browser for quick testing
npm run dev

# Or run on connected Android device
npm run mobile:run:android
```

## Viewing Logs

### Android Logs (Device Connected)

```powershell
# View all logs
adb logcat

# Filter for your app
adb logcat | Select-String "chromium"

# Clear logs first
adb logcat -c
adb logcat
```

### Build Logs

```powershell
cd android
# Verbose output
.\gradlew bundleRelease --info
# or
.\gradlew bundleRelease --debug
```

## Troubleshooting

### Clear Everything and Rebuild

```powershell
# Clear npm cache
npm cache clean --force

# Clear Capacitor
npx cap sync --force

# Clear Gradle
cd android
.\gradlew clean
.\gradlew --stop  # Stop Gradle daemon

# Rebuild
cd ..
npm run build
npx cap sync
cd android
.\gradlew bundleRelease
```

### Permission Issues

```powershell
# Check AndroidManifest.xml permissions
Get-Content android/app/src/main/AndroidManifest.xml | Select-String "permission"
```

### Bundle Size Check

```powershell
# Check bundle size
Get-Item "android\app\build\outputs\bundle\release\app-release.aab" | Format-Table Name, Length
```

## Pre-Release Checklist

- [ ] Update versionCode and versionName
- [ ] Test on physical device
- [ ] Check all features work:
  - [ ] Camera photo capture
  - [ ] Gallery photo selection
  - [ ] Location capture
  - [ ] Form submission
  - [ ] Report history
- [ ] Review logs for errors
- [ ] Build release bundle
- [ ] Test release bundle (via bundletool or Play Console)
- [ ] Commit and push changes
- [ ] Tag release in git

## Git Workflow

```powershell
# After successful build
git add -A
git commit -m "Release v1.1 - [describe changes]"
git tag v1.1
git push origin master
git push origin v1.1
```

## File Locations Quick Reference

- **App Bundle:** `android/app/build/outputs/bundle/release/app-release.aab`
- **APK:** `android/app/build/outputs/apk/release/app-release.apk`
- **Build Config:** `android/app/build.gradle`
- **Manifest:** `android/app/src/main/AndroidManifest.xml`
- **Main Activity:** `android/app/src/main/java/com/municipality/faultreporter/MainActivity.java`
- **Web Assets:** `dist/`
- **Android Assets:** `android/app/src/main/assets/public/`
- **iOS Assets:** `ios/App/App/public/`

