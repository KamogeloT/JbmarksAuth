# App Store Submission Plan - iOS App Review Fixes

## 📋 Analysis Summary

**Date:** March 12, 2025  
**App:** SDINMOTION (com.municipality.faultreporter)  
**Version:** 1.8.0 (Build 20)  
**Status:** ⚠️ **NOT READY** - Critical issues found

---

## 🔴 CRITICAL ISSUES (Must Fix Before Submission)

### Issue #1: App Transport Security (ATS) Violation
**Severity:** 🔴 **CRITICAL - Will cause rejection**

**Location:** `ios/App/App/Info.plist` lines 61-66

**Problem:**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

**Why This Is a Problem:**
- Apple strongly discourages `NSAllowsArbitraryLoads` and may reject apps using it
- This setting allows insecure HTTP connections, which violates Apple's security guidelines
- App Store reviewers will flag this immediately

**Analysis:**
✅ **Good News:** The app uses HTTPS for all API calls:
- Bitrix24 webhook URL uses HTTPS (`https://jbmarks.sdinmotion.co.za/rest/1/...`)
- Capacitor config uses `iosScheme: 'https'`
- All fetch calls use HTTPS URLs

**Solution:**
Remove the entire ATS exception section. The app doesn't need it since all connections are HTTPS.

**Fix Required:**
1. Remove lines 61-66 from `ios/App/App/Info.plist`
2. Test app functionality to ensure all API calls work
3. Verify no HTTP connections are attempted

---

### Issue #2: Privacy Policy URL Missing
**Severity:** 🔴 **CRITICAL - Required by Apple**

**Status:** Privacy policy exists but not hosted publicly

**Current State:**
- ✅ Privacy policy file exists: `privacy-policy.html`
- ✅ Privacy policy content is complete
- ❌ Privacy policy is NOT hosted publicly
- ❌ Privacy policy URL NOT added to App Store Connect

**Solution:**
1. Host `privacy-policy.html` on a publicly accessible HTTPS URL
2. Add URL to App Store Connect → App Information → Privacy Policy URL

**Recommended Hosting Options:**
- **Option A:** GitHub Pages (Free, ~5 minutes)
  - URL: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
- **Option B:** Your own domain
  - URL: `https://jbmarks.sdinmotion.co.za/privacy-policy.html`

---

## 🟡 MODERATE ISSUES (Should Fix)

### Issue #3: App Store Connect Metadata Incomplete
**Severity:** 🟡 **MODERATE - Required for submission**

**Required Fields:**
- ✅ App Name: SDINMOTION
- ❌ Subtitle: (Optional but recommended)
- ❌ Description: Need comprehensive description
- ❌ Keywords: Need relevant search terms
- ❌ Support URL: Need to add
- ❌ Privacy Policy URL: (See Issue #2)
- ❌ Marketing URL: (Optional)
- ❌ Screenshots: Need to prepare
- ❌ App Icon: ✅ Just updated to JBmarks logo

**Action Items:**
1. Prepare app description (see template below)
2. Add support URL to App Store Connect
3. Prepare screenshots for required device sizes
4. Complete all metadata fields

---

## ✅ ALREADY COMPLIANT

### Permissions
✅ All permission descriptions are clear and compliant:
- Camera: "This app needs access to your camera to take photos of municipal faults for reporting purposes."
- Photo Library: "This app needs access to your photo library to select images of municipal faults for reporting purposes."
- Location: "This app needs your location to accurately report the location of municipal faults."

### Version Numbers
✅ Correctly set:
- Marketing Version: 1.8.0
- Build Number: 20

### Bundle Identifier
✅ Set correctly: `com.municipality.faultreporter`

### App Icon
✅ Updated to JBmarks logo (just completed)

### Support Contact
✅ Present in config:
- Email: support@municipality.gov.za
- Phone: +27 18 297 5111

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (Do First)

#### Step 1.1: Fix App Transport Security
**File:** `ios/App/App/Info.plist`

**Action:** Remove lines 61-66 (ATS exception section)

**Before:**
```xml
	<!-- App Transport Security Settings -->
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
```

**After:**
```xml
	<!-- App Transport Security Settings removed - all connections use HTTPS -->
```

**Testing:**
1. Build app in Xcode
2. Test form submission
3. Test photo upload
4. Verify all API calls work
5. Check console for any HTTP connection warnings

---

#### Step 1.2: Host Privacy Policy

**Option A: GitHub Pages (Recommended)**

1. **Commit privacy policy to repo:**
   ```bash
   git add privacy-policy.html
   git commit -m "Add privacy policy for App Store"
   git push origin master
   ```

2. **Enable GitHub Pages:**
   - Go to: https://github.com/KamogeloT/sdinmotionapp/settings/pages
   - Source: Deploy from a branch
   - Branch: master, Folder: / (root)
   - Save

3. **Wait 2-5 minutes**, then verify URL:
   ```
   https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
   ```

**Option B: Your Own Domain**

1. Upload `privacy-policy.html` to your web server
2. Place at: `https://jbmarks.sdinmotion.co.za/privacy-policy.html`
3. Verify it's publicly accessible (no login required)

---

#### Step 1.3: Add Privacy Policy to App Store Connect

1. Go to: https://appstoreconnect.apple.com
2. Select your app: SDINMOTION
3. Navigate to: **App Information**
4. Scroll to: **Privacy Policy URL**
5. Enter your hosted URL
6. Save

---

### Phase 2: App Store Connect Setup

#### Step 2.1: App Description Template

```
SDINMOTION is the official mobile app for JBmarks Local Municipality, 
allowing residents to quickly report municipal faults and service issues.

Features:
• Report faults in Water, Electricity, Roads, and Waste services
• Take photos directly from the app
• Automatic GPS location detection
• Track your report status
• Works offline - reports saved automatically

Report issues like:
• Water leaks and supply problems
• Power outages and faulty streetlights
• Potholes and road damage
• Missed waste collections

Your reports are automatically routed to the correct municipal department 
for quick resolution.

For support, contact:
Email: support@municipality.gov.za
Phone: +27 18 297 5111
```

#### Step 2.2: Keywords
```
municipal, fault reporting, water, electricity, roads, waste, jbmarks, 
potchefstroom, ventersdorp, municipality, service request, report issue
```

#### Step 2.3: Support URL
Add to App Store Connect:
```
https://jbmarks.sdinmotion.co.za
```
(Or your support page URL)

#### Step 2.4: Screenshots Required

**iPhone Screenshots:**
- 6.7" (iPhone 14 Pro Max): 1290 x 2796 pixels
- 6.5" (iPhone 11 Pro Max): 1242 x 2688 pixels
- 5.5" (iPhone 8 Plus): 1242 x 2208 pixels

**How to Create:**
1. Run app in iOS Simulator
2. Navigate to key screens:
   - Home page
   - Report form (with city dropdown visible)
   - Report history
3. Take screenshots: Cmd+S in Simulator
4. Save and upload to App Store Connect

---

### Phase 3: Testing & Verification

#### Pre-Submission Checklist

**Code Fixes:**
- [ ] ATS exception removed from Info.plist
- [ ] Privacy policy hosted publicly
- [ ] Privacy policy URL added to App Store Connect
- [ ] App icon updated (✅ Done)

**App Store Connect:**
- [ ] App name set: SDINMOTION
- [ ] App description completed
- [ ] Keywords added
- [ ] Support URL added
- [ ] Privacy Policy URL added
- [ ] Screenshots uploaded for all required sizes
- [ ] App icon verified (1024x1024)

**Testing:**
- [ ] Build app in Xcode (Release configuration)
- [ ] Test on physical iOS device
- [ ] Test form submission
- [ ] Test photo capture and upload
- [ ] Test location services
- [ ] Test offline functionality
- [ ] Verify all API calls use HTTPS
- [ ] Check for console errors/warnings
- [ ] Test city dropdown visibility
- [ ] Verify error handling works

**Build:**
- [ ] Archive app in Xcode
- [ ] Upload to App Store Connect
- [ ] Verify build appears in TestFlight
- [ ] Test with TestFlight beta testers (optional)

---

## 🎯 EXPECTED OUTCOME

After implementing these fixes:

**Before:** ⚠️ **Will be rejected** due to ATS violation  
**After:** ✅ **High likelihood of approval**

**Estimated Review Time:**
- First submission: 24-48 hours
- If rejected and resubmitted: 24-48 hours per resubmission

---

## 📞 SUPPORT RESOURCES

**Apple Developer Support:**
- https://developer.apple.com/support/
- App Review: https://developer.apple.com/app-store/review/

**App Store Review Guidelines:**
- https://developer.apple.com/app-store/review/guidelines/

**Common Rejection Reasons:**
- https://developer.apple.com/app-store/review/rejections/

---

## ✅ SUCCESS CRITERIA

The app will be ready for submission when:

1. ✅ ATS exception removed
2. ✅ Privacy policy hosted and linked
3. ✅ All App Store Connect metadata completed
4. ✅ Screenshots prepared and uploaded
5. ✅ App tested and working correctly
6. ✅ Build uploaded successfully

---

**Next Steps:**
1. Implement Phase 1 fixes (Critical)
2. Complete Phase 2 setup (App Store Connect)
3. Perform Phase 3 testing
4. Submit for review
