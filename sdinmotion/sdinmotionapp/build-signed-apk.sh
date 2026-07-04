#!/bin/bash
# Script to build signed Android APK

set -e

echo "🔨 Building signed Android APK..."
echo ""

# Step 1: Build web assets
echo "📦 Step 1: Building web assets..."
npm run build

# Step 2: Sync to Android
echo ""
echo "📱 Step 2: Syncing to Android..."
npx cap sync android

# Step 3: Check for keystore
KEYSTORE_PATH="android/app/upload-keystore.jks"
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo ""
    echo "⚠️  Warning: Keystore not found at $KEYSTORE_PATH"
    echo "The APK will be built with debug signing (not suitable for Play Store)."
    echo ""
    echo "To create a release keystore, run:"
    echo "  ./create-keystore.sh"
    echo ""
    read -p "Continue with debug signing? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Build cancelled. Please create the keystore first."
        exit 1
    fi
fi

# Step 4: Build signed APK
echo ""
echo "🔨 Step 3: Building signed APK..."
cd android

# Clean previous builds
./gradlew clean

# Build release APK
./gradlew assembleRelease

cd ..

# Check if APK was created
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ Signed APK built successfully!"
    echo ""
    echo "📦 APK Details:"
    echo "   Location: $APK_PATH"
    echo "   Size: $APK_SIZE"
    echo ""
    
    # Show APK info
    echo "📋 APK Information:"
    if command -v aapt &> /dev/null; then
        aapt dump badging "$APK_PATH" | grep -E "package:|versionCode:|versionName:" | head -3
    fi
    
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Test the APK on a device"
    echo "   2. For Play Store: Build AAB instead using: ./gradlew bundleRelease"
    echo "   3. Upload to Google Play Console"
else
    echo ""
    echo "❌ Error: APK not found at expected location"
    echo "Check the build output above for errors."
    exit 1
fi

