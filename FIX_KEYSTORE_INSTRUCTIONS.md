# Fix Keystore Fingerprint Mismatch

## Problem

Google Play Console expects a keystore with SHA1:
```
5F:D5:69:88:03:99:99:BF:0B:AB:DF:9F:2B:48:A1:19:CB:D8:DB:DF
```

But the current keystore has SHA1:
```
60:63:27:47:02:F1:AB:CD:88:14:80:01:D1:B5:13:D2:DC:F9:12:FF
```

## Solution

You need to use the **original keystore** that was used for previous Play Store uploads.

### Step 1: Find Your Original Keystore

The original keystore file should be:
- A `.jks` or `.keystore` file
- From a previous build or backup
- Password: `android123` (as you mentioned)

**Common locations to check:**
- Previous project backups
- Downloads folder
- Documents folder
- Old Android project folders
- Cloud backup (Google Drive, Dropbox, etc.)

### Step 2: Verify the Keystore Fingerprint

Once you find a keystore file, check its fingerprint:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH

keytool -list -v -keystore YOUR_KEYSTORE.jks -storepass android123
```

Look for the SHA1 line. It should match:
```
SHA1: 5F:D5:69:88:03:99:99:BF:0B:AB:DF:9F:2B:48:A1:19:CB:D8:DB:DF
```

### Step 3: Use the Correct Keystore

Once you find the correct keystore:

```bash
# Copy it to the android/app directory
cp YOUR_ORIGINAL_KEYSTORE.jks android/app/upload-keystore.jks

# Verify it's correct
keytool -list -v -keystore android/app/upload-keystore.jks -storepass android123 | grep SHA1
```

### Step 4: Rebuild the AAB

```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME="/Users/kamogelotshukudu/Library/Android/sdk"

./gradlew clean bundleRelease
```

The new AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Alternative: Use Google Play App Signing

If you can't find the original keystore, you can:

1. **Request key reset** in Google Play Console (if this is a new app)
2. **Use Google Play App Signing** - Google can manage the signing key for you
3. **Contact Google Play Support** for assistance

## Quick Check Script

Run this to search for the correct keystore:

```bash
./find-correct-keystore.sh
```

## Important Notes

- ⚠️ **Never lose your original keystore!** You need it for all future updates
- ⚠️ **Keep it backed up** in multiple secure locations
- ⚠️ **The keystore password is:** `android123` (as you mentioned)

