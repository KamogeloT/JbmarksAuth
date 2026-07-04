# ============================================================================
# Deploy Azure Static Web App using ARM Template
# Alternative method using Azure Resource Manager template
# ============================================================================

# Configuration
$SUBSCRIPTION_NAME = "Azure subscription 1"
$RESOURCE_GROUP = "jbmarks-oauth-redirect-rg"
$APP_NAME = "jbmarks-oauth-redirect"
$LOCATION = "eastus"
$TEMPLATE_FILE = "azure-static-webapp-template.json"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Deploying Azure Static Web App via ARM Template" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Login and set subscription
Write-Host "🔐 Logging into Azure..." -ForegroundColor Yellow
$account = az account show 2>$null
if (-not $account) {
    az login
}
az account set --subscription "$SUBSCRIPTION_NAME"
Write-Host "✅ Subscription set to: $SUBSCRIPTION_NAME" -ForegroundColor Green
Write-Host ""

# Create resource group if it doesn't exist
Write-Host "📦 Creating/Checking resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $RESOURCE_GROUP
if ($rgExists -eq "false") {
    az group create --name $RESOURCE_GROUP --location $LOCATION
    Write-Host "✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✅ Resource group already exists" -ForegroundColor Green
}
Write-Host ""

# Deploy template
Write-Host "🚀 Deploying ARM template..." -ForegroundColor Yellow
az deployment group create `
    --resource-group $RESOURCE_GROUP `
    --template-file $TEMPLATE_FILE `
    --parameters `
        staticWebAppName=$APP_NAME `
        location=$LOCATION `
        sku="Free"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ ARM template deployed successfully" -ForegroundColor Green
Write-Host ""

# Get outputs
Write-Host "📋 Getting deployment outputs..." -ForegroundColor Yellow
$outputs = az deployment group show `
    --resource-group $RESOURCE_GROUP `
    --name "azure-static-webapp-template" `
    --query properties.outputs -o json | ConvertFrom-Json

$REDIRECT_URL = $outputs.redirectUrl.value

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 YOUR REDIRECT URL:" -ForegroundColor Cyan
Write-Host "   $REDIRECT_URL" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "⚠️  NOTE: You still need to deploy the index.html file!" -ForegroundColor Yellow
Write-Host "   Run: .\deploy-to-azure.ps1 (steps 4-5) to deploy the HTML file" -ForegroundColor Gray
Write-Host ""
