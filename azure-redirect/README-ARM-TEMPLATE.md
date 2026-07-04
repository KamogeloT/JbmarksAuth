# Azure Resource Manager (ARM) Template for Static Web App

This ARM template creates an Azure Static Web App for the OAuth redirect functionality.

## What This Template Creates

- **Azure Static Web App** (`Microsoft.Web/staticSites`)
- Resource group (if doesn't exist)
- Free tier SKU
- Outputs the redirect URL

## How to Use

### Option 1: Via PowerShell Script (Recommended)

```powershell
.\deploy-with-arm-template.ps1
```

### Option 2: Via Azure CLI

```powershell
# 1. Set subscription
az account set --subscription "Azure subscription 1"

# 2. Create resource group (if needed)
az group create --name "jbmarks-oauth-redirect-rg" --location "eastus"

# 3. Deploy template
az deployment group create `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --template-file "azure-static-webapp-template.json" `
    --parameters staticWebAppName="jbmarks-oauth-redirect" location="eastus" sku="Free"

# 4. Get outputs
az deployment group show `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --name "azure-static-webapp-template" `
    --query properties.outputs.redirectUrl.value -o tsv
```

### Option 3: Via Azure Portal

1. Go to Azure Portal → Create a resource
2. Search for "Template deployment"
3. Upload `azure-static-webapp-template.json`
4. Fill in parameters and deploy

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `staticWebAppName` | `jbmarks-oauth-redirect` | Name of the Static Web App |
| `location` | `eastus` | Azure region |
| `sku` | `Free` | SKU tier (Free or Standard) |

## Outputs

- `staticWebAppName`: Name of the created Static Web App
- `staticWebAppUrl`: Base URL of the Static Web App
- `redirectUrl`: Full redirect URL (`https://.../oauth_redirect`)
- `deploymentToken`: API key for deployments

## After Deployment

**IMPORTANT:** The ARM template only creates the Static Web App infrastructure. You still need to:

1. Deploy the `index.html` file (use `deploy-to-azure.ps1` steps 4-5)
2. Or manually upload via Azure Portal

## Comparison with CLI Method

| Method | Pros | Cons |
|--------|------|------|
| ARM Template | Repeatable, version controlled, infrastructure as code | Requires deployment step for HTML |
| CLI Script (`deploy-to-azure.ps1`) | Complete automation including HTML deployment | Less "infrastructure as code" friendly |

**Recommendation:** Use `deploy-to-azure.ps1` for initial setup, use ARM template for infrastructure automation.
