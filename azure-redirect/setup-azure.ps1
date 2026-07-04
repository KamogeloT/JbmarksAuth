# Azure Static Web App Setup Script for JBmarks OAuth Redirect
# PowerShell script for Windows
# Run this in PowerShell: .\setup-azure.ps1

# Configuration - UPDATE THESE VALUES
$RESOURCE_GROUP_NAME = "jbmarks-oauth-redirect-rg"
$STATIC_WEB_APP_NAME = "jbmarks-oauth-redirect"
$LOCATION = "eastus"  # Change to your preferred region (e.g., westeurope, eastus2)

Write-Host "🚀 Setting up Azure Static Web App for OAuth Redirect..." -ForegroundColor Cyan

# Step 1: Login to Azure (if not already logged in)
Write-Host "`n📝 Step 1: Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>$null
if (-not $account) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}

# Get subscription ID
$subscriptionId = az account show --query id -o tsv
Write-Host "Using subscription: $subscriptionId" -ForegroundColor Green

# Step 2: Create Resource Group
Write-Host "`n📦 Step 2: Creating resource group..." -ForegroundColor Yellow
az group create `
    --name $RESOURCE_GROUP_NAME `
    --location $LOCATION

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create resource group!" -ForegroundColor Red
    exit 1
}

# Step 3: Create Static Web App
Write-Host "`n🌐 Step 3: Creating Static Web App..." -ForegroundColor Yellow
az staticwebapp create `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP_NAME `
    --location $LOCATION `
    --sku Free `
    --login-with-github false

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create Static Web App!" -ForegroundColor Red
    Write-Host "Note: App name might be taken. Try a different name like: jbmarks-oauth-redirect-$((Get-Random).ToString().Substring(0,5))" -ForegroundColor Yellow
    exit 1
}

# Step 4: Get deployment token
Write-Host "`n🔑 Step 4: Getting deployment token..." -ForegroundColor Yellow
$deploymentToken = az staticwebapp secrets list `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP_NAME `
    --query properties.apiKey -o tsv

# Step 5: Deploy the HTML file
Write-Host "`n📤 Step 5: Deploying redirect page..." -ForegroundColor Yellow

# Create a temporary directory structure for deployment
$tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
$oauthDir = Join-Path $tempDir "oauth_redirect"
New-Item -ItemType Directory -Path $oauthDir -Force | Out-Null
Copy-Item "index.html" -Destination $oauthDir -Force

Write-Host "Deploying files from: $tempDir" -ForegroundColor Gray

# Deploy using az staticwebapp deploy
az staticwebapp deploy `
    --name $STATIC_WEB_APP_NAME `
    --resource-group $RESOURCE_GROUP_NAME `
    --app-location "." `
    --output-location "." `
    --deployment-token $deploymentToken `
    --source $tempDir

# Cleanup
Remove-Item $tempDir -Recurse -Force

Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 IMPORTANT: Next Steps" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Your redirect endpoint URL:" -ForegroundColor Yellow
Write-Host "   https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect" -ForegroundColor White
Write-Host ""
Write-Host "2. Update Config.kt in your Android project:" -ForegroundColor Yellow
Write-Host "   const val BITRIX_REDIRECT_URI_HTTPS = `"https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect`"" -ForegroundColor White
Write-Host ""
Write-Host "3. Update Bitrix24 Local Application:" -ForegroundColor Yellow
Write-Host "   Handler path: https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect" -ForegroundColor White
Write-Host ""
Write-Host "4. Test the redirect:" -ForegroundColor Yellow
Write-Host "   Visit: https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect?code=test123" -ForegroundColor White
Write-Host "   (Should redirect to: jbmarks://oauth_redirect?code=test123)" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
