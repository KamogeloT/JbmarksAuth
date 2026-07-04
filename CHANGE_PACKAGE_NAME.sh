#!/bin/bash
# Script to change Android package name

NEW_PACKAGE_NAME="${1:-com.jbmarks.faultreporter}"

if [ -z "$1" ]; then
    echo "Usage: ./CHANGE_PACKAGE_NAME.sh <new.package.name>"
    echo ""
    echo "Example: ./CHANGE_PACKAGE_NAME.sh com.jbmarks.faultreporter"
    exit 1
fi

OLD_PACKAGE="com.municipality.faultreporter"
NEW_PACKAGE="$NEW_PACKAGE_NAME"

echo "🔄 Changing package name from: $OLD_PACKAGE"
echo "                              to: $NEW_PACKAGE"
echo ""

# Convert package name to directory path
OLD_DIR=$(echo "$OLD_PACKAGE" | tr '.' '/')
NEW_DIR=$(echo "$NEW_PACKAGE" | tr '.' '/')

echo "📝 Step 1: Updating build.gradle..."
sed -i '' "s/namespace \"$OLD_PACKAGE\"/namespace \"$NEW_PACKAGE\"/g" android/app/build.gradle
sed -i '' "s/applicationId \"$OLD_PACKAGE\"/applicationId \"$NEW_PACKAGE\"/g" android/app/build.gradle

echo "📝 Step 2: Updating strings.xml..."
sed -i '' "s|$OLD_PACKAGE|$NEW_PACKAGE|g" android/app/src/main/res/values/strings.xml

echo "📝 Step 3: Moving Java source files..."
# Create new directory structure
mkdir -p "android/app/src/main/java/$NEW_DIR"
# Move files
if [ -d "android/app/src/main/java/$OLD_DIR" ]; then
    mv "android/app/src/main/java/$OLD_DIR"/* "android/app/src/main/java/$NEW_DIR/" 2>/dev/null
    # Remove old directory
    find "android/app/src/main/java" -type d -empty -delete
fi

echo "📝 Step 4: Updating MainActivity.java package declaration..."
if [ -f "android/app/src/main/java/$NEW_DIR/MainActivity.java" ]; then
    sed -i '' "s/package $OLD_PACKAGE;/package $NEW_PACKAGE;/" "android/app/src/main/java/$NEW_DIR/MainActivity.java"
fi

echo ""
echo "✅ Package name changed to: $NEW_PACKAGE"
echo ""
echo "Next steps:"
echo "1. Sync Capacitor: npx cap sync android"
echo "2. Rebuild AAB: cd android && ./gradlew bundleRelease"

