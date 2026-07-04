# JBmarks Android App - Detailed Implementation Plan

## Executive Summary

This plan outlines step-by-step implementation tasks to transform the current JBmarks app from a read-only webhook-based prototype into a full-featured Bitrix24-like Android app with OAuth 2.0 authentication and complete CRUD functionality.

**Current State**: Read-only app using hardcoded webhook URL
**Target State**: Full-featured app with OAuth authentication, CRUD operations, and all required modules

---

## Phase 1: Foundation & Authentication (Priority: CRITICAL)

### Step 1.1: Configuration Setup
**Goal**: Add configuration management for OAuth credentials and portal URL

**Tasks**:
1. Create `Config.kt` or add to `build.gradle.kts`:
   - Bitrix24 Client ID (stored in `buildConfigField` or `local.properties`)
   - Bitrix24 Client Secret (stored securely)
   - Default Portal URL (can be overridden by user)
   - Redirect URI scheme (`jbmarks://oauth_redirect`)

2. Add `buildConfigField` in `app/build.gradle.kts`:
   ```kotlin
   buildTypes {
       debug {
           buildConfigField("String", "BITRIX_CLIENT_ID", "\"YOUR_CLIENT_ID\"")
           buildConfigField("String", "BITRIX_CLIENT_SECRET", "\"YOUR_CLIENT_SECRET\"")
           buildConfigField("String", "BITRIX_REDIRECT_URI", "\"jbmarks://oauth_redirect\"")
       }
   }
   ```

**Files to Create/Modify**:
- `app/src/main/java/com/example/jbmarks/config/Config.kt` (optional, if not using BuildConfig)
- `app/build.gradle.kts` (add buildConfigField)
- `local.properties` (for secret storage, add to .gitignore)

**Dependencies**: None

---

### Step 1.2: AndroidManifest Deep Link Configuration
**Goal**: Enable app to receive OAuth callback redirects

**Tasks**:
1. Add deep link intent-filter to `AuthActivity` in `AndroidManifest.xml`:
   ```xml
   <activity
       android:name=".auth.ui.AuthActivity"
       android:exported="true">
       <intent-filter>
           <action android:name="android.intent.action.VIEW" />
           <category android:name="android.intent.category.DEFAULT" />
           <category android:name="android.intent.category.BROWSABLE" />
           <data android:scheme="jbmarks" android:host="oauth_redirect" />
       </intent-filter>
   </activity>
   ```

2. Add internet permission (if not already present)

**Files to Modify**:
- `app/src/main/AndroidManifest.xml`

**Dependencies**: Step 1.1 (Config)

---

### Step 1.3: OAuth Service Implementation
**Goal**: Create service to handle OAuth flow

**Tasks**:
1. Create `OAuthService.kt`:
   - `buildAuthorizationUrl(portalUrl: String, clientId: String, redirectUri: String): String`
   - `exchangeCodeForTokens(code: String, ...): TokenResponse`
   - `refreshAccessToken(refreshToken: String, ...): TokenResponse`
   - `validateToken(accessToken: String): Boolean`

2. Add dependency for form-urlencoded requests (if needed):
   ```kotlin
   implementation("com.squareup.retrofit2:converter-scalars:2.9.0")
   ```

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/auth/data/OAuthService.kt`
- `app/src/main/java/com/example/jbmarks/auth/data/OAuthApi.kt` (Retrofit interface for token endpoints)

**Dependencies**: Step 1.1, Step 1.2

---

### Step 1.4: Update TokenManager
**Goal**: Enhance TokenManager to support token expiry tracking

**Tasks**:
1. Add methods to `TokenManager.kt`:
   - `saveTokenExpiry(expiryTime: Long)`
   - `getTokenExpiry(): Long?`
   - `isTokenExpired(): Boolean`
   - `clearAll()` (already exists, verify)

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/auth/data/TokenManager.kt`

**Dependencies**: None (uses existing EncryptedSharedPreferences)

---

### Step 1.5: Update RetrofitInstance with Dynamic URL & Token Injection
**Goal**: Make API calls use OAuth tokens instead of hardcoded webhook

**Tasks**:
1. Update `RetrofitInstance.kt`:
   - Make `BASE_URL` dynamic (retrieve from `TokenManager.getPortalUrl()`)
   - Add OkHttp `Interceptor` to inject `auth=<token>` query parameter
   - Add response interceptor for automatic token refresh on 401

2. Create `AuthInterceptor.kt`:
   - Injects access token as query parameter
   - Detects 401 responses and triggers token refresh
   - Retries original request after refresh

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/network/AuthInterceptor.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/RetrofitInstance.kt`

**Dependencies**: Step 1.3, Step 1.4

---

### Step 1.6: Implement OAuth Flow UI
**Goal**: Create login screen and handle OAuth flow in UI

**Tasks**:
1. Update `AuthActivity.kt`:
   - Check for existing valid token on startup
   - If no token: Show login screen with "Login to Bitrix24" button
   - If token exists and valid: Navigate to MainActivity
   - If token expired: Show login screen

2. Create login UI:
   - Portal URL input field (optional, can use default)
   - "Login to Bitrix24" button
   - Opens Custom Tab or browser for OAuth

3. Handle deep link callback:
   - Extract authorization code from intent data
   - Exchange code for tokens
   - Save tokens to TokenManager
   - Navigate to MainActivity

4. Add Custom Tabs dependency:
   ```kotlin
   implementation("androidx.browser:browser:1.7.0")
   ```

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/auth/ui/AuthActivity.kt`
- `app/src/main/java/com/example/jbmarks/MainActivity.kt` (add token check)

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/auth/ui/LoginScreen.kt` (Compose screen)

**Dependencies**: Step 1.3, Step 1.4, Step 1.5

---

### Step 1.7: Update MainActivity to Check Authentication
**Goal**: Ensure app redirects to login if not authenticated

**Tasks**:
1. Update `MainActivity.kt`:
   - Check `TokenManager` for valid token on startup
   - If no token or expired: Start `AuthActivity`
   - If valid token: Continue to main app

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/MainActivity.kt`

**Dependencies**: Step 1.4, Step 1.6

---

## Phase 2: Core Module Enhancements (Priority: HIGH)

### Step 2.1: Expand BitrixApi Interface - Tasks Module
**Goal**: Add CRUD operations for tasks

**Tasks**:
1. Add methods to `BitrixApi.kt`:
   ```kotlin
   @GET("tasks.task.get.json")
   suspend fun getTask(@Query("taskId") taskId: String): TaskDetailResponse
   
   @POST("tasks.task.add.json")
   suspend fun createTask(@Body request: CreateTaskRequest): CreateTaskResponse
   
   @POST("tasks.task.update.json")
   suspend fun updateTask(@Body request: UpdateTaskRequest): UpdateTaskResponse
   
   @POST("tasks.task.delete.json")
   suspend fun deleteTask(@Body request: DeleteTaskRequest): DeleteTaskResponse
   ```

2. Create request/response data classes:
   - `CreateTaskRequest.kt`
   - `UpdateTaskRequest.kt`
   - `DeleteTaskRequest.kt`
   - `TaskDetailResponse.kt`

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/tasks/data/CreateTaskRequest.kt`
- `app/src/main/java/com/example/jbmarks/tasks/data/UpdateTaskRequest.kt`
- `app/src/main/java/com/example/jbmarks/tasks/data/DeleteTaskRequest.kt`
- `app/src/main/java/com/example/jbmarks/tasks/data/TaskDetailResponse.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`

**Dependencies**: Phase 1 complete

---

### Step 2.2: Update TasksRepository - Add CRUD Methods
**Goal**: Implement repository methods for task operations

**Tasks**:
1. Add methods to `TasksRepository.kt`:
   - `getTask(taskId: String): Task`
   - `createTask(title: String, description: String, ...): Task`
   - `updateTask(taskId: String, updates: Map<String, Any>): Task`
   - `deleteTask(taskId: String): Boolean`
   - `updateTaskStatus(taskId: String, status: TaskStatus): Task`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/tasks/data/TasksRepository.kt`

**Dependencies**: Step 2.1

---

### Step 2.3: Update TasksViewModel - Add CRUD Operations
**Goal**: Add ViewModel methods for task operations

**Tasks**:
1. Add methods to `TasksViewModel.kt`:
   - `createTask(...)`
   - `updateTask(...)`
   - `deleteTask(...)`
   - `loadTaskDetails(taskId: String)`
   - Update UI state to handle single task detail view

2. Add UI states:
   - `TaskDetailLoading`
   - `TaskDetailSuccess`
   - `CreatingTask`, `UpdatingTask`, `DeletingTask`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/tasks/ui/TasksViewModel.kt`

**Dependencies**: Step 2.2

---

### Step 2.4: Create Task Detail Screen
**Goal**: Show full task details and allow editing

**Tasks**:
1. Create `TaskDetailScreen.kt`:
   - Display task details (title, description, status, deadline, etc.)
   - Edit button/mode
   - Delete button
   - Status change buttons

2. Create `TaskEditScreen.kt`:
   - Form for creating/editing tasks
   - Title, description, deadline, priority, responsible picker

3. Update navigation to support task detail route

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/tasks/ui/TaskDetailScreen.kt`
- `app/src/main/java/com/example/jbmarks/tasks/ui/TaskEditScreen.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/navigation/Navigation.kt`
- `app/src/main/java/com/example/jbmarks/navigation/Screen.kt`

**Dependencies**: Step 2.3

---

### Step 2.5: Expand BitrixApi Interface - Chat Module
**Goal**: Add chat messaging operations

**Tasks**:
1. Add methods to `BitrixApi.kt`:
   ```kotlin
   @GET("im.dialog.messages.get.json")
   suspend fun getChatMessages(@Query("DIALOG_ID") dialogId: String): ChatMessagesResponse
   
   @POST("im.message.add.json")
   suspend fun sendMessage(@Body request: SendMessageRequest): SendMessageResponse
   
   @POST("im.chat.add.json")
   suspend fun createChat(@Body request: CreateChatRequest): CreateChatResponse
   
   @GET("im.chat.get.json")
   suspend fun getChatInfo(@Query("CHAT_ID") chatId: String): ChatInfoResponse
   ```

2. Create request/response data classes

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/chat/data/SendMessageRequest.kt`
- `app/src/main/java/com/example/jbmarks/chat/data/ChatMessagesResponse.kt`
- `app/src/main/java/com/example/jbmarks/chat/data/CreateChatRequest.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`

**Dependencies**: Phase 1 complete

---

### Step 2.6: Update ChatRepository - Add Messaging Methods
**Goal**: Implement repository methods for messaging

**Tasks**:
1. Add methods to `ChatRepository.kt`:
   - `getChatMessages(chatId: String): List<Message>`
   - `sendMessage(chatId: String, message: String): Message`
   - `createChat(title: String, userIds: List<Int>): Chat`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/chat/data/ChatRepository.kt`

**Dependencies**: Step 2.5

---

### Step 2.7: Create Chat Detail Screen
**Goal**: Show chat conversation and allow sending messages

**Tasks**:
1. Create `ChatDetailScreen.kt`:
   - Message list with sender names
   - Message input field
   - Send button
   - Auto-scroll to latest message
   - Message timestamps

2. Update navigation to support chat detail route

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/chat/ui/ChatDetailScreen.kt`
- `app/src/main/java/com/example/jbmarks/chat/ui/ChatViewModel.kt` (if separate from list)

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/chat/ui/ChatScreen.kt` (add click navigation)
- `app/src/main/java/com/example/jbmarks/navigation/Navigation.kt`

**Dependencies**: Step 2.6

---

### Step 2.8: Expand BitrixApi Interface - Calendar Module
**Goal**: Add calendar event CRUD operations

**Tasks**:
1. Add methods to `BitrixApi.kt`:
   ```kotlin
   @POST("calendar.event.add.json")
   suspend fun createEvent(@Body request: CreateEventRequest): CreateEventResponse
   
   @POST("calendar.event.update.json")
   suspend fun updateEvent(@Body request: UpdateEventRequest): UpdateEventResponse
   
   @POST("calendar.event.delete.json")
   suspend fun deleteEvent(@Body request: DeleteEventRequest): DeleteEventResponse
   ```

2. Update `getCalendarEvents` to support date filters

3. Create request/response data classes

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/calendar/data/CreateEventRequest.kt`
- `app/src/main/java/com/example/jbmarks/calendar/data/UpdateEventRequest.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`

**Dependencies**: Phase 1 complete

---

### Step 2.9: Update CalendarRepository & ViewModel - Add CRUD
**Goal**: Implement calendar event operations

**Tasks**:
1. Add methods to `CalendarRepository.kt`:
   - `createEvent(...)`
   - `updateEvent(...)`
   - `deleteEvent(...)`
   - `getEvents(dateFrom: String, dateTo: String)`

2. Update `CalendarViewModel.kt` with CRUD methods

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/calendar/data/CalendarRepository.kt`
- `app/src/main/java/com/example/jbmarks/calendar/ui/CalendarViewModel.kt`

**Dependencies**: Step 2.8

---

### Step 2.10: Enhance CalendarScreen - Add Event Creation/Editing
**Goal**: Allow users to create and edit calendar events

**Tasks**:
1. Create `EventEditScreen.kt`:
   - Title, description fields
   - Date/time pickers
   - Attendee selection
   - Location field

2. Add FAB (Floating Action Button) to `CalendarScreen.kt` for creating events

3. Update navigation

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/calendar/ui/EventEditScreen.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/calendar/ui/CalendarScreen.kt`

**Dependencies**: Step 2.9

---

### Step 2.11: Expand BitrixApi Interface - Activity Feed Module
**Goal**: Add feed posting and commenting

**Tasks**:
1. Add methods to `BitrixApi.kt`:
   ```kotlin
   @POST("log.blogpost.add.json")
   suspend fun createPost(@Body request: CreatePostRequest): CreatePostResponse
   
   @POST("log.blogcomment.add.json")
   suspend fun addComment(@Body request: AddCommentRequest): AddCommentResponse
   
   @POST("log.blogpost.update.json")
   suspend fun updatePost(@Body request: UpdatePostRequest): UpdatePostResponse
   ```

2. Create request/response data classes

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/activity_feed/data/CreatePostRequest.kt`
- `app/src/main/java/com/example/jbmarks/activity_feed/data/AddCommentRequest.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`

**Dependencies**: Phase 1 complete

---

### Step 2.12: Update ActivityFeedRepository & ViewModel - Add Posting
**Goal**: Implement feed posting and commenting

**Tasks**:
1. Add methods to `ActivityFeedRepository.kt`:
   - `createPost(message: String, title: String?)`
   - `addComment(postId: String, comment: String)`
   - `likePost(postId: String)` (if API supports)

2. Update `ActivityFeedViewModel.kt` with posting methods

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/activity_feed/data/ActivityFeedRepository.kt`
- `app/src/main/java/com/example/jbmarks/activity_feed/ui/ActivityFeedViewModel.kt`

**Dependencies**: Step 2.11

---

### Step 2.13: Enhance ActivityFeedScreen - Add Posting UI
**Goal**: Allow users to create posts and comments

**Tasks**:
1. Add FAB to `ActivityFeedScreen.kt` for creating posts
2. Create `CreatePostDialog.kt` or `CreatePostScreen.kt`:
   - Text input for post content
   - Title input (optional)
   - Post button

3. Add comment section to post items
4. Add comment input field per post

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/activity_feed/ui/CreatePostDialog.kt`
- `app/src/main/java/com/example/jbmarks/activity_feed/ui/CommentItem.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/activity_feed/ui/ActivityFeedScreen.kt`

**Dependencies**: Step 2.12

---

## Phase 3: Additional Modules (Priority: MEDIUM)

### Step 3.1: Employee Directory - API Setup
**Goal**: Set up employee directory API integration

**Tasks**:
1. Add methods to `BitrixApi.kt`:
   ```kotlin
   @GET("user.current.json")
   suspend fun getCurrentUser(): UserResponse
   
   @POST("user.get.json")
   suspend fun getUserList(@Body request: UserListRequest): UserListResponse
   
   @POST("user.search.json")
   suspend fun searchUsers(@Body request: UserSearchRequest): UserListResponse
   ```

2. Create data models:
   - `User.kt` (data)
   - `UserListResponse.kt`
   - `UserListRequest.kt`

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/employee_directory/data/User.kt`
- `app/src/main/java/com/example/jbmarks/employee_directory/data/UserListResponse.kt`
- `app/src/main/java/com/example/jbmarks/employee_directory/data/UserRepository.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`

**Dependencies**: Phase 1 complete

---

### Step 3.2: Employee Directory - Repository & ViewModel
**Goal**: Implement employee directory logic

**Tasks**:
1. Create `UserRepository.kt`:
   - `getUserList(): List<User>`
   - `searchUsers(query: String): List<User>`
   - `getUserProfile(userId: String): User`

2. Create `EmployeeDirectoryViewModel.kt`:
   - Load user list
   - Search functionality
   - User profile details

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/employee_directory/domain/User.kt`
- `app/src/main/java/com/example/jbmarks/employee_directory/ui/EmployeeDirectoryViewModel.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/employee_directory/data/UserRepository.kt` (created in 3.1)

**Dependencies**: Step 3.1

---

### Step 3.3: Employee Directory - UI Implementation
**Goal**: Create employee directory screen

**Tasks**:
1. Create `EmployeeDirectoryScreen.kt`:
   - User list with avatars, names, positions
   - Search bar
   - Click to view user profile

2. Create `UserProfileScreen.kt`:
   - User details (name, email, phone, position)
   - Action buttons (call, message, email)

3. Add to navigation:
   - New screen in bottom nav or as separate screen

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/employee_directory/ui/EmployeeDirectoryScreen.kt`
- `app/src/main/java/com/example/jbmarks/employee_directory/ui/UserProfileScreen.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/navigation/Screen.kt`
- `app/src/main/java/com/example/jbmarks/navigation/Navigation.kt`

**Dependencies**: Step 3.2

---

### Step 3.4: Notifications - API Setup
**Goal**: Set up notifications API integration

**Tasks**:
1. Add methods to `BitrixApi.kt`:
   ```kotlin
   @POST("im.notify.get.json")
   suspend fun getNotifications(): NotificationsResponse
   
   @POST("im.notify.read.json")
   suspend fun markNotificationRead(@Body request: MarkReadRequest): MarkReadResponse
   
   @GET("user.counter.current.json")
   suspend fun getUserCounters(): UserCountersResponse
   ```

2. Create data models:
   - `Notification.kt`
   - `NotificationsResponse.kt`
   - `UserCounters.kt`

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/notifications/data/Notification.kt`
- `app/src/main/java/com/example/jbmarks/notifications/data/NotificationsResponse.kt`
- `app/src/main/java/com/example/jbmarks/notifications/data/NotificationsRepository.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`

**Dependencies**: Phase 1 complete

---

### Step 3.5: Notifications - Repository & ViewModel
**Goal**: Implement notifications logic

**Tasks**:
1. Create `NotificationsRepository.kt`:
   - `getNotifications(): List<Notification>`
   - `markAsRead(notificationId: String)`
   - `markAllAsRead()`
   - `getUnreadCount(): Int`

2. Create `NotificationsViewModel.kt`:
   - Load notifications
   - Mark as read
   - Unread count state

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/notifications/domain/Notification.kt`
- `app/src/main/java/com/example/jbmarks/notifications/ui/NotificationsViewModel.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/notifications/data/NotificationsRepository.kt` (created in 3.4)

**Dependencies**: Step 3.4

---

### Step 3.6: Notifications - UI Implementation
**Goal**: Create notifications screen

**Tasks**:
1. Create `NotificationsScreen.kt`:
   - Notification list with icons/types
   - Timestamp
   - Click to navigate to related item (task, chat, etc.)
   - Mark as read on click
   - "Mark all as read" button

2. Add notification badge to navigation bar
3. Add to navigation

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/notifications/ui/NotificationsScreen.kt`

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/navigation/Screen.kt`
- `app/src/main/java/com/example/jbmarks/navigation/Navigation.kt`

**Dependencies**: Step 3.5

---

## Phase 4: Enhancements & Polish (Priority: LOW)

### Step 4.1: Add Logout Functionality
**Goal**: Allow users to log out

**Tasks**:
1. Add logout option to settings/drawer menu
2. Clear tokens from `TokenManager`
3. Navigate to `AuthActivity`
4. Clear any cached data

**Files to Modify**:
- `app/src/main/java/com/example/jbmarks/auth/data/TokenManager.kt` (verify clearAll)
- `app/src/main/java/com/example/jbmarks/MainActivity.kt` (add logout)
- Create settings menu/drawer

**Dependencies**: Phase 1 complete

---

### Step 4.2: Error Handling Improvements
**Goal**: Improve error handling across the app

**Tasks**:
1. Create `BitrixApiException.kt` custom exception class
2. Handle specific error codes (401, 403, 404, 500)
3. Show user-friendly error messages
4. Add retry mechanisms
5. Log errors appropriately

**Files to Create**:
- `app/src/main/java/com/example/jbmarks/network/BitrixApiException.kt`

**Files to Modify**:
- All ViewModels (improve error handling)
- All Repositories (throw custom exceptions)

**Dependencies**: Phase 1 complete

---

### Step 4.3: Loading States & Pull-to-Refresh
**Goal**: Improve UX with better loading indicators

**Tasks**:
1. Add pull-to-refresh to all list screens
2. Implement proper loading states
3. Add skeleton loaders
4. Handle empty states better

**Files to Modify**:
- All UI screens (TasksScreen, ChatScreen, etc.)
- All ViewModels (add refreshing state)

**Dependencies**: All phases

---

### Step 4.4: Pagination Support
**Goal**: Implement pagination for large lists

**Tasks**:
1. Update API calls to support pagination (`start`, `next` parameters)
2. Implement infinite scroll or "Load More" buttons
3. Update repositories to handle pagination
4. Update ViewModels to manage paginated state

**Files to Modify**:
- All Repositories (add pagination params)
- All ViewModels (manage paginated state)
- All UI screens (add load more/scroll detection)

**Dependencies**: Phase 2 complete

---

### Step 4.5: Offline Support (Optional)
**Goal**: Cache data for offline viewing

**Tasks**:
1. Add Room database dependency
2. Create entities for each module (Task, Chat, Event, Post)
3. Create DAOs
4. Update repositories to cache data
5. Implement sync mechanism

**Dependencies to Add**:
```kotlin
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")
kapt("androidx.room:room-compiler:2.6.1")
```

**Files to Create**:
- Database classes
- Entity classes
- DAO interfaces

**Dependencies**: All phases

---

### Step 4.6: Background Sync (Optional)
**Goal**: Periodically sync data in background

**Tasks**:
1. Add WorkManager dependency
2. Create sync workers for each module
3. Schedule periodic sync
4. Handle sync conflicts

**Dependencies to Add**:
```kotlin
implementation("androidx.work:work-runtime-ktx:2.9.0")
```

**Files to Create**:
- Worker classes for each module

**Dependencies**: Step 4.5 (if offline support implemented)

---

## Implementation Order Summary

### Must-Have (MVP):
1. **Phase 1**: Complete authentication flow
2. **Phase 2.1-2.4**: Tasks CRUD
3. **Phase 2.5-2.7**: Chat messaging
4. **Phase 2.8-2.10**: Calendar events CRUD
5. **Phase 2.11-2.13**: Activity feed posting

### Should-Have:
6. **Phase 3.1-3.3**: Employee Directory
7. **Phase 3.4-3.6**: Notifications
8. **Phase 4.1**: Logout
9. **Phase 4.2**: Error handling

### Nice-to-Have:
10. **Phase 4.3**: Loading states & pull-to-refresh
11. **Phase 4.4**: Pagination
12. **Phase 4.5**: Offline support
13. **Phase 4.6**: Background sync

---

## Testing Checklist

### Unit Tests:
- [ ] OAuthService token exchange
- [ ] TokenManager save/retrieve
- [ ] Repository methods
- [ ] ViewModel state management

### Integration Tests:
- [ ] OAuth flow end-to-end
- [ ] API calls with token injection
- [ ] Token refresh on 401

### UI Tests:
- [ ] Login flow
- [ ] Navigation between screens
- [ ] CRUD operations for each module

---

## Risk Mitigation

1. **OAuth Flow Complexity**: Start with webhook testing, then migrate to OAuth
2. **Token Security**: Use EncryptedSharedPreferences (already implemented)
3. **API Changes**: Keep API documentation handy, version endpoints if possible
4. **Error Handling**: Implement comprehensive error handling early
5. **Performance**: Use pagination, caching, and background sync

---

## Notes

- **Current Webhook URL**: The app currently uses `https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss/` - this suggests it's using a Bitrix24 webhook. Consider keeping webhook as a fallback option during OAuth implementation.
- **Test Files**: The `app/Test files/` directory contains React Native/TypeScript code that may be useful as reference for API structure.
- **Dependencies**: Most required dependencies are already added. May need to add:
  - `androidx.browser:browser` for Custom Tabs
  - `com.squareup.retrofit2:converter-scalars` for form-urlencoded OAuth requests
  - Room/WorkManager if implementing offline/background sync

---

## Estimated Timeline

- **Phase 1** (Authentication): 3-5 days
- **Phase 2** (Core CRUD): 5-7 days
- **Phase 3** (Additional Modules): 3-4 days
- **Phase 4** (Enhancements): 3-5 days

**Total MVP**: ~2 weeks
**Full Implementation**: ~3-4 weeks

---

This plan should be executed sequentially, with each phase building on the previous one. Start with Phase 1 to establish the authentication foundation before moving to feature development.
