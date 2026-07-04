# App Store Submission Steps - Final Guide

## ✅ Completed Steps
- [x] App Transport Security (ATS) fixed
- [x] HTTPS validation added
- [x] Privacy policy hosted: https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
- [x] App icon updated to JBmarks logo

---

## 📱 Step 1: Add Privacy Policy to App Store Connect

### 1.1 Log in to App Store Connect
- Go to: https://appstoreconnect.apple.com
- Sign in with your Apple Developer account

### 1.2 Navigate to Your App
- Click **My Apps**
- Select **SDINMOTION** (or create new app if not exists)

### 1.3 Add Privacy Policy URL
- Click **App Information** (left sidebar)
- Scroll to **Privacy Policy URL**
- Enter: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
- Click **Save**

---

## 📝 Step 2: Complete App Metadata

### 2.1 App Information
- **App Name:** SDINMOTION ✅
- **Subtitle:** (Optional) "Municipal Fault Reporting"
- **Primary Language:** English
- **Bundle ID:** com.municipality.faultreporter ✅

### 2.2 App Description

**Copy and paste this description:**

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

### 2.3 Keywords
Enter these keywords (100 characters max):
```
municipal, fault reporting, water, electricity, roads, waste, jbmarks, 
potchefstroom, ventersdorp, municipality, service request
```

### 2.4 Support URL
- **Support URL:** `https://kamogelot.github.io/sdinmotionapp` (or your website)
- **Marketing URL:** (Optional) Your website URL

### 2.5 App Icon
- ✅ Already updated to JBmarks logo (1024x1024)
- Verify it appears correctly in App Store Connect

---

## 📸 Step 3: Prepare Screenshots

### 3.1 Required Screenshot Sizes

**iPhone Screenshots (Required):**
- **6.7" Display (iPhone 14 Pro Max):** 1290 x 2796 pixels
- **6.5" Display (iPhone 11 Pro Max):** 1242 x 2688 pixels
- **5.5" Display (iPhone 8 Plus):** 1242 x 2208 pixels

### 3.2 How to Create Screenshots

**Using iOS Simulator:**

1. **Open Xcode:**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Run in Simulator:**
   - Product → Destination → Choose iPhone 14 Pro Max (or similar)
   - Product → Run (Cmd+R)

3. **Take Screenshots:**
   - Navigate to key screens:
     - **Home page** (with JBmarks logo)
     - **Report form** (showing city dropdown)
     - **Report history**
   - Press **Cmd+S** to take screenshot
   - Screenshots saved to Desktop

4. **Upload to App Store Connect:**
   - Go to App Store Connect → Your App → App Store → iOS App
   - Scroll to **Screenshots**
   - Drag and drop screenshots for each device size

**Screenshot Tips:**
- Show the app's main features
- Ensure city dropdown is visible in form screenshot
- Use real data (not placeholder text)
- Make sure UI looks polished

---

## 🏗️ Step 4: Build and Upload App

### 4.1 Build for Release in Xcode

1. **Open Xcode:**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Select Target:**
   - Select **Any iOS Device** or **Generic iOS Device** (not Simulator)

3. **Archive:**
   - Product → **Archive**
   - Wait for archive to complete (may take a few minutes)

4. **Verify Archive:**
   - Xcode Organizer will open automatically
   - Verify your archive appears

### 4.2 Upload to App Store Connect

1. **In Xcode Organizer:**
   - Select your archive
   - Click **Distribute App**

2. **Choose Distribution Method:**
   - Select **App Store Connect**
   - Click **Next**

3. **Choose Distribution Options:**
   - Select **Upload**
   - Click **Next**

4. **Review and Upload:**
   - Review app information
   - Click **Upload**
   - Wait for upload to complete (may take 10-30 minutes)

5. **Verify Upload:**
   - Go to App Store Connect
   - Navigate to **TestFlight** tab
   - Your build should appear (processing may take 10-30 minutes)

---

## ✅ Step 5: Submit for Review

### 5.1 Complete App Store Listing

1. **Go to App Store Tab:**
   - In App Store Connect, click **App Store** tab (left sidebar)

2. **Create New Version:**
   - Click **+ Version or Platform**
   - Select **iOS**
   - Enter version: **1.8.0**
   - Enter build number: **20**

3. **Fill in Required Information:**
   - **What's New in This Version:** (Describe updates)
   - **App Description:** (Paste from Step 2.2)
   - **Keywords:** (From Step 2.3)
   - **Support URL:** (From Step 2.4)
   - **Privacy Policy URL:** ✅ Already added
   - **Screenshots:** Upload from Step 3

4. **App Review Information:**
   - **Contact Information:** Your contact details
   - **Demo Account:** (If required for testing)
   - **Notes:** Any additional information for reviewers

### 5.2 Submit for Review

1. **Review All Information:**
   - Verify all fields are complete
   - Check screenshots are uploaded
   - Verify privacy policy URL works

2. **Submit:**
   - Scroll to bottom
   - Click **Submit for Review**
   - Confirm submission

3. **Status:**
   - App status will change to **"Waiting for Review"**
   - Review typically takes **24-48 hours**

---

## 📋 Pre-Submission Checklist

Before clicking "Submit for Review", verify:

**Code:**
- [x] ATS exception removed ✅
- [x] HTTPS validation added ✅
- [x] App icon updated ✅

**App Store Connect:**
- [ ] Privacy Policy URL added
- [ ] App description completed
- [ ] Keywords added
- [ ] Support URL added
- [ ] Screenshots uploaded (all required sizes)
- [ ] App icon verified

**Build:**
- [ ] App archived successfully
- [ ] Build uploaded to App Store Connect
- [ ] Build processing completed
- [ ] Version number correct (1.8.0)
- [ ] Build number correct (20)

**Testing:**
- [ ] App tested on physical device
- [ ] All features working
- [ ] City dropdown visible
- [ ] Form submission works
- [ ] Photo upload works
- [ ] Location services work

---

## ⏱️ Timeline

- **Build Upload:** 10-30 minutes
- **Build Processing:** 10-30 minutes
- **App Review:** 24-48 hours (typically)
- **Total:** 1-3 days from submission to approval

---

## 🔗 Quick Links

- **App Store Connect:** https://appstoreconnect.apple.com
- **Privacy Policy:** https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
- **Apple Developer:** https://developer.apple.com
- **App Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/

---

## 🎯 Next Steps Summary

1. ✅ **Privacy Policy:** Already hosted and working
2. ⏳ **Add Privacy Policy URL** to App Store Connect (5 min)
3. ⏳ **Complete Metadata** (description, keywords, support URL) (15 min)
4. ⏳ **Prepare Screenshots** (30 min)
5. ⏳ **Build and Upload** (30-60 min)
6. ⏳ **Submit for Review** (10 min)

**Total Time:** ~2 hours

---

## 🚀 You're Almost There!

Your app is App Store compliant! Complete the steps above and submit for review. Good luck! 🎉
