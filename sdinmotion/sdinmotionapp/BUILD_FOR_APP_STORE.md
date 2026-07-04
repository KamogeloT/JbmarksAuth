# Build for App Store Submission - Step by Step

## ⚠️ IMPORTANT: You Need a New Build!

The App Store fixes (ATS removal, HTTPS validation, updated icon) are on the **feature branch** and need to be included in your build.

---

## 🔧 Option 1: Build from Feature Branch (Recommended)

### Step 1: Switch to Feature Branch

```bash
git checkout feature/bitrix24-integration-and-city-dropdown
```

### Step 2: Sync Capacitor

```bash
npm run build
npx cap sync ios
```

### Step 3: Open in Xcode

```bash
open ios/App/App.xcworkspace
```

### Step 4: Build and Archive

1. **Select Target:**
   - In Xcode, select **Any iOS Device** or **Generic iOS Device** (not Simulator)

2. **Clean Build:**
   - Product → Clean Build Folder (Shift+Cmd+K)

3. **Archive:**
   - Product → **Archive**
   - Wait for archive to complete

4. **Distribute:**
   - Click **Distribute App**
   - Select **App Store Connect**
   - Select **Upload**
   - Follow the wizard

---

## 🔧 Option 2: Merge to Master First

If you prefer to build from master:

### Step 1: Merge Feature Branch

```bash
git checkout master
git merge feature/bitrix24-integration-and-city-dropdown
# Resolve any conflicts if needed
git push origin master
```

### Step 2: Build from Master

Then follow the build steps above.

---

## ✅ What's Included in This Build

- ✅ **ATS Exception Removed** - App Store compliant
- ✅ **HTTPS Validation** - Ensures secure connections
- ✅ **JBmarks App Icon** - Updated logo
- ✅ **Privacy Policy** - Ready for App Store Connect
- ✅ **City Dropdown Fixes** - UI improvements

---

## 📋 Pre-Build Checklist

Before archiving, verify:

- [ ] On correct branch (feature branch or merged to master)
- [ ] App version: 1.8.0
- [ ] Build number: 20
- [ ] Info.plist: ATS exception removed ✅
- [ ] App icon: JBmarks logo ✅
- [ ] All changes synced with Capacitor

---

## 🏗️ Build Process

### 1. Build Web Assets

```bash
npm run build
```

### 2. Sync to iOS

```bash
npx cap sync ios
```

### 3. Open Xcode

```bash
open ios/App/App.xcworkspace
```

### 4. Archive

- Product → Archive
- Wait for completion
- Distribute → App Store Connect → Upload

---

## ⏱️ Timeline

- **Build:** 5-10 minutes
- **Archive:** 5-10 minutes
- **Upload:** 10-30 minutes
- **Processing:** 10-30 minutes
- **Total:** ~1 hour

---

## 🎯 After Upload

Once uploaded:

1. Go to App Store Connect
2. Wait for build to finish processing
3. Complete App Store metadata
4. Submit for review

---

**Yes, you definitely need a new archive build with the App Store fixes!** 🚀
