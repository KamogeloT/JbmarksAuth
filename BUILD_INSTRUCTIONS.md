# Step-by-Step Build Instructions for Mac

## Step 1: Open Terminal

**Method 1 (Easiest):**
1. Press `Command (⌘) + Space` (hold both keys together)
2. Type: `Terminal`
3. Press `Enter`

**Method 2:**
1. Click the Finder icon in your Dock (bottom of screen)
2. Click "Applications" in the sidebar
3. Open the "Utilities" folder
4. Double-click "Terminal"

## Step 2: Navigate to Your Project

Once Terminal is open, you'll see a prompt that looks like:
```
your-username@your-computer-name ~ %
```

**Copy and paste this command, then press Enter:**
```bash
cd /Users/kamogelotshukudu/projects/JBMARKS
```

**What this does:**
- `cd` = "change directory" (navigate to a folder)
- The path `/Users/kamogelotshukudu/projects/JBMARKS` is your project location

**Verify you're in the right place:**
Type this and press Enter:
```bash
pwd
```

You should see: `/Users/kamogelotshukudu/projects/JBMARKS`

## Step 3: Build the Framework

**Copy and paste these commands one at a time, pressing Enter after each:**

```bash
./gradlew :shared:clean
```

Wait for it to finish (you'll see "BUILD SUCCESSFUL" or similar).

Then run:
```bash
./gradlew :shared:iosArm64MainBinaries :shared:iosSimulatorArm64MainBinaries :shared:iosX64MainBinaries
```

**This will take a few minutes** - you'll see lots of text scrolling. Wait until you see "BUILD SUCCESSFUL".

**If you get "Java not found" error:**
- The system will try to download Java automatically
- If that doesn't work, you may need to install Java manually

## Step 4: Navigate to iOS Project

After the framework builds successfully, run:
```bash
cd JbmrksIOs
```

## Step 5: Reinstall CocoaPods

```bash
pod install
```

**If you get "pod: command not found":**
You need to install CocoaPods first:
```bash
sudo gem install cocoapods
```
(You'll need to enter your Mac password)

## Step 6: Open Xcode

**Method 1 (from Terminal):**
```bash
open JbmrksIOs.xcworkspace
```

**Method 2 (manually):**
1. Open Finder
2. Navigate to: `/Users/kamogelotshukudu/projects/JBMARKS/JbmrksIOs`
3. Double-click `JbmrksIOs.xcworkspace` (NOT `.xcodeproj`)

## Step 7: Build in Xcode

1. In Xcode, press `Shift + Command + K` (Clean Build Folder)
2. Then press `Command + B` (Build)

## Troubleshooting

**"Permission denied" error:**
Run this first:
```bash
chmod +x gradlew
```

**"Java not found":**
Install Java from: https://adoptium.net/
Or let Gradle download it automatically (it will try)

**"pod: command not found":**
Install CocoaPods:
```bash
sudo gem install cocoapods
```
