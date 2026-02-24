# How to Fix "Cannot find type" Errors

## Problem
You're getting errors like "Cannot find type 'AuthRepository' in scope" or "Cannot find type 'TokenStorage' in scope" because the shared framework hasn't been built yet.

## Root Cause
The podspec script phase tries to build the framework using Gradle, but:
1. Gradle requires Java (which might not be available)
2. The framework needs to be built BEFORE Swift can compile
3. This creates a chicken-and-egg problem

## Solution: Build Framework Manually First

### Step 1: Build the Framework Using Gradle

You need to build the framework manually first. Run this command:

```bash
cd /Users/kamogelotshukudu/projects/JBMARKS
./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries
```

**If you get "Java not found" error:**
- Install Java 17 or later
- Or use the system Java if available: `export JAVA_HOME=/usr/libexec/java_home`

### Step 2: Verify Framework Was Built

Check if the framework exists:
```bash
find shared/build -name "shared.framework" -o -name "*.framework"
```

### Step 3: Reinstall Pods

After building the framework, reinstall CocoaPods:
```bash
cd JbmrksIOs
pod deintegrate
pod install
```

### Step 4: Build in Xcode

Now try building in Xcode:
1. Open `JbmrksIOs.xcworkspace`
2. Product → Clean Build Folder (Shift+Cmd+K)
3. Product → Build (Cmd+B)

## Alternative: Use Xcode to Build Framework

If Gradle doesn't work, you can try building just the shared target in Xcode:

1. Open `JbmrksIOs.xcworkspace`
2. In the Project Navigator, find **Pods** → **shared**
3. Select the **shared** target
4. Build it (⌘B)
5. The script phase should build the framework

## If Still Not Working

If the framework still isn't found, the podspec might need to reference it explicitly. Check if the framework exists and update the podspec to use `vendored_frameworks`.
