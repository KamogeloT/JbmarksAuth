# Manual Deployment Instructions

If the automated script doesn't work, here's how to manually create and deploy the Azure Static Web App.

## Prerequisites

Install Azure CLI:
```powershell
# Windows (PowerShell)
winget install -e --id Microsoft.AzureCLI

# Or download from: https://aka.ms/installazurecliwindows
```

Login to Azure:
```powershell
az login
```

## Step 1: Create Resource Group

```powershell
az group create `
    --name "jbmarks-oauth-redirect-rg" `
    --location "eastus"
```

## Step 2: Create Static Web App

```powershell
az staticwebapp create `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --location "eastus" `
    --sku Free
```

**Note:** If the name is taken, add random characters:
```powershell
$random = -join ((48..57) + (97..122) | Get-Random -Count 6 | % {[char]$_})
az staticwebapp create --name "jbmarks-redirect-$random" --resource-group "jbmarks-oauth-redirect-rg" --location "eastus" --sku Free
```

## Step 3: Get Deployment Token

```powershell
az staticwebapp secrets list `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --query properties.apiKey -o tsv
```

Copy this token - you'll need it for deployment.

## Step 4: Deploy the HTML File

### Option A: Using Azure Portal (Easiest)

1. Go to [Azure Portal](https://portal.azure.com)
2. Find your Static Web App: `jbmarks-oauth-redirect`
3. Click **"Overview"** → **"Deployments"**
4. Click **"Add"** or **"Manage deployment token"**
5. Copy the deployment token
6. Click **"Browse"** and upload `index.html`
7. Set the path/folder structure:
   - Create folder: `oauth_redirect`
   - Place `index.html` inside it
   - Or use root with path `/oauth_redirect/index.html`

### Option B: Using Azure CLI Deployment

Create deployment package structure:
```powershell
# Create temp directory
$tempDir = "$env:TEMP\jbmarks-deploy"
New-Item -ItemType Directory -Path $tempDir -Force
$oauthDir = Join-Path $tempDir "oauth_redirect"
New-Item -ItemType Directory -Path $oauthDir -Force

# Copy index.html
Copy-Item "index.html" -Destination $oauthDir -Force

# Deploy
az staticwebapp deploy `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --deployment-token "YOUR_DEPLOYMENT_TOKEN_HERE" `
    --app-location "." `
    --output-location "." `
    --source $tempDir
```

### Option C: Using GitHub Actions (Recommended for updates)

1. Create a GitHub repository
2. Add `index.html` to folder `oauth_redirect/` in the repo
3. In Azure Portal → Your Static Web App → **"Deployment"** → **"GitHub"**
4. Authorize Azure to access your GitHub
5. Select repository and branch
6. Azure will auto-deploy on every push

## Step 5: Verify Deployment

Visit your app URL:
```
https://jbmarks-oauth-redirect.azurestaticapps.net/oauth_redirect?code=test123
```

It should redirect to: `jbmarks://oauth_redirect?code=test123`

## Update Your Configuration

1. **Update Config.kt:**
   ```kotlin
   const val BITRIX_REDIRECT_URI_HTTPS = "https://jbmarks-oauth-redirect.azurestaticapps.net/oauth_redirect"
   ```

2. **Update Bitrix24:**
   - Handler path: `https://jbmarks-oauth-redirect.azurestaticapps.net/oauth_redirect`

## Troubleshooting

### App name already taken
Change the name in all commands to something unique:
```powershell
$appName = "jbmarks-redirect-$(Get-Random -Maximum 99999)"
```

### Deployment failed
Check Azure Portal → Static Web App → **"Activity log"** for errors.

### Redirect not working
1. Verify `index.html` is at: `/oauth_redirect/index.html` or `/oauth_redirect/`
2. Check browser console for JavaScript errors
3. Test the URL directly in a browser
