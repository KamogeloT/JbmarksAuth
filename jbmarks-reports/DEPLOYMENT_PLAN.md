# JBmarks Reports — Deployment Plan

## Overview

Deploy the JBmarks Reports Dashboard as a standalone web app accessible via browser. The app connects directly to the Bitrix24 REST API from the client side — no backend database or server-side API needed for Phase 1.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Browser (Desktop / Mobile)                       │
│  https://reports.jbmarks.sdinmotion.co.za         │
│                                                   │
│  Next.js Static App (HTML/JS/CSS)                 │
│  - Login → stores token in localStorage           │
│  - Reports → calls Bitrix24 API directly          │
│  - Export → generates Excel/PDF client-side       │
└────────────────────┬─────────────────────────────┘
                     │ HTTPS (REST API calls)
                     ▼
┌──────────────────────────────────────────────────┐
│  Bitrix24 Portal                                  │
│  https://jbmarks.sdinmotion.co.za/rest/...        │
│                                                   │
│  tasks.task.list, user.get, sonet_group, etc.     │
└──────────────────────────────────────────────────┘
```

No middleware server required. The app is purely static (HTML + JS) deployed to a CDN/static host.

---

## Recommended Hosting: Azure Static Web Apps

### Why Azure Static Web Apps?

| Reason | Detail |
|--------|--------|
| Already in use | OAuth redirect page is already hosted here |
| Free tier | Generous free plan (100GB bandwidth, custom domains, SSL) |
| Same subscription | Azure subscription 1 (`41a1a89c-...`), account `admin@t3ssystems.co.za` |
| Custom domain | Can attach `reports.jbmarks.sdinmotion.co.za` |
| CI/CD built-in | Auto-deploys from Azure DevOps or GitHub on push |
| Global CDN | Fast load times for South Africa and beyond |

---

## Step-by-Step Deployment

### Phase 1: Initial Setup (Day 1)

#### 1.1 Create Azure DevOps Repo

```powershell
# From the jbmarks-reports folder
git init
git add .
git commit -m "Initial commit: JBmarks Reports Dashboard"

# Create repo in Azure DevOps (via portal or CLI)
# Then push:
git remote add origin https://T3Systems@dev.azure.com/T3Systems/JBMARKS/_git/jbmarks-reports
git push -u origin main
```

#### 1.2 Create Azure Static Web App

**Via Azure Portal:**
1. Go to portal.azure.com → Create resource → Static Web App
2. Settings:
   - **Name:** `jbmarks-reports`
   - **Hosting plan:** Free
   - **Region:** South Africa North (closest to users)
   - **Source:** Azure DevOps
   - **Organization:** T3Systems
   - **Project:** JBMARKS
   - **Repository:** jbmarks-reports
   - **Branch:** main
   - **Build preset:** Next.js
   - **App location:** `/`
   - **Output location:** `.next/standalone`

**Via Azure CLI:**
```bash
az staticwebapp create \
  --name jbmarks-reports \
  --resource-group jbmarks-rg \
  --location "southafricanorth" \
  --sku Free
```

#### 1.3 Configure Build

The app uses `output: 'standalone'` in `next.config.js`. For Azure Static Web Apps with Next.js, add a build config:

Create `staticwebapp.config.json` in the project root:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "globalHeaders": {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff"
  }
}
```

#### 1.4 First Deploy

Push to `main` — Azure Static Web Apps auto-builds and deploys:
```bash
git push origin main
```

Expected build time: ~2 minutes.

---

### Phase 2: Custom Domain (Day 2)

#### 2.1 Add Custom Domain

1. In Azure Portal → Static Web App → Custom domains
2. Add: `reports.jbmarks.sdinmotion.co.za`
3. Azure provides a CNAME record to add to DNS

#### 2.2 DNS Configuration

Add to your DNS provider (wherever `sdinmotion.co.za` is managed):

```
Type:  CNAME
Name:  reports.jbmarks
Value: <your-app>.azurestaticapps.net
TTL:   3600
```

SSL certificate is provisioned automatically by Azure.

---

### Phase 3: CI/CD Pipeline (Day 2-3)

#### 3.1 Azure DevOps Pipeline

Azure Static Web Apps creates a pipeline automatically when linked to DevOps. If manual setup is needed:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: |
      npm ci
      npm run build
    displayName: 'Build'

  - task: AzureStaticWebApp@0
    inputs:
      app_location: '/'
      output_location: '.next'
      azure_static_web_apps_api_token: $(DEPLOYMENT_TOKEN)
```

#### 3.2 Get Deployment Token

```bash
az staticwebapp secrets list --name jbmarks-reports --query "properties.apiKey" -o tsv
```

Add this as a pipeline variable `DEPLOYMENT_TOKEN` (secret).

---

## Environment Configuration

### Required for Production

No server-side environment variables needed — the app authenticates client-side via the login form. However, you may want to set defaults:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_DEFAULT_PORTAL` | `https://jbmarks.sdinmotion.co.za` | Pre-fill login form |

### Bitrix24 Webhook Setup

For users to access reports, they need a webhook token. Create a shared one:

1. Go to Bitrix24 → Developer resources → Inbound webhooks
2. Create webhook with permissions: `task`, `user`, `sonet_group`, `calendar`, `im`
3. Share the webhook URL with authorized report viewers

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token in browser | localStorage only, cleared on logout. Warn users not to share tokens. |
| CORS | Bitrix24 allows REST API calls from any origin for authenticated requests |
| No server secrets | All auth is client-side — no secrets in the deployment |
| Access control | Only users with valid Bitrix24 tokens can see data |
| HTTPS | Enforced by Azure Static Web Apps + custom domain SSL |

### Future: Add Server-Side Auth (Phase 2)

If tighter security is needed later:
- Add Azure Functions API route for OAuth flow
- Users click "Login with Bitrix24" → OAuth redirect → server stores token in secure httpOnly cookie
- No webhook URLs shared directly

---

## Rollback Plan

Azure Static Web Apps keeps previous deployments:

```bash
# List deployments
az staticwebapp environment list --name jbmarks-reports

# Rollback is automatic — revert the git commit and push
git revert HEAD
git push origin main
```

---

## Monitoring

| What | How |
|------|-----|
| Uptime | Azure Static Web Apps has built-in monitoring |
| Errors | Browser console (client-side app) |
| Usage | Azure Portal → Static Web App → Metrics (requests, bandwidth) |
| Future | Add Application Insights for detailed analytics |

---

## Timeline

| Day | Task | Owner |
|-----|------|-------|
| 1 | Create Azure DevOps repo, push code | Dev |
| 1 | Create Azure Static Web App, link to repo | Dev |
| 1 | Verify auto-deploy works | Dev |
| 2 | Configure custom domain + DNS | Dev + Admin |
| 2 | Create Bitrix24 webhook for report users | Admin |
| 2 | Test full flow (login → reports → export) | QA |
| 3 | Share access with team | Admin |
| 3 | Document webhook creation for new users | Dev |

---

## Cost

| Resource | Cost |
|----------|------|
| Azure Static Web Apps (Free tier) | $0/month |
| Custom domain SSL | Included |
| Bandwidth (up to 100GB) | Included |
| **Total** | **$0/month** |

If traffic exceeds free tier (unlikely for internal tool): Standard plan is ~$9/month.

---

## Post-Deployment Checklist

- [ ] Code pushed to Azure DevOps repo
- [ ] Azure Static Web App created and linked
- [ ] Auto-deploy pipeline working (push to main = live)
- [ ] Custom domain configured (`reports.jbmarks.sdinmotion.co.za`)
- [ ] SSL certificate active
- [ ] Bitrix24 webhook created with required permissions
- [ ] Login tested with webhook URL
- [ ] All 4 reports load with live data
- [ ] Excel export works
- [ ] PDF export works
- [ ] Shared access link sent to team
- [ ] Rollback procedure documented

---

## Access URL (after deployment)

**Temporary:** `https://jbmarks-reports.azurestaticapps.net`  
**Production:** `https://reports.jbmarks.sdinmotion.co.za`
