# Azure Migration Plan: T3S Systems → Client Tenant

## Source Subscription
- **Tenant:** Default Directory (admint3ssystemsco.onmicrosoft.com)
- **Subscription:** Azure subscription 1 (41a1a89c-2a50-44b3-b917-d54b517783c2)
- **Admin:** admin@t3ssystems.co.za

## Target
- Client's Azure tenant (different tenant entirely)

---

## Exported Artifacts (in this folder)

| File | Contents |
|------|----------|
| appsettings-bff-api.json | App settings for jbmarks-bff-api |
| appsettings-oauth-redirect.json | App settings for jbmarks-oauth-redirect |
| appsettings-token-exchange-v3.json | App settings for token exchange function |
| arm-template-bitrix.json | ARM template for RG-BITRIX-PROD |
| arm-template-oauth-rg.json | ARM template for jbmarks-oauth-redirect-rg |
| arm-template-oauth-rg-za.json | ARM template for jbmarks-oauth-redirect-rg-za |
| config-bff-api.json | Site config for BFF API |
| config-oauth-redirect.json | Site config for OAuth redirect |
| connstrings-bff-api.json | Connection strings for BFF API |
| deployment-source-bff-api.json | Deployment source info |
| nsg-rules-bitrix.json | Firewall rules for Bitrix VM |
| static-webapp-config.json | Static Web App configuration |

---

## Resources to Migrate

### 1. Bitrix VM (vm-sdinmotion-bitrix)
- **Type:** Linux VM, Standard_DS1_v2 (1 vCPU, 3.5GB RAM)
- **Disk:** 30GB OS disk
- **IP:** 4.221.173.148
- **NSG Rules:** SSH (22), HTTP (80), HTTPS (443) — all open to internet
- **Snapshot created:** snap-sdinmotion-bitrix ✅

**Migration steps:**
1. ✅ Snapshot created (snap-sdinmotion-bitrix)
2. Export snapshot to VHD → storage account
3. Generate SAS URL for cross-tenant copy
4. In client tenant: copy VHD, create managed disk, create VM
5. Recreate VNet, NSG (SSH/HTTP/HTTPS), Public IP
6. Assign new public IP, update DNS

### 2. BFF API (jbmarks-bff-api)
- **Type:** App Service (Linux, Node 22 LTS)
- **Plan:** "Prod" (Always On enabled)
- **Key settings:**
  - BITRIX_CLIENT_ID: local.69526f981da4a0.86875975
  - BITRIX_CLIENT_SECRET: (exported)
  - BITRIX_REDIRECT_URI: points to OAuth redirect app
  - NODE_ENV: production
  - Port: 8080

**Migration steps:**
1. Create App Service Plan (Linux, B1 or higher for Always On)
2. Create App Service (Node 22 LTS)
3. Deploy code (from repo or zip download)
4. Apply app settings from appsettings-bff-api.json
5. Update BITRIX_REDIRECT_URI to new domain
6. Enable Always On

### 3. OAuth Redirect App (jbmarks-oauth-redirect) — App Service
- **Type:** App Service (Linux, Free tier F1)
- **Location:** South Africa North

**Migration steps:**
1. Create App Service Plan (Free F1 or Basic)
2. Create App Service
3. Deploy code
4. Apply app settings

### 4. Static Web App (jbmarks-oauth-redirect)
- **Type:** Azure Static Web App
- **URL:** calm-tree-0b9cdaa03.2.azurestaticapps.net
- **Location:** West Europe (CDN)

**Migration steps:**
1. Create Static Web App in client tenant
2. Link to source repo (GitHub)
3. Redeploy

### 5. Token Exchange Functions (v1, v2, v3)
- **Type:** Azure Functions (Node.js)
- **Function:** exchangeToken (HTTP trigger, POST)
- **Plan:** Consumption (ASP-jbmarksoauthredirectrgza-83b1)

**Migration steps:**
1. Create Function App in client tenant
2. Deploy function code (exchangeToken)
3. Apply app settings
4. Update function URLs in any calling apps

### 6. Storage Account (jbmarksoauthredirecb0ce)
- **Type:** General purpose v1
- **Contains:** Function app storage, jbmarks-releases blob container (public)

**Migration steps:**
1. Create storage account in client tenant
2. Copy blob containers (especially jbmarks-releases)
3. Link to new function apps

---

## Resources NOT to Migrate

| Resource | Reason |
|----------|--------|
| jbmarks-linux-agent (CI VM) | Your build infrastructure, keep in your tenant |
| NetworkWatcherRG | Auto-created, will be auto-created in client tenant |
| DefaultResourceGroup-JNB | Log Analytics, auto-created |
| Old bitrix networking (vnet-bitrix, pip-bitrix, nsg-bitrix, nic-bitrix) | Appears to be leftover from earlier setup |

---

## Post-Migration Checklist

- [ ] Update Bitrix24 OAuth app redirect URI to new Azure domain
- [ ] Update mobile app .env with new webhook/API URLs (if changed)
- [ ] Update DNS records if custom domains are used
- [ ] Test OAuth flow end-to-end
- [ ] Test BFF API connectivity
- [ ] Test Bitrix VM accessibility (SSH + web)
- [ ] Verify file uploads work through the mobile app
- [ ] Monitor for 30 days before decommissioning old resources

---

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Phase 1: Get client tenant access | 1 day |
| Phase 2: Migrate Bitrix VM | 2-3 hours |
| Phase 3: Migrate App Services | 1-2 hours |
| Phase 4: Migrate Static Web App | 30 min |
| Phase 5: Testing & DNS updates | 1 day |
| Phase 6: Monitoring period | 30 days |

---

## Prerequisites from Client

1. Azure subscription with Contributor access for you
2. Resource group(s) created or permission to create them
3. Preferred region (recommend: South Africa North for latency)
4. Custom domain info (if any)
5. DNS management access (to update records)
