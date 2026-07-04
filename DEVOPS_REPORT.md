# JBmarks — DevOps Report

**Date:** 28 May 2026  
**Project:** JBmarks Android App + Backend Services  
**Author:** DevOps Assessment  

---

## 1. Executive Summary

JBmarks is an Android application integrating with Bitrix24 CRM via OAuth. The system consists of a mobile client, a token exchange backend, and an OAuth redirect service. The current DevOps posture is **early-stage** — functional deployments exist but lack maturity in automation, security, monitoring, and release management.

**Overall Maturity Rating: 2/5** (Basic — deployments work but significant gaps exist)

---

## 2. System Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│  Android App    │────▶│  Token Exchange Server   │────▶│  Bitrix24 OAuth     │
│  (JBmarks)      │     │  (Railway - Express.js)  │     │  (oauth.bitrix.info)│
└────────┬────────┘     └──────────────────────────┘     └─────────────────────┘
         │
         │  OAuth Redirect Flow
         ▼
┌──────────────────────────────────────┐
│  OAuth Redirect Page                 │
│  (Azure Static Web Apps - SA North)  │
│  HTTPS → jbmarks://oauth_redirect   │
└──────────────────────────────────────┘
```

### Components

| Component | Platform | URL | Runtime |
|-----------|----------|-----|---------|
| Android App | Local / Play Store (TBD) | N/A | Kotlin, Jetpack Compose, SDK 36 |
| Token Exchange Server | Railway | `jbmarksauth-production.up.railway.app` | Node.js 18+, Express 4.x |
| OAuth Redirect | Azure Static Web Apps | `jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net` | Static HTML |
| BFF API (legacy) | Azure App Service | `jbmarks-bff-api.azurewebsites.net` | Node.js |
| Bitrix24 Portal | Bitrix24 Cloud | `jbmarks.sdinmotion.co.za` | Managed SaaS |

---

## 3. CI/CD Pipeline Assessment

### 3.1 Current State

| Pipeline | Trigger | Target | Status |
|----------|---------|--------|--------|
| GitHub Actions (OAuth Redirect) | Push to `main` on `azure-redirect/**` | Azure Static Web Apps | ✅ Active |
| Azure Pipelines (Static + BFF) | Push to `main`/`master` | Azure Static Web Apps + App Service | ⚠️ Configured, unclear if active |
| Railway Auto-Deploy | Push to connected branch | Railway | ✅ Active (via GitHub integration) |
| Android Build/Release | **None** | — | ❌ Missing |

### 3.2 Gaps

- **No Android CI/CD pipeline** — No automated build, lint, test, or APK/AAB generation
- **No automated testing** — No unit test, integration test, or UI test execution in any pipeline
- **Duplicate pipelines** — Both GitHub Actions and Azure Pipelines deploy the same OAuth redirect page
- **No staging environment** — All deployments go directly to production
- **No release versioning** — App is at `versionCode = 1`, `versionName = "1.0"` with no release process

---

## 4. Security Assessment

### 4.1 Critical Issues 🔴

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Client secret in source code | **CRITICAL** | `Config.kt` line 18 | Full OAuth compromise if repo is public |
| Webhook token in source code | **HIGH** | `Config.kt` line 63 | Unauthorized API access |
| Secrets in documentation | **HIGH** | `DEPLOYMENT_GUIDE.md` | Credential exposure |
| CORS allows all origins (`*`) | **MEDIUM** | `server-simple.js` line 20 | Token exchange abuse |
| No API rate limiting | **MEDIUM** | `server-simple.js` | DDoS / brute-force risk |
| No input sanitization | **MEDIUM** | `server-simple.js` | Injection risk |

### 4.2 Recommendations

1. **Immediately** rotate `BITRIX_CLIENT_SECRET` and `WEBHOOK_TOKEN`
2. Move secrets to Android `BuildConfig` fields sourced from `local.properties` (excluded from git)
3. Restrict CORS to known origins (your app's user-agent or specific domains)
4. Add rate limiting (e.g., `express-rate-limit`) to the token exchange endpoint
5. Add input validation/sanitization for `oauth_code` and `domain` parameters
6. Use GitHub repository secrets + environment variables for all CI/CD pipelines

---

## 5. Infrastructure Assessment

### 5.1 Current Hosting

| Service | Provider | Region | Cost | SLA |
|---------|----------|--------|------|-----|
| Token Exchange | Railway | Auto (US) | Free tier ($5 credit) | No SLA |
| OAuth Redirect | Azure Static Web Apps | South Africa North | Free tier | 99.95% |
| BFF API (legacy) | Azure App Service | Unknown | Pay-as-you-go | 99.95% |

### 5.2 Observations

- **Multi-cloud sprawl** — Services split across Railway and Azure with no clear strategy
- **Free tier dependency** — Token exchange server runs on Railway's free tier (limited to $5/month)
- **No redundancy** — Single instance of each service, no failover
- **No monitoring/alerting** — No health check monitoring, no error alerting
- **Legacy services** — BFF API and Azure Function v2 URLs still referenced in `Config.kt` but appear unused
- **Region mismatch** — OAuth redirect in South Africa North, token exchange likely in US (Railway default)

### 5.3 Recommendations

1. Consolidate to a single cloud provider (Azure recommended since OAuth redirect is already there)
2. Add uptime monitoring (e.g., UptimeRobot, Better Uptime) for the token exchange endpoint
3. Remove legacy/unused service references from `Config.kt`
4. Consider Azure App Service for token exchange to keep everything in SA North region (lower latency)

---

## 6. Build & Release Process

### 6.1 Android App

| Aspect | Current State | Recommended |
|--------|---------------|-------------|
| Build automation | ❌ Manual (Android Studio) | GitHub Actions with Gradle |
| Code signing | ❌ Not configured | Keystore in CI secrets |
| Version management | ❌ Hardcoded `1.0` | Semantic versioning + auto-increment |
| Distribution | ❌ None | Firebase App Distribution → Play Store |
| ProGuard/R8 | ❌ Disabled (`isMinifyEnabled = false`) | Enable for release builds |

### 6.2 Backend (Token Exchange)

| Aspect | Current State | Recommended |
|--------|---------------|-------------|
| Build automation | ✅ Railway auto-deploy | Keep |
| Health checks | ✅ `/health` endpoint | Add monitoring |
| Rollback | ⚠️ Railway supports it | Document rollback procedure |
| Logging | ⚠️ Console.log only | Structured logging + log aggregation |
| Error tracking | ❌ None | Add Sentry or similar |

---

## 7. Environment Management

### 7.1 Current Environments

| Environment | Exists? | Purpose |
|-------------|---------|---------|
| Local Development | ✅ | `localhost:3000` for server |
| Staging/QA | ❌ | — |
| Production | ✅ | Railway + Azure |

### 7.2 Recommendations

- Add a staging environment on Railway (separate project) for pre-production testing
- Use environment-specific `Config.kt` values via build flavors (`debug` vs `release`)
- Implement feature flags for gradual rollout

---

## 8. Monitoring & Observability

### 8.1 Current State: ❌ None

- No application performance monitoring (APM)
- No error tracking
- No log aggregation
- No uptime monitoring
- No alerting

### 8.2 Recommended Stack (Free/Low-Cost)

| Tool | Purpose | Cost |
|------|---------|------|
| UptimeRobot | Endpoint monitoring | Free (50 monitors) |
| Sentry | Error tracking (server + Android) | Free (5K events/month) |
| Railway Logs | Server log viewing | Included |
| Firebase Crashlytics | Android crash reporting | Free |
| Firebase Analytics | App usage analytics | Free |

---

## 9. Disaster Recovery

### 9.1 Current State: ❌ No DR Plan

- No documented recovery procedures
- No backup strategy for configuration
- Single points of failure on all services
- No runbook for incident response

### 9.2 Recommendations

1. Document recovery steps for each service
2. Store all infrastructure config as code (IaC)
3. Maintain a secrets backup in a secure vault (Azure Key Vault or similar)
4. Define RTO/RPO targets

---

## 10. Action Plan (Priority Order)

### Immediate (This Week) 🔴

- [ ] Rotate exposed `BITRIX_CLIENT_SECRET` in Bitrix24 portal
- [ ] Rotate exposed `WEBHOOK_TOKEN`
- [ ] Remove hardcoded secrets from `Config.kt` — use `BuildConfig` + `local.properties`
- [ ] Remove secrets from `DEPLOYMENT_GUIDE.md` — use placeholders
- [ ] Add `.env` to `.gitignore` if not already present

### Short-Term (2 Weeks) 🟡

- [ ] Add GitHub Actions workflow for Android build (`./gradlew assembleDebug`)
- [ ] Add `express-rate-limit` to `server-simple.js`
- [ ] Restrict CORS to specific origins
- [ ] Set up UptimeRobot for `/health` endpoint monitoring
- [ ] Add Firebase Crashlytics to Android app
- [ ] Remove legacy BFF API and Azure Function v2 references from `Config.kt`

### Medium-Term (1 Month) 🟢

- [ ] Implement Android release pipeline (build → sign → distribute)
- [ ] Add staging environment
- [ ] Add Sentry error tracking to token exchange server
- [ ] Enable ProGuard/R8 for release builds
- [ ] Implement build flavors for debug/release configurations
- [ ] Add automated lint checks to CI

### Long-Term (Quarter) 🔵

- [ ] Consolidate infrastructure to single provider
- [ ] Implement proper secrets management (Azure Key Vault)
- [ ] Add integration tests to CI pipeline
- [ ] Create incident response runbook
- [ ] Set up structured logging and log aggregation
- [ ] Implement blue-green or canary deployments

---

## 11. Appendix

### A. Repository Structure (DevOps-relevant files)

```
JBmarks/
├── .github/workflows/
│   └── deploy-azure-redirect.yml    # GitHub Actions - OAuth redirect deploy
├── azure-pipelines.yml              # Azure DevOps pipeline (Static + BFF)
├── railway.json                     # Railway deployment config
├── render.yaml                      # Render deployment config
├── Procfile                         # Heroku-compatible process file
├── package.json                     # Node.js server dependencies
├── server-simple.js                 # Token exchange Express server
├── app/
│   ├── build.gradle.kts             # Android build config
│   └── src/main/
│       ├── AndroidManifest.xml      # App permissions & activities
│       └── java/.../config/Config.kt # App configuration (contains secrets!)
└── DEPLOYMENT_GUIDE.md              # Deployment documentation
```

### B. Key Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Token exchange uptime | > 99.5% | UptimeRobot |
| Token exchange latency (p95) | < 2s | Railway metrics |
| Android crash-free rate | > 99% | Firebase Crashlytics |
| Build success rate | > 95% | GitHub Actions |
| Mean time to deploy | < 10 min | CI/CD pipeline |

---

*End of Report*
