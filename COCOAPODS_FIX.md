# CocoaPods Framework Not Found - Fix

## Error
```
ld: framework 'Pods_JbmrksIOs' not found
```

## Solution

This happens when CocoaPods dependencies haven't been installed. Follow these steps:

### Step 1: Install CocoaPods (if not installed)

```bash
sudo gem install cocoapods
```

### Step 2: Install Pods

```bash
cd /Users/kamogelotshukudu/projects/JBMARKS/JbmrksIOs
pod install
```

### Step 3: Open the Workspace (NOT the Project)

**Important:** After running `pod install`, you must open the **`.xcworkspace`** file, not the `.xcodeproj` file.

1. Close Xcode if it's open
2. Open: `JbmrksIOs.xcworkspace` (not `JbmrksIOs.xcodeproj`)
3. Build again

### Alternative: If Pods are Empty

If your Podfile has no dependencies (which it currently doesn't), you can:

**Option A:** Remove CocoaPods entirely:
1. Close Xcode
2. Delete `Podfile`, `Podfile.lock`, `Pods/` directory, and `.xcworkspace`
3. Open `JbmrksIOs.xcodeproj` directly

**Option B:** Keep CocoaPods but ensure it's set up:
1. Run `pod install` (even with empty Podfile)
2. Open `.xcworkspace`

## Quick Fix

Run this in Terminal:

```bash
cd /Users/kamogelotshukudu/projects/JBMARKS/JbmrksIOs
pod install
```

Then in Xcode:
- Close the project
- Open `JbmrksIOs.xcworkspace` (not `.xcodeproj`)
- Build again

---

**Note:** Your Podfile currently has no dependencies, so `pod install` will just create the workspace structure.
