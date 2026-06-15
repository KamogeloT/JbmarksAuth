# JBmarks — Service Delivery in Motion (SDiM)
## Full System Technical Documentation

**Document Version:** 1.0  
**Date:** June 2026  
**Classification:** Internal Technical Reference  
**Author:** T3 Systems  

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [System Architecture](#2-system-architecture)
3. [Platform Components](#3-platform-components)
4. [How SDiM Works — Core Concepts](#4-how-sdim-works--core-concepts)
5. [Authentication & Security](#5-authentication--security)
6. [Mobile Application — Feature Reference](#6-mobile-application--feature-reference)
7. [Task Management — Full Lifecycle](#7-task-management--full-lifecycle)
8. [Notifications System](#8-notifications-system)
9. [Network Layer & API Communication](#9-network-layer--api-communication)
10. [Reports Dashboard](#10-reports-dashboard)
11. [Backend Services](#11-backend-services)
12. [Data Models Reference](#12-data-models-reference)
13. [Deployment & Distribution](#13-deployment--distribution)
14. [Security Architecture](#14-security-architecture)
15. [Infrastructure Diagram](#15-infrastructure-diagram)

---

## 1. Executive Overview

**JBmarks** is a mobile and web platform built on top of **Service Delivery in Motion (SDiM)** — an enterprise work management system that provides task tracking, team collaboration, messaging, calendar management, activity feeds, and analytics.

The system consists of three interconnected components:

| Component | Platform | Purpose |
|-----------|----------|---------|
| JBmarks Android App | Android (Kotlin) | Primary mobile interface for field users |
| JBmarks Reports | Web (Next.js) | Analytics and reporting dashboard for managers |
| JBmarks API Server | Node.js (Railway) | Backend proxy for authentication and push notifications |

SDiM powers the underlying data platform (`jbmarks.sdinmotion.co.za`), providing the REST API that all components consume. All data — tasks, users, calendar events, chats, and activity feeds — is stored and managed in SDiM.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  USERS                                                           │
│                                                                  │
│  ┌─────────────────┐         ┌──────────────────────────────┐   │
│  │  Android App    │         │  Reports Web Dashboard       │   │
│  │  (JBmarks)      │         │  reports.sdinmotion.co.za    │   │
│  └────────┬────────┘         └─────────────┬────────────────┘   │
└───────────┼──────────────────────────────── ┼───────────────────┘
            │                                 │
            │ HTTPS (REST)                    │ HTTPS (REST)
            │                                 │
            ▼                                 ▼
┌───────────────────────────────────────────────────────────────┐
│  SDiM Platform (Service Delivery in Motion)                   │
│  https://jbmarks.sdinmotion.co.za                             │
│                                                               │
│  Tasks · Users · Calendar · Chat · Activity Feed · Files      │
│  REST API at /rest/                                           │
└───────────────────────────────────────────────────────────────┘
            │
            │ OAuth / Webhooks
            ▼
┌───────────────────────────────────────────────────────────────┐
│  JBmarks API Server (Railway)                                 │
│  https://jbmarksauth-production.up.railway.app                │
│                                                               │
│  - OAuth token exchange proxy                                 │
│  - Push notification broker (FCM + APNs)                     │
│  - Push token registry (PostgreSQL)                           │
└───────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│  Supporting Azure Infrastructure                              │
│                                                               │
│  ┌─────────────────────────────────────┐                      │
│  │ Azure Static Web App (SA North)     │                      │
│  │ OAuth Redirect Host                 │                      │
│  │ jbmarks-oauth-redirect-prod         │                      │
│  └─────────────────────────────────────┘                      │
│                                                               │
│  ┌─────────────────────────────────────┐                      │
│  │ Azure Blob Storage                  │                      │
│  │ jbmarks-releases container          │                      │
│  │ - jbmarks.apk                       │                      │
│  │ - version.json                      │                      │
│  └─────────────────────────────────────┘                      │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Platform Components

### 3.1 Android Application (JBmarks)

- **Language:** Kotlin
- **UI Framework:** Jetpack Compose (Material 3)
- **Architecture Pattern:** MVVM (ViewModel + Repository)
- **Navigation:** Jetpack Navigation Compose
- **Networking:** Retrofit2 + OkHttp3 + Gson
- **Security:** AndroidX EncryptedSharedPreferences (AES-256-GCM)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Minimum Android:** SDK 24 (Android 7.0)
- **Target Android:** SDK 36

### 3.2 Reports Web Dashboard

- **Framework:** Next.js 14 (React, TypeScript)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Exports:** xlsx (Excel), jsPDF + jspdf-autotable (PDF)
- **Deployment:** Azure Static Web Apps (Free tier)
- **URL:** https://reports.sdinmotion.co.za

### 3.3 JBmarks API Server

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (for push token registry)
- **Push Libraries:** `apn` (APNs/iOS), `firebase-admin` (FCM/Android)
- **Deployment:** Railway
- **URL:** https://jbmarksauth-production.up.railway.app

---

## 4. How SDiM Works — Core Concepts

**Service Delivery in Motion (SDiM)** is the underlying work management platform. It provides a REST API that allows external applications (like JBmarks) to create, read, update, and delete work items.

### 4.1 API Structure

All API calls are made to:
```
https://jbmarks.sdinmotion.co.za/rest/<method>.json
```

Every request must include an authentication token, either as a query parameter:
```
GET /rest/tasks.task.list.json?auth=<access_token>
```
or as a webhook URL embedded token:
```
GET /rest/1/accwtpjw1vnywkss/tasks.task.list.json
```

### 4.2 Authentication Methods

SDiM supports two authentication modes:

| Mode | Format | Use Case |
|------|--------|---------|
| OAuth 2.0 | `?auth=<access_token>` in every request | Mobile app (user-specific access) |
| Webhook | URL: `/rest/<userId>/<token>/` | Reports dashboard (shared read access) |

### 4.3 Permissions Model

SDiM enforces role-based permissions automatically. When the app calls `tasks.task.list`, SDiM returns only the tasks the authenticated user is permitted to see:
- Tasks where the user is **responsible** (assigned to)
- Tasks where the user is the **creator**
- Tasks where the user is an **accomplice** (co-worker on the task)
- Tasks where the user is an **auditor** (observer)
- Tasks belonging to **workgroups** the user is a member of

### 4.4 Workgroups

SDiM organises users into **Workgroups** (project groups). Each workgroup has:
- An owner (role: A)
- Moderators (role: E)
- Members (role: K)

Tasks can be assigned to a workgroup, controlling which team sees them in their task list.

### 4.5 Pagination

SDiM returns a maximum of **50 records per API call**. To retrieve all records, the app implements a pagination loop:

```
Request 1: start=null → returns items 1-50, next=50
Request 2: start=50  → returns items 51-100, next=100
...
Request N: start=N*50 → returns last items, next=null (stop)
```

---

## 5. Authentication & Security

### 5.1 OAuth 2.0 Flow

The JBmarks Android app uses the **Authorization Code Flow** — the most secure OAuth flow, requiring a server-side component to exchange the authorization code for tokens (keeping the client secret off the device).

```
┌──────────────┐     1. User taps Sign In         ┌────────────────────┐
│              │ ──────────────────────────────── ▶ │                    │
│  Android App │                                   │  SDiM Portal       │
│              │ ◀──────────────────────────────── │  (jbmarks.sdim...) │
└──────────────┘     2. Redirect to login page     └────────────────────┘
       │                                                      │
       │  3. User logs in to SDiM in browser                 │
       │                                                      ▼
       │                                           ┌────────────────────┐
       │     4. SDiM redirects to HTTPS redirect   │  Azure Static Web  │
       │        host with ?code=...                │  App (OAuth Relay) │
       │                                           └────────────────────┘
       │                                                      │
       │     5. Relay converts to app deep link               │
       │        jbmarks://oauth_redirect?code=...             ▼
       ◀──────────────────────────────────────────────────────
       │
       │  6. App receives deep link (onNewIntent)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  JBmarks API Server (Railway)                                │
│  POST /api/exchangetoken                                     │
│  { oauth_code: "...", domain: "jbmarks.sdinmotion.co.za" }  │
└──────────────────────────────────────────────────────────────┘
       │
       │  7. Server calls SDiM OAuth token endpoint
       │     (attaches CLIENT_SECRET securely)
       ▼
┌──────────────────────────┐
│  SDiM Token Endpoint     │
│  /oauth/token/           │
│  Returns access_token +  │
│  refresh_token           │
└──────────────────────────┘
       │
       │  8. Tokens returned to app
       ▼
┌──────────────────────────┐
│  Android App             │
│  Stores tokens in        │
│  EncryptedSharedPrefs    │
│  Navigates to main app   │
└──────────────────────────┘
```

### 5.2 Token Management

Tokens are managed by `TokenManager`, which uses Android's `EncryptedSharedPreferences`:

| Stored Value | Key | Encryption |
|---|---|---|
| Access Token | `ACCESS_TOKEN` | AES-256-GCM (Android Keystore) |
| Refresh Token | `REFRESH_TOKEN` | AES-256-GCM (Android Keystore) |
| Portal URL | `PORTAL_URL` | AES-256-GCM (Android Keystore) |
| Token Expiry | `TOKEN_EXPIRY_TIME` | AES-256-GCM (Android Keystore) |

**Token Expiry Logic:**
- SDiM tokens are valid for approximately 1 hour
- The app considers a token expired if it expires within the next **5 minutes**
- On expiry, a silent token refresh is attempted automatically

### 5.3 Token Refresh Flow

```
API Call Made
     │
     ▼
APIRequestHelper.executeWithTokenRefresh()
     │
     ├── Execute API call
     │
     ├── Response == 401?
     │       │
     │       ▼ Yes
     │   TokenRefreshHelper.refreshTokenIfNeeded()
     │       │
     │       ├── Mutex.lock() — prevents concurrent refresh storms
     │       │
     │       ├── Already refreshing? → Wait for existing Deferred
     │       │
     │       └── Not refreshing? → Call OAuthService.refreshAccessToken()
     │               │               (uses oauth.bitrix.info endpoint)
     │               ▼
     │           Save new tokens → RefreshRetrofitInstance()
     │               │
     │               ▼
     │           Retry original API call
     │
     └── Return response
```

The `Mutex` ensures that if 10 API calls all get a 401 simultaneously, only one token refresh request is sent to SDiM — the other 9 callers wait for the same result.

### 5.4 Request Authentication

Every API call to SDiM includes the access token via `AuthInterceptor`:

```kotlin
// All API calls automatically get: ?auth=<access_token>
GET https://jbmarks.sdinmotion.co.za/rest/tasks.task.list.json?auth=abc123...
```

This is the SDiM convention — authentication is via query parameter, not an `Authorization` header.

---

## 6. Mobile Application — Feature Reference

### 6.1 Application Startup Flow

```
Cold Start
    │
    ▼
SplashActivity
    │
    ├── CheckForUpdate()
    │       │
    │       ├── Fetch version.json from Azure Blob Storage
    │       │
    │       ├── remote_version_code > installed_version_code?
    │       │       │
    │       │       ├── Yes + force_update=true → Show mandatory update dialog
    │       │       │       └── Cannot dismiss. Download → Install.
    │       │       │
    │       │       ├── Yes + force_update=false → Show dismissible update dialog
    │       │       │
    │       │       └── No → Proceed
    │       │
    ▼       ▼
    ├── Token valid? → MainActivity (main app)
    │
    └── No token / expired → AuthActivity (login)
```

### 6.2 Navigation Structure

The main app uses a bottom navigation bar with 5 tabs:

```
┌─────────────────────────────────────────────────┐
│  [JBmarks Logo]              [User Name]        │  ← Top Bar
│                              [Position]         │
│                              [Email]            │
├─────────────────────────────────────────────────┤
│                                                 │
│              [Screen Content]                   │
│                                                 │
├─────────────────────────────────────────────────┤
│  🏠 Home  📋 Tasks  💬 Chat  📅 Calendar  🔔 Alerts │  ← Bottom Nav
└─────────────────────────────────────────────────┘
```

| Tab | Screen | Description |
|-----|--------|-------------|
| Home | Dashboard | Activity overview, stats, recent tasks, feed |
| Tasks | Task List | All accessible tasks with search and filters |
| Chat | Chat List | Recent conversations and messages |
| Calendar | Calendar | Upcoming events and appointments |
| Alerts | Notifications | Push notification history with badge count |

**Additional screens (not in bottom nav):**
- **Task Detail** — full task view with comments, checklists, time tracking, and attachments
- **Task Edit Form** — create or edit a task
- **Message Thread** — individual chat conversation
- **Profile** — user profile view

### 6.3 Dashboard Screen

The Dashboard provides an at-a-glance summary of the user's workload:

| Element | Data Source | Description |
|---------|-------------|-------------|
| Active Tasks | SDiM tasks API | Count of non-completed tasks |
| Completed Tasks | SDiM tasks API | Count of completed tasks |
| Unread Messages | SDiM IM API | Sum of unread counts across all chats |
| Upcoming Events | SDiM Calendar API | Count of calendar events |
| Recent Active Tasks | SDiM tasks API | Up to 3 most recent non-completed tasks |
| Recent Completed | SDiM tasks API | Up to 3 most recent completed tasks |
| Pending Invitations | SDiM workgroups API | Workgroup invitations awaiting response |
| Activity Feed | SDiM log API | Last 5 news feed posts |

### 6.4 Chat Module

```
Chat List Screen
    │
    ├── Loads recent chats via im.recent.get
    │       ├── Pinned chats appear first
    │       └── Sorted by last message date (descending)
    │
    └── Tap chat → Message Thread Screen
            │
            ├── Loads messages via im.dialog.messages.get
            │       └── Fetches sender display names via user.get
            │
            ├── Send message → im.message.add
            │
            └── Mark read → im.dialog.read
```

### 6.5 Calendar Module

The calendar fetches events from **4 sources in parallel** to ensure comprehensive coverage:

1. Personal calendar (`type=user`)
2. Company calendar (`type=company`)
3. All accessible calendars (`type=` empty)
4. Each workgroup's calendar (`type=group, ownerId=<groupId>`) — one request per workgroup

Results are deduplicated by event ID. Date range: 1 year ago to 2 years from now.

### 6.6 Activity Feed Module

Displays the SDiM Activity Stream:
- **View**: Calls `log.blogpost.get` for the news feed
- **Post**: Calls `log.blogpost.add` with title, message body, and target audience (users/groups)
- **Filter by user/group**: Calls `log.blogpost.getusers`

---

## 7. Task Management — Full Lifecycle

### 7.1 Task States

```
         ┌──────────────────────────────────────────┐
         │                                          │
         ▼                                          │
      ┌──────┐    startTask()   ┌─────────────┐     │
      │ NEW  │ ───────────────▶ │ IN PROGRESS │     │
      └──────┘                  └─────────────┘     │
         │                            │              │
         │                            │ completeTask()
         │                            ▼              │
         │                  ┌──────────────────┐    │
         │                  │ AWAITING APPROVAL │    │
         │                  └──────────────────┘    │
         │                            │              │
         │                            │ completeTask()
         │                            ▼              │
         │                      ┌───────────┐       │
         │   renewTask() ◀───── │ COMPLETED │       │
         │                      └───────────┘       │
         │                                          │
         │   deferTask()   ┌──────────┐             │
         └───────────────▶ │ DEFERRED │ ────────────┘
                           └──────────┘  renewTask()
```

**Status values (SDiM codes):**
- `2` = New
- `3` = In Progress
- `4` = Awaiting Approval (Supposedly Completed)
- `5` = Completed
- `6` = Deferred

### 7.2 Task Fields

| Field | Type | Description |
|-------|------|-------------|
| ID | String | Unique task identifier |
| Title | String | Task name |
| Description | String | Detailed description (supports BB code) |
| Status | Enum | Current lifecycle state |
| Priority | Enum (Low/Normal/High) | Urgency level |
| Deadline | ISO DateTime? | Due date and time |
| Created Date | ISO DateTime? | When task was created |
| Closed Date | ISO DateTime? | When task was completed |
| Responsible | User | Person assigned to complete the task |
| Creator | User | Person who created the task |
| Accomplices | List\<User\> | Co-workers on the task |
| Auditors | List\<User\> | Observers who can view the task |
| Group/Workgroup | Workgroup? | Project group the task belongs to |
| Tags | List\<String\> | Labels |
| Time Estimate | Seconds | Expected duration |
| Time Spent | Seconds | Actual time logged |
| Comments Count | Int | Number of comments |
| Files | List\<File\> | Attached documents/images |

### 7.3 Task Operations

| Operation | API Call | Notes |
|-----------|----------|-------|
| List all tasks | `tasks.task.list` (paginated) | Returns all accessible tasks |
| Get single task | `tasks.task.get` | Full detail including files and nested objects |
| Create task | `tasks.task.add` | Optional: deadline, priority, workgroup, files |
| Edit task | `tasks.task.update` | Partial update — only changed fields required |
| Delete task | `tasks.task.delete` | Permanent deletion |
| Start task | `tasks.task.start` | Moves status: New → In Progress |
| Complete task | `tasks.task.complete` | Moves status → Completed |
| Defer task | `tasks.task.defer` | Moves status → Deferred |
| Reopen task | `tasks.task.renew` | Moves status → New |
| Delegate task | `tasks.task.update` | Updates `RESPONSIBLE_ID` to new user |

### 7.4 Comments

Comments are attributed to the **logged-in OAuth user** (not a generic system user). The process:

1. App retrieves the current OAuth `access_token` from `TokenManager`
2. Posts to: `POST /rest/task.commentitem.add.json?auth=<token>`
3. Request body is a JSON array: `[taskId, {"POST_MESSAGE": "text"}]`
4. SDiM records the comment as authored by the user who owns the token

When loading comments, the app fetches each unique author's display name via `user.get` and caches them in memory for the session.

### 7.5 Checklists

Tasks can have sub-item checklists:

| Operation | API Method |
|-----------|------------|
| Get items | `task.checklistitem.getlist` |
| Add item | `task.checklistitem.add` |
| Mark complete | `task.checklistitem.update` (IS_COMPLETE=Y) |
| Mark incomplete | `task.checklistitem.renew` |

### 7.6 Time Tracking

Users can log time against tasks:

| Field | Description |
|-------|-------------|
| ID | Entry identifier |
| Task ID | Which task the time belongs to |
| User ID | Who logged the time |
| Seconds | Duration of work logged |
| Comment | Description of work done |
| Created Date | When the entry was recorded |

Time is displayed as "Xh Ym" format (e.g., "1h 30m").

### 7.7 File Attachments

```
User selects file
    │
    ▼
ImageCompressor (if image)
    Compresses to reduce HTTP 413 errors
    Output: JPEG, max quality preserved
    │
    ▼
disk.storage.uploadfile
    Uploads to SDiM Drive (folder ID = 1, root)
    Returns: file_id
    │
    ▼
disk.file.get (file_id)
    Fetches authenticated DOWNLOAD_URL
    │
    ▼
tasks.task.files.attach
    Links the file to the task
    OR include file_id in UF_TASK_WEBDAV_FILES when creating task
```

Files are accessed via `disk.attachedObject.get` for attachment IDs, or `disk.file.get` for direct file IDs. The returned `DOWNLOAD_URL` is pre-authenticated and ready to use.

### 7.8 Task Delegation

Delegation changes the task's `RESPONSIBLE_ID`:

1. User opens Task Detail → taps Delegate
2. `DelegateTaskSheet` appears, listing workgroup members (fetched via `sonet_group.user.get`)
3. User selects new responsible person
4. `DelegateTaskViewModel` validates the new user is a member of the task's workgroup
5. Calls `delegateTask()` → `tasks.task.update` with `RESPONSIBLE_ID = newUserId`

---

## 8. Notifications System

JBmarks uses a **dual notification architecture** — server-pushed FCM notifications combined with a client-side polling service for reliability.

### 8.1 Push Notifications (Firebase Cloud Messaging)

```
SDiM Event Occurs (new task, comment, etc.)
    │
    ▼
SDiM Webhook → POST /api/bitrix/webhook (Railway server)
    │
    ├── Event: ONTASKADD → notify RESPONSIBLE_ID user
    ├── Event: ONTASKCOMMENTADD → notify RESPONSIBLE_ID (if ≠ author)
    ├── Event: ONTASKUPDATE → notify RESPONSIBLE_ID user
    └── Event: ONIMCOMMONADD → notify RECIPIENT_ID (if ≠ sender)
    │
    ▼
Railway Server fetches push tokens from PostgreSQL
    │
    ├── APNs tokens? → Send via APNs (iOS devices)
    └── FCM tokens? → Send via Firebase Admin SDK (Android devices)
    │
    ▼
Android Device receives FCM message
    │
    ▼
JBmarksFirebaseMessagingService.onMessageReceived()
    │
    ├── Parse data payload (type, title, message, related_id, action_url)
    ├── Store in NotificationRepository (SharedPreferences)
    └── Display system notification via NotificationService
```

**Notification Channels:**

| Channel | Importance | Vibration | Use |
|---------|------------|-----------|-----|
| `tasks_channel` | HIGH | Yes | Task events |
| `comments_channel` | DEFAULT | No | Task comments |
| `deadlines_channel` | HIGH | Yes | Deadline alerts |
| `feed_channel` | DEFAULT | No | Feed posts |
| `chat_channel` | HIGH | Yes | Chat messages |
| `general_channel` | DEFAULT | No | Other |

### 8.2 FCM Token Registration

When a user successfully logs in:

1. `FCMTokenManager.checkAndRegisterToken()` is called
2. Retrieves FCM token from Firebase
3. Gets current user ID from SDiM (`user.current`)
4. POSTs to Railway: `POST /api/push/register-token`
   ```json
   {
     "fcm_token": "...",
     "platform": "android",
     "portal_url": "https://jbmarks.sdinmotion.co.za",
     "user_id": "123"
   }
   ```
5. Token stored in PostgreSQL `push_tokens` table
6. Invalid tokens are auto-deleted after delivery failure

### 8.3 Polling Service (Fallback)

`SyncManager` runs a background polling loop every **5 minutes**:

```
App starts → SyncManager.startPeriodicSync()
    │
    ├── Initial run: "silent mode" — seeds last-seen markers
    │   No notifications fired (avoids spamming existing data)
    │
    └── Every 5 minutes: syncAll()
            │
            ├── syncFeed(): Check for new blog posts
            │       └── If newest post ID ≠ last seen → fire FEED_POST notification
            │
            ├── syncChat(): Check for new messages per chat
            │       └── If newest message ID ≠ last seen AND sender ≠ current user
            │               → fire CHAT_MESSAGE notification
            │
            └── syncTasks(): Check for new task assignments
                    └── If task ID not previously seen → fire TASK_ASSIGNED notification
```

State (last-seen IDs) is stored in `sync_prefs` SharedPreferences.

---

## 9. Network Layer & API Communication

### 9.1 Retrofit Configuration

```kotlin
RetrofitInstance
    Base URL: https://jbmarks.sdinmotion.co.za/rest/
    
    OkHttp Client:
        Connect timeout: 30s
        Read timeout:    30s
        Write timeout:   30s
        Call timeout:    60s  (total)
        
    Interceptors:
        1. HttpLoggingInterceptor (HEADERS level)
        2. AuthInterceptor (injects ?auth=<token>)
    
    Converters:
        GsonConverterFactory
            with TasksListDeserializer (handles array OR map task responses)
            with TaskDtoDeserializer (handles inconsistent field casing)
```

SDiM sometimes returns tasks as a JSON array `[{...}]` and sometimes as a map `{"123": {...}, "456": {...}}`. Custom deserializers handle both formats transparently.

### 9.2 All API Endpoints Used

#### User & Groups

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `user.current.json` | Get authenticated user profile |
| GET | `user.get.json?ID=<id>` | Get specific user by ID |
| GET | `sonet_group.user.groups.json` | List current user's workgroups |
| POST | `sonet_group.user.get.json` | List members of a workgroup |
| POST | `sonet_group.user.request.json` | Accept workgroup invitation |
| POST | `sonet_group.user.delete.json` | Decline workgroup invitation |

#### Tasks

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `tasks.task.list.json` | List accessible tasks (paginated) |
| GET | `tasks.task.get.json?taskId=<id>` | Get full task detail |
| POST | `tasks.task.add.json` | Create new task |
| POST | `tasks.task.update.json?taskId=<id>` | Update/delegate task |
| POST | `tasks.task.delete.json?taskId=<id>` | Delete task |
| POST | `tasks.task.complete.json?taskId=<id>` | Mark complete |
| POST | `tasks.task.start.json?taskId=<id>` | Start (→ In Progress) |
| POST | `tasks.task.defer.json?taskId=<id>` | Defer task |
| POST | `tasks.task.renew.json?taskId=<id>` | Reopen task |
| POST | `tasks.task.files.attach.json` | Attach file to task |

#### Comments & Checklists

| Method | Endpoint |
|--------|----------|
| POST | `task.commentitem.getlist.json` |
| POST | `task.commentitem.add.json` |
| POST | `task.checklistitem.getlist.json` |
| POST | `task.checklistitem.add.json` |
| POST | `task.checklistitem.update.json` |
| POST | `task.checklistitem.renew.json` |

#### Time Tracking

| Method | Endpoint |
|--------|----------|
| POST | `task.elapseditem.add.json` |
| POST | `task.elapseditem.getlist.json` |
| POST | `task.elapseditem.update.json` |

#### Files

| Method | Endpoint |
|--------|----------|
| POST | `disk.storage.uploadfile.json` |
| GET | `disk.file.get.json?id=<id>` |
| GET | `disk.attachedObject.get.json?id=<id>` |

#### Calendar

| Method | Endpoint |
|--------|----------|
| POST | `calendar.event.get.json` |

#### Chat (Instant Messaging)

| Method | Endpoint |
|--------|----------|
| GET | `im.recent.get.json` |
| GET | `im.dialog.messages.get.json` |
| POST | `im.message.add.json` |
| POST | `im.chat.add.json` |
| POST | `im.dialog.read.json` |

#### Activity Feed

| Method | Endpoint |
|--------|----------|
| GET | `log.blogpost.get.json` |
| POST | `log.blogpost.add.json` |
| POST | `log.blogpost.getusers.json` |
| GET | `log/events.json` |

---

## 10. Reports Dashboard

### 10.1 Overview

The JBmarks Reports Dashboard is a standalone web application accessible at `https://reports.sdinmotion.co.za`. It provides management-level analytics drawn directly from SDiM data.

**Access:** The dashboard auto-connects to SDiM using a pre-configured webhook. No login is required for authorised users — the session is stored in `localStorage` and persists across visits.

### 10.2 Authentication

```
Browser loads https://reports.sdinmotion.co.za
    │
    ├── Check localStorage for existing session
    │       │
    │       ├── Session exists → Verify token still valid via user.current
    │       │       ├── Valid → Load reports directly
    │       │       └── Invalid → Clear session, auto-connect with default webhook
    │       │
    │       └── No session → Auto-connect with default webhook
    │               │
    │               └── Token stored in localStorage for future visits
```

### 10.3 Available Reports

#### Report 1: Task Summary

Provides a high-level overview of all tasks:

- **Total tasks** by status (pie chart — donut style)
- **Tasks by priority** (bar chart)
- **Tasks by workgroup** (horizontal bar chart)
- **Completion rate** (percentage stat card)
- **Overdue count** (highlighted stat card)

**Data source:** `tasks.task.list` (paginated, all tasks)

#### Report 2: Overdue & Deadlines

Tracks deadline compliance:

- **Overdue task count** (by severity: 1-3 days, 4-7, 8-14, 15-30, 30+)
- **Due this week** count
- **No deadline set** count
- **Overdue by person** (who has the most overdue tasks)
- **Detailed overdue task table** with days overdue, responsible, group, priority

**Data source:** `tasks.task.list` — client-side deadline comparison

#### Report 3: Time Tracking

Analyses time logged against tasks:

- **Total hours logged**
- **Tasks with time entries** count
- **Average efficiency** (estimated vs actual hours)
- **Top tasks by time spent** (bar chart: actual vs estimate)
- **Time by workgroup** (pie chart)
- **Detail table** with over/under per task

**Data source:** `tasks.task.list` (for `timeSpentInLogs`), `task.elapseditem.getlist`

#### Report 4: Team Workload

Shows task distribution across team members:

- **Team size** (active members with tasks)
- **Total active tasks**
- **Average tasks per person**
- **Overdue count** (team total)
- **Workload distribution chart** (stacked bar: active/completed/overdue per person)
- **Team detail table** with completion rate progress bar

**Data source:** `user.get` (all users) + `tasks.task.list`

### 10.4 Export

All reports can be exported:

| Format | File | Content |
|--------|------|---------|
| Excel (.xlsx) | `JBmarks-<report>-<date>.xlsx` | Data table with frozen header row, auto-sized columns |
| PDF | `JBmarks-<report>-<date>.pdf` | Branded document with logo header, green branding, page footer |

PDF exports include:
- JBmarks logo in the header bar
- Report title and generation date
- Record count summary
- Formatted data table with alternating row shading
- "JBmarks Reports | Page X of Y" footer on every page

---

## 11. Backend Services

### 11.1 JBmarks API Server (Railway)

The Node.js Express server handles two concerns:

#### OAuth Token Exchange

**Why this is needed:** SDiM requires a `client_secret` to exchange an authorization code for tokens. This secret cannot be stored on the mobile device (it would be visible in APK decompilation). The server holds the secret and acts as a secure proxy.

```
POST /api/exchangetoken
Body: { oauth_code: "...", domain: "jbmarks.sdinmotion.co.za" }

Server:
  1. Adds BITRIX_CLIENT_ID and BITRIX_CLIENT_SECRET from env vars
  2. Calls SDiM OAuth token endpoint: https://oauth.bitrix.info/oauth/token/
  3. Returns the token response to the mobile app
```

#### Push Notification Broker

Stores device tokens and fans out push notifications when SDiM events occur:

**Token Registration:**
```
POST /api/push/register-token
Body: { fcm_token|apns_token, platform, portal_url, user_id }
→ Stores in PostgreSQL push_tokens table
```

**Webhook Handling:**
```
POST /api/bitrix/webhook
Body: SDiM event payload

Event → Notification Mapping:
  ONTASKADD         → "New Task Assigned" → to RESPONSIBLE_ID
  ONTASKCOMMENTADD  → "New Comment"       → to RESPONSIBLE_ID (if ≠ author)
  ONTASKUPDATE      → "Task Updated"      → to RESPONSIBLE_ID
  ONIMCOMMONADD     → "New Message"       → to RECIPIENT_ID (if ≠ sender)

Delivery:
  → APNs (iOS): via 'apn' library with p8 key
  → FCM (Android): via firebase-admin SDK
```

**PostgreSQL Schema:**
```sql
CREATE TABLE push_tokens (
    id           SERIAL PRIMARY KEY,
    user_id      VARCHAR(255) NOT NULL,
    apns_token   TEXT,
    fcm_token    TEXT,
    platform     VARCHAR(10) DEFAULT 'ios',
    portal_url   VARCHAR(500),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, apns_token),
    UNIQUE(user_id, fcm_token)
);
```

### 11.2 OAuth Redirect Host (Azure Static Web App)

SDiM requires HTTPS redirect URIs for OAuth — it cannot redirect directly to a custom URL scheme like `jbmarks://`. This static web page bridges the gap:

```
SDiM redirects to:
https://jbmarks-oauth-redirect-prod.azurewebsites.net/oauth_redirect?code=...

The page's JavaScript immediately redirects to:
jbmarks://oauth_redirect?code=...

Android intercepts the deep link → AuthActivity.onNewIntent()
```

### 11.3 Azure Blob Storage (APK Distribution)

APK distribution uses Azure Blob Storage instead of the Play Store:

```
Container: jbmarks-releases
│
├── jbmarks.apk           ← Current production APK
└── version.json          ← Version manifest
```

`version.json` format:
```json
{
  "version_code": 10,
  "version_name": "1.0.7",
  "apk_url": "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/jbmarks.apk",
  "release_notes": "What's new in this release",
  "force_update": false
}
```

---

## 12. Data Models Reference

### 12.1 Task

```
Task
├── id: String                    (SDiM task ID)
├── title: String                 (Task name)
├── description: String           (Detail / BB-code text)
├── status: TaskStatus            (NEW|IN_PROGRESS|AWAITING_APPROVAL|COMPLETED|DEFERRED)
├── priority: TaskPriority        (LOW|NORMAL|HIGH)
├── deadline: String?             (ISO 8601 datetime)
├── createdDate: String?          (ISO 8601 datetime)
├── closedDate: String?           (ISO 8601 datetime)
├── createdBy: String?            (User ID)
├── createdByName: String?        (Display name)
├── responsibleId: String?        (Assigned user ID)
├── responsibleName: String?      (Assigned user name)
├── groupId: String?              (Workgroup ID)
├── groupName: String?            (Workgroup name)
├── commentsCount: Int
├── newCommentsCount: Int
└── tags: List<String>
```

### 12.2 User

```
User
├── id: String
├── name: String                  (First name)
├── lastName: String              (Last name)
├── email: String?
├── photoUrl: String?             (Profile photo URL)
├── position: String?             (Job title)
└── fullName: String              (computed: "$name $lastName")
```

### 12.3 Workgroup & Member

```
Workgroup
├── id: String                    (GROUP_ID)
├── name: String                  (GROUP_NAME)
├── role: String?                 (A=Owner, E=Moderator, K=Member)
└── imageUrl: String?

WorkgroupMember
├── userId: String
├── role: String?                 (A|E|K)
├── name: String?                 (fetched separately via user.get)
├── lastName: String?
├── photoUrl: String?
├── fullName: String              (computed)
└── roleDisplayName: String       (computed: "Owner"|"Moderator"|"Member")
```

### 12.4 Notification

```
Notification
├── id: String
├── type: NotificationType        (TASK_ASSIGNED|TASK_UPDATED|TASK_COMMENT|
│                                   TASK_DEADLINE|TASK_STATUS_CHANGED|
│                                   FILE_ATTACHED|FEED_POST|CHAT_MESSAGE|GENERAL)
├── title: String
├── message: String
├── timestamp: Long               (Unix milliseconds)
├── isRead: Boolean
├── priority: NotificationPriority (LOW|NORMAL|HIGH|URGENT)
├── relatedId: String?            (task ID, chat ID, etc.)
└── actionUrl: String?            (navigation deep link)
```

### 12.5 Chat

```
Chat (Conversation)
├── id: String                    (local ID)
├── dialogId: String              ("chatXXX" or "userXXX")
├── type: ChatType                (PRIVATE|GROUP|OPEN)
├── name: String
├── avatar: String?
├── lastMessage: String?
├── unreadCount: Int
├── isPinned: Boolean             (local only, not synced)
└── lastMessageDate: String?

Message
├── id: String
├── chatId: String
├── dialogId: String
├── senderId: String
├── senderName: String?           (resolved via user.get)
├── text: String
├── timestamp: Long
├── isRead: Boolean
├── isDelivered: Boolean
└── files: List<MessageFile>
```

### 12.6 Calendar Event

```
CalendarEvent
├── id: String
├── name: String
├── description: String
├── fromDate: String              (ISO datetime)
├── toDate: String                (ISO datetime)
└── location: String?
```

---

## 13. Deployment & Distribution

### 13.1 Android App Deployment Process

```
1. Increment version in app/build.gradle.kts:
   versionCode = X+1
   versionName = "1.x.y"

2. Update version.json with new version details

3. Build debug APK:
   ./gradlew :app:assembleDebug
   Output: app/build/outputs/apk/debug/jbmarks.apk

4. Get Azure storage key:
   az storage account keys list --account-name jbmarksoauthredirecb0ce ...

5. Upload APK to Azure Blob Storage:
   az storage blob upload --name jbmarks.apk --file <path> --overwrite true

6. Upload version.json:
   az storage blob upload --name version.json --file version.json --overwrite true

7. Verify live:
   curl https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/version.json

8. Commit and push:
   git add app/build.gradle.kts version.json
   git commit -m "chore: bump version to X.Y.Z"
   git push origin <branch>
```

Users receive an in-app update prompt the next time they open the app. If `force_update=true`, they cannot dismiss the prompt.

### 13.2 Reports Dashboard Deployment

```
1. Build Next.js static export:
   npm run build
   Output: out/

2. Deploy to Azure Static Web Apps:
   npx @azure/static-web-apps-cli deploy out --deployment-token <token>

3. Verify:
   curl https://reports.sdinmotion.co.za
```

### 13.3 Infrastructure Summary

| Service | Provider | Region | Cost |
|---------|----------|--------|------|
| SDiM Portal | On-prem/Cloud | South Africa | Managed |
| API Server | Railway | US (auto) | Free tier |
| Reports Web App | Azure Static Web Apps | East Asia | Free tier |
| OAuth Redirect | Azure Static Web Apps | South Africa North | Free tier |
| APK Storage | Azure Blob Storage | South Africa North | Pay-as-you-go |
| Push Notifications | Firebase (FCM) | Google | Free tier |

### 13.4 CI/CD

| Pipeline | Tool | Trigger | Target |
|----------|------|---------|--------|
| OAuth Redirect Deploy | GitHub Actions | Push to `azure-redirect/**` on main | Azure Static Web Apps |
| OAuth Redirect Deploy | Azure Pipelines | Push to main/master | Azure Static Web Apps + BFF API |
| Android App | Manual | Developer manually runs `gradlew assembleDebug` | Azure Blob Storage |
| Reports Dashboard | Manual | Developer runs deploy command | Azure Static Web Apps |

---

## 14. Security Architecture

### 14.1 Token Security

| Asset | Storage | Encryption | Notes |
|-------|---------|------------|-------|
| OAuth Access Token | EncryptedSharedPreferences | AES-256-GCM (Android Keystore) | Auto-refreshed, 1hr lifetime |
| OAuth Refresh Token | EncryptedSharedPreferences | AES-256-GCM (Android Keystore) | Long-lived |
| Portal URL | EncryptedSharedPreferences | AES-256-GCM (Android Keystore) | |
| Client Secret | API Server env vars | Server-side only | Never on device |
| FCM Token | SharedPreferences (plain) | None | Not sensitive |
| Reports session | Browser localStorage | None | Webhook URL stored |

### 14.2 Communication Security

- All communication is over **HTTPS**
- SDiM authentication via `?auth=` query parameter (SDiM convention)
- Client secret is **never stored on the device** — the Railway server holds it and performs the OAuth code exchange on behalf of the app
- Token refresh is mutex-guarded to prevent multiple simultaneous refresh calls

### 14.3 Known Security Concerns

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `BITRIX_CLIENT_SECRET` in `Config.kt` | HIGH | Should be moved to Android `BuildConfig` sourced from env vars; currently exposed in source code |
| `WEBHOOK_TOKEN` in `Config.kt` | HIGH | Same — should be in `BuildConfig` |
| Reports webhook URL hardcoded | MEDIUM | Acceptable for internal tool; should be moved to env var for production |
| CORS on API server allows `*` | MEDIUM | Should be restricted to known origins |
| No rate limiting on token exchange | MEDIUM | `express-rate-limit` should be added |
| Debug builds distributed (no signing) | MEDIUM | Users must uninstall before updating on different dev machines |

---

## 15. Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AZURE (T3 Systems Subscription)                                            │
│                                                                             │
│  ┌──────────────────────────┐    ┌────────────────────────────────────┐    │
│  │ Static Web App (SA North) │    │ Blob Storage (SA North)            │    │
│  │ OAuth Redirect Host       │    │ Container: jbmarks-releases        │    │
│  │ jbmarks-oauth-redirect-   │    │  - jbmarks.apk                     │    │
│  │ prod.azurewebsites.net    │    │  - version.json                    │    │
│  └──────────────────────────┘    └────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Azure Static Web Apps (SA North)                                      │  │
│  │ Reports Dashboard                                                     │  │
│  │ reports.sdinmotion.co.za                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  RAILWAY                               │
│  JBmarks API Server                    │
│  jbmarksauth-production.up.railway.app │
│  ├── Express.js                        │
│  └── PostgreSQL (push_tokens)          │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  GOOGLE                                │
│  Firebase Cloud Messaging              │
│  (Android push notifications)          │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  SDINMOTION (On-Prem / Managed)        │
│  https://jbmarks.sdinmotion.co.za      │
│  Service Delivery in Motion            │
│  REST API at /rest/                    │
│  Tasks · Chat · Calendar · Files       │
│  Users · Workgroups · Activity Feed    │
└────────────────────────────────────────┘

                 ▲
                 │ REST API calls (HTTPS)
                 │ ?auth=<access_token>
                 │
        ┌────────┴────────┐
        │                 │
┌───────┴──────┐  ┌───────┴──────────────┐
│ Android App  │  │ Reports Web Dashboard │
│ (JBmarks)    │  │ (Browser)             │
│ SDK 24+      │  │ reports.sdinmotion.   │
└──────────────┘  │ co.za                 │
                  └───────────────────────┘
```

---

## Appendix A: OAuth Scopes Requested

The app requests the following permissions from SDiM when a user logs in:

```
crm, task, tasks_extended, calendar, user, user_brief, user_basic,
sonet_group, bizproc, log, placement, entity, disk, mailservice,
lists, calendarmobile, tasks, tasksmobile, im
```

---

## Appendix B: Webhook Events Handled

| SDiM Event | Trigger | Notification Sent To |
|------------|---------|---------------------|
| `ONTASKADD` | New task created | Task's Responsible person |
| `ONTASKCOMMENTADD` | Comment added to task | Task's Responsible (if ≠ comment author) |
| `ONTASKUPDATE` | Task modified | Task's Responsible person |
| `ONIMCOMMONADD` | New chat message | Message Recipient (if ≠ sender) |

---

## Appendix C: SDiM Task Status Code Reference

| Code | Status | Description |
|------|--------|-------------|
| `2` | New | Task created, not yet started |
| `3` | In Progress | Work actively underway |
| `4` | Awaiting Approval | Worker marked complete, awaiting supervisor approval |
| `5` | Completed | Fully done and approved |
| `6` | Deferred | Postponed — not being worked on |

---

*End of Document*

*This document reflects the system state as of June 2026. For updates or corrections, contact T3 Systems.*
