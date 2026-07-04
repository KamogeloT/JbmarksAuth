# Privacy Policy Hosting Steps for App Store Submission

## ✅ Status
- Privacy policy file exists: `privacy-policy.html`
- File is ready to be hosted

## 🌐 Option 1: GitHub Pages (FREE - Recommended)

### Step 1: Push Privacy Policy to GitHub

The file is already in your repository. If you need to commit it:

```bash
git add privacy-policy.html
git commit -m "Add privacy policy for App Store submission"
git push origin master
```

### Step 2: Enable GitHub Pages

1. Go to your repository: https://github.com/KamogeloT/sdinmotionapp
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under "Source", select **Deploy from a branch**
5. Under "Branch", select **master** (or your main branch)
6. Under "Folder", select **/ (root)**
7. Click **Save**

### Step 3: Wait and Verify

- Wait 2-5 minutes for GitHub Pages to deploy
- Your privacy policy will be available at:
  ```
  https://kamogelot.github.io/sdinmotionapp/privacy-policy.html
  ```
- Test the URL in your browser to verify it's accessible

### Step 4: Add to App Store Connect

1. Go to: https://appstoreconnect.apple.com
2. Select your app: **SDINMOTION**
3. Navigate to: **App Information**
4. Scroll to: **Privacy Policy URL**
5. Enter: `https://kamogelot.github.io/sdinmotionapp/privacy-policy.html`
6. Click **Save**

---

## 🌐 Option 2: Host on Your Own Domain

If you have access to `jbmarks.sdinmotion.co.za`:

1. Upload `privacy-policy.html` to your web server
2. Place it at: `https://jbmarks.sdinmotion.co.za/privacy-policy.html`
3. Verify it's publicly accessible (no login required)
4. Add URL to App Store Connect: `https://jbmarks.sdinmotion.co.za/privacy-policy.html`

---

## 🌐 Option 3: Netlify (Free Alternative)

1. Go to: https://www.netlify.com/
2. Sign up for a free account
3. Drag and drop `privacy-policy.html`
4. Get your URL (e.g., `https://your-app-name.netlify.app/privacy-policy.html`)
5. Add URL to App Store Connect

---

## ✅ Verification Checklist

Before adding to App Store Connect, verify:

- [ ] Privacy policy URL is publicly accessible (no login required)
- [ ] URL uses HTTPS (not HTTP)
- [ ] Privacy policy displays correctly in browser
- [ ] All content is readable and formatted properly
- [ ] Contact information is correct
- [ ] Policy explains all permissions (Camera, Location, Photo Library)

---

## 📝 Next Steps After Hosting

1. ✅ Host privacy policy (choose one option above)
2. ✅ Add URL to App Store Connect
3. ✅ Verify URL works in browser
4. ✅ Continue with App Store submission

---

**Recommended:** Use GitHub Pages (Option 1) - it's free, easy, and reliable.
