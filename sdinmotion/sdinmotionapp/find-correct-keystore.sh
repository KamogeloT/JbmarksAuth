#!/bin/bash
# Script to find keystore with correct SHA1 fingerprint

EXPECTED_SHA1="5F:D5:69:88:03:99:99:BF:0B:AB:DF:9F:2B:48:A1:19:CB:D8:DB:DF"
EXPECTED_SHA1_CLEAN=$(echo "$EXPECTED_SHA1" | tr -d ':')

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH=$JAVA_HOME/bin:$PATH

echo "🔍 Searching for keystore with SHA1: $EXPECTED_SHA1"
echo ""

# Check common locations
LOCATIONS=(
    "android/app"
    "android"
    "."
    "$HOME/Documents"
    "$HOME/Downloads"
    "$HOME/Desktop"
)

FOUND=false

for location in "${LOCATIONS[@]}"; do
    if [ -d "$location" ]; then
        echo "Checking: $location"
        find "$location" -maxdepth 3 -name "*.jks" -o -name "*.keystore" 2>/dev/null | while read keystore; do
            if [ -f "$keystore" ]; then
                echo "  Checking: $keystore"
                # Try to get fingerprint with android123 password
                SHA1=$(keytool -list -v -keystore "$keystore" -storepass android123 2>/dev/null | grep -i "SHA1:" | head -1 | awk '{print $2}')
                
                if [ ! -z "$SHA1" ]; then
                    SHA1_CLEAN=$(echo "$SHA1" | tr -d ':')
                    if [ "$SHA1_CLEAN" = "$EXPECTED_SHA1_CLEAN" ]; then
                        echo ""
                        echo "✅ FOUND CORRECT KEYSTORE!"
                        echo "   File: $keystore"
                        echo "   SHA1: $SHA1"
                        echo ""
                        echo "To use this keystore:"
                        echo "  cp \"$keystore\" android/app/upload-keystore.jks"
                        FOUND=true
                    fi
                fi
            fi
        done
    fi
done

if [ "$FOUND" = false ]; then
    echo ""
    echo "❌ Keystore with correct fingerprint not found automatically."
    echo ""
    echo "MANUAL STEPS:"
    echo "1. Locate your original keystore file (from previous builds)"
    echo "2. Check its fingerprint:"
    echo "   keytool -list -v -keystore YOUR_KEYSTORE.jks -storepass android123"
    echo "3. If SHA1 matches, copy it:"
    echo "   cp YOUR_KEYSTORE.jks android/app/upload-keystore.jks"
    echo "4. Rebuild AAB:"
    echo "   cd android && ./gradlew bundleRelease"
fi

