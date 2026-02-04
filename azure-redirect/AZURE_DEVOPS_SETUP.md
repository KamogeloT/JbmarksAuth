# Azure DevOps Pipeline Setup Guide

This guide explains how to set up the Azure DevOps pipeline for automatic deployment.

## Prerequisites

1. **Azure DevOps Organization** and **Project**
2. **Azure Static Web App** already created
3. **Repository** connected to Azure DevOps

## Step 1: Get Azure Deployment Token

Get the deployment token from your Azure Static Web App:

```powershell
az staticwebapp secrets list `
    --name "jbmarks-oauth-redirect" `
    --resource-group "jbmarks-oauth-redirect-rg" `
    --query properties.apiKey -o tsv
```

**Copy this token** - you'll need it for the next step.

## Step 2: Create Variable Group (Recommended)

1. Go to your Azure DevOps project
2. Navigate to **Pipelines** → **Library**
3. Click **+ Variable group**
4. Name: `Azure-Static-Web-App`
5. Add variable:
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: Paste the token from Step 1
   - Check **Keep this value secret**
6. Click **Save**

### Alternative: Pipeline Variable

If you prefer not to use a variable group:

1. Go to **Pipelines** → **Pipelines** → Select your pipeline
2. Click **Edit** → **Variables**
3. Click **+ New variable**
4. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
5. Value: Paste the token
6. Check **Keep this value secret**
7. Click **OK** and **Save**

## Step 3: Create Pipeline

### Option A: Using YAML File (Recommended)

1. The `azure-pipelines.yml` file is already in the repository root
2. Go to **Pipelines** → **Pipelines** → **New pipeline**
3. Select your repository
4. Choose **Existing Azure Pipelines YAML file**
5. Select `azure-pipelines.yml` from the root
6. Click **Run** to test

### Option B: Classic Editor

1. Go to **Pipelines** → **Pipelines** → **New pipeline**
2. Select your repository
3. Choose **Starter pipeline** or **YAML**
4. Replace the content with the `azure-pipelines.yml` file content
5. Save and run

## Step 4: Configure Pipeline Permissions

If using a variable group:

1. Go to **Pipelines** → **Library**
2. Select your variable group
3. Click **Security**
4. Add your pipeline (or build service account)
5. Grant **Use** permission

## Step 5: Test Deployment

1. Make a change to `azure-redirect/index.html`
2. Commit and push:
   ```bash
   git add azure-redirect/index.html
   git commit -m "Test Azure DevOps pipeline"
   git push origin main
   ```
3. Go to **Pipelines** → **Pipelines**
4. Watch the pipeline run automatically
5. Verify deployment in Azure Portal

## Pipeline Features

- **Automatic trigger**: Runs on push to `main` or `master` branch
- **Path filter**: Only runs when files in `azure-redirect/` change
- **Pull request support**: Can be configured to run on PRs
- **Manual trigger**: Can be run manually from Azure DevOps

## Troubleshooting

### Pipeline fails with "Variable not found"
- Verify the variable group or pipeline variable is created
- Check that the variable name matches exactly: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Ensure permissions are set correctly

### Deployment fails with "Invalid token"
- Regenerate the deployment token:
  ```powershell
  az staticwebapp secrets list `
      --name "jbmarks-oauth-redirect" `
      --resource-group "jbmarks-oauth-redirect-rg" `
      --query properties.apiKey -o tsv
  ```
- Update the variable in Azure DevOps

### Pipeline doesn't trigger
- Check branch name (should be `main` or `master`)
- Verify path filter includes `azure-redirect/**`
- Check pipeline is enabled and not paused

## Next Steps

After successful deployment:

1. **Update Config.kt** with your Azure Static Web App URL
2. **Update Bitrix24** Local Application with the redirect URL
3. **Test the OAuth flow** in your Android app
