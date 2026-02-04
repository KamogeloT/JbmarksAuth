$functionUrl = "https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken?code=DRgxVCut3DzTSy8wzQDtmhkQsPAhgrDBOqGWw5SJ_V69AzFunzMXrw=="

$testBody = @{
    oauth_code = "test123"
    domain = "jbcompany.bitrix24.com"
} | ConvertTo-Json

Write-Host "Testing function..."

try {
    $response = Invoke-WebRequest -Uri $functionUrl -Method POST -Body $testBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Success! Status: $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    Write-Host "Error: Status $($_.Exception.Response.StatusCode.value__)"
    
    $responseStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    
    if ($responseBody) {
        Write-Host "Response: $responseBody"
    } else {
        Write-Host "ERROR: Empty response body - function is crashing before execution"
        Write-Host "Most likely cause: axios module not installed"
        Write-Host ""
        Write-Host "To check if axios is installed, go to Kudu:"
        Write-Host "https://jbmarks-token-exchange-v2.scm.azurewebsites.net"
        Write-Host "Then navigate to site/wwwroot and check if node_modules/axios exists"
    }
}
