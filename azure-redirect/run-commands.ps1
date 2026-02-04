# Copy and paste this ENTIRE script into PowerShell
# It will create the Azure Static Web App automatically

# ============================================================================
# CONFIGURATION - You can change these if needed
# ============================================================================
$RESOURCE_GROUP = "jbmarks-oauth-redirect-rg"
$APP_NAME = "jbmarks-oauth-redirect"
$LOCATION = "eastus"

# ============================================================================
# STEP 1: Login to Azure
# ============================================================================
Write-Host "`n🔐 Logging into Azure..." -ForegroundColor Cyan
az login

# ============================================================================
# STEP 2: Create Resource Group
# ============================================================================
Write-Host "`n📦 Creating resource group: $RESOURCE_GROUP" -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION

# ============================================================================
# STEP 3: Create Static Web App
# ============================================================================
Write-Host "`n🌐 Creating Static Web App: $APP_NAME" -ForegroundColor Yellow
Write-Host "Note: This is a static HTML page - no runtime stack needed!" -ForegroundColor Gray
az staticwebapp create --name $APP_NAME --resource-group $RESOURCE_GROUP --location $LOCATION --sku Free --login-with-github false

# If name is taken, try with random suffix
if ($LASTEXITCODE -ne 0) {
    Write-Host "Name taken, trying with random suffix..." -ForegroundColor Yellow
    $random = -join ((48..57) + (97..122) | Get-Random -Count 6 | % {[char]$_})
    $APP_NAME = "jbmarks-redirect-$random"
    az staticwebapp create --name $APP_NAME --resource-group $RESOURCE_GROUP --location $LOCATION --sku Free --login-with-github false
}

# ============================================================================
# STEP 4: Get Deployment Token
# ============================================================================
Write-Host "`n🔑 Getting deployment token..." -ForegroundColor Yellow
$DEPLOY_TOKEN = az staticwebapp secrets list --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.apiKey -o tsv
Write-Host "Deployment token: $DEPLOY_TOKEN" -ForegroundColor Gray

# ============================================================================
# STEP 5: Deploy HTML File
# ============================================================================
Write-Host "`n📤 Deploying redirect page..." -ForegroundColor Yellow

# Create temp directory structure
$tempDir = "$env:TEMP\jbmarks-deploy-$(Get-Random)"
New-Item -ItemType Directory -Path "$tempDir\oauth_redirect" -Force | Out-Null
Copy-Item "index.html" -Destination "$tempDir\oauth_redirect\index.html" -Force

# Deploy
az staticwebapp deploy `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --deployment-token $DEPLOY_TOKEN `
    --app-location "." `
    --output-location "." `
    --source $tempDir

# Cleanup
Remove-Item $tempDir -Recurse -Force

# ============================================================================
# STEP 6: Get App URL
# ============================================================================
Write-Host "`n🌍 Getting app URL..." -ForegroundColor Yellow
$APP_URL = az staticwebapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv
$REDIRECT_URL = "https://$APP_URL/oauth_redirect"

# ============================================================================
# DONE! Show results
# ============================================================================
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 YOUR REDIRECT URL:" -ForegroundColor Cyan
Write-Host "   $REDIRECT_URL" -ForegroundColor White
Write-Host ""
Write-Host "📝 NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Update Config.kt:" -ForegroundColor Yellow
Write-Host "   Edit: app/src/main/java/com/example/jbmarks/config/Config.kt" -ForegroundColor Gray
Write-Host "   Set: BITRIX_REDIRECT_URI_HTTPS = `"$REDIRECT_URL`"" -ForegroundColor White
Write-Host ""
Write-Host "2. Update Bitrix24:" -ForegroundColor Yellow
Write-Host "   Handler path: $REDIRECT_URL" -ForegroundColor White
Write-Host ""
Write-Host "3. Test the redirect:" -ForegroundColor Yellow
Write-Host "   Visit: $REDIRECT_URL?code=test123" -ForegroundColor White
Write-Host "   (Should redirect to: jbmarks://oauth_redirect?code=test123)" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
