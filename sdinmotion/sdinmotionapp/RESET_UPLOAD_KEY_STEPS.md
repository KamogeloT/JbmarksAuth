# Reset Upload Key in Google Play Console

## ✅ Google Play App Signing is Enabled!

Since App Signing is enabled, you can easily reset your upload key.

## Step-by-Step Instructions

### Step 1: Go to App Signing in Play Console

1. Open: https://play.google.com/console
2. Select your app: **com.municipality.faultreporter**
3. Navigate to: **Release** → **Setup** → **App signing**

### Step 2: Reset Upload Key

1. Look for **"Upload key certificate"** section
2. Click **"Request upload key reset"** or **"Reset upload key"**
3. Follow Google's prompts:
   - You'll need to upload a certificate from the NEW keystore
   - Google will provide instructions

### Step 3: Generate Upload Certificate from New Keystore

Once you're in the reset process, you'll need to generate a certificate file:

**Run this command:**
```bash
cd /Users/kamogelotshukudu/.cursor/worktrees/sdinmotionapp/FOOWY
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH

keytool -export -rfc -keystore android/app/upload-keystore.jks -alias upload -file upload_certificate.pem -storepass android123
```

This creates `upload_certificate.pem` file that you'll upload to Google Play Console.

### Step 4: Upload Certificate to Google

1. Upload the `upload_certificate.pem` file in Google Play Console
2. Complete the reset process
3. Google will approve the new upload key

### Step 5: Rebuild and Upload AAB

Once the upload key is reset and approved:

1. The current `upload-keystore.jks` will be accepted
2. Rebuild the AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
3. Upload the new AAB to Play Console

---

## Quick Commands

**Generate certificate:**
```bash
keytool -export -rfc -keystore android/app/upload-keystore.jks -alias upload -file upload_certificate.pem -storepass android123
```

**After reset is approved, rebuild:**
```bash
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME="/Users/kamogelotshukudu/Library/Android/sdk"
./gradlew bundleRelease
```

---

**Note:** The reset process may take a few hours to be approved by Google.

