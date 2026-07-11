# Technical Design Document: RMRS Bitrix Integration

## Overview

The Records Management and Registry System (RMRS) is a new standalone web application for JB Marks Local Municipality. It integrates with Bitrix SDinMotion for document storage and authentication, managing the full lifecycle of municipal records in compliance with NARSSA principles and SANS ISO 16175-2:2014.

## High-Level Architecture

### Architecture Style: Layered Monolith with Modular Boundaries

The system uses a modular monolith architecture deployed as a single .NET 8 Web API backend with an Angular 17+ SPA frontend. This approach enables the 12 modules to be developed concurrently while sharing infrastructure.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Angular 17+ SPA Frontend                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   Auth   │ │ Registry │ │ File Plan│ │  Search  │  ...       │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST API
┌────────────────────────────┼────────────────────────────────────┐
│                    .NET 8 Web API Backend                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Layer (Controllers / Endpoints)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Application Layer (Services / CQRS)           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Domain Layer (Entities / Value Objects)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Infrastructure Layer (EF Core / Bitrix Client)     │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      ┌───────┴───────┐ ┌───┴────┐ ┌──────┴──────┐
      │  SQL Server   │ │ Bitrix │ │   Bitrix    │
      │  (Metadata,   │ │ OAuth  │ │  Workgroup  │
      │  Audit, Config)│ │ Server │ │   Drives    │
      └───────────────┘ └────────┘ └─────────────┘
```



### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Angular | 17+ |
| Backend | C# .NET Web API | .NET 8 |
| Database | SQL Server | 2022 |
| ORM | Entity Framework Core | 8.x |
| Authentication | Bitrix OAuth 2.0 | - |
| Document Storage | Bitrix REST API (Workgroup Drives) | - |
| Hosting | IIS / Kestrel on Windows Server | - |
| Caching | IMemoryCache / SQL Server | - |
| Logging | Serilog + SQL Server sink | - |
| PDF Generation | QuestPDF | - |
| Barcode/QR | ZXing.Net | - |
| API Documentation | Swagger / OpenAPI 3.0 | - |

### Deployment Architecture

Single-tenant deployment on the jbmarks.sdinmotion.co.za platform:

```
┌────────────────────────────────────────┐
│         jbmarks.sdinmotion.co.za        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  IIS / Reverse Proxy (HTTPS)    │   │
│  └──────────┬──────────────────────┘   │
│             │                           │
│  ┌──────────┴──────────────────────┐   │
│  │  .NET 8 Kestrel (API + SPA)     │   │
│  └──────────┬──────────────────────┘   │
│             │                           │
│  ┌──────────┴──────────────────────┐   │
│  │  SQL Server 2022 Instance        │   │
│  └─────────────────────────────────┘   │
└────────────────────────────────────────┘
         │
         │ HTTPS REST API calls
         ▼
┌────────────────────────────────────────┐
│  Bitrix SDinMotion Cloud Platform      │
│  (OAuth, REST API, Workgroup Drives)   │
└────────────────────────────────────────┘
```



## Module Architecture

The system is organized into 12 modules, each with clear boundaries and responsibilities:

### Module 1: Authentication Module (`Rmrs.Auth`)

**Responsibility:** Bitrix OAuth 2.0 flow, session management, token lifecycle

**Components:**
- `BitrixOAuthController` — Handles login redirect and callback
- `TokenService` — Manages token exchange, refresh, and encrypted storage
- `SessionMiddleware` — Validates session tokens, enforces 30-minute timeout
- `UserSyncService` — Syncs Bitrix user profile to local user table

**Key Interfaces:**

```csharp
public interface ITokenService
{
    Task<TokenPair> ExchangeCodeAsync(string authorizationCode);
    Task<string> GetValidAccessTokenAsync(int userId);
    Task<bool> RefreshTokenAsync(int userId);
    Task RevokeTokensAsync(int userId);
}

public interface IUserSyncService
{
    Task<User> SyncUserFromBitrixAsync(BitrixUserProfile profile);
}
```

### Module 2: Department Workgroup Mapping Module (`Rmrs.DepartmentMapping`)

**Responsibility:** CRUD for department-to-workgroup mappings, validation against Bitrix API

**Components:**
- `DepartmentMappingController` — CRUD API endpoints
- `DepartmentMappingService` — Business logic and validation
- `BitrixWorkgroupValidator` — Validates workgroup existence via REST API

**Key Interfaces:**

```csharp
public interface IDepartmentMappingService
{
    Task<DepartmentMapping> CreateMappingAsync(CreateMappingRequest request);
    Task<DepartmentMapping> UpdateMappingAsync(int id, UpdateMappingRequest request);
    Task<bool> DeleteMappingAsync(int id);
    Task<IEnumerable<DepartmentMapping>> GetAllMappingsAsync();
    Task<DepartmentMapping?> GetMappingByDepartmentAsync(string departmentCode);
}
```



### Module 3: File Plan Management Module (`Rmrs.FilePlan`)

**Responsibility:** Hierarchical file plan CRUD, retention rule association, classification level defaults

**Components:**
- `FilePlanController` — CRUD and tree retrieval endpoints
- `FilePlanService` — Tree manipulation, validation, deactivation logic
- `RetentionRuleEngine` — Calculates retention dates from rules

**Key Interfaces:**

```csharp
public interface IFilePlanService
{
    Task<FilePlanEntry> CreateEntryAsync(CreateFilePlanRequest request);
    Task<FilePlanEntry> UpdateEntryAsync(int id, UpdateFilePlanRequest request);
    Task DeactivateEntryAsync(int id);
    Task<FilePlanTree> GetTreeAsync(string? departmentCode = null);
    Task<IEnumerable<FilePlanEntry>> GetChildrenAsync(int parentId);
    Task<bool> HasActiveRecordsAsync(int entryId);
}

public interface IRetentionRuleEngine
{
    DateTime CalculateExpiryDate(RetentionRule rule, DateTime recordCreationDate);
    IEnumerable<Record> GetDisposalCandidates(DateTime asOfDate);
}
```

### Module 4: Records Registry Module (`Rmrs.Registry`)

**Responsibility:** Record registration, registry number generation, metadata capture

**Components:**
- `RecordsRegistryController` — Registration and record management endpoints
- `RegistryNumberGenerator` — Auto-generates RMRS/{DEPT}/{YYYY}/{SEQ:00000}
- `RecordRegistrationService` — Orchestrates registration workflow
- `SequenceProvider` — Thread-safe sequence allocation per department/year

**Key Interfaces:**

```csharp
public interface IRegistryNumberGenerator
{
    Task<string> GenerateNextAsync(string departmentCode);
}

public interface IRecordRegistrationService
{
    Task<Record> RegisterIncomingAsync(RegisterIncomingRequest request);
    Task<Record> RegisterOutgoingAsync(RegisterOutgoingRequest request);
    Task<Record> RegisterInternalAsync(RegisterInternalRequest request);
    Task<Record> UpdateRecordAsync(int recordId, UpdateRecordRequest request);
}

public interface ISequenceProvider
{
    Task<int> GetNextSequenceAsync(string departmentCode, int year);
    Task ResetSequenceAsync(string departmentCode, int year);
}
```



### Module 5: Electronic Document Control Module (`Rmrs.Documents`)

**Responsibility:** Document upload/download via Bitrix, versioning, checksum verification, folder structure

**Components:**
- `DocumentController` — Upload, download, version endpoints
- `DocumentUploadService` — Orchestrates upload with retry logic
- `ChecksumService` — SHA-256 computation and verification
- `BitrixFolderService` — Creates folder hierarchies mirroring file plan
- `RetryPolicy` — Exponential backoff (3 attempts)

**Key Interfaces:**

```csharp
public interface IDocumentUploadService
{
    Task<DocumentVersion> UploadAsync(int recordId, Stream fileStream, string fileName, int userId);
    Task<DocumentVersion> UploadNewVersionAsync(int documentId, Stream fileStream, string fileName, int userId);
    Task<Stream> DownloadAsync(int documentId, int? versionNumber = null);
    Task<bool> VerifyIntegrityAsync(int documentId);
}

public interface IChecksumService
{
    string ComputeSha256(Stream fileStream);
    Task<bool> VerifyAsync(int documentId);
}

public interface IBitrixFolderService
{
    Task<string> EnsureFolderStructureAsync(string departmentCode, string classificationPath);
    Task<int> GetOrCreateFolderAsync(int workgroupDriveId, string folderPath);
}
```

### Module 6: Physical Records Control Module (`Rmrs.PhysicalRecords`)

**Responsibility:** Barcode/QR generation, location tracking, custody/loan management

**Components:**
- `PhysicalRecordsController` — Location, loan, and scanning endpoints
- `BarcodeGeneratorService` — Generates barcode and QR code images
- `LocationService` — Manages storage hierarchy and movements
- `LoanService` — Manages loan lifecycle and overdue notifications
- `BulkScanService` — Processes batch barcode scans

**Key Interfaces:**

```csharp
public interface IBarcodeGeneratorService
{
    byte[] GenerateBarcode(string registryNumber);
    byte[] GenerateQrCode(string registryNumber);
}

public interface ILocationService
{
    Task<StorageLocation> GetCurrentLocationAsync(int physicalRecordId);
    Task MoveRecordAsync(int physicalRecordId, int newLocationId, int userId);
    Task<IEnumerable<MovementHistory>> GetMovementHistoryAsync(int physicalRecordId);
    Task BulkMoveAsync(IEnumerable<int> physicalRecordIds, int newLocationId, int userId);
}

public interface ILoanService
{
    Task<Loan> CreateLoanAsync(CreateLoanRequest request);
    Task<Loan> ReturnRecordAsync(int loanId, DateTime returnDate);
    Task<IEnumerable<Loan>> GetOverdueLoansAsync();
}
```



### Module 7: Retention and Disposal Module (`Rmrs.Disposal`)

**Responsibility:** Retention calculation, disposal workflow, Bitrix file deletion, disposal certificates

**Components:**
- `DisposalController` — Disposal workflow endpoints
- `RetentionCalculationJob` — Scheduled job checking retention expiry
- `DisposalWorkflowService` — Multi-step disposal with approval
- `DisposalCertificateGenerator` — Generates PDF disposal certificates
- `BitrixFileDeleteService` — Handles Bitrix file deletion with error handling

**Key Interfaces:**

```csharp
public interface IDisposalWorkflowService
{
    Task<IEnumerable<Record>> GetDisposalCandidatesAsync();
    Task<DisposalBatch> InitiateDisposalAsync(InitiateDisposalRequest request);
    Task<DisposalBatch> ApproveDisposalAsync(int batchId, int complianceOfficerId);
    Task ExecuteDisposalAsync(int batchId);
    Task<byte[]> GenerateDisposalCertificateAsync(int batchId);
}
```

### Module 8: Archive Transfer Module (`Rmrs.Archive`)

**Responsibility:** Transfer batch creation, metadata validation, manifest generation

**Components:**
- `ArchiveTransferController` — Transfer batch endpoints
- `TransferBatchService` — Batch creation, validation, finalization
- `TransferManifestGenerator` — PDF manifest generation
- `MetadataValidator` — Validates completeness for transfer

**Key Interfaces:**

```csharp
public interface ITransferBatchService
{
    Task<TransferBatch> CreateBatchAsync(CreateTransferBatchRequest request);
    Task<TransferBatch> AddRecordsToBatchAsync(int batchId, IEnumerable<int> recordIds);
    Task<ValidationResult> ValidateBatchAsync(int batchId);
    Task<TransferBatch> FinalizeBatchAsync(int batchId);
    Task<TransferBatch> CompleteBatchAsync(int batchId, string archiveReferenceNumber);
    Task<byte[]> GenerateManifestAsync(int batchId);
}
```

### Module 9: Search and Retrieval Module (`Rmrs.Search`)

**Responsibility:** Full-text search, access-filtered results, advanced filtering

**Components:**
- `SearchController` — Search query endpoints
- `SearchService` — Query building with access filters
- `AccessFilterService` — Applies role/department/classification filters
- `SearchIndexService` — Manages full-text index updates

**Key Interfaces:**

```csharp
public interface ISearchService
{
    Task<SearchResult> SearchAsync(SearchQuery query, UserContext userContext);
    Task<RecordDetail> GetRecordDetailAsync(int recordId, UserContext userContext);
}

public interface IAccessFilterService
{
    IQueryable<Record> ApplyAccessFilters(IQueryable<Record> query, UserContext userContext);
    Task<bool> CanAccessRecordAsync(int recordId, UserContext userContext);
}
```



### Module 10: Security and Access Control Module (`Rmrs.Security`)

**Responsibility:** RBAC, department isolation, classification enforcement, re-authentication

**Components:**
- `SecurityController` — Role assignment endpoints
- `RoleService` — Role assignment with audit
- `AuthorizationHandler` — Custom .NET authorization policies
- `ClassificationGuard` — Enforces classification level checks
- `ReAuthenticationMiddleware` — Challenges sensitive operations

**Key Interfaces:**

```csharp
public interface IRoleService
{
    Task AssignRoleAsync(AssignRoleRequest request, int adminUserId);
    Task RevokeRoleAsync(int userId, string roleName, int adminUserId);
    Task<IEnumerable<UserRole>> GetUserRolesAsync(int userId);
    Task<bool> HasPermissionAsync(int userId, string permission, int? recordId = null);
}

public interface IClassificationGuard
{
    Task<bool> CanAccessClassificationLevelAsync(int userId, ClassificationLevel level);
    Task LogUnauthorizedAccessAsync(int userId, int recordId, string action);
}
```

### Module 11: Audit and Compliance Module (`Rmrs.Audit`)

**Responsibility:** Immutable audit logging, compliance dashboards, report generation

**Components:**
- `AuditController` — Audit query and compliance report endpoints
- `AuditLogService` — Append-only audit record creation
- `ComplianceDashboardService` — Aggregates compliance metrics
- `AuditInterceptor` — EF Core interceptor for automatic audit trail

**Key Interfaces:**

```csharp
public interface IAuditLogService
{
    Task LogAsync(AuditEntry entry);
    Task<IEnumerable<AuditEntry>> QueryAsync(AuditQuery query);
    Task<ComplianceMetrics> GetComplianceMetricsAsync(DateTime from, DateTime to);
}

public record AuditEntry(
    int UserId,
    DateTime Timestamp,
    string ActionType,
    string EntityType,
    int EntityId,
    string? PreviousValue,
    string? NewValue,
    string SourceIpAddress
);
```

### Module 12: Reports and Administration Module (`Rmrs.Admin`)

**Responsibility:** Report generation, dashboard data, system configuration, lookup table management

**Components:**
- `ReportsController` — Report generation and export endpoints
- `AdminController` — Configuration and lookup table endpoints
- `ReportGeneratorService` — Produces PDF/Excel reports
- `ConfigurationService` — System settings management
- `ScheduledJobService` — Manages background job scheduling
- `LookupTableService` — CRUD for system lookup values

**Key Interfaces:**

```csharp
public interface IReportGeneratorService
{
    Task<byte[]> GenerateReportAsync(ReportType type, ReportParameters parameters, string format);
    Task<DashboardData> GetDashboardDataAsync(string role, int userId);
}

public interface IConfigurationService
{
    Task<T> GetSettingAsync<T>(string key);
    Task UpdateSettingAsync(string key, string value, int adminUserId, string reason);
    Task<IEnumerable<ConfigSetting>> GetAllSettingsAsync();
}
```



## Bitrix Integration Service

### Centralized Bitrix REST API Client

All modules interact with Bitrix through a shared infrastructure service:

```csharp
public interface IBitrixApiClient
{
    // OAuth
    Task<TokenPair> ExchangeAuthCodeAsync(string code);
    Task<TokenPair> RefreshTokenAsync(string refreshToken);
    Task<BitrixUserProfile> GetUserProfileAsync(string accessToken);
    
    // Workgroups
    Task<BitrixWorkgroup?> GetWorkgroupAsync(int workgroupId, string accessToken);
    Task<bool> ValidateWorkgroupExistsAsync(int workgroupId, string accessToken);
    
    // Drive / Files
    Task<int> CreateFolderAsync(int driveId, string folderName, int? parentFolderId, string accessToken);
    Task<BitrixFileInfo> UploadFileAsync(int folderId, string fileName, Stream content, string accessToken);
    Task<Stream> DownloadFileAsync(int fileId, string accessToken);
    Task DeleteFileAsync(int fileId, string accessToken);
    Task<BitrixFileInfo> GetFileInfoAsync(int fileId, string accessToken);
}
```

### Bitrix API Endpoints Used

| Operation | Bitrix REST Endpoint | Module |
|-----------|---------------------|--------|
| OAuth Authorize | `https://jbmarks.sdinmotion.co.za/oauth/authorize/` | Auth |
| Token Exchange | `https://oauth.bitrix.info/oauth/token/` | Auth |
| User Profile | `user.current` | Auth |
| Validate Workgroup | `sonet_group.get` | DepartmentMapping |
| Create Folder | `disk.folder.addsubfolder` | Documents |
| Upload File | `disk.folder.uploadfile` | Documents |
| Download File | `disk.file.get` (download URL) | Documents |
| Delete File | `disk.file.delete` | Disposal |
| Get File Info | `disk.file.get` | Documents |
| Get Drive | `disk.storage.getlist` | DepartmentMapping |

### Retry and Error Handling Strategy

```csharp
public class BitrixRetryPolicy
{
    public int MaxRetries => 3;
    public TimeSpan[] Delays => new[]
    {
        TimeSpan.FromSeconds(1),
        TimeSpan.FromSeconds(4),
        TimeSpan.FromSeconds(16)
    };
    
    // Exponential backoff: 1s, 4s, 16s
    // Only retry on transient failures (5xx, timeouts, network errors)
    // Do NOT retry on 4xx (auth failures, validation errors)
}
```



## Database Schema Design

### Core Tables

```sql
-- ===========================
-- Authentication & Users
-- ===========================

CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BitrixUserId INT NOT NULL UNIQUE,
    Email NVARCHAR(256) NOT NULL,
    FullName NVARCHAR(256) NOT NULL,
    DepartmentCode NVARCHAR(20),
    MaxClassificationLevel INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE UserTokens (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL REFERENCES Users(Id),
    AccessTokenEncrypted VARBINARY(MAX) NOT NULL,
    RefreshTokenEncrypted VARBINARY(MAX) NOT NULL,
    AccessTokenExpiresAt DATETIME2 NOT NULL,
    RefreshTokenExpiresAt DATETIME2,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE UserRoles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL REFERENCES Users(Id),
    RoleName NVARCHAR(50) NOT NULL,
    EffectiveDate DATETIME2 NOT NULL,
    AssignedByUserId INT NOT NULL REFERENCES Users(Id),
    Justification NVARCHAR(500) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE UserSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId INT NOT NULL REFERENCES Users(Id),
    SessionToken NVARCHAR(512) NOT NULL,
    LastActivityAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL,
    IpAddress NVARCHAR(45),
    IsActive BIT NOT NULL DEFAULT 1
);

-- ===========================
-- Department Mapping
-- ===========================

CREATE TABLE Departments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentCode NVARCHAR(20) NOT NULL UNIQUE,
    DepartmentName NVARCHAR(256) NOT NULL,
    BitrixWorkgroupId INT NOT NULL UNIQUE,
    BitrixDriveId INT NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```



```sql
-- ===========================
-- File Plan
-- ===========================

CREATE TABLE FilePlanEntries (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ParentId INT NULL REFERENCES FilePlanEntries(Id),
    ClassificationCode NVARCHAR(50) NOT NULL UNIQUE,
    Title NVARCHAR(256) NOT NULL,
    Description NVARCHAR(2000),
    Level INT NOT NULL CHECK (Level BETWEEN 1 AND 5),
    RetentionRuleId INT NOT NULL REFERENCES RetentionRules(Id),
    DisposalAuthorityRef NVARCHAR(100) NOT NULL,
    DefaultClassificationLevel INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    DeactivatedAt DATETIME2 NULL
);

CREATE TABLE RetentionRules (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RuleName NVARCHAR(256) NOT NULL,
    RetentionYears INT NOT NULL,
    RetentionMonths INT NOT NULL DEFAULT 0,
    DisposalAction NVARCHAR(50) NOT NULL, -- 'Destroy', 'Archive', 'Review'
    Description NVARCHAR(1000),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ===========================
-- Records Registry
-- ===========================

CREATE TABLE Records (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RegistryNumber NVARCHAR(30) NOT NULL UNIQUE,
    RecordType NVARCHAR(20) NOT NULL CHECK (RecordType IN ('Incoming', 'Outgoing', 'Internal')),
    Subject NVARCHAR(500) NOT NULL,
    SenderOrRecipient NVARCHAR(256),
    DateReceivedOrSent DATE NOT NULL,
    FilePlanEntryId INT NOT NULL REFERENCES FilePlanEntries(Id),
    ClassificationLevel INT NOT NULL,
    ResponsibleOfficerId INT NOT NULL REFERENCES Users(Id),
    DepartmentId INT NOT NULL REFERENCES Departments(Id),
    ExternalReferenceNumber NVARCHAR(100),
    OriginatingOrganization NVARCHAR(256),
    CorrespondenceDate DATE,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Active',
    RetentionExpiryDate DATE,
    CreatedByUserId INT NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE RegistrySequences (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentCode NVARCHAR(20) NOT NULL,
    Year INT NOT NULL,
    CurrentSequence INT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_RegistrySequences UNIQUE (DepartmentCode, Year)
);
```



```sql
-- ===========================
-- Electronic Documents
-- ===========================

CREATE TABLE Documents (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RecordId INT NOT NULL REFERENCES Records(Id),
    FileName NVARCHAR(256) NOT NULL,
    FileSize BIGINT NOT NULL,
    MimeType NVARCHAR(100) NOT NULL,
    CurrentVersion INT NOT NULL DEFAULT 1,
    BitrixFileId INT NOT NULL,
    BitrixFolderId INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE DocumentVersions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DocumentId INT NOT NULL REFERENCES Documents(Id),
    VersionNumber INT NOT NULL,
    BitrixFileId INT NOT NULL,
    Sha256Checksum NVARCHAR(64) NOT NULL,
    FileSize BIGINT NOT NULL,
    UploadedByUserId INT NOT NULL REFERENCES Users(Id),
    UploadedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_DocVersion UNIQUE (DocumentId, VersionNumber)
);

-- ===========================
-- Physical Records
-- ===========================

CREATE TABLE StorageLocations (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ParentId INT NULL REFERENCES StorageLocations(Id),
    LocationType NVARCHAR(20) NOT NULL CHECK (LocationType IN ('Building', 'Floor', 'Room', 'Shelf', 'Position')),
    LocationName NVARCHAR(100) NOT NULL,
    LocationCode NVARCHAR(50) NOT NULL UNIQUE,
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE PhysicalRecords (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RecordId INT NOT NULL REFERENCES Records(Id),
    BarcodeValue NVARCHAR(50) NOT NULL UNIQUE,
    QrCodeValue NVARCHAR(200) NOT NULL,
    CurrentLocationId INT REFERENCES StorageLocations(Id),
    Status NVARCHAR(20) NOT NULL DEFAULT 'InStorage',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE PhysicalRecordMovements (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PhysicalRecordId INT NOT NULL REFERENCES PhysicalRecords(Id),
    FromLocationId INT REFERENCES StorageLocations(Id),
    ToLocationId INT NOT NULL REFERENCES StorageLocations(Id),
    MovedByUserId INT NOT NULL REFERENCES Users(Id),
    MovedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE Loans (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PhysicalRecordId INT NOT NULL REFERENCES PhysicalRecords(Id),
    BorrowerUserId INT NOT NULL REFERENCES Users(Id),
    LoanDate DATE NOT NULL,
    ExpectedReturnDate DATE NOT NULL,
    ActualReturnDate DATE,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
    CreatedByUserId INT NOT NULL REFERENCES Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```



```sql
-- ===========================
-- Disposal and Archive
-- ===========================

CREATE TABLE DisposalBatches (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BatchNumber NVARCHAR(50) NOT NULL UNIQUE,
    DisposalAuthorityRef NVARCHAR(100) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Initiated',
    InitiatedByUserId INT NOT NULL REFERENCES Users(Id),
    ApprovedByUserId INT REFERENCES Users(Id),
    InitiatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ApprovedAt DATETIME2,
    ExecutedAt DATETIME2,
    CertificateGenerated BIT NOT NULL DEFAULT 0
);

CREATE TABLE DisposalBatchRecords (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DisposalBatchId INT NOT NULL REFERENCES DisposalBatches(Id),
    RecordId INT NOT NULL REFERENCES Records(Id),
    DisposalStatus NVARCHAR(30) NOT NULL DEFAULT 'Pending',
    CONSTRAINT UQ_DisposalBatchRecord UNIQUE (DisposalBatchId, RecordId)
);

CREATE TABLE TransferBatches (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BatchNumber NVARCHAR(50) NOT NULL UNIQUE,
    DestinationArchive NVARCHAR(256) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'Draft',
    CreatedByUserId INT NOT NULL REFERENCES Users(Id),
    FinalizedAt DATETIME2,
    CompletedAt DATETIME2,
    ArchiveReferenceNumber NVARCHAR(100),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE TransferBatchRecords (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TransferBatchId INT NOT NULL REFERENCES TransferBatches(Id),
    RecordId INT NOT NULL REFERENCES Records(Id),
    ValidationStatus NVARCHAR(30) NOT NULL DEFAULT 'Pending',
    ValidationErrors NVARCHAR(MAX),
    CONSTRAINT UQ_TransferBatchRecord UNIQUE (TransferBatchId, RecordId)
);

-- ===========================
-- Audit Log (Append-Only)
-- ===========================

CREATE TABLE AuditLogs (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ActionType NVARCHAR(50) NOT NULL,
    EntityType NVARCHAR(50) NOT NULL,
    EntityId INT NOT NULL,
    PreviousValue NVARCHAR(MAX),
    NewValue NVARCHAR(MAX),
    SourceIpAddress NVARCHAR(45) NOT NULL,
    -- No UPDATE or DELETE triggers allowed on this table
    -- Enforce via database-level permissions
);

-- Deny UPDATE and DELETE on AuditLogs
DENY UPDATE ON AuditLogs TO [RmrsAppUser];
DENY DELETE ON AuditLogs TO [RmrsAppUser];
```



```sql
-- ===========================
-- Configuration & Lookup Tables
-- ===========================

CREATE TABLE SystemConfiguration (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ConfigKey NVARCHAR(100) NOT NULL UNIQUE,
    ConfigValue NVARCHAR(MAX) NOT NULL,
    Description NVARCHAR(500),
    UpdatedByUserId INT REFERENCES Users(Id),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE LookupValues (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    LookupType NVARCHAR(50) NOT NULL,
    Code NVARCHAR(50) NOT NULL,
    DisplayName NVARCHAR(256) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_LookupValue UNIQUE (LookupType, Code)
);

CREATE TABLE DisposalCertificates (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DisposalBatchId INT NOT NULL REFERENCES DisposalBatches(Id),
    CertificateNumber NVARCHAR(50) NOT NULL UNIQUE,
    GeneratedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CertificateData VARBINARY(MAX) NOT NULL -- PDF binary
);

-- ===========================
-- Full-Text Search Index
-- ===========================

CREATE FULLTEXT CATALOG RmrsFullTextCatalog AS DEFAULT;

CREATE FULLTEXT INDEX ON Records (Subject, SenderOrRecipient, ExternalReferenceNumber, OriginatingOrganization)
    KEY INDEX PK_Records ON RmrsFullTextCatalog;
```

### Key Database Constraints and Indexes

```sql
-- Performance indexes
CREATE INDEX IX_Records_DepartmentId ON Records(DepartmentId);
CREATE INDEX IX_Records_FilePlanEntryId ON Records(FilePlanEntryId);
CREATE INDEX IX_Records_Status ON Records(Status);
CREATE INDEX IX_Records_RetentionExpiryDate ON Records(RetentionExpiryDate);
CREATE INDEX IX_Records_RegistryNumber ON Records(RegistryNumber);
CREATE INDEX IX_AuditLogs_Timestamp ON AuditLogs(Timestamp);
CREATE INDEX IX_AuditLogs_EntityType_EntityId ON AuditLogs(EntityType, EntityId);
CREATE INDEX IX_AuditLogs_UserId ON AuditLogs(UserId);
CREATE INDEX IX_Loans_Status ON Loans(Status);
CREATE INDEX IX_Loans_ExpectedReturnDate ON Loans(ExpectedReturnDate) WHERE ActualReturnDate IS NULL;
CREATE INDEX IX_DocumentVersions_Checksum ON DocumentVersions(Sha256Checksum);
```



## API Design

### Base URL: `https://records.sdinmotion.co.za/api/v1`

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Redirects to Bitrix OAuth |
| GET | `/auth/bitrix/callback` | OAuth callback handler |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user profile |

### Department Mapping Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments` | List all department mappings |
| GET | `/departments/{id}` | Get single mapping |
| POST | `/departments` | Create mapping |
| PUT | `/departments/{id}` | Update mapping |
| DELETE | `/departments/{id}` | Delete mapping |
| POST | `/departments/{id}/validate` | Validate Bitrix workgroup |

### File Plan Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/file-plan/tree` | Get full tree structure |
| GET | `/file-plan/entries/{id}` | Get single entry |
| GET | `/file-plan/entries/{id}/children` | Get children |
| POST | `/file-plan/entries` | Create entry |
| PUT | `/file-plan/entries/{id}` | Update entry |
| POST | `/file-plan/entries/{id}/deactivate` | Deactivate entry |
| GET | `/file-plan/retention-rules` | List retention rules |
| POST | `/file-plan/retention-rules` | Create retention rule |

### Records Registry Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/records` | List records (filtered) |
| GET | `/records/{id}` | Get record detail |
| POST | `/records/incoming` | Register incoming record |
| POST | `/records/outgoing` | Register outgoing record |
| POST | `/records/internal` | Register internal record |
| PUT | `/records/{id}` | Update record metadata |
| GET | `/records/{id}/history` | Get record audit history |

### Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/records/{recordId}/documents` | Upload document |
| GET | `/records/{recordId}/documents` | List documents for record |
| GET | `/documents/{id}` | Get document metadata |
| GET | `/documents/{id}/download` | Download document |
| POST | `/documents/{id}/versions` | Upload new version |
| GET | `/documents/{id}/versions` | List versions |
| POST | `/documents/{id}/verify` | Verify checksum integrity |



### Physical Records Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/physical-records/{id}` | Get physical record info |
| GET | `/physical-records/{id}/location` | Get current location |
| POST | `/physical-records/{id}/move` | Move to new location |
| POST | `/physical-records/bulk-move` | Bulk move by scan |
| GET | `/physical-records/{id}/movements` | Movement history |
| POST | `/physical-records/{id}/loan` | Create loan |
| POST | `/physical-records/{id}/return` | Return from loan |
| GET | `/physical-records/overdue-loans` | List overdue loans |
| GET | `/physical-records/scan/{barcode}` | Scan and retrieve |
| GET | `/physical-records/{id}/label` | Generate barcode/QR label |
| GET | `/storage-locations` | List locations (tree) |
| POST | `/storage-locations` | Create location |
| PUT | `/storage-locations/{id}` | Update location |

### Disposal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/disposal/candidates` | List disposal candidates |
| POST | `/disposal/batches` | Create disposal batch |
| GET | `/disposal/batches/{id}` | Get batch details |
| POST | `/disposal/batches/{id}/approve` | Approve batch |
| POST | `/disposal/batches/{id}/execute` | Execute disposal |
| GET | `/disposal/batches/{id}/certificate` | Download certificate |

### Archive Transfer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/archive/batches` | Create transfer batch |
| GET | `/archive/batches/{id}` | Get batch details |
| POST | `/archive/batches/{id}/records` | Add records to batch |
| POST | `/archive/batches/{id}/validate` | Validate batch |
| POST | `/archive/batches/{id}/finalize` | Finalize batch |
| POST | `/archive/batches/{id}/complete` | Mark as completed |
| GET | `/archive/batches/{id}/manifest` | Download manifest PDF |

### Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Execute search query |
| GET | `/search/suggestions` | Get search suggestions |

### Security Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/{id}/roles` | Get user roles |
| POST | `/users/{id}/roles` | Assign role |
| DELETE | `/users/{id}/roles/{roleName}` | Revoke role |
| POST | `/auth/re-authenticate` | Re-authenticate for sensitive ops |

### Audit Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit/logs` | Query audit logs |
| GET | `/audit/compliance/metrics` | Get compliance metrics |
| POST | `/audit/compliance/report` | Generate compliance report |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/config` | Get all settings |
| PUT | `/admin/config/{key}` | Update setting |
| GET | `/admin/lookups/{type}` | Get lookup values |
| POST | `/admin/lookups/{type}` | Create lookup value |
| PUT | `/admin/lookups/{type}/{code}` | Update lookup value |
| GET | `/admin/jobs` | List scheduled jobs |
| PUT | `/admin/jobs/{id}` | Update job config |

### Reports Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/types` | List available report types |
| POST | `/reports/generate` | Generate report (PDF/Excel) |
| GET | `/dashboards/{role}` | Get dashboard data |



## Security Architecture

### Authentication Flow

```
User → RMRS Login Page → Bitrix OAuth Authorize Endpoint
                              │
                              ▼
                    User authenticates on Bitrix
                              │
                              ▼
Bitrix → Callback URL with Auth Code → RMRS Backend
                              │
                              ▼
                    RMRS exchanges code for tokens
                              │
                              ▼
                    RMRS fetches user profile from Bitrix
                              │
                              ▼
                    RMRS creates/updates local user
                              │
                              ▼
                    RMRS issues session cookie (HttpOnly, Secure)
                              │
                              ▼
                    User redirected to Angular SPA
```

### Authorization Model

```
┌─────────────────────────────────────────────────────────┐
│                    Request Pipeline                       │
│                                                          │
│  1. Authentication Middleware (validate session)         │
│  2. Session Timeout Check (30 min inactivity)           │
│  3. Role Authorization (policy-based)                   │
│  4. Department Isolation Filter                         │
│  5. Classification Level Check                          │
│  6. Re-Authentication Challenge (sensitive ops)         │
│  7. Audit Log Interceptor                               │
└─────────────────────────────────────────────────────────┘
```

### Role Permissions Matrix

| Permission | SysAdmin | RecMgr | RegClerk | DeptUser | DeptSupv | CompOff | Auditor | Archivist | ExecView |
|-----------|:--------:|:------:|:--------:|:--------:|:--------:|:-------:|:-------:|:---------:|:--------:|
| Manage Config | ✓ | | | | | | | | |
| Manage File Plan | ✓ | ✓ | | | | | | | |
| Register Records | | | ✓ | | | | | | |
| Upload Documents | | | ✓ | ✓ | ✓ | | | | |
| View Dept Records | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| View All Records | ✓ | ✓ | | | | ✓ | ✓ | | |
| Approve Disposal | | | | | | ✓ | | | |
| Initiate Disposal | | ✓ | | | | | | | |
| Manage Physical | | | ✓ | | | | | | |
| Transfer Archive | | | | | | | | ✓ | |
| View Audit Logs | ✓ | | | | | ✓ | ✓ | | |
| View Dashboards | ✓ | ✓ | | | | ✓ | | | ✓ |
| Assign Roles | ✓ | | | | | | | | |

### Encryption Strategy

- **In Transit:** TLS 1.2+ for all HTTPS connections
- **At Rest - Tokens:** AES-256-GCM encryption via .NET Data Protection API
- **At Rest - Database:** SQL Server Transparent Data Encryption (TDE)
- **Checksums:** SHA-256 for document integrity verification

### Session Management

- Session stored server-side in SQL Server
- HTTP-only, Secure, SameSite=Strict cookie
- 30-minute inactivity timeout
- Sliding expiration on each request
- Session invalidated on token refresh failure



## Data Flow Diagrams

### Document Upload Flow

```
Department_User                RMRS API               Bitrix Platform
     │                            │                         │
     │  1. Upload file            │                         │
     │  (multipart/form-data)     │                         │
     │ ──────────────────────────►│                         │
     │                            │  2. Validate file       │
     │                            │  (size ≤ 100MB)         │
     │                            │                         │
     │                            │  3. Compute SHA-256     │
     │                            │                         │
     │                            │  4. Ensure folder       │
     │                            │  structure exists       │
     │                            │ ───────────────────────►│
     │                            │◄───────────────────────│
     │                            │                         │
     │                            │  5. Upload file to      │
     │                            │  workgroup drive        │
     │                            │ ───────────────────────►│
     │                            │                         │
     │                            │  6. Return Bitrix       │
     │                            │  file ID                │
     │                            │◄───────────────────────│
     │                            │                         │
     │                            │  7. Store metadata +    │
     │                            │  checksum + file ref    │
     │                            │  in SQL Server          │
     │                            │                         │
     │                            │  8. Write audit log     │
     │                            │                         │
     │  9. Return success +       │                         │
     │  document metadata         │                         │
     │◄──────────────────────────│                         │
```

### Record Registration Flow

```
Registry_Clerk                 RMRS API               SQL Server
     │                            │                       │
     │  1. POST /records/incoming │                       │
     │ ──────────────────────────►│                       │
     │                            │  2. Validate metadata │
     │                            │                       │
     │                            │  3. Get next sequence │
     │                            │  (atomic increment)   │
     │                            │ ─────────────────────►│
     │                            │◄─────────────────────│
     │                            │                       │
     │                            │  4. Generate registry │
     │                            │  number:              │
     │                            │  RMRS/FIN/2024/00042  │
     │                            │                       │
     │                            │  5. Inherit or set    │
     │                            │  classification level │
     │                            │                       │
     │                            │  6. Calculate         │
     │                            │  retention expiry     │
     │                            │                       │
     │                            │  7. Insert record     │
     │                            │ ─────────────────────►│
     │                            │◄─────────────────────│
     │                            │                       │
     │                            │  8. Write audit log   │
     │                            │ ─────────────────────►│
     │                            │                       │
     │  9. Return record with     │                       │
     │  registry number           │                       │
     │◄──────────────────────────│                       │
```

### Disposal Workflow

```
Records_Manager    Compliance_Officer    RMRS API          Bitrix       SQL Server
     │                    │                 │                │              │
     │ 1. Get candidates  │                 │                │              │
     │ ──────────────────────────────────►│                │              │
     │◄──────────────────────────────────│                │              │
     │                    │                 │                │              │
     │ 2. Initiate batch  │                 │                │              │
     │ ──────────────────────────────────►│                │              │
     │                    │                 │  3. Create batch│              │
     │                    │                 │ ──────────────────────────────►│
     │                    │                 │                │              │
     │                    │ 4. Re-auth      │                │              │
     │                    │◄────────────────│                │              │
     │                    │ 5. Approve      │                │              │
     │                    │ ───────────────►│                │              │
     │                    │                 │  6. Update status              │
     │                    │                 │ ──────────────────────────────►│
     │                    │                 │                │              │
     │ 7. Execute disposal│                 │                │              │
     │ ──────────────────────────────────►│                │              │
     │                    │                 │  8. Delete files│              │
     │                    │                 │ ──────────────►│              │
     │                    │                 │◄──────────────│              │
     │                    │                 │                │              │
     │                    │                 │  9. Remove file refs,          │
     │                    │                 │  retain metadata               │
     │                    │                 │ ──────────────────────────────►│
     │                    │                 │                │              │
     │                    │                 │ 10. Generate certificate       │
     │                    │                 │ ──────────────────────────────►│
     │                    │                 │                │              │
     │ 11. Certificate    │                 │                │              │
     │◄──────────────────────────────────│                │              │
```



### Token Refresh Flow

```
Any User Request       RMRS Middleware        Token Service       Bitrix OAuth
     │                      │                      │                   │
     │  API Request         │                      │                   │
     │ ────────────────────►│                      │                   │
     │                      │  Check token expiry  │                   │
     │                      │ ────────────────────►│                   │
     │                      │                      │                   │
     │                      │  Token expired!      │                   │
     │                      │◄────────────────────│                   │
     │                      │                      │                   │
     │                      │  Refresh token       │                   │
     │                      │ ────────────────────►│                   │
     │                      │                      │  POST /oauth/token│
     │                      │                      │ ─────────────────►│
     │                      │                      │◄─────────────────│
     │                      │                      │                   │
     │                      │  New tokens stored   │                   │
     │                      │◄────────────────────│                   │
     │                      │                      │                   │
     │                      │  Continue with       │                   │
     │                      │  original request    │                   │
     │  Response            │                      │                   │
     │◄────────────────────│                      │                   │
```

## Error Handling Strategy

### Error Response Format

```csharp
public class ApiError
{
    public string Code { get; set; }        // Machine-readable error code
    public string Message { get; set; }     // Human-readable message
    public string? Detail { get; set; }     // Additional context
    public string TraceId { get; set; }     // Correlation ID for troubleshooting
}
```

### Error Categories

| Category | HTTP Status | Example |
|----------|:-----------:|---------|
| Validation Error | 400 | Missing required field |
| Authentication Error | 401 | Invalid/expired session |
| Authorization Error | 403 | Insufficient classification level |
| Not Found | 404 | Record does not exist |
| Conflict | 409 | Duplicate registry number (race condition) |
| Bitrix API Error | 502 | Bitrix service unavailable |
| Rate Limited | 429 | Too many Bitrix API calls |
| Server Error | 500 | Unhandled exception |

### Bitrix Integration Error Handling

- **Transient errors (5xx, timeout):** Retry with exponential backoff (1s, 4s, 16s)
- **Auth errors (401):** Attempt token refresh, then fail if refresh fails
- **Validation errors (400):** Return to caller immediately
- **File deletion failures during disposal:** Mark as "disposal pending", log for manual intervention



## Cross-Cutting Concerns

### Audit Interceptor

All entity changes are automatically captured via an EF Core `SaveChangesInterceptor`:

```csharp
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken)
    {
        var context = eventData.Context;
        var auditEntries = new List<AuditEntry>();
        
        foreach (var entry in context.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            // Capture previous/new values, create audit entry
            auditEntries.Add(CreateAuditEntry(entry));
        }
        
        // Append to AuditLogs table
        await PersistAuditEntriesAsync(auditEntries);
        return result;
    }
}
```

### Background Jobs

Implemented using .NET `IHostedService` with configurable intervals:

| Job | Default Interval | Description |
|-----|:----------------:|-------------|
| RetentionExpiryCheck | Daily 02:00 | Identifies records past retention date |
| OverdueLoanNotifier | Daily 08:00 | Sends notifications for overdue loans |
| TokenRefreshMonitor | Every 30 min | Pre-emptively refreshes near-expiry tokens |
| DatabaseBackup | Daily 01:00 | Triggers SQL Server backup job |

### Caching Strategy

- **File plan tree:** Cached in-memory, invalidated on any file plan change
- **Department mappings:** Cached in-memory, invalidated on mapping CRUD
- **User roles:** Cached per-session, refreshed on role changes
- **Lookup tables:** Cached in-memory with 1-hour TTL
- **Search results:** Not cached (real-time access control)

## Frontend Architecture (Angular 17+)

### Module Structure

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── auth/               # Auth service, guard, interceptor
│   ├── api/                # HTTP client services
│   └── layout/             # Shell, nav, header components
├── shared/                 # Shared components, pipes, directives
│   ├── components/         # Reusable UI components
│   └── models/             # TypeScript interfaces/types
├── features/
│   ├── dashboard/          # Role-based dashboards
│   ├── file-plan/          # File plan tree management
│   ├── registry/           # Record registration forms
│   ├── documents/          # Document upload/management
│   ├── physical-records/   # Location, scanning, loans
│   ├── disposal/           # Disposal workflow
│   ├── archive/            # Archive transfer
│   ├── search/             # Search interface
│   ├── reports/            # Report generation
│   ├── audit/              # Audit log viewer
│   ├── security/           # Role management
│   └── admin/              # System configuration
└── app.routes.ts           # Standalone component routing
```

### Key Angular Patterns

- **Standalone components** (no NgModules)
- **Signals** for reactive state management
- **Lazy loading** per feature route
- **HTTP interceptors** for auth token injection and error handling
- **Route guards** for role-based route protection
- **Reactive forms** with validation for all data entry



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Token Refresh Before API Call

*For any* API request made on behalf of a user whose access token has expired, the system SHALL attempt a token refresh before executing the API call, and only proceed if the refresh succeeds.

**Validates: Requirements 1.3**

### Property 2: User Profile Sync Consistency

*For any* valid Bitrix user profile received during authentication, the local user record SHALL contain the same Bitrix user ID, name, email, and department as the source profile.

**Validates: Requirements 1.5**

### Property 3: Token Encryption at Rest

*For any* OAuth token stored in the database, the stored value SHALL NOT equal the plaintext token value (i.e., it must be encrypted).

**Validates: Requirements 1.6**

### Property 4: Department-Workgroup One-to-One Mapping

*For any* two distinct department mappings in the system, they SHALL NOT share the same Bitrix workgroup ID, and no department SHALL have more than one workgroup mapping.

**Validates: Requirements 2.3**

### Property 5: Protected Deletion of Entities with Active Records

*For any* department mapping or file plan entry that has at least one associated active record, deletion SHALL be rejected by the system.

**Validates: Requirements 2.4, 3.3**

### Property 6: Department Mapping Data Completeness

*For any* saved department mapping, the stored record SHALL contain non-null values for department name, Bitrix workgroup ID, Bitrix drive ID, and creation timestamp.

**Validates: Requirements 2.5**

### Property 7: File Plan Tree Depth Constraint

*For any* file plan entry in the system, its depth in the hierarchical tree SHALL be between 1 and 5 inclusive.

**Validates: Requirements 3.1**

### Property 8: File Plan Entry Required Fields Validation

*For any* file plan entry creation request, if any of the required fields (classification code, title, description, retention rule, disposal authority reference) is missing, the system SHALL reject the request with a validation error.

**Validates: Requirements 3.2**



### Property 9: Deactivated File Plan Entry Blocks New Records

*For any* deactivated file plan entry, creating a new record classified under that entry SHALL fail, while existing records classified under it SHALL remain accessible for reading.

**Validates: Requirements 3.4**

### Property 10: Retention Rule Temporal Isolation

*For any* record created before a retention rule modification on its file plan entry, that record's retention expiry date SHALL be calculated using the original rule (not the modified one). Only records created after the modification SHALL use the new rule.

**Validates: Requirements 3.6**

### Property 11: Registry Number Format Compliance

*For any* auto-generated registry number, it SHALL match the pattern `RMRS/{DEPT}/{YYYY}/{SEQ:00000}` where DEPT is the department code, YYYY is the current four-digit year, and SEQ is a zero-padded five-digit sequential number.

**Validates: Requirements 4.1**

### Property 12: Record Registration Required Metadata Validation

*For any* record registration request, if any required metadata field (record type, subject, sender/recipient, date, file plan classification code, responsible officer) is missing, the system SHALL reject the request.

**Validates: Requirements 4.2**

### Property 13: Classification Level Inheritance Floor

*For any* registered record, its classification level SHALL be greater than or equal to the default classification level of its associated file plan entry. The level can only be overridden upward, never downward.

**Validates: Requirements 4.3**

### Property 14: Registry Number Global Uniqueness

*For any* two distinct records in the system, their registry numbers SHALL never be equal.

**Validates: Requirements 4.4**

### Property 15: Yearly Sequence Reset

*For any* department, the first registry number generated in a new calendar year SHALL have sequence number 00001.

**Validates: Requirements 4.6**

### Property 16: Document Checksum Round-Trip Integrity

*For any* document uploaded to the system, computing the SHA-256 checksum of the stored file content SHALL produce the same value as the checksum recorded at upload time. If the checksums differ, the system SHALL detect and report an integrity violation.

**Validates: Requirements 5.2, 5.6**



### Property 17: Document Version Monotonic Increment

*For any* document with N existing versions, uploading a new version SHALL result in version number N+1, and the new version record SHALL contain a valid upload timestamp, uploading user ID, and SHA-256 checksum.

**Validates: Requirements 5.3**

### Property 18: Upload Retry Bounded Attempts

*For any* transient document upload failure to Bitrix, the system SHALL retry no more than 3 times with exponential backoff delays (1s, 4s, 16s). After 3 failures, the system SHALL notify the user and log the failure.

**Validates: Requirements 5.5**

### Property 19: File Size Limit Enforcement

*For any* document upload request where the file size exceeds 100 MB, the system SHALL reject the upload with a validation error before attempting to send the file to Bitrix.

**Validates: Requirements 5.7**

### Property 20: Physical Record Barcode Uniqueness

*For any* two distinct physical records in the system, their generated barcode values SHALL never be equal.

**Validates: Requirements 6.1**

### Property 21: Movement History Completeness

*For any* physical record movement operation, the system SHALL create a movement history entry containing the previous location, new location, timestamp, and the user who performed the move.

**Validates: Requirements 6.4**

### Property 22: Loan Required Data

*For any* created loan record, the borrower user ID, loan date, and expected return date SHALL be non-null.

**Validates: Requirements 6.5**

### Property 23: Overdue Loan Detection

*For any* loan where the current date exceeds the expected return date AND the actual return date is null, the system SHALL identify the loan as overdue and generate a notification.

**Validates: Requirements 6.6**

### Property 24: Retention Expiry Calculation

*For any* record with a retention rule specifying Y years and M months, and a record creation date D, the calculated retention expiry date SHALL equal D + Y years + M months.

**Validates: Requirements 7.1**



### Property 25: Disposal Candidate Identification

*For any* record whose retention expiry date is on or before the current date and whose status is 'Active', the system SHALL include it in the disposal candidates list.

**Validates: Requirements 7.2**

### Property 26: Disposal Requires Authority and Approval

*For any* disposal batch, execution SHALL be blocked unless both a valid Disposal_Authority reference is specified AND a Compliance_Officer has approved the batch.

**Validates: Requirements 7.3**

### Property 27: Disposal Certificate Completeness

*For any* executed disposal batch, the generated disposal certificate SHALL contain the list of disposed records, the Disposal_Authority reference, the approver name, and the disposal date.

**Validates: Requirements 7.4**

### Property 28: Metadata Preservation After Electronic Disposal

*For any* electronically disposed record, the record metadata (registry number, subject, classification, dates) SHALL remain in the database, but Bitrix file references SHALL be removed.

**Validates: Requirements 7.5**

### Property 29: Disposal Certificates and Audit Logs Are Never Disposed

*For any* disposal certificate or audit log entry, the retention engine SHALL never mark it as a disposal candidate, regardless of any other retention rules in the system.

**Validates: Requirements 7.7**

### Property 30: Transfer Batch Eligibility

*For any* record added to an archive transfer batch, the record SHALL have completed its retention period AND be marked for archival transfer in its Disposal_Authority.

**Validates: Requirements 8.1**

### Property 31: Transfer Batch Metadata Validation

*For any* record in a transfer batch, it SHALL have complete metadata including classification code, registry number, title, date range, and format type. Records with incomplete metadata SHALL be excluded.

**Validates: Requirements 8.2, 8.5**

### Property 32: Archive Status Transition

*For any* completed archive transfer batch, all contained records SHALL have status "Archived" with non-null archive reference number, transfer date, and receiving archive name.

**Validates: Requirements 8.4**



### Property 33: Search Returns Matching Records

*For any* record whose subject, registry number, sender/recipient, classification code, or responsible officer contains a given search term, that record SHALL appear in search results when the user has access to it.

**Validates: Requirements 9.1**

### Property 34: Access Control Enforcement (Comprehensive)

*For any* record accessed or returned in search/report results for a given user: (a) if the user has a department-restricted role (Department_User, Department_Supervisor), the record's department SHALL match the user's assigned department; AND (b) the record's classification level SHALL be less than or equal to the user's maximum authorized classification level. Violations SHALL be denied and logged.

**Validates: Requirements 9.2, 10.2, 10.3, 10.6, 12.5**

### Property 35: Search Result Field Completeness

*For any* item in a search result set, it SHALL contain registry number, subject, record type, date, classification code, and status.

**Validates: Requirements 9.5**

### Property 36: Role Assignment Audit Trail

*For any* role assignment operation, the system SHALL record the effective date, assigning administrator ID, and justification. All three fields SHALL be non-null.

**Validates: Requirements 10.4**

### Property 37: Session Timeout Enforcement

*For any* user session where the last activity timestamp is more than 30 minutes before the current time, the session SHALL be considered expired and further requests SHALL require re-authentication.

**Validates: Requirements 10.7**

### Property 38: Comprehensive Audit Log Creation

*For any* create, update, delete, or status change operation on any auditable entity (record, file plan entry, document, physical record, configuration), an audit log entry SHALL exist containing: user ID, timestamp, action type, affected entity ID, and source IP address. For update operations, previous and new values SHALL also be recorded.

**Validates: Requirements 11.1, 11.2**

### Property 39: Audit Log Immutability

*For any* existing audit log entry, any attempt to UPDATE or DELETE the entry SHALL be rejected by the database, regardless of the user's role (including System_Administrator).

**Validates: Requirements 11.3**

### Property 40: Configuration Change Audit with Reason

*For any* system configuration modification by a System_Administrator, an audit log entry SHALL exist containing the configuration key, previous value, new value, and reason for change.

**Validates: Requirements 13.5**

### Property 41: Configuration Validation Before Apply

*For any* configuration update request with an invalid value (e.g., malformed URL for OAuth endpoints, non-numeric value for numeric settings), the system SHALL reject the update and return validation errors without modifying the stored configuration.

**Validates: Requirements 13.6**
