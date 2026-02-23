#!/bin/bash
# Script to install Java using Homebrew

echo "Installing Java 17 (Temurin) using Homebrew..."
echo "This may take a few minutes..."

brew install --cask temurin

echo ""
echo "Java installation complete!"
echo ""
echo "Verify installation:"
java -version
echo ""
echo "If Java is installed, you can now build the framework:"
echo "  cd /Users/kamogelotshukudu/projects/JBMARKS"
echo "  ./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries"
