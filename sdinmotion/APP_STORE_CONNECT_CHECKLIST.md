# App Store Connect Submission Checklist

## 📋 Pre-Submission Checklist

Use this checklist to ensure your app is ready for App Store submission.

---

## ✅ Code Fixes (COMPLETED)

- [x] **App Transport Security (ATS)** - Removed `NSAllowsArbitraryLoads` from Info.plist
- [x] **HTTPS Validation** - Added validation to ensure webhook URLs use HTTPS
- [x] **App Icon** - Updated to JBmarks logo

---

## 📱 App Store Connect - Required Information

### 1. App Information

- [ ] **App Name:** SDINMOTION ✅
- [ ] **Subtitle:** (Optional) "Municipal Fault Reporting"
- [ ] **Primary Language:** English
- [ ] **Bundle ID:** com.municipality.faultreporter ✅
- [ ] **SKU:** (Unique identifier for your records)

### 2. App Description

**Copy this description:**

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

### 3. Keywords

**Enter these keywords (100 characters max):**
```
municipal, fault reporting, water, electricity, roads, waste, jbmarks, 
potchefstroom, ventersdorp, municipality, service request, report issue
```

### 4. Support URL

**Required:** Add your support URL
- Option 1: `https://jbmarks.sdinmotion.co.za`
- Option 2: `https://kamogelot.github.io/sdinmotionapp`

### 5. Privacy Policy URL

**Required:** Add your hosted privacy policy URL
- GitHub Pages: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
- Or your domain: `https://jbmarks.sdinmotion.co.za/privacy-policy.html`

### 6. Marketing URL (Optional)

- Your website URL (if available)

### 7. App Icon

- [x] **1024x1024 PNG** - ✅ Updated to JBmarks logo
- [ ] Verify icon appears correctly in App Store Connect

### 8. Screenshots (REQUIRED)

**iPhone Screenshots Needed:**

- [ ] **6.7" Display (iPhone 14 Pro Max):** 1290 x 2796 pixels
- [ ] **6.5" Display (iPhone 11 Pro Max):** 1242 x 2688 pixels  
- [ ] **5.5" Display (iPhone 8 Plus):** 1242 x 2208 pixels

**How to Create Screenshots:**

1. Open app in iOS Simulator (Xcode → Product → Destination → iOS Simulator)
2. Navigate to key screens:
   - Home page (with JBmarks logo)
   - Report form (showing city dropdown)
   - Report history
3. Take screenshots: **Cmd+S** in Simulator
4. Screenshots saved to Desktop
5. Upload to App Store Connect

**Screenshot Tips:**
- Show the app's main features
- Ensure city dropdown is visible in form screenshot
- Use real data (not placeholder text)
- Make sure UI looks polished

---

## 🔧 Build & Upload

### Step 1: Build for Release

1. Open Xcode: `open ios/App/App.xcworkspace`
2. Select **Any iOS Device** or **Generic iOS Device** as target
3. Product → **Archive**
4. Wait for archive to complete

### Step 2: Upload to App Store Connect

1. In Xcode Organizer (Window → Organizer)
2. Select your archive
3. Click **Distribute App**
4. Choose **App Store Connect**
5. Follow the upload wizard
6. Wait for processing (can take 10-30 minutes)

### Step 3: Submit for Review

1. Go to App Store Connect
2. Select your app: **SDINMOTION**
3. Go to **TestFlight** tab (optional - for beta testing)
4. Go to **App Store** tab
5. Click **+ Version or Platform**
6. Select **iOS**
7. Fill in version information
8. Upload screenshots
9. Add app description and keywords
10. Add privacy policy URL
11. Add support URL
12. Click **Submit for Review**

---

## ✅ Final Verification Checklist

**Before Clicking "Submit for Review":**

- [ ] All required fields completed
- [ ] Privacy policy URL added and accessible
- [ ] Support URL added
- [ ] App description added
- [ ] Keywords added
- [ ] Screenshots uploaded for all required sizes
- [ ] App icon verified (1024x1024)
- [ ] Build uploaded successfully
- [ ] Build processing completed
- [ ] Version number correct (1.8.0)
- [ ] Build number correct (20)

---

## 📞 Support Information

**App Support:**
- Email: support@municipality.gov.za
- Phone: +27 18 297 5111

**Apple Developer Support:**
- https://developer.apple.com/support/
- App Review: https://developer.apple.com/app-store/review/

---

## ⏱️ Expected Timeline

- **Build Processing:** 10-30 minutes
- **App Review:** 24-48 hours (typically)
- **If Rejected:** Fix issues and resubmit (24-48 hours per resubmission)

---

## 🎯 Success Criteria

Your app is ready when:

1. ✅ All code fixes applied
2. ✅ Privacy policy hosted and linked
3. ✅ All App Store Connect fields completed
4. ✅ Screenshots prepared and uploaded
5. ✅ Build uploaded successfully
6. ✅ Ready to submit for review

---

**Next Steps:**
1. Complete App Store Connect metadata
2. Prepare screenshots
3. Build and upload to App Store Connect
4. Submit for review
