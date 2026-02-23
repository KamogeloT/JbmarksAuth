# Fix for "unable to find shared" Import Error

## Problem
Xcode shows error: `unable to find 'shared'` when trying to `import shared`

## Solution

The issue is that the podspec needs to build a framework, not compile Kotlin source files. Here's the fix:

### Option 1: Build Framework First (Recommended)

1. **Build the framework using Gradle:**
   ```bash
   cd /Users/kamogelotshukudu/projects/JBMARKS
   ./gradlew :shared:assembleSharedXCFramework
   ```

   If that doesn't work, try:
   ```bash
   ./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries
   ```

2. **Update the podspec** to reference the built framework (see updated podspec below)

3. **Reinstall pods:**
   ```bash
   cd JbmrksIOs
   pod deintegrate
   pod install
   ```

### Option 2: Use CocoaPods Gradle Plugin (Better Long-term)

The CocoaPods Gradle plugin should generate the framework automatically. However, it's not working in the current setup. 

**Alternative:** Use the manual approach above for now, or wait for the framework to be built during Xcode compilation (the script phase in the podspec will build it).

### Option 3: Quick Fix - Build in Xcode

1. Open `JbmrksIOs.xcworkspace` in Xcode
2. Select the **shared** target in Pods
3. Build it (⌘B)
4. The framework should be built and then `import shared` should work

## Updated Podspec (if needed)

If the framework is built to a specific location, update `shared.podspec`:

```ruby
spec.vendored_frameworks = "build/bin/iosArm64/debugFramework/shared.framework"
```

Or if using XCFramework:
```ruby
spec.vendored_frameworks = "build/XCFrameworks/release/shared.xcframework"
```

## Verify Framework is Built

Check if framework exists:
```bash
find shared/build -name "shared.framework" -o -name "shared.xcframework"
```

## Next Steps

1. Try building the shared target in Xcode first
2. If that works, `import shared` should resolve
3. If not, we may need to adjust the podspec to reference the correct framework path
