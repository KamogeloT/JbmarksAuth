# Privacy Policy Setup for Google Play Console

## ✅ Status

- **Privacy Policy File:** `privacy-policy.html` (exists in project)
- **Required Permission:** Camera (android.permission.CAMERA)
- **Version Code:** Updated to 18 (was 17)

## 📋 Steps to Add Privacy Policy to Google Play Console

### Step 1: Host Your Privacy Policy

You need to make your privacy policy publicly accessible online.

**Option A: Host on Existing Website**
1. Upload `privacy-policy.html` to your web server
2. Place it at: `https://yourdomain.com/privacy-policy.html`
3. Test that the URL is publicly accessible

**Option B: Use GitHub Pages (Free)**
1. Create a GitHub repository (if you don't have one)
2. Upload `privacy-policy.html` to the repository
3. Enable GitHub Pages
4. Your URL will be: `https://username.github.io/repository/privacy-policy.html`

**Option C: Use Google Sites (Free)**
1. Go to: https://sites.google.com
2. Create a new site
3. Copy content from `privacy-policy.html`
4. Publish and get the URL

### Step 2: Add Privacy Policy URL to Google Play Console

1. **Go to Google Play Console:**
   - https://play.google.com/console

2. **Select Your App:**
   - `com.jbmarks.faultreporter`

3. **Navigate to:**
   - **Policy** → **App content** → **Privacy policy**

4. **Enter Privacy Policy URL:**
   - Paste your hosted privacy policy URL
   - Example: `https://www.yourdomain.com/privacy-policy.html`

5. **Save Changes**

### Step 3: Upload New AAB (Version Code 18)

1. **Go to:** Production → Create new release
2. **Upload:** `app-release.aab` (version code 18)
3. **Fill in release notes**
4. **Submit for review**

---

## 📄 Privacy Policy File Location

- **File:** `privacy-policy.html` (in project root)
- **Size:** 9.2 KB
- **Includes:** Camera permission explanation

---

## ⚠️ Important Notes

- Privacy policy URL **must be publicly accessible** (no login required)
- URL **must use HTTPS** (not HTTP)
- Privacy policy **must be in a language** matching your app's primary language
- Google may take a few hours to verify the privacy policy

---

## 🔗 Quick Links

- [Privacy Policy Hosting Guide](./PRIVACY_POLICY_HOSTING_GUIDE.md)
- Privacy Policy File: `privacy-policy.html`
- Privacy Policy Markdown: `PRIVACY_POLICY.md`

---

**After hosting the privacy policy and adding the URL to Play Console, you can upload version code 18!**

