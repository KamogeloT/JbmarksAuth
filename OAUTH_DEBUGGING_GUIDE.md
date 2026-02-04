# OAuth Token Exchange Debugging Guide

## Issue: Bitrix24 Returns HTML Instead of JSON Tokens

When exchanging the authorization code for tokens, Bitrix24 returns an HTML login page instead of JSON. This typically indicates a **redirect_uri mismatch**.

## Critical Requirement: Exact redirect_uri Match

The `redirect_uri` must match **character-for-character** in:
1. ✅ Authorization request (`/oauth/authorize/`)
2. ✅ Token exchange request (`/oauth/token/`)
3. ⚠️ **Bitrix24 Local Application configuration**

## Current Configuration

**Redirect URI in App:**
```
https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
```

**Verify in Bitrix24:**
1. Go to: `https://jbmarks.sdinmotion.co.za/apps/local/`
2. Open your Local Application (Client ID: `local.69526f981da4a0.86875975`)
3. Check "Handler path" field
4. **Must match exactly** (no spaces, no trailing slash, exact path)

## What We've Fixed

### 1. Added Detailed Logging
- Logs exact redirect_uri being sent in authorization request
- Logs exact redirect_uri being sent in token exchange request
- Logs request method, content-type, and endpoint

### 2. Prevented Double Code Exchange
- Added `processedCode` tracking in `AuthActivity`
- Added `sessionStorage` guard in redirect HTML page
- Prevents same authorization code from being used twice

### 3. Improved Error Handling
- Detects HTML responses (content-type: text/html)
- Provides clear error messages
- Catches JSON parsing exceptions

## Debugging Steps

### Step 1: Check Logcat Output

When you try to log in, look for these log tags:
- `Config` - Shows authorization URL and redirect_uri
- `OAuthService` - Shows token exchange request details

**Look for:**
```
Config: Redirect URI (raw): https://jbmarks-oauth-redirect-...
OAuthService: Redirect URI (exact): https://jbmarks-oauth-redirect-...
```

**Verify they match exactly!**

### Step 2: Verify Bitrix24 Configuration

1. Copy the redirect URI from the logs
2. Go to Bitrix24 Local Application settings
3. Compare character-by-character:
   - No leading/trailing spaces
   - No trailing slash
   - Exact path `/oauth_redirect` (not `/oauth_redirect/`)
   - HTTPS (not HTTP)

### Step 3: Test with cURL (Optional)

If you want to test the token exchange directly:

```bash
curl -X POST "https://jbmarks.sdinmotion.co.za/oauth/token/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=local.69526f981da4a0.86875975" \
  -d "client_secret=z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU" \
  -d "redirect_uri=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect" \
  -d "code=YOUR_AUTHORIZATION_CODE"
```

**Expected:** JSON response with `access_token` and `refresh_token`
**If HTML:** redirect_uri mismatch or code already used

## Common Issues

### Issue 1: Trailing Slash Mismatch
- ❌ `/oauth_redirect/` (with trailing slash)
- ✅ `/oauth_redirect` (no trailing slash)

### Issue 2: Protocol Mismatch
- ❌ `http://...` (HTTP)
- ✅ `https://...` (HTTPS)

### Issue 3: Path Mismatch
- ❌ `/oauth/callback`
- ❌ `/oauth_redirect/`
- ✅ `/oauth_redirect`

### Issue 4: Code Already Used
- Authorization codes are **single-use**
- If you see "code already used" error, get a fresh code by logging in again

## Next Steps

1. **Check Logcat** for the exact redirect_uri values
2. **Verify Bitrix24** configuration matches exactly
3. **Try logging in again** after verifying the match
4. **Share Logcat output** if issue persists (hide client_secret)

## Request Format Verification

Our implementation uses:
- ✅ **Method:** POST
- ✅ **Content-Type:** application/x-www-form-urlencoded (via `@FormUrlEncoded`)
- ✅ **Endpoint:** `/oauth/token/`
- ✅ **Parameters:** `grant_type`, `client_id`, `client_secret`, `code`, `redirect_uri`

This matches Bitrix24's requirements.
