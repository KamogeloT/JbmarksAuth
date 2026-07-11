# Development Hours Quotation
## JBmarks / SDiM Ecosystem — Excluding SDinMotion Community App

**Prepared by:** T3S Systems  
**Client:** JB Marks Local Municipality  
**Date:** July 2026  
**Development Period:** January 2026 – July 2026 (~6 months)

---

## Summary

| # | Deliverable | Estimated Hours |
|---|---|---|
| 1 | JBmarks Native Android App (Kotlin/Compose) | 180 |
| 2 | Azure BFF API (OAuth Token Exchange) | 24 |
| 3 | Azure OAuth Redirect Service | 16 |
| 4 | Reports Dashboard | 56 |
| 5 | IT Support Dashboard | 48 |
| 6 | IT Helpdesk Portal | 40 |
| 7 | Network Monitor (+ Azure Function API) | 32 |
| 8 | Bitrix24 Landing Page & Login Template | 16 |
| 9 | RMRS — Records Management & Registry System | 480 |
| 10 | Azure Infrastructure & Deployment Setup | 40 |
| 11 | DevOps, CI/CD & Documentation | 28 |
| | **TOTAL** | **960 hours** |

---

## Detailed Breakdown

### 1. JBmarks Native Android App — 180 hours

Full native Android application built with Kotlin and Jetpack Compose, integrating with Bitrix24 (SDiM) via REST API.

| Feature / Module | Hours |
|---|---|
| Project setup, architecture (MVVM), navigation | 16 |
| OAuth2 authentication (WebView login, token management, refresh) | 24 |
| Tasks module (list, detail, search, sort, pagination) | 28 |
| Task delegation to workgroup members | 12 |
| Time tracking (start/stop, log hours on tasks) | 10 |
| Comments system (post text + photo attachments) | 14 |
| Activity Feed module | 10 |
| Chat module | 12 |
| Calendar module (workgroup events) | 10 |
| Notifications tab (badge, workgroup invites) | 12 |
| Employee directory | 6 |
| Profile screen (user info, workgroups, version) | 6 |
| In-app update system (Azure Blob version check, auto-download) | 10 |
| Firebase Cloud Messaging (push notifications) | 10 |
| Shared KMM module (Kotlin Multiplatform) | 8 |
| UI/UX polish, splash screen, branding, responsive layouts | 12 |
| Bug fixes & testing (photo upload, crashes, auth issues) | 16 |
| **Subtotal** | **180** |

**Complexity notes:**
- 110 Kotlin source files across 19 modules
- Full Retrofit/OkHttp networking layer with interceptors
- Secure token storage (EncryptedSharedPreferences)
- Firebase integration for push notifications
- Custom image compression and ExifInterface rotation handling

---

### 2. Azure BFF API (Backend-for-Frontend) — 24 hours

Node.js/Express API deployed on Azure for secure OAuth token exchange between the mobile app and Bitrix24.

| Feature / Module | Hours |
|---|---|
| Express server setup with security middleware | 4 |
| OAuth token exchange route (authorization code → access token) | 8 |
| Azure Key Vault integration for secrets | 4 |
| Rate limiting, error handling, logging middleware | 4 |
| Deployment scripts & Azure App Service config | 4 |
| **Subtotal** | **24** |

---

### 3. Azure OAuth Redirect Service — 16 hours

Handles the OAuth callback redirect from Bitrix24 back to the mobile app.

| Feature / Module | Hours |
|---|---|
| OAuth redirect HTML handler (captures auth code) | 4 |
| Token exchange Azure Function (serverless) | 8 |
| Deployment (Azure Static Web App + Function) | 4 |
| **Subtotal** | **16** |

---

### 4. Reports Dashboard — 56 hours

Next.js application providing management reporting with drill-down analytics, charts, and exports.

| Feature / Module | Hours |
|---|---|
| Next.js project setup, layout, auth (webhook) | 6 |
| Bitrix24 API service layer (task fetching, pagination) | 8 |
| Task Summary Report (cards, charts, drill-down) | 10 |
| Overdue & Deadlines Report | 8 |
| Time Tracking Report | 8 |
| Team Workload Report | 8 |
| Drill-down panel (click stat → filtered table) | 6 |
| Export to Excel (ExcelJS) + PDF (jsPDF) | 8 |
| Date range filters with presets | 4 |
| Responsive design, UI polish | 4 |
| Custom domain setup (reports.sdinmotion.co.za) | 2 |
| Workgroup filtering fix (client-side enforcement) | 2 |
| **Subtotal** | **56** |

---

### 5. IT Support Dashboard — 48 hours

Next.js application for IT technicians to manage support tickets from their Bitrix24 workgroup.

| Feature / Module | Hours |
|---|---|
| Next.js project setup, layout, routing | 4 |
| Authentication (SDiM workgroup 14 member check) | 6 |
| Dashboard overview (stats, charts with Recharts) | 8 |
| Ticket queue (list, filters, auto-refresh 30s) | 10 |
| Ticket detail view (status, comments, assignment) | 10 |
| Assign/reassign technicians | 4 |
| Notification sound system | 2 |
| SDiM API integration layer | 6 |
| Email notification service architecture | 4 |
| Responsive design | 4 |
| **Subtotal** | **48** |

---

### 6. IT Helpdesk Portal — 40 hours

Vite/React application for end users to log and track IT support tickets.

| Feature / Module | Hours |
|---|---|
| Vite + React + Tailwind project setup | 3 |
| Login system (SDiM username lookup via webhook) | 6 |
| Home page with navigation | 3 |
| Ticket creation form (category, priority, description) | 10 |
| My Tickets view (list with status, auto-refresh) | 8 |
| Track Ticket (real-time status from SDiM) | 6 |
| SDiM service integration layer | 6 |
| Responsive mobile-first design | 4 |
| **Subtotal** | **40** |

---

### 7. Network Monitor — 32 hours

Real-time infrastructure monitoring with visual dashboard and server-side health checks.

| Feature / Module | Hours |
|---|---|
| Vite + React project setup | 2 |
| Dashboard UI (grid, color-coded status, auto-refresh) | 8 |
| Azure Function API (Node.js — server-side ping) | 8 |
| Configuration panel (add/edit/delete nodes) | 6 |
| Alert sound system (node down notification) | 2 |
| LocalStorage persistence for node config | 2 |
| Azure Static Web App + Function deployment | 4 |
| **Subtotal** | **32** |

---

### 8. Bitrix24 Landing Page & Login Template — 16 hours

Custom themed portal homepage and login screen for the SDiM Bitrix24 instance.

| Feature / Module | Hours |
|---|---|
| Landing page design (green/gold municipal branding) | 6 |
| CSS template override for Bitrix24 | 4 |
| Custom login page (PHP header/footer, branded) | 4 |
| Deployment to production VM via SCP/SSH | 2 |
| **Subtotal** | **16** |

---

### 9. RMRS — Records Management & Registry System — 480 hours

Full enterprise records management system built with .NET 8 (C#) and Angular 17, integrating with Bitrix24/SDiM for authentication and document storage. 12 modules, 9 user roles, NARSSA-compliant.

| Feature / Module | Hours |
|---|---|
| **Backend Architecture & Setup** | |
| Solution architecture (Clean Architecture: API, Application, Domain, Infrastructure) | 16 |
| Entity Framework Core setup, DB schema, migrations | 24 |
| Bitrix OAuth 2.0 SSO integration (token exchange, refresh, session) | 20 |
| Bitrix REST API client (document upload, workgroup drives) | 16 |
| RBAC middleware (9 roles, department isolation, classification levels) | 20 |
| **Module 1: Authentication** | |
| Login flow, token management, session handling, encrypted storage | 16 |
| **Module 2: Department Mapping** | |
| Admin configuration UI, Bitrix workgroup drive linking | 12 |
| **Module 3: File Plan** | |
| Hierarchical classification (5 levels), retention rules, CRUD | 32 |
| **Module 4: Records Registry** | |
| Incoming/outgoing/internal registration, auto-numbering (RMRS/DEPT/YYYY/SEQ) | 28 |
| **Module 5: Electronic Documents** | |
| Upload to Bitrix, versioning, SHA-256 integrity, metadata | 24 |
| **Module 6: Physical Records** | |
| Barcode/QR generation (ZXing.Net), location hierarchy, loans, bulk moves | 32 |
| **Module 7: Retention & Disposal** | |
| Automated retention calculation, multi-step disposal workflow, approvals | 28 |
| **Module 8: Archive Transfer** | |
| Transfer batches, manifest PDF generation (QuestPDF) | 20 |
| **Module 9: Search & Retrieval** | |
| Full-text search, role-based filtering, advanced queries | 20 |
| **Module 10: Security & RBAC** | |
| 9-role permission matrix, department isolation, classification enforcement | 24 |
| **Module 11: Audit & Compliance** | |
| Immutable audit logs (DENY UPDATE/DELETE), compliance dashboards | 24 |
| **Module 12: Reports & Admin** | |
| PDF/Excel report generation, system config, lookup tables | 24 |
| **Angular 17 Frontend** | |
| Project setup, routing, lazy-loaded feature modules (12) | 16 |
| Core module (auth guards, interceptors, layout) | 12 |
| Shared module (reusable components, pipes, models) | 12 |
| Feature UIs (forms, tables, search, dashboards per module) | 56 |
| Responsive design & WCAG 2.1 Level AA accessibility | 16 |
| **Testing & Documentation** | |
| Unit tests & integration tests | 20 |
| Training manual (complete for all 9 roles) | 12 |
| API reference documentation | 8 |
| Deployment guide (IIS, SSL, DB backups) | 4 |
| **Subtotal** | **480** |

**Complexity notes:**
- Clean Architecture (.NET): 4 project layers + test project
- 12 fully independent feature modules (Angular lazy-loaded)
- SQL Server 2022 with EF Core Code-First migrations
- Bitrix24 REST API integration for SSO + document storage
- QuestPDF for manifest/report generation
- ZXing.Net for barcode/QR code generation and scanning
- NARSSA & SANS ISO 16175-2:2014 compliance requirements
- Immutable audit trail with database-level DELETE/UPDATE protection

---

### 10. Azure Infrastructure & Deployment Setup — 40 hours

### 10. Azure Infrastructure & Deployment Setup — 40 hours

Setting up and configuring all Azure resources, deployment pipelines, and hosting.

| Feature / Module | Hours |
|---|---|
| Azure Static Web Apps provisioning (4 apps) | 8 |
| Azure Blob Storage (APK distribution + version.json) | 4 |
| Azure Function App (Network Monitor API) | 4 |
| Azure Key Vault configuration | 3 |
| Custom domain + SSL (reports.sdinmotion.co.za, records.sdinmotion.co.za) | 4 |
| VM configuration (Dev + Prod Bitrix servers) | 4 |
| Windows Server / IIS setup for RMRS | 5 |
| SQL Server provisioning for RMRS | 4 |
| Deployment scripts (PowerShell, Bash, Azure CLI) | 4 |
| **Subtotal** | **40** |

---

### 11. DevOps, CI/CD & Documentation — 28 hours

| Feature / Module | Hours |
|---|---|
| Azure DevOps repository setup & branching strategy | 4 |
| GitHub Actions workflows | 3 |
| Azure Pipelines (azure-pipelines.yml) | 4 |
| Project manual & system documentation | 8 |
| Deployment guides per application | 5 |
| Version management & release notes | 4 |
| **Subtotal** | **28** |

---

## Rate Card

| Item | Value |
|---|---|
| Total Development Hours | 960 |
| Hourly Rate | R _____ |
| **Total Excl. VAT** | **R _____** |
| VAT (15%) | R _____ |
| **Total Incl. VAT** | **R _____** |

---

## Notes

1. Hours are estimated as equivalent **human developer hours** — reflecting the effort a skilled developer would reasonably spend to design, implement, test, and deploy each component.
2. This excludes the SDinMotion Community App (Capacitor/React) as requested.
3. The RMRS system accounts for the largest portion (480h) due to the complexity of an enterprise records management system with 12 modules, 9 roles, compliance requirements, and dual-stack (.NET + Angular).
4. The JBmarks Android App (180h) is the second-largest due to native Kotlin/Compose development with full Bitrix24 API integration.
5. Infrastructure hours cover initial setup only — ongoing maintenance/support is billed separately.
6. Development period spans November 2025 through July 2026 (~8 months).

---

## Deliverables Summary

- ✅ RMRS — Records Management & Registry System (.NET 8 + Angular 17 + SQL Server)
- ✅ Native Android App (Kotlin/Compose) — Staff task management
- ✅ IT Support Dashboard (Next.js) — Technician ticket management
- ✅ IT Helpdesk Portal (React) — End-user ticket logging
- ✅ Reports Dashboard (Next.js) — Management analytics & exports
- ✅ Network Monitor (React + Azure Function) — Infrastructure health
- ✅ Bitrix24 Landing Page & Login Template — Portal branding
- ✅ OAuth Infrastructure (BFF API + Redirect) — Secure authentication
- ✅ Azure & Windows Server Hosting — Full cloud infrastructure
- ✅ Documentation — System manual, training manual, deployment guides, API reference
