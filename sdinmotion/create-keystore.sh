#!/bin/bash
# Script to create Android upload keystore for app signing

KEYSTORE_PATH="android/app/upload-keystore.jks"
KEYSTORE_PASSWORD="android123"
KEY_ALIAS="upload"
KEY_PASSWORD="android123"

# Check if keystore already exists
if [ -f "$KEYSTORE_PATH" ]; then
    echo "⚠️  Keystore already exists at $KEYSTORE_PATH"
    echo "If you want to recreate it, delete the file first and run this script again."
    exit 1
fi

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo "❌ Error: keytool not found. Please install Java JDK."
    echo ""
    echo "To install Java on macOS:"
    echo "  1. Install Android Studio (includes JDK)"
    echo "  2. Or install OpenJDK: brew install openjdk"
    echo ""
    echo "After installation, add Java to PATH or set JAVA_HOME"
    exit 1
fi

echo "🔑 Creating Android upload keystore..."
echo "Location: $KEYSTORE_PATH"
echo ""

# Create keystore
keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias "$KEY_ALIAS" \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=SDINMOTION, OU=Mobile App, O=JBmarks Municipality, L=Potchefstroom, ST=North West, C=ZA"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Keystore created successfully!"
    echo ""
    echo "📋 Keystore Details:"
    echo "   Location: $KEYSTORE_PATH"
    echo "   Alias: $KEY_ALIAS"
    echo "   Validity: 10000 days (~27 years)"
    echo ""
    echo "⚠️  IMPORTANT: Backup this keystore file!"
    echo "   - Store in a secure location"
    echo "   - Keep the passwords safe"
    echo "   - You'll need this for future app updates"
else
    echo ""
    echo "❌ Failed to create keystore. Please check the error above."
    exit 1
fi

