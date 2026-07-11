# RMRS — Records Management and Registry System

**JB Marks Local Municipality**

A comprehensive Records Management and Registry System integrated with Bitrix SDinMotion/Bitrix24 for document storage and authentication. Built for compliance with NARSSA principles and SANS ISO 16175-2:2014.

---

## 🏗️ Architecture

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend API | C# .NET Web API | .NET 8 |
| Frontend SPA | Angular (Standalone Components) | 17+ |
| Database | SQL Server | 2022 |
| ORM | Entity Framework Core | 8.x |
| Authentication | Bitrix OAuth 2.0 (SSO) | - |
| Document Storage | Bitrix REST API (Workgroup Drives) | - |
| PDF Generation | QuestPDF | - |
| Barcode/QR | ZXing.Net | - |
| Hosting | IIS / Kestrel on Windows Server | - |

---

## 📋 Features (12 Modules)

| # | Module | Description |
|---|--------|-------------|
| 1 | **Authentication** | Bitrix OAuth 2.0 SSO with token refresh and session management |
| 2 | **Department Mapping** | Map departments to Bitrix workgroup drives (fully configurable) |
| 3 | **File Plan** | Hierarchical classification (up to 5 levels) with retention rules |
| 4 | **Records Registry** | Register incoming/outgoing/internal records with auto-generated numbers |
| 5 | **Electronic Documents** | Upload to Bitrix with versioning, SHA-256 integrity verification |
| 6 | **Physical Records** | Barcode/QR tracking, location hierarchy, loans, bulk moves |
| 7 | **Retention & Disposal** | Automated retention calculation, multi-step disposal workflow |
| 8 | **Archive Transfer** | Transfer batches with manifest PDF generation |
| 9 | **Search & Retrieval** | Full-text search with role-based access filtering |
| 10 | **Security & RBAC** | 9 roles, department isolation, classification levels |
| 11 | **Audit & Compliance** | Immutable audit logs, compliance dashboards |
| 12 | **Reports & Admin** | PDF/Excel reports, system configuration, lookup tables |

---

## 👥 User Roles

| Role | Access Level |
|------|-------------|
| System Administrator | Full system access and configuration |
| Records Manager | File plan, disposal initiation, reports |
| Registry Clerk | Record registration, documents, physical records |
| Department User | View department records, upload documents |
| Department Supervisor | Department oversight + all Dept User access |
| Compliance Officer | Disposal approval, compliance monitoring |
| Auditor | Read-only audit log access |
| Archivist | Archive transfer management |
| Executive Viewer | Executive dashboards and reports |

---

## 📁 Project Structure

```
RMRS/
├── src/                          # .NET 8 Backend
│   ├── Rmrs.sln                  # Solution file
│   ├── Rmrs.Api/                 # Web API (Controllers, Middleware)
│   ├── Rmrs.Application/        # Business Logic (Services, DTOs)
│   ├── Rmrs.Domain/             # Domain Entities & Interfaces
│   ├── Rmrs.Infrastructure/     # EF Core, Bitrix Client, Persistence
│   └── Rmrs.Tests/              # Unit & Property-Based Tests
├── client/                       # Angular 17+ SPA
│   ├── src/app/
│   │   ├── core/                # Auth, API, Layout (singletons)
│   │   ├── shared/              # Reusable components, pipes, models
│   │   └── features/           # 12 lazy-loaded feature modules
│   └── angular.json
├── .kiro/specs/                  # Specification documents
│   └── rmrs-bitrix-integration/
│       ├── requirements.md      # 14 detailed requirements
│       ├── design.md            # Full technical design
│       └── tasks.md             # Implementation plan (27 tasks)
├── TRAINING-MANUAL.md           # Complete user training manual
├── DEPLOYMENT.md                # Production deployment guide
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- .NET 8 SDK
- Node.js 18+ and npm
- SQL Server 2022
- Access to Bitrix SDinMotion platform (jbmarks.sdinmotion.co.za)

### Backend Setup

```bash
cd src
dotnet restore
dotnet build
```

### Database Setup

```bash
cd src/Rmrs.Infrastructure
dotnet ef database update --startup-project ../Rmrs.Api
```

### Frontend Setup

```bash
cd client
npm install
ng serve
```

### Configuration

1. Copy `appsettings.json` and configure:
   - SQL Server connection string
   - Bitrix OAuth credentials (Client ID, Secret, URLs)
   - CORS origins

2. Configure department-to-workgroup mappings via Admin API

---

## 🔐 Security

- **Authentication:** Bitrix OAuth 2.0 with encrypted token storage
- **Authorization:** Role-based access control (RBAC) with 9 roles
- **Data Protection:** TLS 1.2+, SQL Server TDE, .NET Data Protection API
- **Sessions:** HttpOnly, Secure, SameSite=Strict cookies; 30-min inactivity timeout
- **Audit:** Immutable append-only audit logs (DENY UPDATE/DELETE)
- **Classification:** 4-tier classification levels (Public → Restricted)

---

## 📊 Registry Number Format

```
RMRS/{DEPT}/{YYYY}/{SEQ:00000}
```

Example: `RMRS/FIN/2024/00042`

- **RMRS** — System prefix
- **DEPT** — Department code
- **YYYY** — Year
- **SEQ** — Zero-padded sequential number (resets yearly per department)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [TRAINING-MANUAL.md](TRAINING-MANUAL.md) | Complete user training manual for all 9 roles |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide (IIS, SSL, DB, backups) |
| [.kiro/specs/](/.kiro/specs/rmrs-bitrix-integration/) | Technical specifications (requirements, design, tasks) |

---

## 🏛️ Compliance

- **NARSSA** — National Archives and Records Service of South Africa
- **SANS ISO 16175-2:2014** — Managing electronic records
- **WCAG 2.1 Level AA** — Accessibility compliance

---

## 📞 Support

- **System URL:** https://records.sdinmotion.co.za
- **Platform:** jbmarks.sdinmotion.co.za (Bitrix SDinMotion)
- **Contact:** System Administration Team, JB Marks Local Municipality

---

## License

Proprietary — JB Marks Local Municipality. All rights reserved.
