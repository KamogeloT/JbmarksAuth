# OAuth Flow Test Guide

## ✅ What's Been Completed:

1. ✅ Railway server deployed: `https://jbmarksauth-production.up.railway.app`
2. ✅ Health check working: Returns 200 OK
3. ✅ Android Config.kt updated with Railway URL
4. ✅ OAuthService.kt updated to use Railway as primary token exchange

## 🧪 Testing Steps:

### Step 1: Get a Fresh OAuth Code

Visit this URL in your browser to authenticate with Bitrix24:

```
https://jbmarks.sdinmotion.co.za/oauth/authorize/?client_id=local.69526f981da4a0.86875975&redirect_uri=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect&response_type=code
```

After logging in, you'll be redirected to a URL that looks like:
```
https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect/?code=XXXXXX&domain=jbmarks.sdinmotion.co.za&member_id=XXXXXX
```

**Copy the `code` value** from the URL.

---

### Step 2: Test Railway Token Exchange (PowerShell)

```powershell
# Replace YOUR_CODE_HERE with the actual code from Step 1
$code = "YOUR_CODE_HERE"

$body = @{
    oauth_code = $code
    domain = "jbmarks.sdinmotion.co.za"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://jbmarksauth-production.up.railway.app/api/exchangetoken" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "`n=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "Access Token: $($response.access_token.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "Refresh Token: $($response.refresh_token.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "Expires In: $($response.expires_in) seconds" -ForegroundColor Cyan
    Write-Host "`nFull Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json
    
} catch {
    Write-Host "`n=== FAILED ===" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Error: $errorBody" -ForegroundColor Yellow
}
```

**Expected Result:** You should see tokens returned!

---

### Step 3: Test Android App

1. **Build the Android app** in Android Studio
2. **Run on emulator or device**
3. **Click the Login button**
4. **Authenticate with Bitrix24**
5. **Watch the logs** in Logcat:
   - Filter by `OAuthService` tag
   - You should see: `Token exchange successful via Railway`

---

## 🎯 Success Criteria:

- ✅ Railway health endpoint returns 200 OK
- ✅ Manual token exchange test returns tokens
- ✅ Android app logs in successfully
- ✅ Android app shows user data after login

---

## 🔧 Troubleshooting:

### If token exchange fails with 502:
- OAuth codes expire after 30 seconds - get a fresh one
- Make sure you're using the exact code from the redirect URL

### If Android app doesn't work:
- Check Logcat for errors
- Verify Railway URL is correct in Config.kt
- Make sure environment variables are set in Railway

---

## 📊 Architecture:

```
Android App → Railway Express Server → Bitrix24 OAuth
     ↓               ↓                      ↓
  Deep Link    Token Exchange         Access Token
```

**No Azure Function required!** 🎉
