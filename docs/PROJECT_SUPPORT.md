# JBmarks — Project support handbook

**Audience:** Engineering and operations supporting JBmarks (iOS, Android, auth, and backends).  
**Last updated:** 2026-04-25  
**Repository:** Azure DevOps `T3Systems/JBMARKS` (local path: `JBMARKS`).

---

## 1. Security notice (read first)

- **This document does not contain live passwords, API keys, or private keys.** Support staff should store real values in a **password manager**, **Azure Key Vault**, or **hosting provider secret stores** (Railway variables, App Service configuration), not in shared PDFs or git-tracked Markdown.
- Your repo includes deployment guides that may have contained **example or historical** environment variable blocks. If any **real** `BITRIX_CLIENT_SECRET`, APNs `.p8` material, or database URLs were ever committed, treat them as **compromised**: **rotate** those credentials in Bitrix24, Apple Developer, and Azure/Railway, then remove sensitive values from tracked files and consider `git filter-repo` for history cleanup.

---

## 2. Product overview

JBmarks integrates with **Bitrix24** for tasks, calendar, chat, and related features. Clients include:

| Surface | Location | Notes |
|--------|----------|--------|
| iOS | `JbmrksIOs/` | SwiftUI; `JbmrksIOs.xcworkspace` |
| Android | `app/`, `shared/` | Kotlin / Compose |
| BFF API | `azure-bff-api/` | Node/Express; Bitrix OAuth for Android |
| OAuth redirect | `azure-redirect/` | Static / Functions redirect to app deep link |
| Token exchange (legacy/docs) | Root `DEPLOYMENT_GUIDE.md`, server scripts | Railway/Render options described in repo |

---

## 3. Repository map

| Path | Purpose |
|------|---------|
| `JbmrksIOs/JbmrksIOs.xcodeproj` / `.xcworkspace` | iOS app |
| `JbmrksIOs/JbmrksIOs/Services/BitrixApiClient.swift` | Bitrix REST client (token in query `auth`) |
| `JbmrksIOs/JbmrksIOs/Config/PushNotificationConfig.swift` | Push registration base URLs |
| `app/src/main/java/com/example/jbmarks/` | Android feature modules |
| `azure-bff-api/` | BFF: token exchange, optional Key Vault |
| `azure-redirect/` | OAuth redirect HTML / patterns |
| `RAILWAY_ENV_VARS_SETUP.md` | Railway + APNs env var **names** (do not duplicate secrets here) |

---

## 4. Builds and releases

### iOS (TestFlight / App Store)

1. Open `JbmrksIOs/JbmrksIOs.xcworkspace` in Xcode.  
2. Target **Signing & Capabilities**: correct team; bundle id matches App Store Connect (project uses `jbmarks.JbmrksIOs`).  
3. Increment **Build** (`CURRENT_PROJECT_VERSION`) for each upload; keep **Version** (`MARKETING_VERSION`) aligned with marketing.  
4. **Product → Archive → Distribute** to App Store Connect → TestFlight.

### Android

- Standard Gradle assemble; Play Console internal/open testing as per your org process.  
- OAuth and BFF URLs must match the environment you are testing against (see config packages under `app/.../config` per your branch).

---

## 5. Environments and public endpoints (non-secret)

These URLs appear in source or docs as **service endpoints** (not necessarily secret). Confirm current production values in your deployment dashboard before changing clients.

| Service | Typical use |
|---------|-------------|
| BFF (Azure App Service) | Example host pattern: `jbmarks-bff-api.azurewebsites.net` — push register path under `/api/push/`. |
| Auth / push backend (Railway) | Example host pattern: `jbmarksauth-production.up.railway.app` — health and APIs per deployment. |
| Bitrix portal | Users’ portal base URL (e.g. org-specific); tokens are per-user OAuth, not hardcoded in app binaries for production flows. |
| OAuth redirect | Azure Static Web App or App Service URL registered in Bitrix24 OAuth app settings. |

**Deep link (Android/iOS OAuth return):** scheme `jbmarks://oauth_redirect` (see `azure-redirect/README.md`).

---

## 6. Secrets and credentials — inventory (names only)

Fill real values in your **secret store**; use this table as a checklist.

| Secret / artifact | Where it belongs | Rotation triggers |
|-------------------|------------------|---------------------|
| `BITRIX_CLIENT_ID` | BFF `.env` / Azure App Settings / Railway | Bitrix app recreated |
| `BITRIX_CLIENT_SECRET` | Same as above — **never** in mobile app for production token exchange (use BFF) | Leak, staff offboarding, annual |
| `BITRIX_REDIRECT_URI` | Must match Bitrix OAuth app + deployed redirect page | URL or hosting change |
| User **access** / **refresh** tokens | Secure storage on device (`TokenStorage` pattern) | Logout, refresh failure, compromise |
| **APNs** `.p8` key, Key ID, Team ID | Apple Developer + Railway (or your push server) env vars | Key revoked or rotated |
| **FCM** server key / service account (if used) | Backend only | Google Cloud policy |
| Azure **subscription** / **tenant** / **service principal** | CI and deployment operators | Key rotation policy |
| **Database** connection strings | Railway / Azure — backend only | Credential rotation |
| **App Store Connect** API key (optional CI) | CI secret store | Apple key rotation |
| Android **keystore** passwords | Maintainer secure storage — not in git | Signing cert change |

---

## 7. OAuth and token flow (support mental model)

1. User starts login; app opens Bitrix OAuth in browser / ASWebAuthenticationSession.  
2. Bitrix redirects to your **HTTPS redirect** endpoint.  
3. Redirect server sends user back to app via **`jbmarks://oauth_redirect?...`**.  
4. App exchanges `code` via **BFF** (`azure-bff-api`) — BFF holds `BITRIX_CLIENT_SECRET`.  
5. App stores tokens locally; Bitrix REST calls use portal `baseUrl` + `auth` token (see `BitrixApiClient`).

**Common failures:** redirect URI mismatch, clock skew, expired refresh token, wrong BFF URL in Android `Config`, or Bitrix app permissions.

---

## 8. Push notifications (iOS)

- Registration URLs are configured in `PushNotificationConfig.swift` (production vs BFF).  
- Server must have valid **APNs** credentials (see Railway env var doc for **variable names**).  
- Support checks: device token received, HTTP 200 from register endpoint, APNs logs in backend.

---

## 9. Operational troubleshooting

| Symptom | Checks |
|---------|--------|
| 401 / invalid_grant on token exchange | Client id/secret, redirect URI, code reuse, clock |
| Bitrix `error` in JSON body | Bitrix method permissions, token scope, filter params |
| iOS archive fails | Signing, provisioning, bundle id, Xcode version |
| Android build fails | JDK, Gradle, `local.properties` SDK path (local machine) |
| Push not delivered | APNs env on server, bundle id match, user notification permission |

---

## 10. Escalation and ownership

Document here (offline):

- **Product owner:** _______________________  
- **Primary engineer:** _______________________  
- **Azure subscription owner:** _______________________  
- **Apple Developer account admin:** _______________________  
- **Bitrix24 portal admin:** _______________________

---

## 11. Related internal documents

- `DEPLOYMENT_GUIDE.md` — token exchange server deployment options (**sanitize** before sharing externally).  
- `RAILWAY_ENV_VARS_SETUP.md` — APNs-related Railway variable **names**.  
- `azure-bff-api/README.md` — BFF local run and Azure deploy.  
- `azure-redirect/README.md` — redirect hosting options.

---

## 12. Offline credential worksheet (print and fill by hand)

_Use only on paper or in a vault — not in git._

```
BITRIX_CLIENT_ID:        _________________________________
BITRIX_CLIENT_SECRET:    _________________________________
BITRIX_REDIRECT_URI:     _________________________________
BFF_BASE_URL:            _________________________________
TOKEN_EXCHANGE_URL:      _________________________________
RAILWAY_PROJECT_URL:       _________________________________
APNS_KEY_ID:             _________________________________
APNS_TEAM_ID:            _________________________________
APNS_BUNDLE_ID:          _________________________________
```

---

*End of handbook.*
