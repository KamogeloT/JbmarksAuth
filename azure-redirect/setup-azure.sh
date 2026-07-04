#!/bin/bash
# Azure Static Web App Setup Script for JBmarks OAuth Redirect
# Run this script to create and deploy the redirect server

# Configuration - UPDATE THESE VALUES
RESOURCE_GROUP_NAME="jbmarks-oauth-redirect-rg"
STATIC_WEB_APP_NAME="jbmarks-oauth-redirect"
LOCATION="eastus"  # Change to your preferred region (e.g., westeurope, eastus2)
DEPLOYMENT_TOKEN=""  # Will be generated after app creation

echo "🚀 Setting up Azure Static Web App for OAuth Redirect..."

# Step 1: Login to Azure (if not already logged in)
echo "📝 Step 1: Checking Azure login..."
az account show > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Azure..."
    az login
fi

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Using subscription: $SUBSCRIPTION_ID"

# Step 2: Create Resource Group
echo "📦 Step 2: Creating resource group..."
az group create \
    --name $RESOURCE_GROUP_NAME \
    --location $LOCATION

# Step 3: Create Static Web App
echo "🌐 Step 3: Creating Static Web App..."
az staticwebapp create \
    --name $STATIC_WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP_NAME \
    --location $LOCATION \
    --sku Free

# Step 4: Get deployment token
echo "🔑 Step 4: Getting deployment token..."
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
    --name $STATIC_WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP_NAME \
    --query properties.apiKey -o tsv)

echo ""
echo "✅ Static Web App created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Your app URL: https://${STATIC_WEB_APP_NAME}.azurestaticapps.net"
echo "2. Redirect endpoint: https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect"
echo "3. Deploy the index.html file using one of these methods:"
echo ""
echo "   Option A - Using Azure CLI (recommended):"
echo "   az staticwebapp appsettings set --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP_NAME --setting-value DEPLOYMENT_TOKEN=$DEPLOYMENT_TOKEN"
echo "   az staticwebapp deployment source sync --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP_NAME"
echo ""
echo "   Option B - Manual upload via Azure Portal:"
echo "   1. Go to: https://portal.azure.com"
echo "   2. Find your Static Web App: $STATIC_WEB_APP_NAME"
echo "   3. Go to 'Overview' → Click 'Deployments' → Click 'Add'"
echo "   4. Upload index.html and set path to '/oauth_redirect/'"
echo ""
echo "   Option C - Using GitHub Actions (if connected to repo):"
echo "   Push index.html to your repository and Azure will auto-deploy"
echo ""
echo "🔐 Update your Config.kt with:"
echo "   BITRIX_REDIRECT_URI_HTTPS = \"https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect\""
echo ""
echo "📝 Update Bitrix24 Local Application:"
echo "   Handler path: https://${STATIC_WEB_APP_NAME}.azurestaticapps.net/oauth_redirect"
