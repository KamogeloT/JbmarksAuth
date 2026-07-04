# Migration Guide: JBmarks → Client's Azure Subscription

## Current Infrastructure Summary

| Resource | Type | Location | Resource Group |
|----------|------|----------|----------------|
| vm-sdinmotion-bitrix | VM (Standard_DS1_v2, Linux) | South Africa North | RG-BITRIX-PROD |
| jbmarksoauthredirecb0ce | Storage Account (Standard_LRS) | South Africa North | jbmarks-oauth-redirect-rg-za |
| jbmarks-bff-api | App Service (Node.js 20) | South Africa North | jbmarks-oauth-redirect-rg-za |
| jbmarks-oauth-redirect | Static Web App | West Europe | jbmarks-oauth-redirect-rg-za |
| jbmarks-oauth-redirect | App Service | South Africa North | jbmarks-oauth-redirect-rg |

---

## Pre-Migration Status (Our Side — DONE)

- [x] VM snapshot created: `snap-sdinmotion-bitrix-migration-20260608`
- [x] Snapshot SAS URL generated (valid 24h from creation)
- [x] All app service env vars documented
- [x] NSG rules documented
- [x] Storage container structure documented
- [x] APK + version.json + install.html backed up
- [x] Server code in repo (server-simple.js)

---

## What the Client Needs to Provide

| # | Item | Notes |
|---|------|-------|
| 1 | Azure Subscription ID | Target subscription |
| 2 | Azure Tenant ID | For cross-tenant access |
| 3 | Location preference | Recommend: South Africa North |
| 4 | Contributor role granted to your account OR a service principal | Needed to create resources |

---

## Migration Steps (Run on Client's Subscription)

### Step 1: Create Resource Groups

```bash
az group create --name RG-BITRIX-PROD --location southafricanorth
az group create --name RG-JBMARKS-APP --location southafricanorth
```

### Step 2: Migrate the Bitrix24 VM

```bash
# 1. Copy snapshot VHD to client's storage account
az storage account create --name jbmarksmigration --resource-group RG-BITRIX-PROD --location southafricanorth --sku Standard_LRS

DEST_KEY=$(az storage account keys list --account-name jbmarksmigration --resource-group RG-BITRIX-PROD --query "[0].value" -o tsv)

az storage container create --name vhds --account-name jbmarksmigration --account-key "$DEST_KEY"

# Copy from SAS URL (replace with fresh SAS if expired)
az storage blob copy start \
  --destination-blob bitrix-os-disk.vhd \
  --destination-container vhds \
  --account-name jbmarksmigration \
  --account-key "$DEST_KEY" \
  --source-uri "<SNAPSHOT_SAS_URL>"

# 2. Create managed disk from the copied VHD
az disk create \
  --resource-group RG-BITRIX-PROD \
  --name vm-bitrix-osdisk \
  --location southafricanorth \
  --sku Standard_LRS \
  --source "https://jbmarksmigration.blob.core.windows.net/vhds/bitrix-os-disk.vhd"

# 3. Create the VM from the disk
az network vnet create --resource-group RG-BITRIX-PROD --name vnet-bitrix --address-prefix 10.0.0.0/16 --subnet-name default --subnet-prefix 10.0.0.0/24 --location southafricanorth
az network nsg create --resource-group RG-BITRIX-PROD --name nsg-bitrix --location southafricanorth
az network nsg rule create --resource-group RG-BITRIX-PROD --nsg-name nsg-bitrix --name Allow-SSH --priority 1000 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes '*' --destination-port-ranges 22
az network nsg rule create --resource-group RG-BITRIX-PROD --nsg-name nsg-bitrix --name Allow-HTTP --priority 1010 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes '*' --destination-port-ranges 80
az network nsg rule create --resource-group RG-BITRIX-PROD --nsg-name nsg-bitrix --name Allow-HTTPS --priority 1020 --direction Inbound --access Allow --protocol Tcp --source-address-prefixes '*' --destination-port-ranges 443
az network public-ip create --resource-group RG-BITRIX-PROD --name pip-bitrix --sku Standard --allocation-method Static --location southafricanorth
az network nic create --resource-group RG-BITRIX-PROD --name nic-bitrix --vnet-name vnet-bitrix --subnet default --network-security-group nsg-bitrix --public-ip-address pip-bitrix --location southafricanorth

az vm create \
  --resource-group RG-BITRIX-PROD \
  --name vm-bitrix \
  --attach-os-disk vm-bitrix-osdisk \
  --os-type Linux \
  --nics nic-bitrix \
  --size Standard_DS1_v2 \
  --location southafricanorth
```

### Step 3: Create Storage Account (APK Hosting)

```bash
az storage account create \
  --name jbmarksreleases \
  --resource-group RG-JBMARKS-APP \
  --location southafricanorth \
  --sku Standard_LRS \
  --kind StorageV2

STORAGE_KEY=$(az storage account keys list --account-name jbmarksreleases --resource-group RG-JBMARKS-APP --query "[0].value" -o tsv)

az storage container create \
  --name jbmarks-releases \
  --account-name jbmarksreleases \
  --account-key "$STORAGE_KEY" \
  --public-access blob

# Copy blobs from old account
# APK
az storage blob copy start \
  --destination-blob jbmarks.apk \
  --destination-container jbmarks-releases \
  --account-name jbmarksreleases \
  --account-key "$STORAGE_KEY" \
  --source-uri "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/jbmarks.apk"

# version.json
az storage blob copy start \
  --destination-blob version.json \
  --destination-container jbmarks-releases \
  --account-name jbmarksreleases \
  --account-key "$STORAGE_KEY" \
  --source-uri "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/version.json"

# install.html
az storage blob copy start \
  --destination-blob install.html \
  --destination-container jbmarks-releases \
  --account-name jbmarksreleases \
  --account-key "$STORAGE_KEY" \
  --source-uri "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/install.html"
```

### Step 4: Create App Service (Token Exchange / BFF API)

```bash
# Create App Service Plan
az appservice plan create \
  --name asp-jbmarks \
  --resource-group RG-JBMARKS-APP \
  --location southafricanorth \
  --sku B1 \
  --is-linux

# Create the BFF API app
az webapp create \
  --name jbmarks-bff-api-client \
  --resource-group RG-JBMARKS-APP \
  --plan asp-jbmarks \
  --runtime "NODE:20-lts"

# Set environment variables
az webapp config appsettings set \
  --name jbmarks-bff-api-client \
  --resource-group RG-JBMARKS-APP \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    BITRIX_CLIENT_ID=local.69526f981da4a0.86875975 \
    BITRIX_CLIENT_SECRET=<CLIENT_SECRET> \
    BITRIX_REDIRECT_URI=<NEW_REDIRECT_URL> \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### Step 5: Deploy Code to App Service

```bash
# From the project root, zip the server code
cd azure-bff-api
zip -r ../bff-deploy.zip . -x "node_modules/*"
cd ..

az webapp deployment source config-zip \
  --name jbmarks-bff-api-client \
  --resource-group RG-JBMARKS-APP \
  --src bff-deploy.zip
```

### Step 6: Create OAuth Redirect (Static Web App or App Service)

```bash
az webapp create \
  --name jbmarks-oauth-redirect-client \
  --resource-group RG-JBMARKS-APP \
  --plan asp-jbmarks \
  --runtime "NODE:20-lts"

# Deploy the redirect page
cd azure-redirect
zip -r ../redirect-deploy.zip oauth_redirect/ index.html
cd ..

az webapp deployment source config-zip \
  --name jbmarks-oauth-redirect-client \
  --resource-group RG-JBMARKS-APP \
  --src redirect-deploy.zip
```

---

## Post-Migration Updates

After all resources are created on the client's Azure, update these:

| # | What | Current Value | New Value |
|---|------|--------------|-----------|
| 1 | APK URL in `version.json` | `jbmarksoauthredirecb0ce.blob...` | `jbmarksreleases.blob...` (new account) |
| 2 | APK URL in Android app Config.kt | Same as above | New blob URL |
| 3 | OAuth redirect URL | `jbmarks-oauth-redirect-e9dee...azurewebsites.net` | New app service URL |
| 4 | Token exchange URL in Config.kt | Railway URL | New app service URL or keep Railway |
| 5 | Bitrix24 portal URL | Points to old VM IP `4.221.173.148` | New VM's public IP |
| 6 | DNS records (if any) | `jbmarks.sdinmotion.co.za` | Update A record to new IP |
| 7 | Bitrix24 OAuth app settings | Old redirect URI | New redirect URI |
| 8 | FCM token registration URL | Railway URL | Keep Railway OR point to new app service |

---

## VM Specs (for recreating)

| Setting | Value |
|---------|-------|
| Size | Standard_DS1_v2 |
| OS | Linux |
| Location | South Africa North |
| Public IP | Static, Standard SKU |
| NSG Rules | SSH (22), HTTP (80), HTTPS (443) — open to all |
| Current IP | 4.221.173.148 |

---

## Storage Account Contents

| Container | Access | Files |
|-----------|--------|-------|
| jbmarks-releases | Public (blob) | jbmarks.apk (20.7MB), version.json, install.html |

---

## App Service Config: jbmarks-bff-api

| Setting | Value |
|---------|-------|
| NODE_ENV | production |
| PORT | 8080 |
| BITRIX_CLIENT_ID | local.69526f981da4a0.86875975 |
| BITRIX_CLIENT_SECRET | (stored securely — get from current config) |
| BITRIX_REDIRECT_URI | https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect |
| SCM_DO_BUILD_DURING_DEPLOYMENT | true |
| WEBSITE_NODE_DEFAULT_VERSION | 20-lts |
