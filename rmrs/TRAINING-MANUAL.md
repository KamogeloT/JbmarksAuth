# RMRS Training Manual — JB Marks Local Municipality

**Records Management and Registry System (RMRS)**
**Integrated with Bitrix SDinMotion / Bitrix24**

---

**Document Version:** 1.0
**Last Updated:** June 2025
**Intended Audience:** All RMRS Users — JB Marks Local Municipality
**Classification:** Internal

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Roles Overview](#2-user-roles-overview)
3. [Getting Started — Logging In](#3-getting-started--logging-in)
4. [Navigation Guide](#4-navigation-guide)
5. [Module-by-Module Training](#5-module-by-module-training)
6. [Common Workflows (Step-by-Step)](#6-common-workflows-step-by-step)
7. [Security Best Practices](#7-security-best-practices)
8. [Troubleshooting](#8-troubleshooting)
9. [Glossary](#9-glossary)
10. [Quick Reference Card (Per Role)](#10-quick-reference-card-per-role)

---

## 1. Introduction

### System Overview and Purpose

The **Records Management and Registry System (RMRS)** is a web-based application designed to manage the full lifecycle of records at JB Marks Local Municipality. The system handles record registration, classification, storage tracking, retention management, disposal, and archival transfer — all in compliance with South African regulatory requirements.

RMRS integrates with **Bitrix SDinMotion (Bitrix24)** to leverage existing user authentication and document storage infrastructure, ensuring a seamless experience for municipal employees.


### NARSSA Compliance

This system is designed to comply with the **National Archives and Records Service of South Africa (NARSSA)** requirements and **SANS ISO 16175** standards for records management. All retention schedules, disposal procedures, and archive transfers follow prescribed national guidelines.

### System Access Details

| Item | Detail |
|------|--------|
| **System URL** | https://records.sdinmotion.co.za |
| **Authentication** | Via Bitrix SDinMotion (Single Sign-On) |
| **Browser Requirements** | Any modern browser (Chrome, Firefox, Edge, Safari) with HTTPS support |
| **Session Timeout** | 30 minutes of inactivity |
| **Support** | Contact your System Administrator or IT Help Desk |

> **⚠️ Important:** Always access the system using the URL above. Do not bookmark intermediate login pages.

---

## 2. User Roles Overview

The RMRS supports **9 user roles**, each with specific permissions and access to different modules. Your role determines what you can see and do within the system.

### 2.1 System Administrator (`System_Administrator`)

**Purpose:** Full system configuration, user management, and oversight of all modules.

**Access:** All modules without restriction.

**Key Responsibilities:**
- Configure OAuth integration with Bitrix
- Manage user roles and security settings
- Configure departments and lookup tables
- Monitor system health and scheduled jobs
- Manage classification levels and access controls


### 2.2 Records Manager (`Records_Manager`)

**Purpose:** Oversees the file plan, initiates disposal processes, and monitors records management operations.

**Access:** Dashboard, File Plan, Registry, Documents, Physical Records, Disposal, Search, Reports.

**Key Responsibilities:**
- Create and maintain the file plan hierarchy
- Define and manage retention rules
- Initiate disposal batches
- Execute approved disposals
- Generate management reports
- Monitor overdue loans and upcoming disposals

### 2.3 Registry Clerk (`Registry_Clerk`)

**Purpose:** Day-to-day record registration and physical records management.

**Access:** Dashboard, Registry, Documents, Physical Records, Search.

**Key Responsibilities:**
- Register incoming, outgoing, and internal records
- Upload and manage electronic documents
- Manage physical record locations, loans, and movements
- Generate barcodes and labels for physical files
- Scan and track physical records

### 2.4 Department User (`Department_User`)

**Purpose:** Access and contribute to records within their own department.

**Access:** Dashboard, Documents, Search.

**Key Responsibilities:**
- View records assigned to their department
- Upload documents related to their work
- Search for records within their access level
- Download documents as needed

### 2.5 Department Supervisor (`Department_Supervisor`)

**Purpose:** Same as Department User, with additional oversight of department activities.

**Access:** Dashboard, Documents, Search.

**Key Responsibilities:**
- All Department User responsibilities
- Oversight of department records activity
- Review documents uploaded by department staff
- Monitor department record metrics on dashboard


### 2.6 Compliance Officer (`Compliance_Officer`)

**Purpose:** Ensures records management practices comply with regulations; approves disposal actions.

**Access:** Dashboard (Compliance), Disposal, Search, Reports, Audit.

**Key Responsibilities:**
- Approve or reject disposal batches
- Monitor compliance metrics and dashboards
- Review audit logs for irregularities
- Generate compliance reports
- Ensure retention policies are being followed

### 2.7 Auditor (`Auditor`)

**Purpose:** Independent read-only access for auditing purposes.

**Access:** Dashboard, Search, Audit (read-only).

**Key Responsibilities:**
- Review audit logs
- Verify compliance with records management policies
- Generate audit reports
- Inspect record metadata and history (read-only)

### 2.8 Archivist (`Archivist`)

**Purpose:** Manages the transfer of records to the National Archives or other archival institutions.

**Access:** Dashboard, Archive, Search.

**Key Responsibilities:**
- Create and manage archive transfer batches
- Validate record metadata completeness
- Generate transfer manifests
- Complete transfers and record archive reference numbers

### 2.9 Executive Viewer (`Executive_Viewer`)

**Purpose:** High-level overview of records management statistics and compliance status.

**Access:** Dashboard (Executive), Search, Reports.

**Key Responsibilities:**
- View executive dashboards with aggregate statistics
- Review high-level reports across all departments
- Monitor organizational compliance posture

---


## 3. Getting Started — Logging In

RMRS uses **Single Sign-On (SSO)** through Bitrix SDinMotion. You do not need a separate username and password for RMRS — you use your existing Bitrix credentials.

### Step-by-Step Login Process

1. **Open your web browser** (Chrome, Firefox, Edge, or Safari recommended).

2. **Navigate to:** https://records.sdinmotion.co.za

3. **Click the "Sign in with Bitrix" button** on the login page.

4. **You will be redirected** to the Bitrix SDinMotion login page at `jbmarks.sdinmotion.co.za`.

5. **Enter your existing Bitrix credentials** (the same username and password you use for Bitrix24/SDinMotion).

6. **Upon successful authentication**, you will be redirected back to the RMRS dashboard appropriate for your role.

> **💡 Tip:** If you are already logged into Bitrix in the same browser, you may be signed in automatically without needing to re-enter your credentials.

### Session Management

- Your session lasts for **30 minutes of inactivity**. If you do not interact with the system for 30 minutes, you will need to log in again.
- Active use of the system (clicking, navigating, saving) resets the timeout timer.
- You will see a warning before your session expires.

### Logging Out

1. Click your **user name** displayed in the top-right corner of the header.
2. Select **"Logout"** from the dropdown menu.
3. You will be returned to the login page.

> **⚠️ Important:** Always log out when leaving your workstation, especially on shared computers.

---


## 4. Navigation Guide

Once logged in, you will see a **sidebar navigation menu** on the left side of the screen. The modules visible to you depend on your assigned role.

### Sidebar Modules by Role

| Icon | Module | Available To |
|------|--------|-------------|
| 📊 | **Dashboard** | All users |
| 📁 | **File Plan** | System Administrator, Records Manager |
| 📝 | **Registry** | System Administrator, Records Manager, Registry Clerk |
| 📄 | **Documents** | System Administrator, Records Manager, Registry Clerk, Department User, Department Supervisor |
| 📦 | **Physical Records** | System Administrator, Records Manager, Registry Clerk |
| 🗑️ | **Disposal** | System Administrator, Records Manager, Compliance Officer |
| 🏛️ | **Archive** | System Administrator, Archivist |
| 🔍 | **Search** | All users |
| 📈 | **Reports** | System Administrator, Records Manager, Compliance Officer, Executive Viewer |
| 🛡️ | **Audit** | System Administrator, Compliance Officer, Auditor |
| 🔒 | **Security** | System Administrator only |
| ⚙️ | **Admin** | System Administrator only |

### Navigation Tips

- The **currently active module** is highlighted in the sidebar.
- Click any module name to navigate to it.
- The **header bar** at the top shows your username, current role, and the logout option.
- **Breadcrumbs** appear at the top of content areas to show your current location within a module.
- Use the **browser back button** or breadcrumbs to return to previous pages.

> **💡 Tip:** If you cannot see a module you expect to access, contact your System Administrator to verify your role assignment.

---


## 5. Module-by-Module Training

### 5.1 Dashboard

**Available to:** All users (content varies by role)

The Dashboard is your landing page after login. It provides at-a-glance information relevant to your role.

#### Records Manager Dashboard

If you are a Records Manager, your dashboard displays:

- **Daily Registration Counts** — Number of records registered today
- **Overdue Loans** — Physical records not returned by their due date
- **Upcoming Disposals** — Records approaching their retention expiry date
- **Transfer Batch Status** — Current archive transfer batches and their progress

#### Executive Dashboard

If you are an Executive Viewer, your dashboard shows:

- **Aggregate Statistics** — Total records across all departments
- **Department Comparisons** — Registration volumes by department
- **Compliance Overview** — High-level compliance status indicators
- **Trend Charts** — Monthly registration and disposal trends

#### Compliance Dashboard

If you are a Compliance Officer, your dashboard presents:

- **Pending Disposals** — Batches awaiting your approval
- **Retention Metrics** — Records approaching or past retention dates
- **File Plan Coverage** — Percentage of departments with active file plans
- **Compliance Alerts** — Any overdue actions requiring attention

#### Standard User Dashboard

Department Users, Department Supervisors, Registry Clerks, Auditors, and Archivists see a simplified dashboard with:

- **Recent Activity** — Your recent actions in the system
- **Quick Links** — Shortcuts to your most-used functions
- **Notifications** — Any pending items requiring your attention

---


### 5.2 File Plan Management

**Available to:** System Administrator, Records Manager

The File Plan is the hierarchical classification structure that organizes all records in the municipality. It can have up to **5 levels** of nesting.

#### Viewing the File Plan

1. Navigate to **File Plan** in the sidebar.
2. The file plan displays as a **hierarchical tree**.
3. Click the **expand arrow (▶)** next to any entry to reveal child entries.
4. Click an entry to view its details.

#### Creating a File Plan Entry

1. Navigate to **File Plan**.
2. Click the **"Add Entry"** button.
3. Fill in the required fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Classification Code** | Unique code identifying this entry | `FIN/01/002` |
| **Title** | Descriptive name for this category | `Accounts Payable — Invoices` |
| **Description** | Detailed explanation of what records belong here | `All supplier invoices...` |
| **Retention Rule** | Select from dropdown — defines how long records are kept | `5 Years then Destroy` |
| **Disposal Authority Reference** | Reference to the approved disposal authority | `DA-2024-FIN-003` |
| **Default Classification Level** | Security level for records filed here | `Internal` |
| **Parent Entry** | Select parent for nesting (leave empty for top-level) | `FIN/01` |

4. Click **"Save"** to create the entry.

> **💡 Tip:** Plan your classification codes carefully. They should follow a logical hierarchy (e.g., `DEPT/Category/Sub-category`).

#### Editing a File Plan Entry

1. Click on the entry in the tree view.
2. Click the **"Edit"** button.
3. Modify the desired fields.
4. Click **"Save"** to apply changes.

> **⚠️ Warning:** Changing a retention rule on an existing entry applies ONLY to records created AFTER the change. Existing records retain their original retention period.


#### Deactivating a File Plan Entry

You **cannot delete** a file plan entry that has records assigned to it. Instead, use the **Deactivate** function:

1. Select the entry.
2. Click **"Deactivate"**.
3. Confirm the action.

**What happens when an entry is deactivated:**
- No new records can be filed under this classification.
- Existing records remain accessible and retain their classification.
- The entry appears greyed out in the tree view.
- The entry can be reactivated later if needed.

#### Managing Retention Rules

Retention rules define how long records must be kept and what happens when the retention period expires.

1. Navigate to **File Plan → Retention Rules**.
2. Click **"Add Rule"** to create a new rule.
3. Specify:
   - **Rule Name** (e.g., "5 Years then Destroy")
   - **Retention Period** — Years and/or months
   - **Disposal Action** — Choose one of:
     - **Destroy** — Record will be permanently deleted
     - **Archive** — Record will be transferred to National Archives
     - **Review** — Record will be flagged for manual review before action
4. Click **"Save"**.

> **⚠️ Important:** Modified retention rules apply ONLY to records created AFTER the modification. Existing records keep their original retention period.

---

### 5.3 Records Registry

**Available to:** System Administrator, Records Manager, Registry Clerk

The Registry module is where records are formally registered into the system. Each record receives a unique registry number.

#### Registry Number Format

All records receive an automatically generated number in this format:

```
RMRS/{DEPT}/{YYYY}/{SEQ:00000}
```

**Example:** `RMRS/FIN/2024/00042`

- **RMRS** — System prefix (fixed)
- **DEPT** — Department code (e.g., FIN, HR, TECH)
- **YYYY** — Year of registration
- **SEQ** — Sequential number, padded to 5 digits

> **💡 Tip:** The sequence number resets to `00001` at the start of each calendar year for each department.


#### Registering an Incoming Record

1. Navigate to **Registry** in the sidebar.
2. Click **"New Incoming"**.
3. Fill in the registration form:

| Field | Required | Description |
|-------|:--------:|-------------|
| Record Type | ✓ | Pre-selected as "Incoming" |
| Subject | ✓ | Brief description of the record content |
| Sender | ✓ | Person or organization who sent the record |
| Date Received | ✓ | Date the record was received |
| File Plan Classification | ✓ | Select from file plan tree |
| Responsible Officer | | Person responsible for actioning |
| External Reference Number | | Reference number from the sender |
| Originating Organization | | Organization the record came from |
| Correspondence Date | | Date on the original correspondence |
| Classification Level | | Inherited from file plan; can override to HIGHER only |

4. Click **"Register"**.
5. The system generates a registry number (e.g., `RMRS/FIN/2024/00042`).
6. Optionally, upload an associated electronic document.
7. Optionally, create a physical record entry with barcode.

> **⚠️ Important:** The Classification Level inherited from the file plan can only be overridden to a HIGHER level (e.g., from "Internal" to "Confidential"), never lower.

#### Registering an Outgoing Record

1. Navigate to **Registry → "New Outgoing"**.
2. Complete the same form as incoming, but with:
   - **Recipient** instead of Sender
   - Record type pre-selected as "Outgoing"
3. Click **"Register"**.

#### Registering an Internal Record

1. Navigate to **Registry → "New Internal"**.
2. Complete the form for internal memos and communications.
3. Used for records that do not leave the municipality.
4. Click **"Register"**.

#### Viewing Record Details

1. Click any record in the registry list.
2. The detail page shows:
   - Full metadata (all fields from registration)
   - Associated documents (with download links)
   - Complete audit history (who did what and when)
   - Current status and classification

---


### 5.4 Electronic Document Management

**Available to:** System Administrator, Records Manager, Registry Clerk, Department User, Department Supervisor

This module handles the upload, versioning, storage, and integrity verification of electronic documents.

#### Uploading a Document

1. Navigate to **Documents → "Upload"** or from a Record's detail page, click **"Attach Document"**.
2. **Drag-and-drop** a file onto the upload area, or **click to browse** and select a file.
3. The system automatically:
   - Validates the file size (maximum **100 MB**)
   - Computes a **SHA-256 checksum** (digital fingerprint)
   - Uploads the file to your department's **Bitrix workgroup drive**
   - Organizes the file in a folder structure mirroring the file plan hierarchy
4. A success confirmation appears with the document details.

> **💡 Tip:** The folder structure in Bitrix automatically mirrors your file plan hierarchy, making it easy to find documents in both systems.

#### Uploading a New Version

When a document is updated (e.g., a revised policy), upload a new version rather than a separate document:

1. Navigate to the document's detail page.
2. Click **"Upload New Version"**.
3. Select the updated file.
4. The system creates **Version N+1** with a new checksum.
5. Previous versions are preserved in the version history.

> **💡 Tip:** Never delete and re-upload a document to update it. Always use "Upload New Version" to maintain the complete history.

#### Downloading a Document

1. Navigate to the document list or record detail page.
2. Click the **download button** (⬇️) next to the document.
3. The file downloads to your computer.

#### Verifying Document Integrity

The integrity verification feature ensures documents have not been tampered with:

1. Navigate to the document detail page.
2. Click the **"Verify"** button.
3. The system compares the stored SHA-256 checksum against the current file in Bitrix.
4. **Result:**
   - ✅ **Match** — Document integrity confirmed.
   - ❌ **Mismatch** — Document may have been modified outside RMRS.

> **⚠️ Warning:** If you see a checksum mismatch alert, report it immediately to the System Administrator. This could indicate unauthorized document modification.

#### Upload Failure Handling

If a document upload fails:
- The system **automatically retries 3 times** with increasing delays (1 second, 4 seconds, 16 seconds).
- If all retries fail, you will receive a **notification** explaining the failure.
- Common causes: network interruption, file too large, or Bitrix service temporarily unavailable.
- Wait a few minutes and try again. If the problem persists, contact IT support.

---


### 5.5 Physical Records Management

**Available to:** System Administrator, Records Manager, Registry Clerk

This module manages the physical (paper) records: their locations, movements, barcode labels, and loans.

#### Generating Labels

Every physical record can have a printed label with barcode and QR code for easy identification and tracking:

1. Navigate to the physical record's detail page.
2. Click **"Print Label"**.
3. The system generates a label containing:
   - **Barcode** (Code128 format) — for scanner use
   - **QR Code** — for mobile device scanning
   - Record registry number and classification code
4. Print the label and affix it to the physical file.

#### Storage Location Hierarchy

Physical records are stored in a hierarchical location system:

```
Building → Floor → Room → Shelf → Position
```

**Example:** `Main Building → 2nd Floor → Room 2.04 → Shelf C → Position 3`

#### Scanning a Record

1. Navigate to **Physical Records → "Scan"**.
2. Use a barcode scanner or mobile device camera to scan the record's barcode/QR code.
3. The system displays:
   - Current storage location
   - Classification details
   - Custody history (who has held this record)
   - Loan status (if currently on loan)

#### Moving a Record

When a physical record is relocated:

1. Find the record (by scanning or searching).
2. Click **"Move"**.
3. Select the new location from the location hierarchy.
4. Click **"Confirm Move"**.
5. The system records:
   - Previous location
   - New location
   - Date and time of move
   - User who performed the move

#### Bulk Move

To move multiple physical records at once:

1. Navigate to **Physical Records → "Bulk Move"**.
2. Scan multiple barcodes (one after another).
3. All scanned records appear in a list.
4. Select the common new location.
5. Click **"Move All"** to assign all records to the new location.

> **💡 Tip:** Bulk Move is useful when reorganizing shelves or moving records between rooms.


#### Creating a Loan

When a physical record needs to be borrowed:

1. Navigate to **Physical Records → Loans → "New Loan"**.
2. Fill in:
   - **Record** — Select or scan the record to be loaned
   - **Borrower** — Select the person borrowing the record
   - **Loan Date** — Date the record is being loaned (defaults to today)
   - **Expected Return Date** — When the record should be returned
3. Click **"Create Loan"**.
4. The record's status changes to "On Loan".

#### Returning a Loaned Record

1. Navigate to **Physical Records → Loans**.
2. Find the active loan.
3. Click **"Return"**.
4. Confirm the return.
5. The record's status returns to its storage location.

#### Overdue Loans

The system automatically manages overdue loans:

- **Daily at 08:00**, the system checks all active loans against their expected return dates.
- Records past their return date are flagged as **"Overdue"**.
- **Notifications are sent** to both:
  - The borrower (reminder to return)
  - The Records Manager (for follow-up)
- View all overdue loans at **Physical Records → "Overdue Loans"**.

> **⚠️ Important:** Persistent overdue loans may result in escalation. Please return records by their due date.

---

### 5.6 Retention and Disposal

**Available to:** System Administrator, Records Manager, Compliance Officer

Disposal is the process of destroying or archiving records that have reached the end of their retention period. This is a controlled, auditable process requiring multiple approvals.

#### For Records Managers

##### Viewing Disposal Candidates

1. Navigate to **Disposal → "Candidates"**.
2. This screen shows records that have passed their retention expiry date.
3. The system identifies these automatically via a **daily check at 02:00**.
4. Review the list — each record shows:
   - Registry number
   - Subject
   - Classification
   - Retention rule applied
   - Date retention expired

##### Creating a Disposal Batch

1. Navigate to **Disposal → "New Batch"**.
2. Select records from the candidates list (use checkboxes).
3. Enter the **Disposal Authority Reference** (the approved authority for this disposal action).
4. Review the batch summary.
5. Click **"Submit for Approval"**.
6. The Compliance Officer is automatically notified.


#### For Compliance Officers

##### Approving or Rejecting Disposal

1. Navigate to **Disposal → "Pending Approval"**.
2. Click on a batch to review it.
3. Examine the records in the batch:
   - Verify the Disposal Authority reference is valid
   - Confirm records have genuinely exceeded their retention period
   - Check that no legal holds or exceptions apply
4. **Re-authentication required:** You must re-enter your credentials to confirm your identity.
5. Click **"Approve"** to authorize disposal, or **"Reject"** to send it back with comments.

> **⚠️ Important:** Re-authentication for disposal approval is a security feature. It confirms that you — personally — are authorizing the destruction of records.

#### After Approval (Records Manager)

##### Executing Disposal

1. Navigate to **Disposal** and find the **approved batch**.
2. Click **"Execute"**.
3. The system performs the following:
   - Electronic files are **deleted from Bitrix drive**
   - File references are **removed from RMRS**
   - Record **metadata is preserved permanently** (for audit trail)
   - A **Disposal Certificate** is generated (PDF)
4. The batch status changes to "Executed".

##### Downloading the Disposal Certificate

1. Navigate to **Disposal → select the batch**.
2. Click **"Download Certificate"**.
3. The PDF certificate contains:
   - Complete list of disposed records
   - Disposal Authority reference
   - Approver name and date of approval
   - Executor name and date of execution
   - Digital verification details

> **⚠️ Critical:** Disposal certificates and audit logs can **NEVER** be disposed of. They are permanently retained.

##### Failed Deletions

If the system cannot delete a file from Bitrix (e.g., network error):
- The record is marked as **"Disposal Pending"**.
- The Records Manager is notified for manual intervention.
- The record must be manually deleted from Bitrix, then confirmed in RMRS.

---


### 5.7 Archive Transfer

**Available to:** System Administrator, Archivist

Archive Transfer manages the process of transferring records to the National Archives or other archival institutions.

#### Creating a Transfer Batch

1. Navigate to **Archive** in the sidebar.
2. Click **"New Batch"**.
3. Enter the **Destination Archive Name** (e.g., "National Archives and Records Service").
4. Click **"Create"**.

#### Adding Records to a Batch

1. Open the transfer batch.
2. Click **"Add Records"**.
3. Select eligible records — records that have:
   - Completed their retention period
   - Been marked for archival (disposal action = "Archive")
4. Click **"Add Selected"**.

#### Validating a Batch

Before a batch can be finalized, it must pass validation:

1. Click **"Validate"** on the batch.
2. The system checks each record for complete metadata:
   - ✅ Classification code
   - ✅ Registry number
   - ✅ Title
   - ✅ Date range
   - ✅ Format type
3. **Results:**
   - Records with complete metadata: ✅ Ready for transfer
   - Records with incomplete metadata: ❌ Excluded (you'll see which fields are missing)
4. Fix incomplete records or remove them from the batch before proceeding.

#### Finalizing a Batch

1. After successful validation, click **"Finalize"**.
2. This **locks the batch** — no further records can be added or removed.
3. The batch status changes to "Finalized".

#### Generating the Transfer Manifest

1. Click **"Download Manifest"** on the finalized batch.
2. A PDF is generated containing:
   - Batch number
   - Transfer date
   - Destination archive
   - Complete record list with metadata
   - Total record count
3. Print this manifest to accompany the physical/digital transfer.

#### Completing the Transfer

After the physical or digital transfer has been made to the receiving institution:

1. Open the finalized batch.
2. Click **"Complete"**.
3. Enter the **Archive Reference Number** provided by the receiving institution.
4. Click **"Confirm"**.
5. All records in the batch are updated to status **"Archived"**.
6. The archive reference number is stored with each record for future retrieval requests.

---


### 5.8 Search and Retrieval

**Available to:** All users

The Search module allows all users to find records across the system, subject to their access permissions.

#### Basic Search

1. Click the **🔍 Search** module in the sidebar, or use the search bar at the top of any page.
2. Type your keywords (e.g., subject, registry number, person name).
3. Press **Enter** or click the search icon.
4. The system searches across:
   - Subject
   - Registry number
   - Sender / Recipient
   - Classification code
   - Responsible officer

#### Advanced Search

For more precise results:

1. Click **"Advanced"** next to the search bar.
2. Apply filters:

| Filter | Options |
|--------|---------|
| **Date Range** | From date — To date |
| **Record Type** | Incoming, Outgoing, Internal |
| **Department** | Select from dropdown |
| **File Plan Classification** | Select from tree |
| **Record Status** | Active, On Loan, Archived, Disposed |

3. Click **"Search"** to apply filters.

#### Search Results

Results display in a table with columns:
- **Registry Number** — Click to view full details
- **Subject** — Brief description
- **Record Type** — Incoming / Outgoing / Internal
- **Date** — Registration date
- **Classification Code** — File plan reference
- **Status** — Current record status

#### Access Filtering

Your search results are automatically filtered based on your permissions:

- **Department Users/Supervisors:** Only see records from your own department.
- **Classification restrictions:** Records above your clearance level are hidden.
- **System Administrators and Records Managers:** See all records across departments.

> **💡 Tip:** If you cannot find a record you expect to see, verify that you have the correct department access and classification level. Contact your System Administrator if needed.

#### Performance

- Search results return within **3 seconds** for up to 1,000 records.
- For very broad searches, use filters to narrow results.

---


### 5.9 Reports

**Available to:** System Administrator, Records Manager, Compliance Officer, Executive Viewer

The Reports module generates management and compliance reports.

#### Available Reports

| Report | Description |
|--------|-------------|
| **Records Registered per Department** | Monthly count of records registered, broken down by department |
| **Records Pending Disposal** | List of records past retention date awaiting disposal action |
| **Physical File Movement Summary** | Overview of all physical record moves in a given period |
| **Storage Utilization by Department** | How much physical and digital storage each department uses |
| **Compliance Status Summary** | Overall compliance metrics: coverage, overdue items, pending actions |

#### Generating a Report

1. Navigate to **Reports** in the sidebar.
2. Select the **report type** from the list.
3. Set parameters:
   - Date range
   - Department(s) — if applicable
   - Additional filters specific to the report type
4. Click **"Generate"**.
5. The report appears on screen.

#### Exporting Reports

Reports can be exported in two formats:

- **PDF** — For printing and formal distribution
- **Excel** — For further analysis and data manipulation

Click the **"Export PDF"** or **"Export Excel"** button above the report results.

#### Access Control for Reports

Reports respect your access permissions:
- You will only see data from departments and classification levels you are authorized to access.
- Executive Viewers see aggregate data across all departments.
- Records Managers see detailed data for departments they oversee.

---


### 5.10 Audit Log

**Available to:** System Administrator, Compliance Officer, Auditor

The Audit module provides a complete, immutable record of every action taken in the system.

#### Viewing Audit Logs

1. Navigate to **Audit → "Log Viewer"**.
2. The log displays entries with:

| Column | Description |
|--------|-------------|
| **User** | Who performed the action |
| **Timestamp** | Exact date and time |
| **Action** | What was done (Create, Update, Delete, Status Change) |
| **Entity** | What was affected (Record, Document, File Plan Entry, etc.) |
| **Previous Value** | What the data was before the change |
| **New Value** | What the data was changed to |
| **IP Address** | Network address of the user |

#### Filtering Audit Logs

Use the filter panel to narrow results:
- **User** — Select a specific user
- **Date Range** — From date to date
- **Action Type** — Create, Update, Delete, Login, etc.
- **Entity Type** — Records, Documents, File Plan, Users, etc.

#### Key Properties of Audit Logs

- **Immutability:** Audit logs **cannot be modified or deleted** by anyone — not even System Administrators. This ensures the integrity of the audit trail.
- **Retention:** Audit logs are retained for a **minimum of 10 years**.
- **Completeness:** Every create, update, delete, and status change is recorded automatically.

#### Compliance Metrics (Compliance Officer)

The Audit module also provides compliance metrics:
- Pending disposals count
- Overdue disposals (past retention + grace period)
- Records approaching retention expiry
- File plan coverage percentage

#### Compliance Reports

- Generate compliance reports within **10 seconds** for up to 12 months of data.
- Reports can be filtered by department and exported as PDF.

---


### 5.11 Security Management

**Available to:** System Administrator only

The Security module manages user roles, classification levels, and access controls.

#### Viewing User Roles

1. Navigate to **Security → "Users"**.
2. Select a user from the list.
3. View their currently assigned roles and classification level.

#### Assigning a Role to a User

1. Navigate to **Security → "Users"** → select the user.
2. Click **"Assign Role"**.
3. Select the role from the dropdown:
   - `System_Administrator`
   - `Records_Manager`
   - `Registry_Clerk`
   - `Department_User`
   - `Department_Supervisor`
   - `Compliance_Officer`
   - `Auditor`
   - `Archivist`
   - `Executive_Viewer`
4. Provide:
   - **Effective Date** — When the role becomes active
   - **Justification** — Required reason for the role assignment (this is recorded in the audit log)
5. **Re-authentication required:** Re-enter your credentials to confirm.
6. Click **"Assign"**.

> **⚠️ Important:** A justification is always required for role changes. This is an auditable action.

#### Revoking a Role

1. Navigate to the user's role list.
2. Click the **✕** (remove) button next to the role to revoke.
3. Confirm the revocation.
4. The action is recorded in the audit log.

#### Classification Levels

The system supports four classification levels, from lowest to highest:

| Level | Description |
|-------|-------------|
| **Public** | Available to all authorized users |
| **Internal** | Available to all municipal employees |
| **Confidential** | Restricted to specific roles/departments |
| **Restricted** | Highest security — limited access |

**Rules:**
- Users can only view records **at or below** their authorized classification level.
- Unauthorized access attempts are **logged and flagged**.
- Classification levels are assigned per user by the System Administrator.

#### Re-authentication Requirements

The following actions require re-authentication (re-entering your password):
- Assigning or revoking user roles
- Approving disposal batches
- Modifying system configuration
- Changing classification levels

---


### 5.12 System Administration

**Available to:** System Administrator only

The Admin module provides system-level configuration options.

#### OAuth Configuration

Manages the connection between RMRS and Bitrix SDinMotion:

1. Navigate to **Admin → "System Config"**.
2. Configure the following fields:

| Field | Description |
|-------|-------------|
| **Bitrix Client ID** | OAuth application identifier |
| **Client Secret** | OAuth application secret |
| **Authorization URL** | Bitrix OAuth authorization endpoint |
| **Token URL** | Bitrix OAuth token endpoint |
| **Callback URL** | RMRS callback URL for OAuth flow |

3. Click **"Save"**.
4. All changes are **validated before saving** (system tests the connection).
5. All changes are **recorded in the audit log** with the reason for change.

> **⚠️ Warning:** Incorrect OAuth configuration will prevent all users from logging in. Test carefully before saving.

#### Department Mapping

Maps RMRS departments to Bitrix Workgroups:

1. Navigate to **Admin → "Departments"**.
2. To create a new mapping:
   - Enter the **Department Name** (e.g., "Finance")
   - Enter the **Bitrix Workgroup ID** (numeric ID from Bitrix)
   - Click **"Save"**
3. The system **validates** that the workgroup exists via the Bitrix API.
4. Each department maps to exactly **one** Bitrix workgroup (one-to-one relationship).

> **⚠️ Important:** You cannot delete a department mapping that has existing records. You must first reassign or deactivate those records.

#### Lookup Tables

Manage the system's reference data:

1. Navigate to **Admin → "Lookups"**.
2. Manage the following lookup tables:
   - **Record Types** — Incoming, Outgoing, Internal
   - **Classification Levels** — Public, Internal, Confidential, Restricted
   - **Storage Locations** — Buildings, floors, rooms, shelves
   - **Departments** — Municipal departments
   - **Disposal Authority References** — Approved disposal authorities

#### Scheduled Jobs

The system runs automated background jobs:

1. Navigate to **Admin → "Jobs"**.
2. View and configure:

| Job | Default Schedule | Purpose |
|-----|-----------------|---------|
| **Retention Expiry Check** | Daily at 02:00 | Identifies records past retention date |
| **Overdue Loan Notifications** | Daily at 08:00 | Sends reminders for unreturned physical records |
| **Token Refresh Monitor** | Every 30 minutes | Ensures Bitrix OAuth tokens remain valid |

3. Adjust intervals as needed (requires re-authentication).

---


## 6. Common Workflows (Step-by-Step)

This section provides end-to-end walkthroughs for the most common processes in RMRS.

---

### 6.1 Complete Record Registration Workflow

**Performed by:** Registry Clerk

This workflow covers registering a new incoming record from start to finish.

| Step | Action | Details |
|:----:|--------|---------|
| 1 | Open Registry | Navigate to Registry → click "New Incoming" |
| 2 | Fill in metadata | Enter Subject, Sender, Date Received (all required) |
| 3 | Select classification | Pick file plan classification from the tree |
| 4 | Review classification level | Auto-inherited from file plan; override to higher if needed |
| 5 | Register | Click "Register" → registry number generated (e.g., `RMRS/FIN/2024/00001`) |
| 6 | Upload document | Optionally attach an electronic document to the record |
| 7 | Create physical entry | Optionally create a physical record entry and print barcode label |

**Result:** Record is registered, searchable, and trackable in the system.

---

### 6.2 Complete Disposal Workflow

**Performed by:** Records Manager + Compliance Officer

This is a multi-step, multi-role process for safely destroying records.

| Step | Who | Action |
|:----:|-----|--------|
| 1 | System | Automatically identifies disposal candidates daily at 02:00 |
| 2 | Records Manager | Reviews candidates in Disposal → Candidates |
| 3 | Records Manager | Creates disposal batch: selects records, enters Disposal Authority reference |
| 4 | System | Notifies Compliance Officer of pending batch |
| 5 | Compliance Officer | Reviews the batch, re-authenticates, and approves (or rejects) |
| 6 | Records Manager | Executes the approved disposal |
| 7 | System | Deletes electronic files from Bitrix; preserves metadata |
| 8 | System | Generates disposal certificate (PDF) |

**Result:** Records are destroyed, metadata preserved, certificate available for audit.

> **💡 Tip:** The disposal certificate serves as legal proof that records were disposed of following proper procedures.

---


### 6.3 Complete Archive Transfer Workflow

**Performed by:** Archivist

This workflow covers transferring records to the National Archives.

| Step | Action | Details |
|:----:|--------|---------|
| 1 | Create batch | Archive → "New Batch" → enter destination archive name |
| 2 | Add records | Select eligible records (completed retention + marked for archival) |
| 3 | Validate | Click "Validate" — system checks metadata completeness |
| 4 | Fix issues | Correct any incomplete records or remove them from the batch |
| 5 | Finalize | Click "Finalize" — locks the batch (no further changes allowed) |
| 6 | Download manifest | Generate and download the transfer manifest PDF |
| 7 | Transfer records | Physically or digitally transfer records to National Archives |
| 8 | Complete | Enter archive reference number → mark batch as complete |

**Result:** Records are marked as "Archived" with the archive reference number for future retrieval.

> **💡 Tip:** Print two copies of the transfer manifest — one accompanies the records, one stays with the municipality.

---

### 6.4 Document Version Update Workflow

**Performed by:** Registry Clerk, Department User, Department Supervisor

This workflow covers updating an existing document with a new version.

| Step | Action | Details |
|:----:|--------|---------|
| 1 | Navigate to record | Find the record → click Documents tab |
| 2 | Select document | Click on the document to update |
| 3 | Upload new version | Click "Upload New Version" → select new file (max 100MB) |
| 4 | System processes | Creates Version N+1 with new SHA-256 checksum |
| 5 | Verify | Previous versions remain in version history |
| 6 | Confirm integrity | Click "Verify" at any time to confirm document integrity |

**Result:** New version available; complete version history preserved.

> **⚠️ Important:** Never ask someone to delete the old version. The system maintains all versions for audit purposes.

---


## 7. Security Best Practices

Protecting municipal records is everyone's responsibility. Follow these guidelines to keep the system secure.

### Do's ✅

- **Do** log out when leaving your workstation, especially on shared computers.
- **Do** lock your computer screen (Windows: `Win+L`, Mac: `Ctrl+Cmd+Q`) when stepping away.
- **Do** report any checksum mismatch alerts immediately to the System Administrator.
- **Do** comply with re-authentication prompts — these are normal security features for sensitive operations.
- **Do** only access records that are relevant to your work duties.
- **Do** report any suspicious system behaviour to IT support immediately.

### Don'ts ❌

- **Don't** share your Bitrix credentials with anyone — ever.
- **Don't** attempt to access records above your classification level (all attempts are logged).
- **Don't** leave the system open and unattended.
- **Don't** download records to personal devices or external storage.
- **Don't** share document download links with unauthorized persons.
- **Don't** modify documents directly in Bitrix — always use RMRS to maintain integrity tracking.

### Session Security

- Sessions expire after **30 minutes of inactivity** — this is intentional and protects your account.
- If you see the login page unexpectedly, your session has expired. Simply log in again.
- Only one active session per user is recommended.

### Classification Level Compliance

- Your classification level determines what you can see. This is set by the System Administrator.
- If you need access to higher-classified records for legitimate work purposes, request an access level change through your supervisor.
- **All unauthorized access attempts are logged** and may be subject to disciplinary procedures.

### Re-authentication

Re-authentication prompts (asking you to re-enter your password) appear for:
- Role changes
- Disposal approvals
- System configuration changes

This is a **security feature**, not a system error. It ensures that sensitive actions are confirmed by the person currently at the keyboard.

---


## 8. Troubleshooting

### Common Issues and Solutions

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| **"Access Denied" page** | Your role doesn't have permission for that module | Contact your System Administrator to verify your role assignment. |
| **Session expired** | 30 minutes of inactivity | This is normal. Log in again via Bitrix. Your work-in-progress is saved. |
| **Document upload fails** | File exceeds 100MB or network issue | Check file size is under 100MB. The system retries 3 times automatically. If still failing, check your network connection and try again. |
| **Cannot find a record** | Access restrictions or incorrect search | Verify you have the correct department access and classification level. Try Advanced Search with different filters. |
| **Checksum mismatch alert** | Document modified outside RMRS | Report to System Administrator immediately. Do not modify or delete the document. |
| **Cannot delete a department mapping** | Department has active records | Deactivate or reassign all records first, then delete the mapping. |
| **Cannot delete a file plan entry** | Entry has active records | Use "Deactivate" instead of Delete. Deactivated entries block new records but preserve existing ones. |
| **Disposal batch rejected** | Invalid authority or missing information | Ensure Disposal Authority reference is valid. Contact Compliance Officer for specific rejection reason. |
| **Transfer batch validation fails** | Incomplete record metadata | Check that all records have: classification code, registry number, title, date range, and format type. Fix missing fields before re-validating. |
| **Barcode won't scan** | Label damaged or printer quality | Reprint the label. Ensure printer is set to high quality for barcode printing. |
| **Bitrix login fails** | Credentials incorrect or Bitrix service down | Verify credentials at jbmarks.sdinmotion.co.za directly. If Bitrix is accessible but RMRS is not, contact IT support. |
| **Report takes too long** | Too broad a date range or too many departments | Narrow the date range or filter to specific departments. Reports should generate within 10 seconds for 12 months of data. |

### When to Contact IT Support

Contact your IT Help Desk or System Administrator if:
- You experience repeated login failures
- You see error messages not listed above
- The system is unusually slow or unresponsive
- You suspect unauthorized access to your account
- You need a role change or classification level adjustment

---


## 9. Glossary

| Term | Definition |
|------|-----------|
| **RMRS** | Records Management and Registry System — the system this manual documents |
| **Registry Number** | Unique record identifier in the format: `RMRS/{DEPT}/{YYYY}/{SEQ:00000}` |
| **File Plan** | Hierarchical classification structure for organizing records (up to 5 levels) |
| **Retention Rule** | Defines how long records must be kept before disposal action is taken |
| **Disposal Authority** | Approved authorization from NARSSA for destroying or transferring records |
| **Classification Level** | Security clearance level: Public, Internal, Confidential, or Restricted |
| **Workgroup Drive** | Bitrix24 storage area associated with a specific department |
| **SHA-256 Checksum** | A digital fingerprint used to verify document integrity (detects tampering) |
| **NARSSA** | National Archives and Records Service of South Africa |
| **SANS ISO 16175** | South African National Standard for records management in electronic environments |
| **OAuth / SSO** | Single Sign-On technology that allows login via Bitrix credentials |
| **Bitrix SDinMotion** | The Bitrix24 platform used by JB Marks Municipality for collaboration |
| **Barcode (Code128)** | A standardized barcode format used on physical record labels |
| **QR Code** | Quick Response code — scannable with mobile devices for record identification |
| **Disposal Batch** | A grouped set of records submitted together for disposal approval |
| **Transfer Manifest** | PDF document listing all records in an archive transfer batch |
| **Retention Expiry** | The date when a record's required retention period ends |
| **Custody History** | Complete log of who has held or moved a physical record |
| **Re-authentication** | Security requirement to re-enter credentials for sensitive operations |
| **Immutable** | Cannot be changed or deleted (applies to audit logs) |

---


## 10. Quick Reference Card (Per Role)

### Module Access Matrix

The following table shows which modules each role can access:

| Module | SysAdmin | RecMgr | RegClerk | DeptUser | DeptSupv | CompOff | Auditor | Archivist | ExecView |
|--------|:--------:|:------:|:--------:|:--------:|:--------:|:-------:|:-------:|:---------:|:--------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| File Plan | ✓ | ✓ | | | | | | | |
| Registry | ✓ | ✓ | ✓ | | | | | | |
| Documents | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| Physical Records | ✓ | ✓ | ✓ | | | | | | |
| Disposal | ✓ | ✓ | | | | ✓ | | | |
| Archive | ✓ | | | | | | | ✓ | |
| Search | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reports | ✓ | ✓ | | | | ✓ | | | ✓ |
| Audit | ✓ | | | | | ✓ | ✓ | | |
| Security | ✓ | | | | | | | | |
| Admin | ✓ | | | | | | | | |

### Role Quick Summary

| Role | Primary Function | Key Actions |
|------|-----------------|-------------|
| **System Administrator** | Full system management | Configure system, manage users, all module access |
| **Records Manager** | Records lifecycle oversight | File plan, disposal initiation, reports, loan monitoring |
| **Registry Clerk** | Daily record operations | Register records, manage documents, physical tracking |
| **Department User** | Department record access | View records, upload documents, search |
| **Department Supervisor** | Department oversight | All Department User actions + oversight |
| **Compliance Officer** | Regulatory compliance | Approve disposals, compliance metrics, audit review |
| **Auditor** | Independent audit | Read-only audit log access, compliance verification |
| **Archivist** | Archive transfers | Create batches, validate, generate manifests, complete transfers |
| **Executive Viewer** | Strategic oversight | Executive dashboards, aggregate reports |

---


### Key Actions by Role

#### System Administrator — Quick Actions
- Assign/revoke user roles → Security → Users
- Configure OAuth → Admin → System Config
- Map departments → Admin → Departments
- Manage lookup tables → Admin → Lookups
- Monitor scheduled jobs → Admin → Jobs
- Review audit logs → Audit → Log Viewer

#### Records Manager — Quick Actions
- Create file plan entry → File Plan → Add Entry
- Manage retention rules → File Plan → Retention Rules
- Register records → Registry → New (type)
- View disposal candidates → Disposal → Candidates
- Create disposal batch → Disposal → New Batch
- Execute approved disposal → Disposal → (batch) → Execute
- Generate reports → Reports → Select type

#### Registry Clerk — Quick Actions
- Register incoming → Registry → New Incoming
- Register outgoing → Registry → New Outgoing
- Register internal → Registry → New Internal
- Upload document → Documents → Upload
- Print barcode label → Physical Records → (record) → Print Label
- Scan record → Physical Records → Scan
- Move record → Physical Records → (record) → Move
- Create loan → Physical Records → Loans → New Loan
- Return loan → Physical Records → Loans → (loan) → Return

#### Department User / Supervisor — Quick Actions
- Search records → Search → type keywords
- View record details → Click any record in results
- Upload document → Documents → Upload
- Download document → Click download button on document

#### Compliance Officer — Quick Actions
- Review pending disposals → Disposal → Pending Approval
- Approve/reject batch → (batch) → Approve/Reject
- View compliance metrics → Dashboard (Compliance)
- Review audit logs → Audit → Log Viewer
- Generate compliance report → Reports → Compliance Status

#### Auditor — Quick Actions
- View audit logs → Audit → Log Viewer
- Filter by user/date/action → Use filter panel
- Search records (read-only) → Search → type keywords

#### Archivist — Quick Actions
- Create transfer batch → Archive → New Batch
- Add records to batch → (batch) → Add Records
- Validate batch → (batch) → Validate
- Finalize batch → (batch) → Finalize
- Download manifest → (batch) → Download Manifest
- Complete transfer → (batch) → Complete

#### Executive Viewer — Quick Actions
- View executive dashboard → Dashboard (auto-loads)
- Generate reports → Reports → Select type
- Search records → Search → type keywords

---

## End of Training Manual

**Document maintained by:** System Administration Team, JB Marks Local Municipality
**For support:** Contact your IT Help Desk or System Administrator
**System URL:** https://records.sdinmotion.co.za

---

*This manual is classified as **Internal** and is intended for authorized RMRS users of JB Marks Local Municipality only.*
