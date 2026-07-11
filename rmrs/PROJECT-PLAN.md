# RMRS Project Plan

## Current Status

The project is **scaffolded and partially implemented**. All 12 modules have their structure in place (controllers, services, entities, Angular components). The key infrastructure (EF Core, Bitrix client, auth flow, Serilog, Swagger) is configured and compiling.

**What's done (✅):** Project structure, domain entities, DB schema/migrations, API controllers (skeleton), Angular routing, core services framework
**What's partially done ([~]):** Most module services have logic started but not complete
**What's not done (❌):** Property tests, frontend component implementations (forms/tables), end-to-end integration testing, production deployment

---

## Recommended Approach: Vertical Slices

Build **one complete module end-to-end** (backend + frontend + test) before moving to the next. This gives you a working feature to demo after each phase, rather than a half-built system.

---

## Phase 1: Foundation (Week 1-2)
*Get the system running with login and basic navigation*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 1 | Set up SQL Server database, run EF Core migration | You | 🔴 |
| 2 | Configure `appsettings.json` with DB connection string + Bitrix OAuth credentials | You | 🔴 |
| 3 | Complete Auth module — Bitrix OAuth login, token refresh, session management | Me | 🔴 |
| 4 | Build Angular login page + auth guard + role guard | Me | 🔴 |
| 5 | Build shell layout (sidebar nav, header, content area) | Me | 🔴 |
| 6 | Verify: user can log in via Bitrix, session persists, roles load | Both | 🔴 |

**Deliverable:** User can log in, see their role, and navigate the app shell.

---

## Phase 2: Department Mapping + File Plan (Week 3-4)
*Set up the organizational structure that everything else depends on*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 7 | Complete Department Mapping service + API (CRUD, Bitrix validation) | Me | 🔴 |
| 8 | Build Department Mapping UI (admin page) | Me | 🔴 |
| 9 | Complete File Plan service + API (tree CRUD, retention rules) | Me | 🔴 |
| 10 | Build File Plan tree UI (view, create, edit, deactivate) | Me | 🔴 |
| 11 | Map real departments to Bitrix workgroups (data entry) | You | 🟡 |
| 12 | Create initial file plan structure (data entry) | You | 🟡 |

**Deliverable:** Admin can manage departments and file plan. Foundation for records.

---

## Phase 3: Records Registry (Week 5-6)
*The core feature — registering records*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 13 | Complete registry number generation (atomic sequences, yearly reset) | Me | 🔴 |
| 14 | Complete record registration service (incoming/outgoing/internal) | Me | 🔴 |
| 15 | Build record registration forms (3 types) | Me | 🔴 |
| 16 | Build record list + detail views | Me | 🔴 |
| 17 | Integration test: register a record, verify number format | Both | 🟡 |

**Deliverable:** Users can register records and get auto-generated registry numbers.

---

## Phase 4: Electronic Documents (Week 7-8)
*Upload/download documents via Bitrix*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 18 | Complete document upload service (SHA-256, Bitrix upload, folder structure) | Me | 🔴 |
| 19 | Complete document versioning + integrity verification | Me | 🟡 |
| 20 | Build document upload UI (drag-drop, progress, version history) | Me | 🔴 |
| 21 | Test: upload document, verify checksum, download | Both | 🟡 |

**Deliverable:** Users can attach documents to records, stored in Bitrix workgroup drives.

---

## Phase 5: Physical Records (Week 9-10)
*Barcode tracking and loans*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 22 | Complete barcode/QR generation + location tracking | Me | 🔴 |
| 23 | Complete loan management + overdue notification job | Me | 🟡 |
| 24 | Build physical records UI (scan, move, loan, print labels) | Me | 🔴 |
| 25 | Test: scan barcode, move record, create/return loan | Both | 🟡 |

**Deliverable:** Physical files can be tracked with barcodes, loaned out, and monitored.

---

## Phase 6: Disposal & Archive (Week 11-12)
*Records lifecycle completion*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 26 | Complete retention calculation background job | Me | 🔴 |
| 27 | Complete disposal workflow (initiate → approve → execute) | Me | 🔴 |
| 28 | Complete archive transfer batch workflow | Me | 🟡 |
| 29 | Build disposal UI (candidates, batches, certificates) | Me | 🔴 |
| 30 | Build archive transfer UI (batches, manifest PDF) | Me | 🟡 |

**Deliverable:** Records managers can dispose of expired records and transfer to archives.

---

## Phase 7: Search, Reports & Admin (Week 13-14)
*Cross-cutting features*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 31 | Complete full-text search with access filtering | Me | 🔴 |
| 32 | Complete report generation (PDF/Excel) | Me | 🟡 |
| 33 | Build search UI + advanced filters | Me | 🔴 |
| 34 | Build role-based dashboards (3 types) | Me | 🟡 |
| 35 | Build admin UI (config, lookups, roles, audit log viewer) | Me | 🟡 |

**Deliverable:** Full search capability, reports, and admin management.

---

## Phase 8: Testing & Hardening (Week 15-16)
*Quality assurance*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 36 | Write property-based tests for all modules (41 properties defined) | Me | 🟡 |
| 37 | Security audit — penetration test key flows | Both | 🟡 |
| 38 | Performance test — search <3s, report gen <10s, concurrent users | Me | 🟡 |
| 39 | Accessibility audit (WCAG 2.1 AA) | Me | 🟢 |
| 40 | Fix all issues found in testing | Me | 🔴 |

**Deliverable:** Production-ready, tested system.

---

## Phase 9: Deployment (Week 17)
*Go live*

| # | Task | Owner | Priority |
|---|------|-------|----------|
| 41 | Set up Windows Server (IIS) on Azure | You | 🔴 |
| 42 | Deploy SQL Server database | You | 🔴 |
| 43 | Deploy .NET API + Angular build | Me | 🔴 |
| 44 | Configure SSL certificates | You | 🔴 |
| 45 | Configure Bitrix OAuth callback URLs for production | You | 🟡 |
| 46 | User training (refer to TRAINING-MANUAL.md) | You | 🟡 |
| 47 | Go-live monitoring (first week) | Both | 🔴 |

**Deliverable:** System live at `https://records.sdinmotion.co.za`

---

## Prerequisites (You need to provide)

| # | Item | When needed |
|---|------|-------------|
| 1 | SQL Server 2022 instance (Azure SQL or VM) | Phase 1 |
| 2 | Bitrix OAuth app credentials for RMRS | Phase 1 |
| 3 | Department list + Bitrix workgroup IDs | Phase 2 |
| 4 | Initial file plan structure (classification codes) | Phase 2 |
| 5 | Windows Server for hosting (IIS) | Phase 9 |
| 6 | SSL certificate for `records.sdinmotion.co.za` | Phase 9 |

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 2 weeks | Login + navigation working |
| 2. Departments + File Plan | 2 weeks | Org structure configured |
| 3. Records Registry | 2 weeks | Record registration live |
| 4. Documents | 2 weeks | File upload/download via Bitrix |
| 5. Physical Records | 2 weeks | Barcode tracking + loans |
| 6. Disposal & Archive | 2 weeks | Records lifecycle complete |
| 7. Search & Reports | 2 weeks | Full search + dashboards |
| 8. Testing | 2 weeks | Quality assurance |
| 9. Deployment | 1 week | Go live |
| **Total** | **~17 weeks** | **Full system** |

---

## Quick Wins (Can start immediately)

If you want visible progress fast, Phase 1 (login) and Phase 3 (record registration) give the most impactful demos. Phase 2 (departments/file plan) is a prerequisite for Phase 3 though — so the order above is optimal.

---

## How to Start

1. You: Set up SQL Server and give me the connection string
2. Me: Complete the auth module and get login working
3. We go from there phase by phase

Ready when you are.
