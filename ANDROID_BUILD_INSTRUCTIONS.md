# Android APK Build Instructions

## Prerequisites

To build the Android APK, you need:
1. **Java JDK** (version 11 or higher)
2. **Android SDK** (comes with Android Studio)
3. **Gradle** (bundled with the project)

## Option 1: Build Using Android Studio (Recommended)

1. **Open Android Studio**
   - Open Android Studio
   - Select "Open" and navigate to: `android/` folder
   - Wait for Gradle sync to complete

2. **Build the APK**
   - Go to: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Wait for build to complete
   - Click "locate" in the notification when done
   - APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Option 2: Build Using Command Line

### Step 1: Install/Configure Java

**On macOS:**
```bash
# Option A: Install via Homebrew
brew install openjdk@11

# Option B: Install Android Studio (includes JDK)
# Download from: https://developer.android.com/studio

# After installing, set JAVA_HOME:
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
# Or for Android Studio's JDK:
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

**Verify Java:**
```bash
java -version
# Should show Java 11 or higher
```

### Step 2: Create Keystore (First Time Only)

If you don't have a keystore yet:

```bash
cd android/app

keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload \
  -storepass android123 \
  -keypass android123 \
  -dname "CN=SDINMOTION, OU=Mobile App, O=JBmarks Municipality, L=Potchefstroom, ST=North West, C=ZA"
```

**⚠️ IMPORTANT:** Keep this keystore file safe! You'll need it for all future updates.

### Step 3: Build the APK

```bash
# Navigate to android directory
cd android

# Make gradlew executable (if needed)
chmod +x gradlew

# Clean previous builds
./gradlew clean

# Build release APK
./gradlew assembleRelease
```

### Step 4: Locate the APK

The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Current Build Configuration

- **Package Name:** `com.municipality.faultreporter`
- **Version Code:** 17
- **Version Name:** 1.7.7
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)

## Keystore Configuration

The project is configured to use a keystore file located at:
- **Path:** `android/app/upload-keystore.jks`
- **Alias:** `upload`
- **Passwords:** Configured in `android/gradle.properties`

If the keystore doesn't exist, the build will fall back to debug signing (not suitable for Play Store).

## Troubleshooting

### Error: "Unable to locate Java Runtime"
- Install Java JDK (see Step 1 above)
- Set JAVA_HOME environment variable
- Restart terminal

### Error: "Keystore not found"
- Create keystore using Step 2 above
- Or build with debug signing: `./gradlew assembleDebug`

### Error: "Gradle build failed"
- Make sure Android SDK is installed
- Update Gradle wrapper: `./gradlew wrapper --gradle-version 8.0`
- Clean build: `./gradlew clean`

### Build takes too long
- First build downloads dependencies (one-time)
- Subsequent builds are faster
- Use `--offline` flag if you've built before

## Next Steps After Building

1. **Test the APK:**
   ```bash
   # Install on connected device
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

2. **Upload to Google Play Console:**
   - Sign in to [Google Play Console](https://play.google.com/console)
   - Go to your app
   - Create new release
   - Upload the APK or AAB file

3. **Build AAB for Play Store (Recommended):**
   ```bash
   cd android
   ./gradlew bundleRelease
   # AAB will be at: android/app/build/outputs/bundle/release/app-release.aab
   ```

## Quick Build Script

I've created `build-signed-apk.sh` in the project root. After configuring Java, you can use:

```bash
./build-signed-apk.sh
```

This script will:
1. Build web assets
2. Sync to Android
3. Build signed APK

