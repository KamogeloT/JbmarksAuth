# OAuth "Invalid Client" Error - Troubleshooting Guide

## Error: `Token exchange failed: HTTP 400: invalid client`

This error means Bitrix24 rejected your client credentials or redirect URI.

---

## Common Causes & Fixes

### 1. **Redirect URI Mismatch** (Most Common) ⚠️

**Problem:** The redirect URI used in token exchange doesn't match what's configured in Bitrix24.

**Check:**
1. Go to your Bitrix24 portal: `https://jbmarks.sdinmotion.co.za/apps/local/`
2. Find your app (Client ID: `local.69526f981da4a0.86875975`)
3. Check the "Your handler path" - it MUST be exactly:
   ```
   https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
   ```

**Fix:**
- Ensure the redirect URI in Bitrix24 matches EXACTLY (no trailing slash, exact URL)
- The redirect URI in `OAuthConfig.swift` must match exactly

**Current Config:**
```swift
static let redirectUriHTTPS = "https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect"
```

---

### 2. **Wrong Client ID or Secret** ⚠️

**Problem:** The client ID or secret doesn't match what's registered in Bitrix24.

**Check:**
1. Go to Bitrix24 portal: `https://jbmarks.sdinmotion.co.za/apps/local/`
2. Verify:
   - Client ID: `local.69526f981da4a0.86875975`
   - Client Secret: `z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU`

**Fix:**
- If they don't match, update `OAuthConfig.swift` with the correct values
- Or create a new app in Bitrix24 and use those credentials

---

### 3. **Client ID Format Issue** ⚠️

**Problem:** For `local.*` client IDs, you must use `oauth.bitrix.info` for token exchange.

**Current Implementation:**
- ✅ Already using `oauth.bitrix.info` for `local.*` client IDs
- ✅ Code checks: `if clientId.hasPrefix("local.")`

**Verify:**
- Your client ID starts with `local.` ✅
- Token endpoint is: `https://oauth.bitrix.info/oauth/token/` ✅

---

### 4. **Authorization Code Expired or Already Used** ⚠️

**Problem:** Authorization codes can only be used once and expire quickly.

**Fix:**
- Try the OAuth flow again from the beginning
- Make sure you're using a fresh authorization code

---

## Debug Steps

### Step 1: Check Console Logs

When you run the app, check Xcode console for:
```
🔄 Token Exchange Request:
   URL: https://oauth.bitrix.info/oauth/token/
   Client ID: local.69526f981da4a0.86875975
   Redirect URI: https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
   Code length: XX
```

If you see an error:
```
❌ Token exchange failed:
   Status: 400
   Response: {"error":"invalid_client","error_description":"..."}
```

### Step 2: Verify Bitrix24 Configuration

1. **Login to Bitrix24:**
   ```
   https://jbmarks.sdinmotion.co.za/apps/local/
   ```

2. **Find your app** (search for Client ID: `local.69526f981da4a0.86875975`)

3. **Check these settings:**
   - ✅ Client ID matches
   - ✅ Client Secret matches
   - ✅ "Your handler path" matches redirect URI exactly
   - ✅ App is active/enabled

### Step 3: Test Redirect URI

The redirect URI must be:
- ✅ HTTPS (not HTTP)
- ✅ Exact match (no trailing slash differences)
- ✅ Accessible (the Azure redirect server must be running)

**Test the redirect server:**
```bash
curl https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
```

Should return HTML (the redirect page).

---

## Quick Fix Checklist

- [ ] Verify Client ID in `OAuthConfig.swift` matches Bitrix24
- [ ] Verify Client Secret in `OAuthConfig.swift` matches Bitrix24
- [ ] Verify redirect URI in `OAuthConfig.swift` matches Bitrix24 "handler path" EXACTLY
- [ ] Check redirect server is accessible (Azure function is running)
- [ ] Try OAuth flow again (get fresh authorization code)
- [ ] Check Xcode console for detailed error messages

---

## Alternative: Use Backend Token Exchange

If direct token exchange keeps failing, you can use your backend server instead:

**Backend URLs available:**
- Railway: `https://jbmarksauth-production.up.railway.app/api/exchangetoken`
- Azure: `https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken`

**Benefits:**
- Backend handles client secret securely
- Backend can handle redirect URI matching
- More reliable for production

**To implement:**
- Modify `OAuthService.exchangeCodeForTokens()` to call backend instead of Bitrix24 directly
- Backend expects: `POST /api/exchangetoken` with `{ "oauth_code": "...", "domain": "..." }`

---

## Still Not Working?

1. **Check Bitrix24 App Status:**
   - Is the app active?
   - Are there any restrictions?

2. **Verify Portal URL:**
   - Current: `https://jbmarks.sdinmotion.co.za`
   - Make sure this is correct

3. **Check Network:**
   - Can the app reach `oauth.bitrix.info`?
   - Is there a firewall blocking requests?

4. **Try Creating New App:**
   - Create a new Local Application in Bitrix24
   - Use new Client ID and Secret
   - Update `OAuthConfig.swift`

---

## Current Configuration

**File:** `JbmrksIOs/JbmrksIOs/Config/OAuthConfig.swift`

```swift
static let clientId = "local.69526f981da4a0.86875975"
static let clientSecret = "z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU"
static let redirectUriHTTPS = "https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect"
static let defaultPortalUrl = "https://jbmarks.sdinmotion.co.za"
```

**Verify these match your Bitrix24 app configuration exactly!**
