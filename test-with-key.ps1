$functionUrl = "https://jbmarks-token-exchange-v3.azurewebsites.net/api/exchangetoken?code=CXuwMW-23C7ELaCAaiawOiNOgJSqk-IFbyV0TMBgS0TNAzFun4bS3Q=="
$body = @{
    oauth_code = "test123"
    domain = "jbcompany.bitrix24.com"
} | ConvertTo-Json

Write-Host "Testing with function key..."

try {
    $response = Invoke-WebRequest -Uri $functionUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $responseStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    
    if ($responseBody) {
        Write-Host "Response Body:"
        try {
            $responseBody | ConvertFrom-Json | ConvertTo-Json -Depth 5
        } catch {
            Write-Host $responseBody
        }
    } else {
        Write-Host "Empty response body"
    }
}
