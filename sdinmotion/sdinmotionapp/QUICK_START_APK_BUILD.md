# Quick Start: Build Signed APK for Play Store

## ⚡ Fast Setup (3 Steps)

### Step 1: Install Java JDK

Open Terminal and run:
```bash
brew install --cask temurin
```

**Note:** This will ask for your password to install Java.

After installation, verify:
```bash
java -version
```

### Step 2: Build the APK

Navigate to project and run:
```bash
cd /Users/kamogelotshukudu/.cursor/worktrees/sdinmotionapp/FOOWY
./prepare-apk-build.sh
```

This script will:
- ✅ Build web assets
- ✅ Sync to Android
- ✅ Create keystore (if needed)
- ✅ Build signed APK

### Step 3: Find Your APK

The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📋 What's Already Prepared

✅ Web assets built and synced  
✅ Build configuration ready  
✅ Keystore creation script ready  
✅ Build script created (`prepare-apk-build.sh`)

---

## 🔧 Manual Build Steps (if script doesn't work)

1. **Install Java:**
   ```bash
   brew install --cask temurin
   ```

2. **Verify Java:**
   ```bash
   java -version
   ```

3. **Create keystore (first time only):**
   ```bash
   cd android/app
   keytool -genkey -v -keystore upload-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias upload \
     -storepass android123 \
     -keypass android123 \
     -dname "CN=SDINMOTION, OU=Mobile App, O=JBmarks Municipality, L=Potchefstroom, ST=North West, C=ZA"
   cd ../..
   ```

4. **Build APK:**
   ```bash
   cd android
   chmod +x gradlew
   ./gradlew clean assembleRelease
   cd ..
   ```

5. **Find APK:**
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## ❓ Troubleshooting

### "Java not found"
- Run: `brew install --cask temurin`
- Then: `export JAVA_HOME=$(/usr/libexec/java_home -v 11)`

### "Permission denied"
- Run: `chmod +x gradlew`
- Run: `chmod +x prepare-apk-build.sh`

### Build fails
- First build downloads dependencies (may take 5-10 minutes)
- Check internet connection
- Ensure Android SDK is installed (if using Android Studio)

---

## 📦 APK Information

- **Package:** com.municipality.faultreporter
- **Version:** 1.7.7 (Code: 17)
- **Signing:** Release keystore
- **Ready for:** Google Play Store upload

