# Requirements Document

## Introduction

The Records Management and Registry System (RMRS) is a new standalone web application for JB Marks Local Municipality that integrates with Bitrix SDinMotion for document storage and authentication. The system manages the full lifecycle of municipal records — from creation and classification through retention, disposal, and archival — in compliance with NARSSA principles and SANS ISO 16175-2:2014. Built on C# (.NET 8), Angular 17+, and SQL Server, the application provides 12 functional modules covering file plan management, records registry, electronic and physical document control, retention/disposal workflows, search, security, audit, reporting, and administration. All document storage is delegated to Bitrix workgroup drives, with RMRS storing metadata and Bitrix file references only.

## Glossary

- **RMRS**: Records Management and Registry System — the application being specified
- **Bitrix_Platform**: The Bitrix SDinMotion instance hosted at jbmarks.sdinmotion.co.za providing OAuth authentication, REST API, and workgroup drives
- **Workgroup_Drive**: A Bitrix storage area associated with a single department, used for document storage
- **File_Plan**: A hierarchical classification structure defining how records are organized, retained, and disposed of
- **Registry_Number**: A unique identifier assigned to each record following the pattern RMRS/{DEPT}/{YYYY}/{SEQ:00000}
- **Retention_Rule**: A rule specifying how long a record category must be retained before disposal or transfer
- **Disposal_Authority**: A reference to the approved authority permitting destruction or transfer of records
- **OAuth_Token**: An access token obtained via Bitrix OAuth 2.0 used to authenticate REST API calls
- **Records_Manager**: A user role responsible for managing file plans, retention rules, and disposal processes
- **Registry_Clerk**: A user role responsible for registering incoming, outgoing, and internal records
- **Department_User**: A user role with access to records within their assigned department
- **Department_Supervisor**: A user role with elevated access to approve and oversee departmental records
- **Compliance_Officer**: A user role responsible for monitoring compliance with records management policies
- **Auditor**: A user role with read-only access to audit logs and compliance reports
- **Archivist**: A user role responsible for archive transfer processes
- **Executive_Viewer**: A user role with access to executive dashboards and summary reports
- **System_Administrator**: A user role with full system configuration access
- **Classification_Level**: A security classification (e.g., Public, Internal, Confidential, Restricted) assigned to records
- **NARSSA**: National Archives and Records Service of South Africa — the regulatory body for public records
- **SANS_ISO_16175**: South African standard for managing electronic records, aligned to ISO 16175-2:2014

## Requirements

### Requirement 1: Bitrix OAuth Authentication

**User Story:** As a municipal employee, I want to authenticate using my existing Bitrix credentials, so that I have single sign-on access without managing separate passwords.

#### Acceptance Criteria

1. WHEN a user navigates to the RMRS login page, THE RMRS SHALL redirect the user to the Bitrix_Platform OAuth 2.0 authorization endpoint at jbmarks.sdinmotion.co.za.
2. WHEN the Bitrix_Platform redirects to the callback URL https://records.sdinmotion.co.za/auth/bitrix/callback with an authorization code, THE RMRS SHALL exchange the authorization code for an OAuth_Token pair (access token and refresh token).
3. WHEN an OAuth_Token access token expires, THE RMRS SHALL request a new access token using the refresh token via oauth.bitrix.info/oauth/token before the next API call.
4. IF the refresh token exchange fails, THEN THE RMRS SHALL invalidate the user session and redirect the user to the login page with an appropriate error message.
5. WHEN a user authenticates successfully, THE RMRS SHALL retrieve the user profile from Bitrix_Platform REST API and create or update the local user record with Bitrix user ID, name, email, and department.
6. THE RMRS SHALL store OAuth_Token values encrypted at rest in the SQL Server database.

### Requirement 2: Department Workgroup Mapping

**User Story:** As a System_Administrator, I want to map each municipal department to its corresponding Bitrix workgroup drive, so that records are stored in the correct departmental location.

#### Acceptance Criteria

1. THE RMRS SHALL provide an interface for the System_Administrator to create, update, and delete mappings between departments and Bitrix Workgroup_Drive identifiers.
2. WHEN a System_Administrator creates a department mapping, THE RMRS SHALL validate the Workgroup_Drive identifier by calling the Bitrix_Platform REST API to confirm the workgroup exists.
3. THE RMRS SHALL enforce a one-to-one relationship between each department and a single Workgroup_Drive.
4. IF a System_Administrator attempts to delete a department mapping that has associated records, THEN THE RMRS SHALL prevent deletion and display a message indicating active records exist.
5. WHEN the System_Administrator saves a department mapping, THE RMRS SHALL store the department name, Bitrix workgroup ID, Bitrix drive ID, and the mapping creation timestamp in the SQL Server database.

### Requirement 3: File Plan Management

**User Story:** As a Records_Manager, I want to define and maintain a hierarchical file plan, so that all records are classified according to NARSSA standards.

#### Acceptance Criteria

1. THE RMRS SHALL allow Records_Manager users to create, modify, and deactivate file plan entries organized in a hierarchical tree structure of up to 5 levels.
2. WHEN a Records_Manager creates a file plan entry, THE RMRS SHALL require a unique classification code, title, description, associated Retention_Rule, and Disposal_Authority reference.
3. THE RMRS SHALL prevent deletion of file plan entries that have active records classified under them; only deactivation shall be permitted.
4. WHEN a file plan entry is deactivated, THE RMRS SHALL prevent new records from being classified under that entry while retaining access to existing records.
5. THE RMRS SHALL associate each file plan entry with a default Classification_Level that applies to records created under it.
6. WHEN a Records_Manager modifies a Retention_Rule on a file plan entry, THE RMRS SHALL apply the updated rule only to records created after the modification date.

### Requirement 4: Records Registry

**User Story:** As a Registry_Clerk, I want to register incoming, outgoing, and internal records with auto-generated registry numbers, so that every record is uniquely identifiable and traceable.

#### Acceptance Criteria

1. WHEN a Registry_Clerk registers a new record, THE RMRS SHALL auto-generate a Registry_Number following the pattern RMRS/{DEPT}/{YYYY}/{SEQ:00000} where DEPT is the department code, YYYY is the current year, and SEQ is a zero-padded sequential number.
2. THE RMRS SHALL require the following metadata for each registered record: record type (incoming, outgoing, or internal), subject, sender or recipient, date received or sent, file plan classification code, and responsible officer.
3. WHEN a record is registered, THE RMRS SHALL assign the Classification_Level inherited from the associated file plan entry unless the Registry_Clerk explicitly overrides it to a higher level.
4. THE RMRS SHALL guarantee Registry_Number uniqueness across the entire system through database-level constraints.
5. WHEN a Registry_Clerk registers an incoming record, THE RMRS SHALL capture the external reference number, originating organization, and date of correspondence.
6. THE RMRS SHALL reset the sequential number (SEQ) portion of the Registry_Number to 00001 at the start of each calendar year for each department.

### Requirement 5: Electronic Document Control

**User Story:** As a Department_User, I want to upload and link electronic documents to Bitrix workgroup drives with version tracking, so that documents are securely stored and their integrity is verifiable.

#### Acceptance Criteria

1. WHEN a Department_User uploads a document, THE RMRS SHALL upload the file to the associated department Workgroup_Drive via the Bitrix_Platform REST API and store the returned Bitrix file ID as a reference.
2. WHEN a document is uploaded, THE RMRS SHALL compute a SHA-256 checksum of the file content and store the checksum in the SQL Server database alongside the Bitrix file reference.
3. WHEN a Department_User uploads a new version of an existing document, THE RMRS SHALL create a new version in the Bitrix_Platform and record the version number, upload timestamp, uploading user, and checksum in the RMRS database.
4. THE RMRS SHALL create folder structures in the Workgroup_Drive that mirror the file plan hierarchy for the department.
5. IF a document upload to Bitrix_Platform fails, THEN THE RMRS SHALL retry the upload up to 3 times with exponential backoff, and if all retries fail, notify the user and log the failure.
6. WHEN a Department_User requests a document, THE RMRS SHALL verify the current Bitrix file checksum against the stored checksum and alert the user if a mismatch is detected.
7. THE RMRS SHALL enforce a maximum file size of 100 MB per individual document upload.

### Requirement 6: Physical Records Control

**User Story:** As a Registry_Clerk, I want to track physical records using barcodes and QR codes with location hierarchy, so that physical files can be located and movements audited.

#### Acceptance Criteria

1. WHEN a physical record is registered, THE RMRS SHALL generate a unique barcode and QR code label for the record.
2. THE RMRS SHALL maintain a storage location hierarchy consisting of building, floor, room, shelf, and position levels.
3. WHEN a Registry_Clerk scans a barcode or QR code, THE RMRS SHALL display the current location, assigned classification, and custody history of the physical record.
4. WHEN a physical record is moved to a new location, THE RMRS SHALL record the previous location, new location, date/time of movement, and the user who performed the move.
5. WHEN a physical record is loaned to a Department_User, THE RMRS SHALL record the borrower, loan date, expected return date, and actual return date upon check-in.
6. IF a loaned physical record exceeds its expected return date, THEN THE RMRS SHALL generate an overdue notification to the borrower and the Records_Manager.
7. THE RMRS SHALL provide a bulk scanning interface that allows a Registry_Clerk to scan multiple barcodes sequentially and assign them to a common new location.

### Requirement 7: Retention and Disposal

**User Story:** As a Records_Manager, I want to manage retention schedules and process disposal of records according to authorized disposal authorities, so that the municipality complies with NARSSA regulations.

#### Acceptance Criteria

1. THE RMRS SHALL calculate the retention expiry date for each record based on the Retention_Rule associated with the record's file plan entry and the record's creation date.
2. WHEN a record's retention period expires, THE RMRS SHALL add the record to the disposal candidates list and notify the Records_Manager.
3. WHEN a Records_Manager initiates disposal, THE RMRS SHALL require selection of a valid Disposal_Authority reference and approval from a Compliance_Officer before processing.
4. WHEN disposal is approved, THE RMRS SHALL generate a disposal certificate containing the list of records disposed, the Disposal_Authority reference, approver name, and disposal date.
5. WHEN electronic records are disposed, THE RMRS SHALL delete the files from the Bitrix_Platform Workgroup_Drive via the REST API and remove the file references from the RMRS database while retaining the metadata and disposal certificate.
6. IF deletion of a file from Bitrix_Platform fails during disposal, THEN THE RMRS SHALL mark the record as "disposal pending" and log the failure for manual intervention.
7. THE RMRS SHALL retain disposal certificates and audit records indefinitely regardless of other retention rules.

### Requirement 8: Archive Transfer

**User Story:** As an Archivist, I want to create transfer batches of records destined for the National Archives, so that transfers are documented and validated according to NARSSA requirements.

#### Acceptance Criteria

1. WHEN an Archivist creates a transfer batch, THE RMRS SHALL allow selection of records that have completed their retention period and are marked for archival transfer in their Disposal_Authority.
2. THE RMRS SHALL validate that each record in a transfer batch has complete metadata including classification code, Registry_Number, title, date range, and format type.
3. WHEN a transfer batch is finalized, THE RMRS SHALL generate a transfer manifest in PDF format containing batch number, transfer date, destination archive, list of records with metadata, and total record count.
4. WHEN a transfer batch is completed, THE RMRS SHALL update each transferred record's status to "Archived" and record the archive reference number, transfer date, and receiving archive.
5. IF a record in a transfer batch has incomplete metadata, THEN THE RMRS SHALL exclude that record from the batch and notify the Archivist of the missing fields.

### Requirement 9: Search and Retrieval

**User Story:** As a Department_User, I want to search records by metadata fields with results filtered by my access permissions, so that I can quickly find records I am authorized to view.

#### Acceptance Criteria

1. THE RMRS SHALL provide full-text search across record metadata fields including subject, Registry_Number, sender/recipient, classification code, and responsible officer.
2. THE RMRS SHALL filter search results to show only records the current user is authorized to access based on their role, department assignment, and the record's Classification_Level.
3. WHEN a user performs a search, THE RMRS SHALL return results within 3 seconds for result sets of up to 1000 records.
4. THE RMRS SHALL support advanced search with filters for date range, record type, department, file plan classification, and record status.
5. THE RMRS SHALL display search results with Registry_Number, subject, record type, date, classification code, and status as default columns.
6. WHEN a user selects a search result, THE RMRS SHALL display the full metadata record and provide a link to view or download the associated document from Bitrix_Platform (subject to access permissions).

### Requirement 10: Security and Access Control

**User Story:** As a System_Administrator, I want to configure role-based access with department-level isolation and classification-based restrictions, so that records are accessible only to authorized personnel.

#### Acceptance Criteria

1. THE RMRS SHALL implement role-based access control with the following roles: System_Administrator, Records_Manager, Registry_Clerk, Department_User, Department_Supervisor, Compliance_Officer, Auditor, Archivist, and Executive_Viewer.
2. THE RMRS SHALL restrict Department_User and Department_Supervisor access to records within their assigned department only.
3. THE RMRS SHALL enforce Classification_Level access restrictions: users can view records at or below their authorized classification level only.
4. WHEN a System_Administrator assigns a role to a user, THE RMRS SHALL record the assignment with effective date, assigning administrator, and justification.
5. THE RMRS SHALL require re-authentication for sensitive operations including disposal approval, role assignment changes, and system configuration modifications.
6. IF a user attempts to access a record beyond their authorized Classification_Level, THEN THE RMRS SHALL deny access and log the attempted access with user ID, record ID, timestamp, and action attempted.
7. THE RMRS SHALL enforce session timeout after 30 minutes of inactivity, requiring re-authentication.

### Requirement 11: Audit and Compliance

**User Story:** As a Compliance_Officer, I want immutable audit logs of all record operations and compliance dashboards, so that I can demonstrate regulatory compliance and investigate issues.

#### Acceptance Criteria

1. THE RMRS SHALL record an immutable audit log entry for every create, read, update, delete, and status change operation on any record or file plan entry.
2. EACH audit log entry SHALL contain the user ID, timestamp, action type, affected record ID, previous value, new value, and source IP address.
3. THE RMRS SHALL store audit logs in append-only storage that prevents modification or deletion by any user including System_Administrator.
4. THE RMRS SHALL provide a compliance dashboard showing metrics for records pending disposal, overdue disposals, records approaching retention expiry, and file plan coverage.
5. WHEN a Compliance_Officer generates a compliance report, THE RMRS SHALL produce the report within 10 seconds for data spanning up to 12 months.
6. THE RMRS SHALL retain audit log entries for a minimum of 10 years.

### Requirement 12: Reports and Dashboards

**User Story:** As an Executive_Viewer, I want operational, compliance, and executive reports, so that I can monitor the health and performance of the records management function.

#### Acceptance Criteria

1. THE RMRS SHALL provide pre-built reports including: records registered per department per month, records pending disposal, physical file movement summary, storage utilization by department, and compliance status summary.
2. THE RMRS SHALL allow authorized users to export reports in PDF and Excel formats.
3. THE RMRS SHALL provide a dashboard for Records_Manager users showing daily registration counts, overdue loans, upcoming disposals, and transfer batch status.
4. THE RMRS SHALL provide an executive dashboard for Executive_Viewer users showing aggregate statistics across all departments.
5. WHEN a user generates a report, THE RMRS SHALL apply the same access control rules as search — users see only data from departments and classification levels they are authorized to access.

### Requirement 13: Administration

**User Story:** As a System_Administrator, I want to configure OAuth settings, lookup tables, numbering rules, and scheduled jobs, so that the system adapts to organizational changes without code modifications.

#### Acceptance Criteria

1. THE RMRS SHALL provide an administration interface for configuring Bitrix OAuth client ID, client secret, authorization URL, token URL, and callback URL.
2. THE RMRS SHALL allow System_Administrator users to manage lookup tables for record types, Classification_Levels, storage locations, departments, and disposal authority references.
3. THE RMRS SHALL allow System_Administrator users to configure the Registry_Number pattern including department code mappings and sequence reset rules.
4. THE RMRS SHALL provide configuration of scheduled jobs including retention expiry checks, overdue loan notifications, and token refresh intervals.
5. WHEN a System_Administrator modifies a configuration value, THE RMRS SHALL record the change in the audit log with previous value, new value, and reason for change.
6. THE RMRS SHALL validate all configuration changes before applying them and display validation errors to the System_Administrator if invalid values are provided.

### Requirement 14: Non-Functional - Performance and Availability

**User Story:** As a municipal employee, I want the system to respond quickly and remain available during working hours, so that records management activities are not delayed.

#### Acceptance Criteria

1. THE RMRS SHALL achieve 99.5% availability measured on a monthly basis.
2. WHEN a user performs a search query, THE RMRS SHALL return results within 3 seconds for databases containing up to 5 million record metadata entries.
3. THE RMRS SHALL support up to 200 concurrent users without degradation of response times beyond 5 seconds for standard operations.
4. THE RMRS SHALL encrypt all data in transit using HTTPS with TLS 1.2 or higher.
5. THE RMRS SHALL perform automated daily backups of the SQL Server database with a recovery point objective of 24 hours.
6. THE RMRS SHALL conform to WCAG 2.1 Level AA accessibility guidelines for all user-facing interfaces.
7. THE RMRS SHALL support horizontal scaling of the API layer to accommodate growth beyond initial capacity.
