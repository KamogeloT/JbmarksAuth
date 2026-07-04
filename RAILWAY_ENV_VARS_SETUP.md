# Railway Environment Variables Setup

## ✅ Current Status

- ✅ Deployment successful
- ✅ PostgreSQL database created
- ⏳ **Next: Add environment variables**

## 📋 Environment Variables to Add

Go to **Railway Dashboard** → Your Project → **Variables** tab, then add these 3 variables:

### 1. APNS_TEAM_ID

- **Name:** `APNS_TEAM_ID`
- **Value:** `R4K5T5B397` (Your Apple Team ID - found in Xcode project)
- **Description:** Your Apple Developer Team ID

### 2. APNS_KEY_CONTENT

- **Name:** `APNS_KEY_CONTENT`
- **Value:** (See below - the full base64 encoded key)
- **Description:** Base64 encoded APNs authentication key

### 3. APNS_BUNDLE_ID

- **Name:** `APNS_BUNDLE_ID`
- **Value:** `jbmarks.JbmrksIOs`
- **Description:** Your iOS app bundle identifier

### 4. APNS_KEY_ID (Optional - already set in code)

- **Name:** `APNS_KEY_ID`
- **Value:** `KGVWC4F2KA`
- **Description:** Your APNs key ID (already configured in code, but you can set it here too)

## 🔑 Get Your Base64 Key

I'll get the full base64 key for you. It will be a long string - copy the ENTIRE output.

## 📝 Step-by-Step Instructions

1. **Open Railway Dashboard**
   - Go to: https://railway.app/dashboard
   - Click on your project

2. **Go to Variables Tab**
   - Click **"Variables"** in the left sidebar
   - Or click **"Variables"** tab at the top

3. **Add Each Variable**
   - Click **"+ New Variable"** button
   - Enter the Name and Value
   - Click **"Add"** or **"Save"**

4. **After Adding All Variables**
   - Railway will automatically redeploy
   - Wait for deployment to complete (~1-2 minutes)
   - Check logs to see if APNs initialized successfully

## ✅ Verification

After adding variables and Railway redeploys, check the logs:

1. Railway Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Check **Logs** tab
4. Look for: `✅ APNs provider initialized`

If you see that message, everything is working! 🎉

## 🧪 Test the Endpoints

After setup, you can test:

```bash
# Health check
curl https://jbmarksauth-production.up.railway.app/health

# Should return JSON with service info
```

---

**Ready to add the variables?** The base64 key will be shown below.
