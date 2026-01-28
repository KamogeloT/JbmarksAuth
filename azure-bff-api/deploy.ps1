# PowerShell script to deploy JBmarks BFF API to Azure App Service
# Run this script from the azure-bff-api directory

param(
    [string]$ResourceGroup = "jbmarks-oauth-redirect-rg-za",
    [string]$AppName = "jbmarks-bff-api",
    [string]$Location = "southafricanorth",
    [string]$PlanName = "jbmarks-bff-plan",
    [string]$NodeVersion = "18-lts"
)

Write-Host "=== JBmarks BFF API Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
$azVersion = az version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Azure CLI not found. Please install it from https://aka.ms/installazurecliwindows" -ForegroundColor Red
    exit 1
}

# Check if logged in
Write-Host "📝 Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}

$subscriptionId = az account show --query id -o tsv
Write-Host "Using subscription: $subscriptionId" -ForegroundColor Gray
Write-Host ""

# Step 1: Create resource group if it doesn't exist
Write-Host "📦 Step 1: Checking resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Host "Creating resource group: $ResourceGroup" -ForegroundColor Gray
    az group create --name $ResourceGroup --location $Location
    Write-Host "✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "Resource group already exists" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Create App Service Plan
Write-Host "Step 2: Creating App Service Plan..." -ForegroundColor Yellow
$planExists = az appservice plan show --name $PlanName --resource-group $ResourceGroup 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating App Service Plan: $PlanName" -ForegroundColor Gray
    az appservice plan create `
        --name $PlanName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku FREE `
        --is-linux
    if ($LASTEXITCODE -eq 0) {
        Write-Host "App Service Plan created" -ForegroundColor Green
    } else {
        Write-Host "Failed to create App Service Plan" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "App Service Plan already exists" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Create App Service
Write-Host "Step 3: Creating App Service..." -ForegroundColor Yellow
$appExists = az webapp show --name $AppName --resource-group $ResourceGroup 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating App Service: $AppName" -ForegroundColor Gray
    az webapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --plan $PlanName `
        --runtime "NODE:$NodeVersion"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "App Service created" -ForegroundColor Green
    } else {
        Write-Host "Failed to create App Service" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "App Service already exists" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Configure App Settings
Write-Host "⚙️ Step 4: Configuring App Settings..." -ForegroundColor Yellow
Write-Host "Setting Node.js version and startup command..." -ForegroundColor Gray

az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings `
        WEBSITE_NODE_DEFAULT_VERSION="$NodeVersion" `
        SCM_DO_BUILD_DURING_DEPLOYMENT=true `
        ENABLE_ORYX_BUILD=true

Write-Host "✅ App Settings configured" -ForegroundColor Green
Write-Host ""

# Step 5: Set startup command
Write-Host "🚀 Step 5: Setting startup command..." -ForegroundColor Yellow
az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file "node server.js"
Write-Host "✅ Startup command set" -ForegroundColor Green
Write-Host ""

# Step 6: Create deployment package
Write-Host "📦 Step 6: Creating deployment package..." -ForegroundColor Yellow
$deployZip = "$env:TEMP\jbmarks-bff-deploy.zip"

# Remove old zip if exists
if (Test-Path $deployZip) {
    Remove-Item $deployZip -Force
}

# Create zip (excluding node_modules, .env, etc.)
Write-Host "Zipping files..." -ForegroundColor Gray
$filesToZip = @("server.js", "package.json", "config", "routes", "middleware")
# Add .env.example if it exists
if (Test-Path ".env.example") {
    $filesToZip += ".env.example"
}
Compress-Archive -Path $filesToZip -DestinationPath $deployZip -Force

if (-not (Test-Path $deployZip)) {
    Write-Host "❌ Failed to create deployment package" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deployment package created: $deployZip" -ForegroundColor Green
Write-Host ""

# Step 7: Deploy to Azure
Write-Host "🚀 Step 7: Deploying to Azure..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

az webapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $AppName `
    --src $deployZip

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 8: Get App URL
$appUrl = az webapp show --name $AppName --resource-group $ResourceGroup --query defaultHostName -o tsv
$fullUrl = "https://$appUrl"

Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "App URL: $fullUrl" -ForegroundColor Cyan
Write-Host "Health check: $fullUrl/health" -ForegroundColor Cyan
Write-Host "Token exchange endpoint: $fullUrl/api/auth/bitrix/exchange" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Configure environment variables in Azure Portal:" -ForegroundColor Yellow
$configMsg = "  1. Go to Azure Portal > App Service > $AppName > Configuration"
Write-Host $configMsg -ForegroundColor Gray
Write-Host "  2. Add these Application Settings:" -ForegroundColor Gray
Write-Host "     - BITRIX_CLIENT_ID" -ForegroundColor Gray
Write-Host "     - BITRIX_CLIENT_SECRET" -ForegroundColor Gray
Write-Host "     - BITRIX_REDIRECT_URI" -ForegroundColor Gray
Write-Host "  3. Save and restart the app" -ForegroundColor Gray
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
$logCmd = "az webapp log tail --name $AppName --resource-group $ResourceGroup"
Write-Host "  $logCmd" -ForegroundColor Gray
Write-Host ""
