$functionUrl = "https://jbmarks-token-exchange-v3.azurewebsites.net/api/exchangetoken"
$body = @{
    oauth_code = "test123"
    domain = "jbcompany.bitrix24.com"
} | ConvertTo-Json

Write-Host "Testing NEW Function App at: $functionUrl"

try {
    $response = Invoke-WebRequest -Uri $functionUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:"
    $response.Content
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $responseStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    $responseBody = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Response: $responseBody"
}
