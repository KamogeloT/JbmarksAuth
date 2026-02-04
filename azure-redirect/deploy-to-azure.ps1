# ============================================================================
# COMPLETE AZURE DEPLOYMENT SCRIPT FOR JBmarks OAuth Redirect
# Run this script to set everything up automatically
# ============================================================================

# Configuration
$SUBSCRIPTION_NAME = "Azure subscription 1"
$RESOURCE_GROUP = "jbmarks-oauth-redirect-rg"
$APP_NAME = "jbmarks-oauth-redirect"
$LOCATION = "eastus"  # Change if needed (eastus, westeurope, etc.)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  JBmarks OAuth Redirect - Azure Deployment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Login and Set Subscription
# ============================================================================
Write-Host "🔐 STEP 1: Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Logging into Azure..." -ForegroundColor Gray
    az login
}

Write-Host "📋 Setting subscription to: $SUBSCRIPTION_NAME" -ForegroundColor Yellow
az account set --subscription "$SUBSCRIPTION_NAME"

$currentSub = az account show --query name -o tsv
Write-Host "✅ Using subscription: $currentSub" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Create Resource Group
# ============================================================================
Write-Host "📦 STEP 2: Creating resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $RESOURCE_GROUP
if ($rgExists -eq "true") {
    Write-Host "Resource group already exists. Using existing one." -ForegroundColor Gray
} else {
    az group create --name $RESOURCE_GROUP --location $LOCATION
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create resource group!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Resource group created" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# STEP 3: Create Static Web App
# ============================================================================
Write-Host "🌐 STEP 3: Creating Static Web App..." -ForegroundColor Yellow
Write-Host "App name: $APP_NAME" -ForegroundColor Gray
Write-Host "Location: $LOCATION" -ForegroundColor Gray

# Check if app name is available
$appExists = az staticwebapp show --name $APP_NAME --resource-group $RESOURCE_GROUP 2>$null
if ($appExists) {
    Write-Host "Static Web App already exists. Using existing one." -ForegroundColor Gray
} else {
    az staticwebapp create `
        --name $APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --location $LOCATION `
        --sku Free `
        --login-with-github false
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create Static Web App!" -ForegroundColor Red
        Write-Host "App name might be taken. Trying with random suffix..." -ForegroundColor Yellow
        
        $random = -join ((48..57) + (97..122) | Get-Random -Count 6 | % {[char]$_})
        $APP_NAME = "jbmarks-redirect-$random"
        Write-Host "New app name: $APP_NAME" -ForegroundColor Gray
        
        az staticwebapp create `
            --name $APP_NAME `
            --resource-group $RESOURCE_GROUP `
            --location $LOCATION `
            --sku Free `
            --login-with-github false
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Still failed. Please try a different name manually." -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "✅ Static Web App created: $APP_NAME" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# STEP 4: Get Deployment Token
# ============================================================================
Write-Host "🔑 STEP 4: Getting deployment token..." -ForegroundColor Yellow
$DEPLOY_TOKEN = az staticwebapp secrets list `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query properties.apiKey -o tsv

if (-not $DEPLOY_TOKEN) {
    Write-Host "❌ Failed to get deployment token!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Deployment token obtained" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 5: Deploy HTML File
# ============================================================================
Write-Host "📤 STEP 5: Deploying redirect page..." -ForegroundColor Yellow

# Check if index.html exists
if (-not (Test-Path "index.html")) {
    Write-Host "❌ ERROR: index.html not found in current directory!" -ForegroundColor Red
    Write-Host "Please run this script from the azure-redirect folder." -ForegroundColor Yellow
    exit 1
}

# Create temp directory structure
$tempDir = "$env:TEMP\jbmarks-deploy-$(Get-Random)"
$oauthDir = Join-Path $tempDir "oauth_redirect"
New-Item -ItemType Directory -Path $oauthDir -Force | Out-Null
Copy-Item "index.html" -Destination "$oauthDir\index.html" -Force

Write-Host "Deploying files..." -ForegroundColor Gray

# Deploy
az staticwebapp deploy `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --deployment-token $DEPLOY_TOKEN `
    --app-location "." `
    --output-location "." `
    --source $tempDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# Cleanup
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Files deployed successfully" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 6: Get App URL
# ============================================================================
Write-Host "🌍 STEP 6: Getting app URL..." -ForegroundColor Yellow
$APP_HOSTNAME = az staticwebapp show `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --query defaultHostname -o tsv

$REDIRECT_URL = "https://$APP_HOSTNAME/oauth_redirect"

Write-Host "✅ App URL obtained" -ForegroundColor Green
Write-Host ""

# ============================================================================
# DONE! Show Results
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 YOUR REDIRECT URL:" -ForegroundColor Cyan
Write-Host "   $REDIRECT_URL" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "  NEXT STEPS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "1️⃣  UPDATE CONFIG.KT:" -ForegroundColor Cyan
Write-Host "   File: app/src/main/java/com/example/jbmarks/config/Config.kt" -ForegroundColor Gray
Write-Host "   Change this line:" -ForegroundColor Gray
Write-Host "   const val BITRIX_REDIRECT_URI_HTTPS = `"$REDIRECT_URL`"" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  UPDATE BITRIX24:" -ForegroundColor Cyan
Write-Host "   Go to: Bitrix24 Portal → Apps → Local Applications" -ForegroundColor Gray
Write-Host "   Set 'Handler path' to:" -ForegroundColor Gray
Write-Host "   $REDIRECT_URL" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  TEST IT:" -ForegroundColor Cyan
Write-Host "   Visit this URL in your browser:" -ForegroundColor Gray
Write-Host "   ${REDIRECT_URL}?code=test123" -ForegroundColor White
Write-Host "   (Should redirect to: jbmarks://oauth_redirect?code=test123)" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
