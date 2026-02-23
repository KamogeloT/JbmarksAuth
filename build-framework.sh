#!/bin/bash
# Build script for shared KMM framework
# Run this BEFORE building in Xcode

set -e

echo "Building shared KMM framework for iOS..."

cd "$(dirname "$0")"

# Check if Gradle wrapper exists
if [ ! -f "./gradlew" ]; then
    echo "Error: gradlew not found. Are you in the project root?"
    exit 1
fi

# Check if Java is available
if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed or not in PATH"
    echo "Please install Java 17 or later, or set JAVA_HOME"
    exit 1
fi

echo "Building framework for all iOS architectures..."
./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries

echo ""
echo "Framework build complete!"
echo ""
echo "Next steps:"
echo "1. cd JbmrksIOs"
echo "2. pod install"
echo "3. Open JbmrksIOs.xcworkspace in Xcode"
echo "4. Build the project (⌘B)"
