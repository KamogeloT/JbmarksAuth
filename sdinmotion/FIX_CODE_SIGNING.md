# Fix Code Signing Error in Xcode

## ❌ Error Message
```
Signing for "App" requires a development team. Select a development team 
in the Signing & Capabilities editor.
```

## ✅ Solution: Select Development Team in Xcode

### Step-by-Step Fix

1. **Open Xcode Project:**
   - Make sure `ios/App/App.xcworkspace` is open in Xcode

2. **Select the App Target:**
   - In the left sidebar (Project Navigator), click on **App** (blue icon at the top)
   - Make sure the **App** project is selected (not a file)

3. **Open Signing & Capabilities:**
   - Click on the **App** target (under "TARGETS" in the main editor)
   - Click on the **Signing & Capabilities** tab (at the top)

4. **Select Your Development Team:**
   - Check the box: **"Automatically manage signing"**
   - Under **Team**, click the dropdown
   - Select your Apple Developer account/team
   - If you don't see your team:
     - Click **"Add Account..."**
     - Sign in with your Apple ID
     - Select your team

5. **Verify Bundle Identifier:**
   - Make sure **Bundle Identifier** is: `com.municipality.faultreporter`
   - If it's different, you can change it here

6. **Check for Errors:**
   - Xcode should automatically generate provisioning profiles
   - Wait for any "Processing..." messages to complete
   - The error should disappear

7. **Try Building Again:**
   - Product → Clean Build Folder (Shift+Cmd+K)
   - Product → Build (Cmd+B)
   - The signing error should be gone

---

## 🔐 If You Don't Have an Apple Developer Account

### Option 1: Free Apple Developer Account (Limited)

1. **Sign in with Apple ID:**
   - Use your personal Apple ID
   - Can build and test on your own device
   - **Cannot** submit to App Store (requires paid account)

2. **Limitations:**
   - Apps expire after 7 days
   - Can only install on your own devices
   - Cannot distribute via App Store

### Option 2: Paid Apple Developer Account (Required for App Store)

1. **Sign up:**
   - Go to: https://developer.apple.com/programs/
   - Cost: $99/year
   - Required for App Store submission

2. **Benefits:**
   - Submit apps to App Store
   - Distribute to TestFlight
   - No expiration on apps
   - Access to beta software

---

## ⚠️ About the Warning

The warning about CocoaPods script is **not critical** - it's just informational. You can ignore it for now, or fix it later:

**To Fix Warning (Optional):**
1. Select **App** target
2. Go to **Build Phases** tab
3. Expand **"[CP] Embed Pods Frameworks"**
4. Uncheck **"Based on dependency analysis"**

---

## ✅ After Fixing Signing

Once signing is configured:

1. **Clean Build:**
   - Product → Clean Build Folder (Shift+Cmd+K)

2. **Build:**
   - Product → Build (Cmd+B)
   - Should build successfully

3. **Archive:**
   - Select **Any iOS Device** as target
   - Product → Archive
   - Should archive successfully

---

## 🎯 Quick Checklist

- [ ] Xcode project open
- [ ] App target selected
- [ ] Signing & Capabilities tab open
- [ ] "Automatically manage signing" checked
- [ ] Development team selected
- [ ] Bundle identifier correct
- [ ] No signing errors
- [ ] Build successful

---

## 📞 Need Help?

**Common Issues:**

1. **"No accounts with App Store Connect access"**
   - You need to sign in with an Apple ID that has developer access
   - Go to Xcode → Preferences → Accounts → Add Apple ID

2. **"Bundle identifier is already in use"**
   - Change bundle identifier to something unique
   - Format: `com.yourname.appname`

3. **"Provisioning profile not found"**
   - Make sure "Automatically manage signing" is checked
   - Xcode will create it automatically

---

**Fix the signing issue first, then you can build and archive!** 🚀
