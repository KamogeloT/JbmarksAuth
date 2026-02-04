#!/usr/bin/env pwsh

$functionAppName = "jbmarks-token-exchange-v2"
$resourceGroup = "jbmarks-oauth-redirect-rg-za"

Write-Host "`n=== Redeploying Azure Function ===" -ForegroundColor Cyan

# Step 1: Create deployment package
Write-Host "`n[Step 1] Creating deployment package..." -ForegroundColor Yellow

$deployDir = "azure-redirect/token-exchange-function"
$zipFile = "function-deploy.zip"

if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Write-Host "Packaging files from: $deployDir"
Compress-Archive -Path "$deployDir/*" -DestinationPath $zipFile -Force

Write-Host "Created: $zipFile (Size: $((Get-Item $zipFile).Length / 1KB) KB)" -ForegroundColor Green

# Step 2: Deploy to Azure
Write-Host "`n[Step 2] Deploying to Azure (this may take 2-3 minutes)..." -ForegroundColor Yellow

az functionapp deployment source config-zip `
    --resource-group $resourceGroup `
    --name $functionAppName `
    --src $zipFile `
    --build-remote true `
    --timeout 600

Write-Host "`nDeployment command completed with exit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })

# Step 3: Wait and test
Write-Host "`n[Step 3] Waiting for function to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Testing function endpoint..."

$functionUrl = "https://$functionAppName.azurewebsites.net/api/exchangetoken?code=DRgxVCut3DzTSy8wzQDtmhkQsPAhgrDBOqGWw5SJ_V69AzFunzMXrw=="
$testBody = '{"oauth_code":"test_code","domain":"jbcompany.bitrix24.com"}'

$response = Invoke-WebRequest -Uri $functionUrl -Method POST -Body $testBody -ContentType "application/json" -UseBasicParsing 2>&1

Write-Host "`nTest Result:"
Write-Host "$response"

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "`nCheck Azure Portal logs for details:"
Write-Host "https://portal.azure.com → $functionAppName → Monitor → Log stream"
Write-Host "`n"
