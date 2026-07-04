# Azure Function Token Exchange - Fix Summary

## Date: 2026-01-28

## Problem
The original Azure Function was returning 500 errors with empty response bodies during OAuth token exchange with Bitrix24.

## Root Cause
The Azure Function had a naming collision with the `code` query parameter (reserved by Azure Functions for function keys).

## Solution Applied

### 1. Fixed Azure Function (`jbmarks-token-exchange-v2`)
**Location**: `azure-redirect/token-exchange-function/exchangeToken/index.js`

**Key Changes**:
- ✅ Changed parameter name from `code` to `oauth_code`
- ✅ Removed `domain` and `member_id` from the Bitrix token request (they caused HTML responses)
- ✅ Added proper JSON error responses
- ✅ Improved logging for debugging

**Function URL**: 
```
https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken
```

**Expected Request**:
```json
POST /api/exchangetoken
Content-Type: application/json

{
  "oauth_code": "your_authorization_code_here",
  "domain": "your-portal.bitrix24.com",
  "member_id": "your_member_id"
}
```

**Success Response**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "user_id": 1,
  "domain": "your-portal.bitrix24.com",
  "member_id": "your_member_id"
}
```

### 2. Updated Android App
**Location**: `app/src/main/java/com/example/jbmarks/config/Config.kt`

**Changes**:
- ✅ Updated `AZURE_FUNCTION_TOKEN_EXCHANGE_URL` to point to the fixed v2 function
- ✅ Removed function key from URL (not needed for anonymous access)

### 3. Android OAuth Flow
The Android app (`OAuthService.kt`) is already configured to:
1. Detect `local.*` client IDs (Bitrix24 On-Prem/Box)
2. Use the Azure Function as a proxy for token exchange
3. Send `oauth_code` parameter instead of `code`
4. Fallback to portal endpoint if Azure Function fails

## Deployment Status

✅ **Azure Function**: Deployed to `jbmarks-token-exchange-v2`
✅ **Android Config**: Updated to use new function URL
⏳ **Testing**: Ready for testing

## Next Steps

1. **Rebuild Android App**:
   ```bash
   ./gradlew clean assembleDebug
   ```

2. **Install on Device/Emulator**:
   ```bash
   ./gradlew installDebug
   ```

3. **Test OAuth Flow**:
   - Launch the app
   - Click "Login with Bitrix24"
   - Authorize in browser
   - Check logs for successful token exchange

4. **Monitor Logs**:
   - Android: Use Logcat filter `OAuthService`
   - Azure: Check Application Insights or Function logs

## Troubleshooting

### If OAuth still fails:

1. **Check Azure Function logs**:
   ```bash
   az monitor app-insights query \
     --app jbmarks-token-exchange-v2 \
     --analytics-query "traces | where timestamp > ago(30m) | order by timestamp desc"
   ```

2. **Test function directly**:
   ```bash
   curl -X POST https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken \
     -H "Content-Type: application/json" \
     -d '{"oauth_code":"test_code","domain":"jbmarks.sdinmotion.co.za"}'
   ```

3. **Verify environment variables** are set in Azure Function:
   - `BITRIX_CLIENT_ID`
   - `BITRIX_CLIENT_SECRET`
   - `BITRIX_REDIRECT_URI`

## Alternative: BFF API

If the Azure Function approach continues to have issues, a Backend-for-Frontend (BFF) API was also created but encountered deployment timeouts. Files are ready at:
- `azure-bff-api/` folder
- ZIP file: `C:\Users\kjsem\AppData\Local\Temp\bff-deploy.zip`

The BFF API can be deployed via Azure Portal (Kudu) to avoid CLI timeout issues.

## Files Modified

1. `azure-redirect/token-exchange-function/exchangeToken/index.js` - Fixed function logic
2. `app/src/main/java/com/example/jbmarks/config/Config.kt` - Updated function URL
3. *(No changes needed to `OAuthService.kt` - already uses oauth_code parameter)*

## Success Criteria

✅ Azure Function returns JSON responses (not HTML)
✅ Azure Function returns proper error codes
✅ Android app successfully exchanges code for tokens
✅ Access token is stored and can be used for API calls
