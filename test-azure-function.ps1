#!/usr/bin/env pwsh
# Script to test and debug the Azure Function

$functionUrl = "https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken?code=DRgxVCut3DzTSy8wzQDtmhkQsPAhgrDBOqGWw5SJ_V69AzFunzMXrw=="

Write-Host "`n=== Testing Azure Function ===" -ForegroundColor Cyan
Write-Host "Function URL: $functionUrl`n"

# Test 1: Check if function is reachable
Write-Host "[1] Testing function endpoint..." -ForegroundColor Yellow
try {
    $testBody = @{
        oauth_code = "test_code_12345"
        domain = "jbcompany.bitrix24.com"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri $functionUrl -Method POST -Body $testBody -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Headers:"
    $response.Headers | Format-Table
    Write-Host "`nResponse Body:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "`nError Response Body:" -ForegroundColor Red
        Write-Host $responseBody
        
        # Try to parse as JSON
        try {
            $jsonError = $responseBody | ConvertFrom-Json
            Write-Host "`nParsed Error:" -ForegroundColor Yellow
            $jsonError | ConvertTo-Json -Depth 5
        } catch {
            Write-Host "Response is not JSON"
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Check deployment files via Kudu
Write-Host "`n`n[2] Checking deployed files..." -ForegroundColor Yellow
$kuduUrl = "https://jbmarks-token-exchange-v2.scm.azurewebsites.net/api/vfs/site/wwwroot/"

Write-Host "Attempting to list files at: $kuduUrl"
Write-Host "(This may fail if you're not authenticated via browser)`n"

# Test 3: Provide manual testing instructions
Write-Host "`n`n[3] Manual Testing Steps:" -ForegroundColor Cyan
Write-Host "=" * 70

Write-Host "`nTo get detailed error logs:"
Write-Host "1. Go to: https://portal.azure.com"
Write-Host "2. Navigate to: jbmarks-token-exchange-v2 Function App"
Write-Host "3. Go to: Functions → exchangeToken → Monitor"
Write-Host "4. Or go to: Log stream (under Monitoring)"
Write-Host "5. Run a test request and watch the live logs"

Write-Host "`n`nTo test with a REAL OAuth code:" -ForegroundColor Yellow
Write-Host "1. Open in browser:"
Write-Host "   https://jbcompany.bitrix24.com/oauth/authorize/?client_id=local.YOUR_CLIENT_ID&response_type=code&redirect_uri=https://jbmarks-oauth-redirect.azurewebsites.net/oauth_redirect/"
Write-Host "`n2. After login, grab the 'code' parameter from the redirect URL"
Write-Host "`n3. Test the function with PowerShell:"
Write-Host @"

`$testCode = "PASTE_REAL_CODE_HERE"
`$body = @{
    oauth_code = `$testCode
    domain = "jbcompany.bitrix24.com"
} | ConvertTo-Json

`$response = Invoke-WebRequest ``
    -Uri "$functionUrl" ``
    -Method POST ``
    -Body `$body ``
    -ContentType "application/json" ``
    -UseBasicParsing

`$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
"@

Write-Host "`n`nCommon 500 Error Causes:" -ForegroundColor Yellow
Write-Host "✗ Missing axios package (npm install not run during deployment)"
Write-Host "✗ Missing environment variables (BITRIX_CLIENT_ID, BITRIX_CLIENT_SECRET, etc.)"
Write-Host "✗ Runtime error in the function code"
Write-Host "✗ Wrong Node.js version"

Write-Host "`n`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Check Function logs in Azure Portal (Monitor → Log stream)"
Write-Host "2. Verify environment variables are set"
Write-Host "3. Re-deploy with package.json to ensure dependencies install"
Write-Host "`n"
