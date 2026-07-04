# Privacy Policy Hosting Guide

## ✅ Privacy Policy Created

I've created two versions of your privacy policy:
1. **PRIVACY_POLICY.md** - Markdown version (for documentation)
2. **privacy-policy.html** - HTML version (for hosting online)

## 🌐 Option 1: Host on GitHub Pages (FREE & EASIEST)

### Step 1: Commit and Push the Privacy Policy

```powershell
git add privacy-policy.html PRIVACY_POLICY.md
git commit -m "Add privacy policy for Google Play Console"
git push origin master
```

### Step 2: Enable GitHub Pages

1. Go to your repository: https://github.com/KamogeloT/sdinmotionapp
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under "Source", select **Deploy from a branch**
5. Under "Branch", select **master** and **/ (root)**
6. Click **Save**

### Step 3: Get Your Privacy Policy URL

After a few minutes, your privacy policy will be available at:

**URL:** `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`

### Step 4: Add to Google Play Console

1. Go to Google Play Console
2. Navigate to **Policy** → **App content**
3. Under **Privacy policy**, click **Start**
4. Enter the URL: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
5. Click **Save**

---

## 🌐 Option 2: Host on Your Own Website

If you have your own website, upload `privacy-policy.html` to your web server.

Example URLs:
- `https://sdinmotion.com/privacy-policy.html`
- `https://municipality.gov.za/apps/sdinmotion/privacy-policy.html`

---

## 🌐 Option 3: Use a Free Hosting Service

### Using Netlify (Free, Easy)

1. Go to https://www.netlify.com/
2. Sign up for a free account
3. Drag and drop the `privacy-policy.html` file
4. Get your URL (e.g., `https://your-app-name.netlify.app/privacy-policy.html`)

---

## 📝 What's in the Privacy Policy?

The privacy policy explains:

✅ **Camera Permission** - Why you need it and how it's used  
✅ **Location Permission** - GPS for fault location  
✅ **Storage Permission** - Access to photo gallery  
✅ **Internet Permission** - To submit reports  
✅ **Data Collection** - What data is collected  
✅ **Data Usage** - How data is used  
✅ **Data Sharing** - Who has access (municipality, Bitrix24)  
✅ **User Rights** - POPIA compliance (South African law)  
✅ **Contact Information** - How to reach you  

---

## 🔄 After Hosting the Privacy Policy

1. **Add URL to Play Console:**
   - Policy → App content → Privacy policy
   - Enter your privacy policy URL
   - Save

2. **Update App Store Listing:**
   - Add the privacy policy link to your app description (optional but recommended)

3. **Save the URL:**
   - Keep a record of your privacy policy URL
   - You'll need it for future updates and versions

---

## 📱 Adding Privacy Policy Link to Your App (Optional)

If you want to add a "Privacy Policy" link in your app:

### Add to HomePage.tsx Footer:

```tsx
<div className="text-center py-4 mt-8 border-t">
  <a 
    href="https://kamogelot.github.io/sdinmotionapp/privacy-policy.html"
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-gray-600 hover:text-primary-dark"
  >
    Privacy Policy
  </a>
</div>
```

---

## ⚠️ Important Notes

1. **URL Must Be Public:** Google Play requires the privacy policy to be publicly accessible
2. **HTTPS Required:** Must use secure connection (https://)
3. **Always Accessible:** Keep the URL active as long as your app is on the Play Store
4. **Update When Needed:** If you change permissions, update the privacy policy

---

## 🆘 Quick Fix for Google Play Console

**Current Error:** "Your APK or Android App Bundle is using permissions that require a privacy policy: (android.permission.CAMERA)"

**Solution:**
1. Host the `privacy-policy.html` file (use GitHub Pages - easiest)
2. Get the URL
3. Add it to Google Play Console under **Policy → App content → Privacy policy**
4. Save and continue with your release

**GitHub Pages URL (once enabled):**  
`https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`

---

## ✅ Checklist

- [ ] Commit privacy policy files to GitHub
- [ ] Enable GitHub Pages in repository settings
- [ ] Wait 2-5 minutes for deployment
- [ ] Test the URL in your browser
- [ ] Add URL to Google Play Console
- [ ] Complete the release

---

**Need help? The privacy policy is ready to go - just host it and add the URL to Play Console!**

