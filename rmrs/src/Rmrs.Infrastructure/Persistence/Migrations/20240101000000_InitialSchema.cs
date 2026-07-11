using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rmrs.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class InitialSchema : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Users table
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                BitrixUserId = table.Column<int>(nullable: false),
                Email = table.Column<string>(maxLength: 256, nullable: false),
                FullName = table.Column<string>(maxLength: 256, nullable: false),
                DepartmentCode = table.Column<string>(maxLength: 20, nullable: true),
                MaxClassificationLevel = table.Column<int>(nullable: false, defaultValue: 0),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateIndex("IX_Users_BitrixUserId", "Users", "BitrixUserId", unique: true);


        // UserTokens table
        migrationBuilder.CreateTable(
            name: "UserTokens",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                UserId = table.Column<int>(nullable: false),
                AccessTokenEncrypted = table.Column<byte[]>(nullable: false),
                RefreshTokenEncrypted = table.Column<byte[]>(nullable: false),
                AccessTokenExpiresAt = table.Column<DateTime>(nullable: false),
                RefreshTokenExpiresAt = table.Column<DateTime>(nullable: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserTokens", x => x.Id);
                table.ForeignKey("FK_UserTokens_Users_UserId", x => x.UserId, "Users", "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // UserRoles table
        migrationBuilder.CreateTable(
            name: "UserRoles",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                UserId = table.Column<int>(nullable: false),
                RoleName = table.Column<string>(maxLength: 50, nullable: false),
                EffectiveDate = table.Column<DateTime>(nullable: false),
                AssignedByUserId = table.Column<int>(nullable: false),
                Justification = table.Column<string>(maxLength: 500, nullable: false),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserRoles", x => x.Id);
                table.ForeignKey("FK_UserRoles_Users_UserId", x => x.UserId, "Users", "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_UserRoles_Users_AssignedByUserId", x => x.AssignedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
            });


        // UserSessions table
        migrationBuilder.CreateTable(
            name: "UserSessions",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false, defaultValueSql: "NEWID()"),
                UserId = table.Column<int>(nullable: false),
                SessionToken = table.Column<string>(maxLength: 512, nullable: false),
                LastActivityAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                ExpiresAt = table.Column<DateTime>(nullable: false),
                IpAddress = table.Column<string>(maxLength: 45, nullable: true),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserSessions", x => x.Id);
                table.ForeignKey("FK_UserSessions_Users_UserId", x => x.UserId, "Users", "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // Departments table
        migrationBuilder.CreateTable(
            name: "Departments",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                DepartmentCode = table.Column<string>(maxLength: 20, nullable: false),
                DepartmentName = table.Column<string>(maxLength: 256, nullable: false),
                BitrixWorkgroupId = table.Column<int>(nullable: false),
                BitrixDriveId = table.Column<int>(nullable: false),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Departments", x => x.Id);
            });

        migrationBuilder.CreateIndex("IX_Departments_DepartmentCode", "Departments", "DepartmentCode", unique: true);
        migrationBuilder.CreateIndex("IX_Departments_BitrixWorkgroupId", "Departments", "BitrixWorkgroupId", unique: true);


        // RetentionRules table
        migrationBuilder.CreateTable(
            name: "RetentionRules",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                RuleName = table.Column<string>(maxLength: 256, nullable: false),
                RetentionYears = table.Column<int>(nullable: false),
                RetentionMonths = table.Column<int>(nullable: false, defaultValue: 0),
                DisposalAction = table.Column<string>(maxLength: 50, nullable: false),
                Description = table.Column<string>(maxLength: 1000, nullable: true),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_RetentionRules", x => x.Id);
            });

        // FilePlanEntries table
        migrationBuilder.CreateTable(
            name: "FilePlanEntries",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                ParentId = table.Column<int>(nullable: true),
                ClassificationCode = table.Column<string>(maxLength: 50, nullable: false),
                Title = table.Column<string>(maxLength: 256, nullable: false),
                Description = table.Column<string>(maxLength: 2000, nullable: true),
                Level = table.Column<int>(nullable: false),
                RetentionRuleId = table.Column<int>(nullable: false),
                DisposalAuthorityRef = table.Column<string>(maxLength: 100, nullable: false),
                DefaultClassificationLevel = table.Column<int>(nullable: false, defaultValue: 0),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                DeactivatedAt = table.Column<DateTime>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_FilePlanEntries", x => x.Id);
                table.ForeignKey("FK_FilePlanEntries_FilePlanEntries_ParentId", x => x.ParentId, "FilePlanEntries", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_FilePlanEntries_RetentionRules_RetentionRuleId", x => x.RetentionRuleId, "RetentionRules", "Id",
                    onDelete: ReferentialAction.Restrict);
                table.CheckConstraint("CK_FilePlanEntries_Level", "[Level] BETWEEN 1 AND 5");
            });

        migrationBuilder.CreateIndex("IX_FilePlanEntries_ClassificationCode", "FilePlanEntries", "ClassificationCode", unique: true);


        // Records table
        migrationBuilder.CreateTable(
            name: "Records",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                RegistryNumber = table.Column<string>(maxLength: 30, nullable: false),
                RecordType = table.Column<string>(maxLength: 20, nullable: false),
                Subject = table.Column<string>(maxLength: 500, nullable: false),
                SenderOrRecipient = table.Column<string>(maxLength: 256, nullable: true),
                DateReceivedOrSent = table.Column<DateTime>(type: "date", nullable: false),
                FilePlanEntryId = table.Column<int>(nullable: false),
                ClassificationLevel = table.Column<int>(nullable: false),
                ResponsibleOfficerId = table.Column<int>(nullable: false),
                DepartmentId = table.Column<int>(nullable: false),
                ExternalReferenceNumber = table.Column<string>(maxLength: 100, nullable: true),
                OriginatingOrganization = table.Column<string>(maxLength: 256, nullable: true),
                CorrespondenceDate = table.Column<DateTime>(type: "date", nullable: true),
                Status = table.Column<string>(maxLength: 30, nullable: false, defaultValue: "Active"),
                RetentionExpiryDate = table.Column<DateTime>(type: "date", nullable: true),
                CreatedByUserId = table.Column<int>(nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Records", x => x.Id);
                table.ForeignKey("FK_Records_FilePlanEntries", x => x.FilePlanEntryId, "FilePlanEntries", "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_Records_Users_ResponsibleOfficerId", x => x.ResponsibleOfficerId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_Records_Departments", x => x.DepartmentId, "Departments", "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_Records_Users_CreatedByUserId", x => x.CreatedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.CheckConstraint("CK_Records_RecordType", "[RecordType] IN ('Incoming', 'Outgoing', 'Internal')");
            });

        migrationBuilder.CreateIndex("IX_Records_RegistryNumber", "Records", "RegistryNumber", unique: true);
        migrationBuilder.CreateIndex("IX_Records_DepartmentId", "Records", "DepartmentId");
        migrationBuilder.CreateIndex("IX_Records_FilePlanEntryId", "Records", "FilePlanEntryId");
        migrationBuilder.CreateIndex("IX_Records_Status", "Records", "Status");
        migrationBuilder.CreateIndex("IX_Records_RetentionExpiryDate", "Records", "RetentionExpiryDate");


        // RegistrySequences table
        migrationBuilder.CreateTable(
            name: "RegistrySequences",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                DepartmentCode = table.Column<string>(maxLength: 20, nullable: false),
                Year = table.Column<int>(nullable: false),
                CurrentSequence = table.Column<int>(nullable: false, defaultValue: 0)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_RegistrySequences", x => x.Id);
            });

        migrationBuilder.CreateIndex("UQ_RegistrySequences", "RegistrySequences",
            new[] { "DepartmentCode", "Year" }, unique: true);

        // Documents table
        migrationBuilder.CreateTable(
            name: "Documents",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                RecordId = table.Column<int>(nullable: false),
                FileName = table.Column<string>(maxLength: 256, nullable: false),
                FileSize = table.Column<long>(nullable: false),
                MimeType = table.Column<string>(maxLength: 100, nullable: false),
                CurrentVersion = table.Column<int>(nullable: false, defaultValue: 1),
                BitrixFileId = table.Column<int>(nullable: false),
                BitrixFolderId = table.Column<int>(nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Documents", x => x.Id);
                table.ForeignKey("FK_Documents_Records", x => x.RecordId, "Records", "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        // DocumentVersions table
        migrationBuilder.CreateTable(
            name: "DocumentVersions",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                DocumentId = table.Column<int>(nullable: false),
                VersionNumber = table.Column<int>(nullable: false),
                BitrixFileId = table.Column<int>(nullable: false),
                Sha256Checksum = table.Column<string>(maxLength: 64, nullable: false),
                FileSize = table.Column<long>(nullable: false),
                UploadedByUserId = table.Column<int>(nullable: false),
                UploadedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DocumentVersions", x => x.Id);
                table.ForeignKey("FK_DocumentVersions_Documents", x => x.DocumentId, "Documents", "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_DocumentVersions_Users", x => x.UploadedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex("UQ_DocVersion", "DocumentVersions",
            new[] { "DocumentId", "VersionNumber" }, unique: true);
        migrationBuilder.CreateIndex("IX_DocumentVersions_Checksum", "DocumentVersions", "Sha256Checksum");


        // StorageLocations table
        migrationBuilder.CreateTable(
            name: "StorageLocations",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                ParentId = table.Column<int>(nullable: true),
                LocationType = table.Column<string>(maxLength: 20, nullable: false),
                LocationName = table.Column<string>(maxLength: 100, nullable: false),
                LocationCode = table.Column<string>(maxLength: 50, nullable: false),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StorageLocations", x => x.Id);
                table.ForeignKey("FK_StorageLocations_StorageLocations_ParentId", x => x.ParentId, "StorageLocations", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.CheckConstraint("CK_StorageLocations_LocationType",
                    "[LocationType] IN ('Building', 'Floor', 'Room', 'Shelf', 'Position')");
            });

        migrationBuilder.CreateIndex("IX_StorageLocations_LocationCode", "StorageLocations", "LocationCode", unique: true);

        // PhysicalRecords table
        migrationBuilder.CreateTable(
            name: "PhysicalRecords",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                RecordId = table.Column<int>(nullable: false),
                BarcodeValue = table.Column<string>(maxLength: 50, nullable: false),
                QrCodeValue = table.Column<string>(maxLength: 200, nullable: false),
                CurrentLocationId = table.Column<int>(nullable: true),
                Status = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "InStorage"),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PhysicalRecords", x => x.Id);
                table.ForeignKey("FK_PhysicalRecords_Records", x => x.RecordId, "Records", "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_PhysicalRecords_StorageLocations", x => x.CurrentLocationId, "StorageLocations", "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex("IX_PhysicalRecords_BarcodeValue", "PhysicalRecords", "BarcodeValue", unique: true);


        // PhysicalRecordMovements table
        migrationBuilder.CreateTable(
            name: "PhysicalRecordMovements",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                PhysicalRecordId = table.Column<int>(nullable: false),
                FromLocationId = table.Column<int>(nullable: true),
                ToLocationId = table.Column<int>(nullable: false),
                MovedByUserId = table.Column<int>(nullable: false),
                MovedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PhysicalRecordMovements", x => x.Id);
                table.ForeignKey("FK_PhysicalRecordMovements_PhysicalRecords", x => x.PhysicalRecordId, "PhysicalRecords", "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_PhysicalRecordMovements_StorageLocations_From", x => x.FromLocationId, "StorageLocations", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_PhysicalRecordMovements_StorageLocations_To", x => x.ToLocationId, "StorageLocations", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_PhysicalRecordMovements_Users", x => x.MovedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        // Loans table
        migrationBuilder.CreateTable(
            name: "Loans",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                PhysicalRecordId = table.Column<int>(nullable: false),
                BorrowerUserId = table.Column<int>(nullable: false),
                LoanDate = table.Column<DateTime>(type: "date", nullable: false),
                ExpectedReturnDate = table.Column<DateTime>(type: "date", nullable: false),
                ActualReturnDate = table.Column<DateTime>(type: "date", nullable: true),
                Status = table.Column<string>(maxLength: 20, nullable: false, defaultValue: "Active"),
                CreatedByUserId = table.Column<int>(nullable: false),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Loans", x => x.Id);
                table.ForeignKey("FK_Loans_PhysicalRecords", x => x.PhysicalRecordId, "PhysicalRecords", "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_Loans_Users_Borrower", x => x.BorrowerUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_Loans_Users_CreatedBy", x => x.CreatedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex("IX_Loans_Status", "Loans", "Status");
        migrationBuilder.CreateIndex("IX_Loans_ExpectedReturnDate", "Loans", "ExpectedReturnDate",
            filter: "[ActualReturnDate] IS NULL");


        // DisposalBatches table
        migrationBuilder.CreateTable(
            name: "DisposalBatches",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                BatchNumber = table.Column<string>(maxLength: 50, nullable: false),
                DisposalAuthorityRef = table.Column<string>(maxLength: 100, nullable: false),
                Status = table.Column<string>(maxLength: 30, nullable: false, defaultValue: "Initiated"),
                InitiatedByUserId = table.Column<int>(nullable: false),
                ApprovedByUserId = table.Column<int>(nullable: true),
                InitiatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                ApprovedAt = table.Column<DateTime>(nullable: true),
                ExecutedAt = table.Column<DateTime>(nullable: true),
                CertificateGenerated = table.Column<bool>(nullable: false, defaultValue: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DisposalBatches", x => x.Id);
                table.ForeignKey("FK_DisposalBatches_Users_Initiated", x => x.InitiatedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_DisposalBatches_Users_Approved", x => x.ApprovedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex("IX_DisposalBatches_BatchNumber", "DisposalBatches", "BatchNumber", unique: true);

        // DisposalBatchRecords table
        migrationBuilder.CreateTable(
            name: "DisposalBatchRecords",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                DisposalBatchId = table.Column<int>(nullable: false),
                RecordId = table.Column<int>(nullable: false),
                DisposalStatus = table.Column<string>(maxLength: 30, nullable: false, defaultValue: "Pending")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DisposalBatchRecords", x => x.Id);
                table.ForeignKey("FK_DisposalBatchRecords_Batches", x => x.DisposalBatchId, "DisposalBatches", "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_DisposalBatchRecords_Records", x => x.RecordId, "Records", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex("UQ_DisposalBatchRecord", "DisposalBatchRecords",
            new[] { "DisposalBatchId", "RecordId" }, unique: true);


        // DisposalCertificates table
        migrationBuilder.CreateTable(
            name: "DisposalCertificates",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                DisposalBatchId = table.Column<int>(nullable: false),
                CertificateNumber = table.Column<string>(maxLength: 50, nullable: false),
                GeneratedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                CertificateData = table.Column<byte[]>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DisposalCertificates", x => x.Id);
                table.ForeignKey("FK_DisposalCertificates_Batches", x => x.DisposalBatchId, "DisposalBatches", "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex("IX_DisposalCertificates_CertificateNumber", "DisposalCertificates",
            "CertificateNumber", unique: true);

        // TransferBatches table
        migrationBuilder.CreateTable(
            name: "TransferBatches",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                BatchNumber = table.Column<string>(maxLength: 50, nullable: false),
                DestinationArchive = table.Column<string>(maxLength: 256, nullable: false),
                Status = table.Column<string>(maxLength: 30, nullable: false, defaultValue: "Draft"),
                CreatedByUserId = table.Column<int>(nullable: false),
                FinalizedAt = table.Column<DateTime>(nullable: true),
                CompletedAt = table.Column<DateTime>(nullable: true),
                ArchiveReferenceNumber = table.Column<string>(maxLength: 100, nullable: true),
                CreatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TransferBatches", x => x.Id);
                table.ForeignKey("FK_TransferBatches_Users", x => x.CreatedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex("IX_TransferBatches_BatchNumber", "TransferBatches", "BatchNumber", unique: true);

        // TransferBatchRecords table
        migrationBuilder.CreateTable(
            name: "TransferBatchRecords",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                TransferBatchId = table.Column<int>(nullable: false),
                RecordId = table.Column<int>(nullable: false),
                ValidationStatus = table.Column<string>(maxLength: 30, nullable: false, defaultValue: "Pending"),
                ValidationErrors = table.Column<string>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TransferBatchRecords", x => x.Id);
                table.ForeignKey("FK_TransferBatchRecords_Batches", x => x.TransferBatchId, "TransferBatches", "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_TransferBatchRecords_Records", x => x.RecordId, "Records", "Id",
                    onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex("UQ_TransferBatchRecord", "TransferBatchRecords",
            new[] { "TransferBatchId", "RecordId" }, unique: true);


        // AuditLogs table (append-only)
        migrationBuilder.CreateTable(
            name: "AuditLogs",
            columns: table => new
            {
                Id = table.Column<long>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                UserId = table.Column<int>(nullable: false),
                Timestamp = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()"),
                ActionType = table.Column<string>(maxLength: 50, nullable: false),
                EntityType = table.Column<string>(maxLength: 50, nullable: false),
                EntityId = table.Column<int>(nullable: false),
                PreviousValue = table.Column<string>(nullable: true),
                NewValue = table.Column<string>(nullable: true),
                SourceIpAddress = table.Column<string>(maxLength: 45, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AuditLogs", x => x.Id);
            });

        migrationBuilder.CreateIndex("IX_AuditLogs_Timestamp", "AuditLogs", "Timestamp");
        migrationBuilder.CreateIndex("IX_AuditLogs_EntityType_EntityId", "AuditLogs",
            new[] { "EntityType", "EntityId" });
        migrationBuilder.CreateIndex("IX_AuditLogs_UserId", "AuditLogs", "UserId");

        // SystemConfiguration table
        migrationBuilder.CreateTable(
            name: "SystemConfiguration",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                ConfigKey = table.Column<string>(maxLength: 100, nullable: false),
                ConfigValue = table.Column<string>(nullable: false),
                Description = table.Column<string>(maxLength: 500, nullable: true),
                UpdatedByUserId = table.Column<int>(nullable: true),
                UpdatedAt = table.Column<DateTime>(nullable: false, defaultValueSql: "GETUTCDATE()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SystemConfiguration", x => x.Id);
                table.ForeignKey("FK_SystemConfiguration_Users", x => x.UpdatedByUserId, "Users", "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex("IX_SystemConfiguration_ConfigKey", "SystemConfiguration", "ConfigKey", unique: true);

        // LookupValues table
        migrationBuilder.CreateTable(
            name: "LookupValues",
            columns: table => new
            {
                Id = table.Column<int>(nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                LookupType = table.Column<string>(maxLength: 50, nullable: false),
                Code = table.Column<string>(maxLength: 50, nullable: false),
                DisplayName = table.Column<string>(maxLength: 256, nullable: false),
                SortOrder = table.Column<int>(nullable: false, defaultValue: 0),
                IsActive = table.Column<bool>(nullable: false, defaultValue: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_LookupValues", x => x.Id);
            });

        migrationBuilder.CreateIndex("UQ_LookupValue", "LookupValues",
            new[] { "LookupType", "Code" }, unique: true);


        // Full-Text Catalog and Index
        migrationBuilder.Sql(@"
            CREATE FULLTEXT CATALOG RmrsFullTextCatalog AS DEFAULT;
        ");

        migrationBuilder.Sql(@"
            CREATE FULLTEXT INDEX ON Records (Subject, SenderOrRecipient, ExternalReferenceNumber, OriginatingOrganization)
                KEY INDEX PK_Records ON RmrsFullTextCatalog;
        ");

        // Deny UPDATE/DELETE on AuditLogs for the app user (append-only enforcement)
        migrationBuilder.Sql(@"
            -- Note: Execute this after creating the RmrsAppUser database login/user
            -- DENY UPDATE ON AuditLogs TO [RmrsAppUser];
            -- DENY DELETE ON AuditLogs TO [RmrsAppUser];
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Drop full-text index and catalog
        migrationBuilder.Sql("DROP FULLTEXT INDEX ON Records;");
        migrationBuilder.Sql("DROP FULLTEXT CATALOG RmrsFullTextCatalog;");

        // Drop tables in reverse dependency order
        migrationBuilder.DropTable("TransferBatchRecords");
        migrationBuilder.DropTable("TransferBatches");
        migrationBuilder.DropTable("DisposalCertificates");
        migrationBuilder.DropTable("DisposalBatchRecords");
        migrationBuilder.DropTable("DisposalBatches");
        migrationBuilder.DropTable("Loans");
        migrationBuilder.DropTable("PhysicalRecordMovements");
        migrationBuilder.DropTable("PhysicalRecords");
        migrationBuilder.DropTable("StorageLocations");
        migrationBuilder.DropTable("DocumentVersions");
        migrationBuilder.DropTable("Documents");
        migrationBuilder.DropTable("RegistrySequences");
        migrationBuilder.DropTable("Records");
        migrationBuilder.DropTable("FilePlanEntries");
        migrationBuilder.DropTable("RetentionRules");
        migrationBuilder.DropTable("LookupValues");
        migrationBuilder.DropTable("SystemConfiguration");
        migrationBuilder.DropTable("AuditLogs");
        migrationBuilder.DropTable("UserSessions");
        migrationBuilder.DropTable("UserRoles");
        migrationBuilder.DropTable("UserTokens");
        migrationBuilder.DropTable("Users");
    }
}
