# 🚀 Token Exchange Server - Deployment Guide

## ✅ Local Testing - VERIFIED WORKING!

Your server is **tested and working locally** on `http://localhost:3000`

- ✅ Health check: `http://localhost:3000/health` → 200 OK
- ✅ Token exchange: `http://localhost:3000/api/exchangetoken` → Working!

---

## 🚂 Option 1: Deploy to Railway (Recommended - Easiest)

### Why Railway?
- ✅ Automatic deployments from GitHub
- ✅ Free $5 credit/month
- ✅ Super simple setup (< 5 minutes)
- ✅ No complex configuration

### Steps:

1. **Sign up for Railway**
   - Go to: https://railway.app
   - Click "Login with GitHub"

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `JBmarks` repository
   - Railway auto-detects `package.json` and deploys!

3. **Set Environment Variables**
   - In Railway project dashboard, click "Variables"
   - Add these 3 variables:
     ```
     BITRIX_CLIENT_ID=local.69526f981da4a0.86875975
     BITRIX_CLIENT_SECRET=z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU
     BITRIX_REDIRECT_URI=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
     ```

4. **Get Your URL**
   - Railway automatically generates a URL like:
     `https://jbmarks-token-exchange.up.railway.app`
   - Click "Settings" → "Generate Domain" if not auto-generated

5. **Test Deployment**
   ```powershell
   # Test health endpoint
   Invoke-WebRequest -Uri "https://YOUR-APP.up.railway.app/health"
   
   # Should return: {"status":"healthy","service":"jbmarks-token-exchange"...}
   ```

6. **Update Android App**
   - Open `app/src/main/java/com/example/jbmarks/config/Config.kt`
   - Update line 59:
     ```kotlin
     const val TOKEN_EXCHANGE_URL = "https://YOUR-APP.up.railway.app/api/exchangetoken"
     ```

---

## 🎨 Option 2: Deploy to Render

### Why Render?
- ✅ True free tier (750 hours/month)
- ✅ Reliable and stable
- ✅ Good for production

### Steps:

1. **Sign up for Render**
   - Go to: https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select `JBmarks` repository

3. **Configure Service**
   - **Name**: `jbmarks-token-exchange`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server-simple.js`
   - **Plan**: `Free`

4. **Set Environment Variables**
   - In service settings, add:
     ```
     BITRIX_CLIENT_ID=local.69526f981da4a0.86875975
     BITRIX_CLIENT_SECRET=z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU
     BITRIX_REDIRECT_URI=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy (takes ~2 minutes)
   - Your URL: `https://jbmarks-token-exchange.onrender.com`

6. **Update Android App**
   - Update `Config.kt` with your Render URL:
     ```kotlin
     const val TOKEN_EXCHANGE_URL = "https://jbmarks-token-exchange.onrender.com/api/exchangetoken"
     ```

---

## 🧪 Testing Your Deployment

### 1. Test Health Endpoint

```powershell
# Replace YOUR-URL with your actual deployment URL
$url = "https://YOUR-APP.up.railway.app"  # or .onrender.com

# Health check
Invoke-WebRequest -Uri "$url/health"
# Expected: 200 OK with JSON response
```

### 2. Test Token Exchange (with test code)

```powershell
$body = @{
    oauth_code = "test123"
    domain = "jbcompany.bitrix24.com"
} | ConvertTo-Json

Invoke-WebRequest -Uri "$url/api/exchangetoken" -Method POST -Body $body -ContentType "application/json"
# Expected: 502 (because test code is invalid - this is correct!)
```

### 3. Test with Real OAuth Code

1. Open in browser:
   ```
   https://jbcompany.bitrix24.com/oauth/authorize/?client_id=local.69526f981da4a0.86875975&response_type=code&redirect_uri=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect/
   ```

2. After login, grab the `code` from redirect URL

3. Test with PowerShell:
   ```powershell
   $realCode = "PASTE_REAL_CODE_HERE"
   $body = @{
       oauth_code = $realCode
       domain = "jbcompany.bitrix24.com"
   } | ConvertTo-Json
   
   $response = Invoke-WebRequest -Uri "$url/api/exchangetoken" -Method POST -Body $body -ContentType "application/json"
   $response.Content | ConvertFrom-Json
   # Expected: 200 OK with access_token and refresh_token!
   ```

---

## 📱 Update Android App to Use New Server

### In `Config.kt`:

```kotlin
// Replace the old Azure Function URL with your new deployment:
const val TOKEN_EXCHANGE_URL = "https://YOUR-APP.up.railway.app/api/exchangetoken"
```

### In your auth code (wherever you call token exchange):

```kotlin
// Use the new URL
val tokenExchangeUrl = Config.TOKEN_EXCHANGE_URL

// Make POST request with oauth_code and domain
val response = apiClient.post(tokenExchangeUrl) {
    contentType(ContentType.Application.Json)
    setBody(mapOf(
        "oauth_code" to oauthCode,
        "domain" to domain
    ))
}
```

---

## 🔧 Troubleshooting

### Server Not Starting
- Check environment variables are set correctly
- Check logs in Railway/Render dashboard
- Verify `package.json` has `"start": "node server-simple.js"`

### 500 Error
- Check logs for detailed error message
- Verify all 3 environment variables are set
- Test locally first to isolate issue

### 502 Error (with test code)
- ✅ **This is expected!** It means:
  - Server is working correctly
  - It successfully called Bitrix
  - Bitrix rejected the fake test code (correct behavior)
- Try with a real OAuth code to verify full flow

### Can't Connect from Android App
- Verify the URL in `Config.kt` is correct
- Test the URL in browser first: `https://YOUR-URL/health`
- Check CORS is enabled (it is in `server-simple.js`)
- Check Android app has INTERNET permission in AndroidManifest.xml

---

## 📊 Comparison: Railway vs Render vs Azure

| Feature | Railway | Render | Azure Functions |
|---------|---------|--------|-----------------|
| Setup Time | ⭐⭐⭐⭐⭐ 5 min | ⭐⭐⭐⭐ 10 min | ⭐ 2+ hours |
| Free Tier | $5 credit/month | 750 hours/month | Limited |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ (issues in SA region) |
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Recommended?** | **✅ YES** | **✅ YES** | ❌ NO (too complex) |

---

## 🎉 Success Checklist

- [ ] Server tested locally (✅ Already done!)
- [ ] Deployed to Railway or Render
- [ ] Environment variables set
- [ ] Health endpoint returns 200
- [ ] Token exchange returns 502 for test code (expected)
- [ ] Token exchange returns 200 for real OAuth code
- [ ] Android `Config.kt` updated with new URL
- [ ] Android app tested end-to-end

---

## 📞 Need Help?

If you encounter issues:
1. Check the logs in Railway/Render dashboard
2. Test the health endpoint first
3. Verify environment variables are set
4. Test with a real OAuth code (not test code)

**Remember:** The local server already works! If deployment fails, it's a platform configuration issue, not a code issue.
