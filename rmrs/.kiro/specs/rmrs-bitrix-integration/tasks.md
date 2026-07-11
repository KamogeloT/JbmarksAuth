# Implementation Plan: RMRS Bitrix Integration

## Overview

This plan implements a new Records Management and Registry System (RMRS) as a layered monolith (.NET 8 Web API backend + Angular 17+ SPA frontend) with SQL Server 2022. The system integrates with Bitrix SDinMotion for OAuth authentication and document storage. Tasks are organized for maximum concurrent development across 12 functional modules.

## Tasks

- [x] 1. Project Scaffolding and Infrastructure
  - [x] 1.1 Create .NET 8 solution structure with modular project layout
    - Create solution file `Rmrs.sln`
    - Create projects: `Rmrs.Api`, `Rmrs.Application`, `Rmrs.Domain`, `Rmrs.Infrastructure`, `Rmrs.Tests`
    - Add NuGet references: EF Core 8, Serilog, QuestPDF, ZXing.Net, Swashbuckle
    - Configure `Program.cs` with service registration, middleware pipeline, Swagger, and CORS
    - _Requirements: 14.4, 14.7_

  - [x] 1.2 Create Angular 17+ SPA project with standalone component architecture
    - Initialize Angular project with standalone components (no NgModules)
    - Create folder structure: `core/`, `shared/`, `features/`
    - Configure routing with lazy loading per feature
    - Set up HTTP interceptor for auth token injection
    - Set up HTTP interceptor for global error handling
    - _Requirements: 14.6_


  - [x] 1.3 Configure EF Core 8 DbContext, entity configurations, and migrations
    - Create `RmrsDbContext` with all entity DbSets
    - Create entity configurations (IEntityTypeConfiguration) for all tables
    - Configure the `AuditSaveChangesInterceptor` for automatic audit logging
    - Add initial migration with full schema (Users, Departments, FilePlanEntries, Records, Documents, etc.)
    - Configure full-text catalog and indexes
    - _Requirements: 11.1, 11.3, 14.2_

  - [x] 1.4 Implement centralized Bitrix API client (`IBitrixApiClient`)
    - Create `BitrixApiClient` implementing all Bitrix REST API operations
    - Implement `BitrixRetryPolicy` with exponential backoff (1s, 4s, 16s) for transient errors
    - Configure HttpClient with base URLs for Bitrix platform
    - Add logging for all Bitrix API calls
    - _Requirements: 1.2, 1.3, 5.5_

  - [x] 1.5 Implement shared infrastructure services
    - Create `ApiError` response model and global exception handler middleware
    - Create `UserContext` service for extracting current user from session
    - Create base controller with common response patterns
    - Configure Serilog with SQL Server sink
    - _Requirements: 14.1, 14.4_


- [~] 2. Checkpoint - Verify project scaffolding
  - Ensure solution builds, EF Core migration applies, Angular project compiles, and Swagger UI loads. Ask the user if questions arise.

- [ ] 3. Authentication Module (Rmrs.Auth)
  - [x] 3.1 Implement Bitrix OAuth 2.0 flow with `BitrixOAuthController`
    - Create `GET /auth/login` endpoint that redirects to Bitrix OAuth authorize URL
    - Create `GET /auth/bitrix/callback` endpoint that receives authorization code
    - Implement `TokenService.ExchangeCodeAsync` to exchange code for token pair
    - Store tokens encrypted via .NET Data Protection API in `UserTokens` table
    - _Requirements: 1.1, 1.2, 1.6_

  - [~] 3.2 Implement token refresh and session management
    - Implement `TokenService.GetValidAccessTokenAsync` with automatic refresh when expired
    - Implement `TokenService.RefreshTokenAsync` calling `oauth.bitrix.info/oauth/token`
    - On refresh failure, invalidate session and return 401
    - Create `SessionMiddleware` enforcing 30-minute inactivity timeout with sliding expiration
    - Store sessions in `UserSessions` table with HttpOnly, Secure, SameSite=Strict cookie
    - _Requirements: 1.3, 1.4, 10.7_


  - [~] 3.3 Implement user profile sync from Bitrix
    - Create `UserSyncService.SyncUserFromBitrixAsync` to fetch profile via `user.current` API
    - Create or update local `Users` record with Bitrix user ID, name, email, department
    - Create `GET /auth/me` endpoint returning current user profile
    - Create `POST /auth/logout` endpoint to invalidate session
    - _Requirements: 1.5_

  - [ ]*3.4 Write property tests for Authentication module
    - **Property 1: Token Refresh Before API Call** — verify expired tokens trigger refresh before proceeding
    - **Property 2: User Profile Sync Consistency** — verify local user matches Bitrix source profile
    - **Property 3: Token Encryption at Rest** — verify stored token values are not plaintext
    - **Property 37: Session Timeout Enforcement** — verify sessions expire after 30 min inactivity
    - **Validates: Requirements 1.3, 1.5, 1.6, 10.7**

- [ ] 4. Security and Access Control Module (Rmrs.Security)
  - [x] 4.1 Implement role-based authorization with custom policies
    - Define all 9 roles as constants: System_Administrator, Records_Manager, Registry_Clerk, Department_User, Department_Supervisor, Compliance_Officer, Auditor, Archivist, Executive_Viewer
    - Create custom `IAuthorizationHandler` implementations for each policy
    - Implement `ClassificationGuard` to enforce classification level checks
    - Implement `DepartmentIsolationFilter` to restrict department-scoped access
    - _Requirements: 10.1, 10.2, 10.3_


  - [~] 4.2 Implement role assignment and re-authentication
    - Create `SecurityController` with endpoints: `GET /users/{id}/roles`, `POST /users/{id}/roles`, `DELETE /users/{id}/roles/{roleName}`
    - Implement `RoleService` recording effective date, assigning admin, and justification
    - Create `ReAuthenticationMiddleware` challenging sensitive operations (disposal approval, role changes, config modifications)
    - Log unauthorized classification access attempts with user ID, record ID, timestamp, and action
    - _Requirements: 10.4, 10.5, 10.6_

  - [ ]*4.3 Write property tests for Security module
    - **Property 34: Access Control Enforcement** — verify department isolation and classification restrictions
    - **Property 36: Role Assignment Audit Trail** — verify effective date, admin ID, and justification are non-null
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.6**

- [ ] 5. Audit and Compliance Module (Rmrs.Audit)
  - [x] 5.1 Implement immutable audit logging with EF Core interceptor
    - Create `AuditSaveChangesInterceptor` capturing all entity create/update/delete operations
    - Record user ID, timestamp, action type, entity type, entity ID, previous value, new value, source IP
    - Configure SQL Server DENY UPDATE/DELETE on `AuditLogs` table for app user
    - Create `AuditLogService` with append-only write and query capabilities
    - _Requirements: 11.1, 11.2, 11.3_


  - [~] 5.2 Implement compliance dashboard and audit query endpoints
    - Create `AuditController` with `GET /audit/logs` (paginated, filterable query)
    - Create `GET /audit/compliance/metrics` returning pending disposals, overdue disposals, records approaching retention expiry, file plan coverage
    - Create `POST /audit/compliance/report` generating compliance report within 10 seconds for 12-month data
    - Enforce 10-year minimum retention for audit log entries
    - _Requirements: 11.4, 11.5, 11.6_

  - [ ]*5.3 Write property tests for Audit module
    - **Property 38: Comprehensive Audit Log Creation** — verify every CUD operation produces a complete audit entry
    - **Property 39: Audit Log Immutability** — verify UPDATE/DELETE attempts on audit logs are rejected
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [~] 6. Checkpoint - Verify core infrastructure modules
  - Ensure authentication flow works end-to-end, RBAC policies enforce correctly, and audit interceptor captures changes. Ask the user if questions arise.

- [ ] 7. Department Workgroup Mapping Module (Rmrs.DepartmentMapping)
  - [~] 7.1 Implement department mapping CRUD with Bitrix validation
    - Create `DepartmentMappingController` with full CRUD endpoints: `GET/POST/PUT/DELETE /departments`
    - Implement `DepartmentMappingService` with business logic
    - Create `POST /departments/{id}/validate` endpoint calling Bitrix `sonet_group.get` to confirm workgroup exists
    - Enforce one-to-one relationship (unique constraint on `BitrixWorkgroupId`)
    - Prevent deletion of mappings with associated records (return error with message)
    - Store department name, Bitrix workgroup ID, Bitrix drive ID, and creation timestamp
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


  - [ ]*7.2 Write property tests for Department Mapping module
    - **Property 4: Department-Workgroup One-to-One Mapping** — verify no two departments share a workgroup ID
    - **Property 5: Protected Deletion of Entities with Active Records** — verify deletion blocked when records exist
    - **Property 6: Department Mapping Data Completeness** — verify all required fields are non-null
    - **Validates: Requirements 2.3, 2.4, 2.5**

- [ ] 8. File Plan Management Module (Rmrs.FilePlan)
  - [~] 8.1 Implement hierarchical file plan CRUD
    - Create `FilePlanController` with endpoints: `GET /file-plan/tree`, `GET/POST/PUT /file-plan/entries`, `POST /file-plan/entries/{id}/deactivate`
    - Implement `FilePlanService` managing tree structure up to 5 levels
    - Require unique classification code, title, description, retention rule, and disposal authority reference
    - Prevent deletion of entries with active records (allow deactivation only)
    - On deactivation, block new records while retaining access to existing ones
    - Associate default classification level with each entry
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [~] 8.2 Implement retention rules management
    - Create `GET/POST /file-plan/retention-rules` endpoints
    - Implement `RetentionRuleEngine.CalculateExpiryDate` computing expiry from rule and creation date
    - Ensure modified retention rules apply only to records created after modification date
    - Implement in-memory caching of file plan tree with invalidation on changes
    - _Requirements: 3.6, 7.1_


  - [ ]*8.3 Write property tests for File Plan module
    - **Property 7: File Plan Tree Depth Constraint** — verify all entries have depth between 1 and 5
    - **Property 8: File Plan Entry Required Fields Validation** — verify missing fields cause rejection
    - **Property 9: Deactivated File Plan Entry Blocks New Records** — verify deactivated entries reject new records
    - **Property 10: Retention Rule Temporal Isolation** — verify modified rules only apply to future records
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.6**

- [ ] 9. Records Registry Module (Rmrs.Registry)
  - [~] 9.1 Implement registry number generation and record registration
    - Create `RecordsRegistryController` with endpoints: `POST /records/incoming`, `POST /records/outgoing`, `POST /records/internal`, `PUT /records/{id}`, `GET /records/{id}`
    - Implement `SequenceProvider` with atomic increment per department/year using `RegistrySequences` table
    - Implement `RegistryNumberGenerator` producing `RMRS/{DEPT}/{YYYY}/{SEQ:00000}` pattern
    - Reset sequence to 00001 at start of each calendar year per department
    - Enforce registry number uniqueness via database constraint
    - _Requirements: 4.1, 4.4, 4.6_

  - [~] 9.2 Implement record metadata capture and classification inheritance
    - Validate required metadata: record type, subject, sender/recipient, date, file plan classification code, responsible officer
    - For incoming records: capture external reference number, originating organization, correspondence date
    - Inherit classification level from file plan entry; allow override only to higher level
    - Calculate retention expiry date at registration time using `RetentionRuleEngine`
    - Create `GET /records/{id}/history` endpoint returning audit trail for the record
    - _Requirements: 4.2, 4.3, 4.5, 7.1_


  - [ ]*9.3 Write property tests for Records Registry module
    - **Property 11: Registry Number Format Compliance** — verify pattern matches `RMRS/{DEPT}/{YYYY}/{SEQ:00000}`
    - **Property 12: Record Registration Required Metadata Validation** — verify missing fields rejected
    - **Property 13: Classification Level Inheritance Floor** — verify level >= file plan default
    - **Property 14: Registry Number Global Uniqueness** — verify no duplicates across system
    - **Property 15: Yearly Sequence Reset** — verify first number in new year is 00001
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6**

- [ ] 10. Electronic Document Control Module (Rmrs.Documents)
  - [~] 10.1 Implement document upload with Bitrix integration
    - Create `DocumentController` with endpoints: `POST /records/{recordId}/documents`, `GET /documents/{id}/download`, `POST /documents/{id}/versions`
    - Implement `DocumentUploadService` orchestrating: validate size ≤ 100MB, compute SHA-256, ensure folder structure, upload to Bitrix, store metadata
    - Implement `BitrixFolderService.EnsureFolderStructureAsync` mirroring file plan hierarchy in workgroup drive
    - Implement retry logic: 3 attempts with exponential backoff (1s, 4s, 16s) for transient Bitrix failures
    - On all retries exhausted, notify user and log failure
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.7_

  - [~] 10.2 Implement document versioning and integrity verification
    - Implement `DocumentUploadService.UploadNewVersionAsync` creating version N+1 with timestamp, user, and checksum
    - Implement `ChecksumService.VerifyAsync` comparing stored checksum against current Bitrix file checksum
    - Create `POST /documents/{id}/verify` endpoint alerting on mismatch
    - Create `GET /documents/{id}/versions` and `GET /records/{recordId}/documents` list endpoints
    - _Requirements: 5.2, 5.3, 5.6_


  - [ ]*10.3 Write property tests for Document Control module
    - **Property 16: Document Checksum Round-Trip Integrity** — verify SHA-256 at upload matches verification
    - **Property 17: Document Version Monotonic Increment** — verify version N+1 with required fields
    - **Property 18: Upload Retry Bounded Attempts** — verify max 3 retries with correct delays
    - **Property 19: File Size Limit Enforcement** — verify >100MB rejected before Bitrix call
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.6, 5.7**

- [ ] 11. Physical Records Control Module (Rmrs.PhysicalRecords)
  - [~] 11.1 Implement barcode/QR generation and location tracking
    - Create `PhysicalRecordsController` with endpoints for location, movements, scanning, and labels
    - Implement `BarcodeGeneratorService` using ZXing.Net for barcode and QR code image generation
    - Implement `LocationService` managing storage hierarchy (building/floor/room/shelf/position)
    - Create `POST /physical-records/{id}/move` recording previous location, new location, timestamp, user
    - Create `POST /physical-records/bulk-move` for batch barcode scan operations
    - Create `GET /physical-records/scan/{barcode}` displaying current location, classification, custody history
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7_

  - [~] 11.2 Implement loan management and overdue notifications
    - Create `POST /physical-records/{id}/loan` recording borrower, loan date, expected return date
    - Create `POST /physical-records/{id}/return` recording actual return date
    - Create `GET /physical-records/overdue-loans` listing all overdue loans
    - Implement `OverdueLoanNotifier` background job (runs daily at 08:00) generating notifications
    - Create `GET/POST/PUT /storage-locations` for location hierarchy management
    - _Requirements: 6.5, 6.6_


  - [ ]*11.3 Write property tests for Physical Records module
    - **Property 20: Physical Record Barcode Uniqueness** — verify no two records share barcode values
    - **Property 21: Movement History Completeness** — verify move records contain all required fields
    - **Property 22: Loan Required Data** — verify borrower, loan date, expected return date are non-null
    - **Property 23: Overdue Loan Detection** — verify loans past expected date with null actual return are flagged
    - **Validates: Requirements 6.1, 6.4, 6.5, 6.6**

- [~] 12. Checkpoint - Verify core record management modules
  - Ensure record registration generates correct registry numbers, document upload/download works via Bitrix, physical record scanning functions correctly, and file plan tree navigation works. Ask the user if questions arise.

- [ ] 13. Retention and Disposal Module (Rmrs.Disposal)
  - [~] 13.1 Implement retention calculation and disposal candidate identification
    - Create `DisposalController` with endpoints: `GET /disposal/candidates`, `POST /disposal/batches`, `POST /disposal/batches/{id}/approve`, `POST /disposal/batches/{id}/execute`
    - Implement `RetentionCalculationJob` (IHostedService, daily at 02:00) identifying records past retention expiry
    - Add identified records to disposal candidates list and notify Records_Manager
    - Ensure disposal certificates and audit logs are never marked as disposal candidates
    - _Requirements: 7.1, 7.2, 7.7_


  - [~] 13.2 Implement disposal workflow with approval and execution
    - Implement multi-step workflow: initiate (Records_Manager) → approve (Compliance_Officer with re-auth) → execute
    - Require valid Disposal_Authority reference and Compliance_Officer approval before execution
    - On execution: delete files from Bitrix via REST API, remove file references, retain metadata
    - If Bitrix file deletion fails, mark record as "disposal pending" and log for manual intervention
    - Generate disposal certificate PDF (using QuestPDF) containing record list, authority reference, approver, date
    - Create `GET /disposal/batches/{id}/certificate` endpoint for certificate download
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [ ]*13.3 Write property tests for Disposal module
    - **Property 24: Retention Expiry Calculation** — verify expiry = creation date + Y years + M months
    - **Property 25: Disposal Candidate Identification** — verify expired active records appear as candidates
    - **Property 26: Disposal Requires Authority and Approval** — verify execution blocked without both
    - **Property 27: Disposal Certificate Completeness** — verify certificate contains all required fields
    - **Property 28: Metadata Preservation After Electronic Disposal** — verify metadata retained, file refs removed
    - **Property 29: Disposal Certificates and Audit Logs Are Never Disposed** — verify exemption from disposal
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.7**

- [ ] 14. Archive Transfer Module (Rmrs.Archive)
  - [~] 14.1 Implement archive transfer batch workflow
    - Create `ArchiveTransferController` with endpoints: `POST /archive/batches`, `POST /archive/batches/{id}/records`, `POST /archive/batches/{id}/validate`, `POST /archive/batches/{id}/finalize`, `POST /archive/batches/{id}/complete`
    - Implement `TransferBatchService` with batch creation, record addition, and finalization
    - Validate eligibility: records must have completed retention and be marked for archival transfer
    - Implement `MetadataValidator` checking completeness (classification code, registry number, title, date range, format type)
    - Exclude records with incomplete metadata and notify Archivist of missing fields
    - On completion, update records to status "Archived" with archive reference number, transfer date, receiving archive
    - _Requirements: 8.1, 8.2, 8.4, 8.5_


  - [~] 14.2 Implement transfer manifest PDF generation
    - Implement `TransferManifestGenerator` using QuestPDF
    - Manifest includes: batch number, transfer date, destination archive, list of records with metadata, total count
    - Create `GET /archive/batches/{id}/manifest` endpoint returning PDF
    - _Requirements: 8.3_

  - [ ]*14.3 Write property tests for Archive Transfer module
    - **Property 30: Transfer Batch Eligibility** — verify only completed-retention + archival-marked records eligible
    - **Property 31: Transfer Batch Metadata Validation** — verify incomplete records are excluded
    - **Property 32: Archive Status Transition** — verify completed batches set status "Archived" with all required fields
    - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**

- [ ] 15. Search and Retrieval Module (Rmrs.Search)
  - [~] 15.1 Implement full-text search with access filtering
    - Create `SearchController` with `POST /search` endpoint
    - Implement `SearchService` using SQL Server Full-Text Search across subject, sender/recipient, registry number, classification code, responsible officer
    - Implement `AccessFilterService` applying role-based, department, and classification level filters to results
    - Support advanced filters: date range, record type, department, file plan classification, record status
    - Return results with registry number, subject, record type, date, classification code, and status
    - Ensure search returns results within 3 seconds for up to 1000 results
    - Create `GET /search/suggestions` for search autocomplete
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


  - [~] 15.2 Implement record detail retrieval with document access
    - Create record detail endpoint showing full metadata with link to view/download associated document
    - Verify user access permissions before returning detail (department + classification check)
    - _Requirements: 9.6_

  - [ ]*15.3 Write property tests for Search module
    - **Property 33: Search Returns Matching Records** — verify matching records appear in results when user has access
    - **Property 34: Access Control Enforcement** — verify department isolation and classification filtering in results
    - **Property 35: Search Result Field Completeness** — verify all required fields present in each result
    - **Validates: Requirements 9.1, 9.2, 9.5**

- [ ] 16. Reports and Dashboards Module (Rmrs.Admin - Reports)
  - [~] 16.1 Implement report generation with PDF/Excel export
    - Create `ReportsController` with `GET /reports/types` and `POST /reports/generate`
    - Implement `ReportGeneratorService` using QuestPDF for PDF and a library for Excel export
    - Pre-built reports: records per department/month, pending disposal, physical file movements, storage utilization, compliance status
    - Apply same access control rules as search — users see only authorized department/classification data
    - _Requirements: 12.1, 12.2, 12.5_

  - [~] 16.2 Implement role-based dashboards
    - Create `GET /dashboards/{role}` endpoint
    - Records_Manager dashboard: daily registration counts, overdue loans, upcoming disposals, transfer batch status
    - Executive_Viewer dashboard: aggregate statistics across all departments
    - Compliance dashboard: metrics for pending/overdue disposals, approaching retention expiry, file plan coverage
    - _Requirements: 12.3, 12.4, 11.4_


- [ ] 17. Administration Module (Rmrs.Admin - Config)
  - [~] 17.1 Implement system configuration management
    - Create `AdminController` with endpoints: `GET /admin/config`, `PUT /admin/config/{key}`
    - Implement `ConfigurationService` for OAuth settings (client ID, secret, URLs, callback URL)
    - Validate all configuration values before applying (e.g., valid URLs, required formats)
    - Record configuration changes in audit log with previous value, new value, and reason
    - _Requirements: 13.1, 13.5, 13.6_

  - [~] 17.2 Implement lookup tables and scheduled job management
    - Create `GET/POST/PUT /admin/lookups/{type}` for record types, classification levels, storage locations, departments, disposal authority references
    - Create `GET/PUT /admin/jobs/{id}` for scheduled job configuration (retention checks, overdue notifications, token refresh intervals)
    - Implement `ScheduledJobService` managing background job scheduling via IHostedService
    - Create `GET/POST/PUT /admin/lookups/{type}/{code}` endpoints for individual lookup values
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ]*17.3 Write property tests for Administration module
    - **Property 40: Configuration Change Audit with Reason** — verify audit entry with key, previous, new, and reason
    - **Property 41: Configuration Validation Before Apply** — verify invalid values rejected without modifying stored config
    - **Validates: Requirements 13.5, 13.6**

- [~] 18. Checkpoint - Verify all backend modules
  - Ensure all 12 API module groups respond correctly, disposal workflow executes end-to-end, search returns filtered results, and reports generate properly. Ask the user if questions arise.


- [ ] 19. Frontend - Core and Authentication
  - [x] 19.1 Implement Angular core services and auth flow
    - Create `AuthService` handling OAuth redirect, callback processing, and session management
    - Create `AuthGuard` protecting routes based on authentication state
    - Create `RoleGuard` protecting routes based on user role
    - Create `AuthInterceptor` attaching session cookie to API requests
    - Create `ErrorInterceptor` handling 401 (redirect to login), 403 (show access denied), and global errors
    - Create shell layout: navigation sidebar, header with user info, content area
    - _Requirements: 1.1, 10.1, 10.7_

  - [~] 19.2 Implement Angular shared components and models
    - Create TypeScript interfaces for all API models (Record, FilePlanEntry, Document, User, etc.)
    - Create shared UI components: data table with sorting/pagination, search bar, confirmation dialog, notification toast, file upload component
    - Create shared pipes: date formatting, classification level display, record status badge
    - _Requirements: 14.6_

- [ ] 20. Frontend - File Plan and Registry Features
  - [~] 20.1 Implement file plan tree management UI
    - Create `FilePlanTreeComponent` displaying hierarchical tree with expand/collapse
    - Create `FilePlanEntryFormComponent` for create/edit with all required fields
    - Create `RetentionRuleListComponent` for viewing and managing retention rules
    - Implement deactivation confirmation flow
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


  - [~] 20.2 Implement record registration forms
    - Create `RegisterIncomingComponent` with all required metadata fields + external reference fields
    - Create `RegisterOutgoingComponent` with required metadata fields
    - Create `RegisterInternalComponent` with required metadata fields
    - Create `RecordDetailComponent` showing full metadata, documents, and audit history
    - Create `RecordListComponent` with filtering and sorting by department/type/status
    - Implement classification level inheritance display with override option (higher only)
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 21. Frontend - Document and Physical Records Features
  - [~] 21.1 Implement document management UI
    - Create `DocumentUploadComponent` with drag-and-drop, file size validation (100MB limit), and progress indicator
    - Create `DocumentVersionListComponent` showing version history with checksums
    - Create `DocumentVerifyComponent` triggering integrity check and displaying result
    - Create download button linking to Bitrix file via API
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

  - [~] 21.2 Implement physical records management UI
    - Create `PhysicalRecordScanComponent` for barcode/QR scanning interface (mobile-friendly)
    - Create `LocationTreeComponent` displaying storage hierarchy
    - Create `MoveRecordComponent` for single and bulk move operations
    - Create `LoanFormComponent` for creating and returning loans
    - Create `OverdueLoansListComponent` displaying overdue loan notifications
    - Create `PrintLabelComponent` generating barcode/QR label for printing
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_


- [ ] 22. Frontend - Disposal, Archive, and Search Features
  - [~] 22.1 Implement disposal and archive transfer UI
    - Create `DisposalCandidatesComponent` listing records eligible for disposal
    - Create `DisposalBatchComponent` for batch creation, approval workflow display, and execution
    - Create `DisposalCertificateComponent` for viewing/downloading certificates
    - Create `ArchiveTransferBatchComponent` for batch creation, record selection, validation, and finalization
    - Create `TransferManifestComponent` for downloading manifest PDF
    - _Requirements: 7.2, 7.3, 7.4, 8.1, 8.3_

  - [~] 22.2 Implement search interface
    - Create `SearchComponent` with full-text search bar and results display
    - Create `AdvancedSearchComponent` with filter panel (date range, record type, department, classification, status)
    - Create `SearchResultsComponent` displaying results in data table with default columns
    - Implement click-through to record detail with document access
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

- [ ] 23. Frontend - Dashboards, Reports, and Admin
  - [~] 23.1 Implement role-based dashboards
    - Create `RecordsManagerDashboardComponent` with registration counts, overdue loans, upcoming disposals
    - Create `ExecutiveDashboardComponent` with aggregate cross-department statistics
    - Create `ComplianceDashboardComponent` with pending disposals, retention metrics, file plan coverage
    - Implement dashboard routing based on user role
    - _Requirements: 12.3, 12.4, 11.4_


  - [~] 23.2 Implement reports and admin configuration UI
    - Create `ReportListComponent` showing available report types
    - Create `ReportGeneratorComponent` with parameter selection and PDF/Excel export
    - Create `AuditLogViewerComponent` with filterable, paginated audit log display
    - Create `SystemConfigComponent` for OAuth settings and general configuration
    - Create `LookupTableEditorComponent` for managing all lookup value types
    - Create `RoleManagementComponent` for assigning/revoking user roles with justification
    - Create `DepartmentMappingComponent` for department-to-workgroup CRUD
    - _Requirements: 12.1, 12.2, 13.1, 13.2, 10.4_

- [~] 24. Checkpoint - Verify frontend application
  - Ensure Angular app loads, routing works per role, all forms validate correctly, and API integration functions end-to-end. Ask the user if questions arise.

- [ ] 25. Integration Testing and Background Jobs
  - [~] 25.1 Implement background jobs (IHostedService)
    - Create `RetentionExpiryCheckJob` running daily at 02:00 identifying expired records
    - Create `OverdueLoanNotifierJob` running daily at 08:00 sending overdue notifications
    - Create `TokenRefreshMonitorJob` running every 30 minutes pre-emptively refreshing near-expiry tokens
    - Configure job scheduling via `SystemConfiguration` table
    - _Requirements: 7.2, 6.6, 1.3, 13.4_


  - [ ]*25.2 Write integration tests for critical workflows
    - Test full OAuth flow: login redirect → callback → token exchange → session creation
    - Test record registration end-to-end: create file plan entry → register record → verify registry number
    - Test disposal workflow: candidate identification → batch creation → approval → execution → certificate
    - Test document upload/download with checksum verification
    - Test search with access control filtering
    - _Requirements: 1.1, 1.2, 4.1, 7.3, 5.1, 9.2_

- [ ] 26. Deployment Configuration
  - [~] 26.1 Configure deployment infrastructure
    - Create `appsettings.json` and `appsettings.Production.json` with Bitrix OAuth settings, connection strings, and job schedules
    - Configure HTTPS with TLS 1.2+ enforcement
    - Configure IIS reverse proxy settings for Kestrel
    - Set up SQL Server TDE (Transparent Data Encryption) for at-rest encryption
    - Configure automated daily database backup with 24-hour RPO
    - Set up CORS policy for Angular SPA origin
    - Configure Swagger to be disabled in production
    - _Requirements: 14.1, 14.4, 14.5_

  - [~] 26.2 Configure Angular production build and hosting
    - Configure Angular production build with AOT compilation and tree shaking
    - Set up SPA hosting via .NET static file middleware
    - Configure base href and environment-specific API URLs
    - Ensure WCAG 2.1 Level AA compliance in component markup (ARIA labels, keyboard navigation, contrast)
    - _Requirements: 14.6_

- [~] 27. Final Checkpoint - Full system verification
  - Ensure all modules are integrated, authentication flow works end-to-end with Bitrix, all background jobs are configured, deployment settings are correct, and the system supports 200 concurrent users. Ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breakpoints
- Property tests validate universal correctness properties defined in the design document
- The backend uses C# .NET 8 Web API with EF Core 8 and SQL Server 2022
- The frontend uses Angular 17+ with standalone components, signals, and lazy loading
- All Bitrix API interactions go through the centralized `IBitrixApiClient` service
- Background jobs use `IHostedService` with configurable intervals stored in `SystemConfiguration`
- The audit interceptor automatically logs all entity changes without manual intervention
- Frontend and backend modules can be developed concurrently after scaffolding is complete


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["3.1", "4.1", "5.1", "19.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "5.2", "19.2"] },
    { "id": 4, "tasks": ["3.4", "4.3", "5.3", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1", "9.1"] },
    { "id": 6, "tasks": ["8.2", "9.2", "10.1", "11.1"] },
    { "id": 7, "tasks": ["8.3", "9.3", "10.2", "11.2"] },
    { "id": 8, "tasks": ["10.3", "11.3", "13.1", "14.1", "15.1"] },
    { "id": 9, "tasks": ["13.2", "14.2", "15.2", "16.1"] },
    { "id": 10, "tasks": ["13.3", "14.3", "15.3", "16.2", "17.1"] },
    { "id": 11, "tasks": ["17.2", "17.3", "20.1", "20.2"] },
    { "id": 12, "tasks": ["21.1", "21.2", "22.1", "22.2"] },
    { "id": 13, "tasks": ["23.1", "23.2", "25.1"] },
    { "id": 14, "tasks": ["25.2", "26.1", "26.2"] }
  ]
}
```
