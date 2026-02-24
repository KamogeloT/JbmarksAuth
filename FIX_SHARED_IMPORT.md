# Fix: "unable to find 'shared'" Import Error

## Problem
Xcode shows error: `unable to find 'shared'` when trying to `import shared` in Swift files.

## Root Cause
The CocoaPods podspec is trying to compile Kotlin source files directly, which CocoaPods cannot do. We need to build a framework first.

## Solution: Build Framework Manually

### Step 1: Build the Framework Using Gradle

Run this command to build the framework for all iOS architectures:

```bash
cd /Users/kamogelotshukudu/projects/JBMARKS
./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries
```

### Step 2: Create Framework Structure

The framework needs to be created manually. Run this script:

```bash
cd /Users/kamogelotshukudu/projects/JBMARKS/shared
mkdir -p build/cocoapods/framework/shared.framework
```

### Step 3: Alternative - Use Xcode Build

1. Open `JbmrksIOs.xcworkspace` in Xcode
2. Select the **shared** target under Pods
3. Build it (⌘B)
4. The script phase in the podspec should build the framework

### Step 4: Update Podspec (if needed)

If the framework is built to a different location, update `shared/shared.podspec`:

```ruby
spec.vendored_frameworks = "build/cocoapods/framework/shared.framework"
```

Change the path to match where the framework actually gets built.

## Temporary Workaround

If you need to continue development while fixing this:

1. Comment out `import shared` temporarily
2. Build the framework first
3. Then uncomment the import

## Long-term Fix

The proper solution is to use the CocoaPods Gradle plugin, but it's not working in the current setup. We can:

1. Fix the CocoaPods plugin configuration
2. Or use a different integration method (SPM, manual framework)

For now, building in Xcode should work - the script phase will build the framework automatically.
