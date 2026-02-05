# Azure Function 500 Error - Complete Diagnosis

## Problem Summary

The Azure Function `jbmarks-token-exchange-v2` returns **500 Internal Server Error with empty response body** for ALL code, including a simple "Hello World" function.

## What We Tested

✅ Environment variables are set correctly:
- `BITRIX_CLIENT_ID`: `local.69526f981da4a0.86875975`
- `BITRIX_CLIENT_SECRET`: (hidden)
- `BITRIX_REDIRECT_URI`: (configured)

✅ Runtime settings are correct:
- `FUNCTIONS_EXTENSION_VERSION`: `~4`
- `FUNCTIONS_WORKER_RUNTIME`: `node`
- `WEBSITE_NODE_DEFAULT_VERSION`: `~20`

✅ Code deployed successfully:
- `provisioningState`: "Succeeded"
- `complete`: true
- Deployment status: 4 (success)

❌ Function execution FAILS even with:
- Simple "Hello World" function (no dependencies)
- No-dependencies version (using only built-in Node.js modules)
- Original axios version

## Root Cause

The Function App itself is in a **broken state** and cannot execute ANY code. This is NOT a code issue.

## Immediate Next Steps

### Option 1: Manually Check Deployed Files (RECOMMENDED FIRST)

1. Go to Kudu console:
   ```
   https://jbmarks-token-exchange-v2.scm.azurewebsites.net
   ```

2. Navigate to: **Debug console → CMD**

3. Go to: `site\wwwroot`

4. Verify file structure:
   ```
   /site/wwwroot/
     ├── host.json
     ├── package.json
     └── /exchangeToken/
           ├── function.json
           └── index.js
   ```

5. Check `index.js` contents - click to view file

6. Check for errors in: `LogFiles` folder

### Option 2: Restart the Function App

```powershell
az functionapp restart `
  --name jbmarks-token-exchange-v2 `
  --resource-group jbmarks-oauth-redirect-rg-za
```

Then wait 30 seconds and test again.

### Option 3: Check Application Insights Logs

1. Go to Azure Portal: https://portal.azure.com
2. Navigate to: `jbmarks-token-exchange-v2`
3. Click: **Monitor → Logs**
4. Run this query:

```kusto
traces
| where timestamp > ago(1h)
| where cloud_RoleName == "jbmarks-token-exchange-v2"
| order by timestamp desc
| take 50
```

Look for errors like:
- "Worker was unable to load..."
- "Module not found..."
- "SyntaxError..."

### Option 4: Create New Function App (NUCLEAR OPTION)

If all else fails, create a fresh Function App:

```powershell
# Create new Function App
az functionapp create `
  --resource-group jbmarks-oauth-redirect-rg-za `
  --consumption-plan-location "southafricanorth" `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --name jbmarks-token-exchange-v3 `
  --storage-account jbmarksstorage001

# Copy environment variables from old to new
$oldSettings = az functionapp config appsettings list `
  --name jbmarks-token-exchange-v2 `
  --resource-group jbmarks-oauth-redirect-rg-za | ConvertFrom-Json

$bitrixSettings = $oldSettings | Where-Object { $_.name -like "BITRIX*" }

foreach ($setting in $bitrixSettings) {
    az functionapp config appsettings set `
      --name jbmarks-token-exchange-v3 `
      --resource-group jbmarks-oauth-redirect-rg-za `
      --settings "$($setting.name)=$($setting.value)"
}

# Deploy to new Function App
az functionapp deployment source config-zip `
  --resource-group jbmarks-oauth-redirect-rg-za `
  --name jbmarks-token-exchange-v3 `
  --src function-deploy.zip
```

## Test Commands

After any fix attempt, test with:

```powershell
$functionUrl = "https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken?code=YOUR_FUNCTION_KEY"
$body = '{"oauth_code":"test","domain":"jbcompany.bitrix24.com"}'

Invoke-WebRequest -Uri $functionUrl -Method POST -Body $body -ContentType "application/json"
```

Expected result:
- Status 200 or 400 (not 500!)
- Response body with JSON

## Files Created for Debugging

- `simple-test.ps1` - Quick function test script
- `redeploy-function.ps1` - Redeploy with build flags
- `test-function-detailed.ps1` - Detailed error output
- `function-deploy.zip` - Latest deployment package

## Android App Impact

The Android app currently shows:
```
Server Error: 500
HTTP 500 Internal Server Error
```

Once the Azure Function is fixed and returns proper JSON responses, the Android app should work correctly as it already has:
- ✅ Error reset logic (user can retry login)
- ✅ Proper error handling
- ✅ Retry mechanism

## Current Status

🔴 **BLOCKED**: Azure Function App is not executing any code
🟡 **Android App**: Ready and waiting for working backend
🟢 **Authentication Flow**: Logic is correct, just needs working endpoint

## Decision Point

**We recommend**: Start with Option 1 (check Kudu) to see what's actually deployed, then try Option 2 (restart). If those don't work, proceed with Option 4 (create new Function App).
