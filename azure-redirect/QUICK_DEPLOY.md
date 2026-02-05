# Quick Deploy Guide - GitHub Actions

## One-Time Setup

### 1. Get Azure Deployment Token

```powershell
# Login to Azure
az login

# Get deployment token (replace with your app name and resource group)
az staticwebapp secrets list `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --query properties.apiKey -o tsv
```

### 2. Add GitHub Secret

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. Value: Paste the token from step 1
5. Click **Add secret**

## Deploy

Just push to main branch:

```bash
git add .
git commit -m "Update OAuth redirect"
git push origin main
```

The GitHub Actions workflow will automatically deploy!

## Manual Trigger

You can also trigger manually:
1. Go to **Actions** tab in GitHub
2. Select **Deploy Azure Static Web App - OAuth Redirect**
3. Click **Run workflow**

## Verify Deployment

After deployment completes:
1. Check the Actions tab for success ✅
2. Visit your Azure Static Web App URL
3. Test: `https://your-app.azurestaticapps.net/oauth_redirect?code=test123`
