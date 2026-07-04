# GitHub Actions Deployment Guide

This guide explains how to set up automatic deployment of the OAuth redirect page to Azure Static Web Apps using GitHub Actions.

## Prerequisites

1. **Azure Account** with an active subscription
2. **Azure Static Web App** already created (or we'll create it)
3. **GitHub Repository** with this code
4. **Azure CLI** installed (for initial setup)

## Step 1: Create Azure Static Web App (if not already created)

Run the deployment script:

```powershell
cd azure-redirect
.\deploy-to-azure.ps1
```

Or manually:

```powershell
# Login to Azure
az login

# Create resource group
az group create --name "jbmarks-oauth-redirect-rg" --location "eastus"

# Create Static Web App
az staticwebapp create `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --location "eastus" `
    --sku Free `
    --login-with-github false
```

## Step 2: Get Deployment Token

Get the deployment token from Azure:

```powershell
az staticwebapp secrets list `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --query properties.apiKey -o tsv
```

**Copy this token** - you'll need it for the next step.

## Step 3: Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
5. Value: Paste the deployment token from Step 2
6. Click **Add secret**

## Step 4: Configure Workflow (if needed)

The workflow file (`.github/workflows/deploy-azure-redirect.yml`) is already configured to:
- Deploy on push to `main` or `master` branch
- Only when files in `azure-redirect/` folder change
- Deploy to the `oauth_redirect` path

If your Azure Static Web App name or resource group is different, update the workflow file.

## Step 5: Test Deployment

1. Make a change to `azure-redirect/index.html`
2. Commit and push to the `main` branch:
   ```bash
   git add azure-redirect/index.html
   git commit -m "Update OAuth redirect page"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub
4. Watch the deployment workflow run
5. Once complete, verify the deployment at your Azure Static Web App URL

## Manual Deployment (Alternative)

If you prefer manual deployment, use the PowerShell script:

```powershell
cd azure-redirect
.\deploy-to-azure.ps1
```

## Troubleshooting

### Workflow fails with "Invalid token"
- Verify the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret is set correctly
- Regenerate the token if needed:
  ```powershell
  az staticwebapp secrets list `
      --name "jbmarks-oauth-redirect" `
      --resource-group "jbmarks-oauth-redirect-rg" `
      --query properties.apiKey -o tsv
  ```

### Deployment succeeds but redirect doesn't work
- Verify the file is deployed to `/oauth_redirect/index.html`
- Check the Azure Static Web App URL in the Azure Portal
- Test the redirect URL manually in a browser

### Workflow doesn't trigger
- Ensure you're pushing to `main` or `master` branch
- Check that files in `azure-redirect/` folder are being changed
- Verify the workflow file is in `.github/workflows/` directory

## Next Steps

After successful deployment:

1. **Update Config.kt** with your Azure Static Web App URL:
   ```kotlin
   const val BITRIX_REDIRECT_URI_HTTPS = "https://your-app.azurestaticapps.net/oauth_redirect"
   ```

2. **Update Bitrix24** Local Application with the same URL

3. **Test the OAuth flow** in your Android app
