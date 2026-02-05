#!/usr/bin/env pwsh

Write-Host "`n=== Testing Azure Function with Detailed Error Output ===" -ForegroundColor Cyan

$functionUrl = "https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken?code=DRgxVCut3DzTSy8wzQDtmhkQsPAhgrDBOqGWw5SJ_V69AzFunzMXrw=="

$testBody = @{
    oauth_code = "test_oauth_code_12345"
    domain = "jbcompany.bitrix24.com"
} | ConvertTo-Json

Write-Host "`nRequest URL: $functionUrl"
Write-Host "Request Body: $testBody`n"

try {
    $response = Invoke-WebRequest -Uri $functionUrl -Method POST -Body $testBody -ContentType "application/json" -UseBasicParsing
    
    Write-Host "✓ Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`nResponse:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ Error! Status Code: $statusCode" -ForegroundColor Red
    
    Write-Host "`nResponse Headers:"
    $_.Exception.Response.Headers | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)"
    }
    
    Write-Host "`nAttempting to read response body..."
    try {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        if ($responseBody) {
            Write-Host "`nResponse Body:"
            Write-Host $responseBody -ForegroundColor Yellow
            
            # Try to parse as JSON
            try {
                $jsonResponse = $responseBody | ConvertFrom-Json
                Write-Host "`nParsed JSON:"
                $jsonResponse | ConvertTo-Json -Depth 5
            } catch {
                Write-Host "  (Response is not JSON)" -ForegroundColor Gray
            }
        } else {
            Write-Host "`n✗ Response body is EMPTY" -ForegroundColor Red
            Write-Host "This means the function is crashing BEFORE it can execute." -ForegroundColor Red
            Write-Host "`nPossible causes:" -ForegroundColor Yellow
            Write-Host "  1. Missing 'axios' module (npm install didn't run)"
            Write-Host "  2. Syntax error in index.js"
            Write-Host "  3. Wrong programming model (v3 vs v4)"
            Write-Host "  4. Missing dependencies"
        }
    } catch {
        Write-Host "Could not read response stream: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n`n=== How to View Logs in Azure Portal ===" -ForegroundColor Cyan
Write-Host "1. Open: https://portal.azure.com"
Write-Host "2. Search for: jbmarks-token-exchange-v2"
Write-Host "3. Go to: Functions → exchangeToken → Monitor"
Write-Host "4. Or go to: Monitoring → Log stream (for live logs)"
Write-Host "5. Click on any invocation to see detailed error messages"

Write-Host "`n`n=== Manual Verification Steps ===" -ForegroundColor Cyan
Write-Host "To check if axios is installed:"
Write-Host "1. Go to: https://jbmarks-token-exchange-v2.scm.azurewebsites.net"
Write-Host "2. Click: Debug console -> CMD"
Write-Host "3. Navigate to: site\wwwroot"
Write-Host "4. Run: dir node_modules\axios"
Write-Host "5. If axios folder does not exist, then npm install did not run"

Write-Host "`n`n=== Next Steps ===" -ForegroundColor Yellow
Write-Host "If axios is missing, we need to either:"
Write-Host "  A) Set SCM_DO_BUILD_DURING_DEPLOYMENT=true"
Write-Host "  B) Deploy with --build-remote true (we already tried this)"
Write-Host "  C) Use a GitHub Actions or Azure DevOps pipeline"
Write-Host "  D) Manually install via Kudu console: npm install --production"
Write-Host "`n"
