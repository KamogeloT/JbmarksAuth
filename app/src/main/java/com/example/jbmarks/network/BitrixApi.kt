package com.example.jbmarks.network

import com.example.jbmarks.activity_feed.data.BlogFeedResponse
import com.example.jbmarks.activity_feed.data.AddBlogPostRequest
import com.example.jbmarks.activity_feed.data.AddBlogPostResponse
import com.example.jbmarks.activity_feed.data.GetUsersFeedRequest
import com.example.jbmarks.activity_feed.data.FeedEventsResponse
import com.example.jbmarks.calendar.data.CalendarEventsResponse
import com.example.jbmarks.calendar.data.CalendarEventsRequest
import com.example.jbmarks.chat.data.ChatRecentResponse
import com.example.jbmarks.chat.data.ChatMessagesResponse
import com.example.jbmarks.chat.data.SendMessageRequest
import com.example.jbmarks.chat.data.SendMessageResponse
import com.example.jbmarks.chat.data.CreateChatRequest
import com.example.jbmarks.chat.data.CreateChatResponse
import com.example.jbmarks.tasks.data.AddChecklistItemRequest
import com.example.jbmarks.tasks.data.AddCommentRequest
import com.example.jbmarks.tasks.data.AddElapsedTimeRequest
import com.example.jbmarks.tasks.data.AttachFileRequest
import com.example.jbmarks.tasks.data.ChecklistItem
import com.example.jbmarks.tasks.data.ChecklistItemResponse
import com.example.jbmarks.tasks.data.Comment
import com.example.jbmarks.tasks.data.CommentResponse
import com.example.jbmarks.tasks.data.CommentsListResponse
import com.example.jbmarks.tasks.data.ElapsedTimeItem
import com.example.jbmarks.tasks.data.ElapsedTimeResponse
import com.example.jbmarks.tasks.data.FileOperationResponse
import com.example.jbmarks.tasks.data.FileDetails
import com.example.jbmarks.tasks.data.FileUploadResponse
import com.example.jbmarks.tasks.data.TaskCreateRequest
import com.example.jbmarks.tasks.data.TaskDto
import com.example.jbmarks.tasks.data.TaskResponse
import com.example.jbmarks.tasks.data.TasksListResponse
import com.example.jbmarks.tasks.data.UpdateChecklistItemRequest
import com.example.jbmarks.tasks.data.UpdateElapsedTimeRequest
import com.example.jbmarks.user.data.BitrixResponse
import com.example.jbmarks.user.data.User
import com.example.jbmarks.user.data.Workgroup
import retrofit2.Response
import retrofit2.http.*
import com.example.jbmarks.tasks.data.FileUploadRequest

interface BitrixApi {

    // ===== FEED / ACTIVITY STREAM OPERATIONS =====
    
    /**
     * Get news feed messages (Activity Stream)
     * Bitrix24 API: log.blogpost.get
     */
    @GET("log.blogpost.get.json")
    suspend fun getBlogFeed(
        @Query("POST_ID") postId: String? = null,
        @Query("FILTER") filter: Map<String, String>? = null
    ): Response<BlogFeedResponse>
    
    /**
     * Add / Post to Feed (Activity Stream)
     * Bitrix24 API: log.blogpost.add
     */
    @POST("log.blogpost.add.json")
    suspend fun addBlogPost(
        @Body request: AddBlogPostRequest
    ): Response<AddBlogPostResponse>
    
    /**
     * Get posts for specific users
     * Bitrix24 API: log.blogpost.getusers
     */
    @POST("log.blogpost.getusers.json")
    suspend fun getUsersFeed(
        @Body request: GetUsersFeedRequest
    ): Response<BlogFeedResponse>
    
    /**
     * Get feed events (types of events that trigger feed updates)
     * Bitrix24 API: log/events
     */
    @GET("log/events.json")
    suspend fun getFeedEvents(): Response<FeedEventsResponse>

    // ===== CHAT OPERATIONS =====
    
    /**
     * Get recent chats
     */
    @GET("im.recent.get.json")
    suspend fun getRecentChats(): ChatRecentResponse
    
    /**
     * Get chat messages
     */
    @GET("im.dialog.messages.get.json")
    suspend fun getChatMessages(
        @Query("DIALOG_ID") dialogId: String,
        @Query("LIMIT") limit: Int = 20,
        @Query("LAST_ID") lastId: String? = null
    ): Response<ChatMessagesResponse>
    
    /**
     * Send a message
     */
    @POST("im.message.add.json")
    suspend fun sendMessage(
        @Body request: SendMessageRequest
    ): Response<SendMessageResponse>
    
    /**
     * Create a new chat
     */
    @POST("im.chat.add.json")
    suspend fun createChat(
        @Body request: CreateChatRequest
    ): Response<CreateChatResponse>
    
    /**
     * Mark messages as read
     */
    @POST("im.dialog.read.json")
    suspend fun markMessagesAsRead(
        @Query("DIALOG_ID") dialogId: String,
        @Query("MESSAGE_ID") messageId: String? = null
    ): Response<BitrixResponse<Any>>

    /**
     * Get tasks with optional filters and pagination
     * Bitrix24 API supports filtering by RESPONSIBLE_ID, CREATED_BY, STATUS, GROUP_ID, etc.
     * Filters respect Bitrix24 role-based permissions automatically
     * Supports pagination via start parameter
     */
    @GET("tasks.task.list.json")
    suspend fun getTasks(
        @Query("filter[RESPONSIBLE_ID]") responsibleId: String? = null,
        @Query("filter[CREATED_BY]") createdBy: String? = null,
        @Query("filter[STATUS]") status: String? = null,
        @Query("filter[GROUP_ID]") groupId: String? = null,
        @Query("order[DEADLINE]") orderDeadline: String? = null, // "ASC" or "DESC"
        @Query("start") start: Int? = null, // Pagination offset
        @Query("select[]") select: List<String>? = null // Fields to return
    ): TasksListResponse

    @POST("calendar.event.get.json")
    suspend fun getCalendarEvents(
        @Body request: CalendarEventsRequest
    ): Response<CalendarEventsResponse>
    
    @GET("user.current.json")
    suspend fun getCurrentUser(): BitrixResponse<User>
    
    /**
     * Get user information by ID
     */
    @GET("user.get.json")
    suspend fun getUser(@Query("ID") userId: String): BitrixResponse<List<User>>
    
    @GET("sonet_group.user.groups.json")
    suspend fun getUserWorkgroups(): BitrixResponse<List<Workgroup>>
    
    // ===== TASK CRUD OPERATIONS =====
    
    /**
     * Get a single task by ID
     */
    @GET("tasks.task.get.json")
    suspend fun getTask(
        @Query("taskId") taskId: String,
        @Query("select[]") select: List<String>? = listOf("*", "UF_*")
    ): Response<TaskResponse>
    
    /**
     * Create a new task
     */
    @POST("tasks.task.add.json")
    suspend fun createTask(@Body request: TaskCreateRequest): Response<TaskResponse>
    
    /**
     * Update an existing task
     */
    @POST("tasks.task.update.json")
    suspend fun updateTask(
        @Query("taskId") taskId: String,
        @Body request: TaskCreateRequest
    ): Response<TaskResponse>
    
    /**
     * Delete a task
     */
    @POST("tasks.task.delete.json")
    suspend fun deleteTask(@Query("taskId") taskId: String): Response<BitrixResponse<Boolean>>
    
    /**
     * Complete a task
     */
    @POST("tasks.task.complete.json")
    suspend fun completeTask(@Query("taskId") taskId: String): Response<TaskResponse>
    
    /**
     * Start a task (set to In Progress)
     */
    @POST("tasks.task.start.json")
    suspend fun startTask(@Query("taskId") taskId: String): Response<TaskResponse>
    
    /**
     * Defer a task
     */
    @POST("tasks.task.defer.json")
    suspend fun deferTask(@Query("taskId") taskId: String): Response<TaskResponse>
    
    /**
     * Renew a task (reopen after completion)
     */
    @POST("tasks.task.renew.json")
    suspend fun renewTask(@Query("taskId") taskId: String): Response<TaskResponse>
    
    // ===== TASK COMMENTS =====
    
    /**
     * Get comments for a task
     * Bitrix24 API: task.commentitem.getlist
     * Note: Bitrix docs indicate development halted for some task.commentitem.* methods since v25.700.0
     * This may still work but plan for fallback alternatives
     * Response structure: { "result": { "items": [...] } } or { "result": [...] }
     */
    @POST("task.commentitem.getlist.json")
    suspend fun getTaskComments(
        @Body request: Map<String, String>
    ): Response<CommentsListResponse>
    
    /**
     * Add a comment to a task
     * Bitrix24 API: task.commentitem.add (recommended, replaces deprecated tasks.task.comment.add)
     */
    @POST("task.commentitem.add.json")
    suspend fun addTaskComment(
        @Body request: AddCommentRequest
    ): Response<CommentResponse>
    
    // ===== TASK CHECKLISTS =====
    
    /**
     * Get checklist items for a task
     * Bitrix24 API: task.checklistitem.getlist
     */
    @POST("task.checklistitem.getlist.json")
    suspend fun getChecklistItems(
        @Body request: Map<String, String>
    ): Response<Map<String, List<ChecklistItem>>>
    
    /**
     * Add a checklist item to a task
     * Bitrix24 API: task.checklistitem.add
     */
    @POST("task.checklistitem.add.json")
    suspend fun addChecklistItem(
        @Body request: AddChecklistItemRequest
    ): Response<ChecklistItemResponse>
    
    /**
     * Update a checklist item
     * Bitrix24 API: task.checklistitem.update
     */
    @POST("task.checklistitem.update.json")
    suspend fun updateChecklistItem(
        @Body request: UpdateChecklistItemRequest
    ): Response<ChecklistItemResponse>
    
    /**
     * Renew (mark incomplete) a checklist item
     * Bitrix24 API: task.checklistitem.renew
     */
    @POST("task.checklistitem.renew.json")
    suspend fun renewChecklistItem(
        @Body request: Map<String, String>
    ): Response<ChecklistItemResponse>
    
    /**
     * Get a single checklist item
     * Bitrix24 API: task.checklistitem.get
     */
    @POST("task.checklistitem.get.json")
    suspend fun getChecklistItem(
        @Body request: Map<String, String>
    ): Response<ChecklistItemResponse>
    
    // ===== TIME TRACKING (ELAPSED TIME) =====
    
    /**
     * Add elapsed time entry to a task
     * Bitrix24 API: task.elapseditem.add
     */
    @POST("task.elapseditem.add.json")
    suspend fun addElapsedTime(
        @Body request: AddElapsedTimeRequest
    ): Response<ElapsedTimeResponse>
    
    /**
     * Get elapsed time entries for a task
     * Bitrix24 API: task.elapseditem.getlist
     */
    @POST("task.elapseditem.getlist.json")
    suspend fun getElapsedTimeEntries(
        @Body request: Map<String, String>
    ): Response<Map<String, List<ElapsedTimeItem>>>
    
    /**
     * Update an elapsed time entry
     * Bitrix24 API: task.elapseditem.update
     */
    @POST("task.elapseditem.update.json")
    suspend fun updateElapsedTime(
        @Body request: UpdateElapsedTimeRequest
    ): Response<ElapsedTimeResponse>
    
    // ===== FILE OPERATIONS =====
    
    /**
     * Upload file to Bitrix24 Drive
     * Bitrix24 API: disk.storage.uploadfile
     * Uploads file to the root folder (ID = 1)
     */
    @POST("disk.storage.uploadfile.json")
    suspend fun uploadFile(
        @Body request: FileUploadRequest
    ): Response<FileUploadResponse>
    
    /**
     * Attach file to task
     * Bitrix24 API: tasks.task.files.attach
     */
    @POST("tasks.task.files.attach.json")
    suspend fun attachFileToTask(
        @Body request: AttachFileRequest
    ): Response<FileOperationResponse>
    
    /**
     * Get file details by ID
     * Returns file metadata including DOWNLOAD_URL (which already includes auth)
     */
    @GET("disk.file.get.json")
    suspend fun getFileDetails(
        @Query("id") fileId: String
    ): Response<BitrixResponse<FileDetails>>
}