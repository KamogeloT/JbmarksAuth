# GitHub Pages Quick Setup Guide

## ✅ Repository Confirmed
- **Repository:** https://github.com/KamogeloT/sdinmotionapp
- **Privacy Policy:** `privacy-policy.html` ✅ (already pushed)
- **Current Branch:** `feature/bitrix24-integration-and-city-dropdown`

---

## 🚀 Quick Setup (Choose One Option)

### Option 1: Enable GitHub Pages from Master Branch (Recommended)

**Step 1: Merge Feature Branch to Master**

```bash
git checkout master
git pull origin master
git merge feature/bitrix24-integration-and-city-dropdown
git push origin master
```

**Step 2: Enable GitHub Pages**

1. Go to: https://github.com/KamogeloT/sdinmotionapp/settings/pages
2. Under **Source**, select: **Deploy from a branch**
3. Under **Branch**, select: **master**
4. Under **Folder**, select: **/ (root)**
5. Click **Save**

**Step 3: Access Your Privacy Policy**

After 2-5 minutes, your privacy policy will be at:
```
https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
```

---

### Option 2: Enable GitHub Pages from Feature Branch

1. Go to: https://github.com/KamogeloT/sdinmotionapp/settings/pages
2. Under **Source**, select: **Deploy from a branch**
3. Under **Branch**, select: **feature/bitrix24-integration-and-city-dropdown**
4. Under **Folder**, select: **/ (root)**
5. Click **Save**

**Note:** GitHub Pages may work with feature branches, but master is more reliable.

---

## ✅ Verification Steps

1. **Wait 2-5 minutes** after enabling GitHub Pages
2. **Check deployment status:**
   - Go to: https://github.com/KamogeloT/sdinmotionapp/actions
   - Look for "pages build and deployment" workflow
   - Should show green checkmark when complete

3. **Test the URL:**
   - Open: https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
   - Verify:
     - ✅ Page loads correctly
     - ✅ All content is visible
     - ✅ HTTPS is working (green lock icon)
     - ✅ No login required (publicly accessible)

---

## 📝 Add to App Store Connect

Once GitHub Pages is enabled and the URL is accessible:

1. Go to: https://appstoreconnect.apple.com
2. Select your app: **SDINMOTION**
3. Navigate to: **App Information**
4. Scroll to: **Privacy Policy URL**
5. Enter: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
6. Click **Save**

---

## 🎯 Quick Checklist

- [x] Privacy policy pushed to GitHub ✅
- [ ] GitHub Pages enabled
- [ ] Privacy policy URL verified (accessible)
- [ ] Privacy policy URL added to App Store Connect

---

## 🔗 Useful Links

- **Repository:** https://github.com/KamogeloT/sdinmotionapp
- **Pages Settings:** https://github.com/KamogeloT/sdinmotionapp/settings/pages
- **Privacy Policy File:** https://github.com/KamogeloT/sdinmotionapp/blob/master/privacy-policy.html
- **Actions (Deployment Status):** https://github.com/KamogeloT/sdinmotionapp/actions

---

**Recommended:** Use Option 1 (merge to master) for the most reliable GitHub Pages setup.
