# PowerShell script to set up Azure Key Vault for JBmarks BFF API secrets
# This is optional - you can use App Service App Settings instead

param(
    [string]$ResourceGroup = "jbmarks-oauth-redirect-rg-za",
    [string]$KeyVaultName = "jbmarks-secrets-kv",
    [string]$AppName = "jbmarks-bff-api",
    [string]$Location = "southafricanorth"
)

Write-Host "=== Azure Key Vault Setup for JBmarks BFF API ===" -ForegroundColor Cyan
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

Write-Host ""

# Step 1: Create Key Vault
Write-Host "🔐 Step 1: Creating Key Vault..." -ForegroundColor Yellow
$kvExists = az keyvault show --name $KeyVaultName --resource-group $ResourceGroup 2>$null
if (-not $kvExists) {
    Write-Host "Creating Key Vault: $KeyVaultName" -ForegroundColor Gray
    az keyvault create `
        --name $KeyVaultName `
        --resource-group $ResourceGroup `
        --location $Location `
        --enabled-for-deployment false `
        --enabled-for-template-deployment false `
        --enabled-for-disk-encryption false `
        --sku standard
    Write-Host "✅ Key Vault created" -ForegroundColor Green
} else {
    Write-Host "Key Vault already exists" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Enable Managed Identity on App Service
Write-Host "🆔 Step 2: Enabling Managed Identity on App Service..." -ForegroundColor Yellow
$identity = az webapp identity assign `
    --name $AppName `
    --resource-group $ResourceGroup `
    --query principalId -o tsv

if ($identity) {
    Write-Host "✅ Managed Identity enabled: $identity" -ForegroundColor Green
} else {
    Write-Host "⚠️ Failed to enable Managed Identity" -ForegroundColor Yellow
    Write-Host "Make sure App Service '$AppName' exists" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Grant Key Vault access to App Service
Write-Host "🔑 Step 3: Granting Key Vault access..." -ForegroundColor Yellow
if ($identity) {
    az keyvault set-policy `
        --name $KeyVaultName `
        --object-id $identity `
        --secret-permissions get list
    Write-Host "✅ Key Vault access granted" -ForegroundColor Green
} else {
    Write-Host "⚠️ Skipping - Managed Identity not available" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Store secrets (prompt user)
Write-Host "💾 Step 4: Storing secrets..." -ForegroundColor Yellow
Write-Host ""
Write-Host "You can store secrets using these commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Store Bitrix Client ID" -ForegroundColor Gray
Write-Host "  az keyvault secret set --vault-name $KeyVaultName --name BITRIX_CLIENT_ID --value 'your_client_id'" -ForegroundColor White
Write-Host ""
Write-Host "  # Store Bitrix Client Secret" -ForegroundColor Gray
Write-Host "  az keyvault secret set --vault-name $KeyVaultName --name BITRIX_CLIENT_SECRET --value 'your_client_secret'" -ForegroundColor White
Write-Host ""
Write-Host "  # Store Bitrix Redirect URI" -ForegroundColor Gray
Write-Host "  az keyvault secret set --vault-name $KeyVaultName --name BITRIX_REDIRECT_URI --value 'your_redirect_uri'" -ForegroundColor White
Write-Host ""

# Step 5: Configure App Service to use Key Vault
Write-Host "⚙️ Step 5: Configure App Service..." -ForegroundColor Yellow
Write-Host "Set KEY_VAULT_URL in App Service App Settings:" -ForegroundColor Gray
Write-Host "  az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings KEY_VAULT_URL=https://$KeyVaultName.vault.azure.net/" -ForegroundColor White
Write-Host ""

Write-Host "=== Key Vault Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Key Vault URL: https://$KeyVaultName.vault.azure.net/" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ Remember to:" -ForegroundColor Yellow
Write-Host "  1. Store your secrets in Key Vault (see commands above)" -ForegroundColor Gray
Write-Host "  2. Set KEY_VAULT_URL in App Service App Settings" -ForegroundColor Gray
Write-Host "  3. Restart the App Service" -ForegroundColor Gray
Write-Host ""
