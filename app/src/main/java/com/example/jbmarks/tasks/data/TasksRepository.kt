package com.example.jbmarks.tasks.data

import android.content.Context
import android.util.Log
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.tasks.domain.Comment as DomainComment
import com.example.jbmarks.tasks.domain.CommentFile as DomainCommentFile
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.TaskFile as DomainTaskFile
import com.example.jbmarks.tasks.domain.TaskPriority
import com.example.jbmarks.tasks.domain.TaskStatus
import com.example.jbmarks.tasks.data.TaskFileDto
import com.example.jbmarks.tasks.data.FileDetails
import com.example.jbmarks.tasks.data.AttachedObject
import com.example.jbmarks.tasks.data.AttachedObjectResponse
import com.example.jbmarks.config.Config
import com.example.jbmarks.network.APIRequestHelper
import com.google.gson.Gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.example.jbmarks.tasks.domain.mapDataToDomain
import com.example.jbmarks.user.data.UserRepository
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.FormBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import java.io.File
import java.util.*
import java.util.concurrent.TimeUnit
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TasksRepository(private val context: Context? = null) {

    private val api = RetrofitInstance.api
    private val TAG = "TasksRepository"
    
    private val userRepository: UserRepository? = if (context != null) UserRepository(context) else null
    private val apiHelper: APIRequestHelper? = if (context != null) APIRequestHelper(context) else null
    
    /**
     * Helper to execute API calls with automatic token refresh
     */
    private suspend fun <T> executeApiCall(operation: suspend () -> retrofit2.Response<T>): retrofit2.Response<T> {
        return if (apiHelper != null) {
            apiHelper.executeWithTokenRefresh(operation)
        } else {
            operation()
        }
    }

    /**
     * Get all tasks accessible to the current logged-in user
     * Bitrix24 API automatically respects role-based permissions and returns:
     * - Tasks where user is RESPONSIBLE (assigned to them)
     * - Tasks where user is CREATED_BY (created by them)
     * - Tasks where user is an ACCOMPLICE (participant)
     * - Tasks where user is an AUDITOR (observer)
     * - Tasks in groups the user belongs to
     */
    suspend fun getTasks(): List<Task> {
        return try {
            // Get current user ID and workgroups for filtering
            val currentUserId = getCurrentUserId()
            val userWorkgroups = getUserWorkgroupIds()
            
            if (currentUserId != null) {
                Log.d(TAG, "Fetching all accessible tasks for user ID: $currentUserId")
                if (userWorkgroups.isNotEmpty()) {
                    Log.d(TAG, "User is in ${userWorkgroups.size} workgroups: $userWorkgroups")
                }
            } else {
                Log.w(TAG, "Could not get current user ID, fetching all accessible tasks")
            }
            
            // Fetch ALL tasks with pagination - Bitrix24 returns max 50 per page
            val allRawData = mutableListOf<com.example.jbmarks.tasks.data.Task>()
            var start: Int? = 0
            
            while (start != null) {
                val response = api.getTasks(
                    responsibleId = null,
                    createdBy = null,
                    status = null,
                    start = if (start == 0) null else start
                )
                
                val rawData = response.result?.tasks ?: emptyList()
                allRawData.addAll(rawData)
                
                Log.d(TAG, "Fetched ${rawData.size} tasks (offset: $start, total so far: ${allRawData.size}, server total: ${response.total})")
                
                // If there's a next page, continue; otherwise stop
                start = response.next
            }
            
            Log.d(TAG, "Found ${allRawData.size} total accessible tasks from API (all pages)")
            
            // Filter out tasks with invalid IDs (null or "0")
            val validTasks = allRawData.mapNotNull { dataTask ->
                val taskId = dataTask.id
                if (taskId.isNullOrBlank() || taskId == "0") {
                    Log.w(TAG, "Skipping task with invalid ID: $taskId, title: ${dataTask.title}")
                    null
                } else {
                    mapDataToDomain(dataTask)
                }
            }
            Log.d(TAG, "Returning ${validTasks.size} valid tasks from ${allRawData.size} API tasks")
            validTasks
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching tasks", e)
            emptyList()
        }
    }
    
    /**
     * Get user's workgroup IDs
     */
    private suspend fun getUserWorkgroupIds(): List<String> {
        return try {
            if (context == null || userRepository == null) {
                Log.w(TAG, "Context not available, cannot get user workgroups")
                return emptyList()
            }
            
            val workgroupsResult = userRepository.getUserWorkgroups()
            workgroupsResult.getOrNull()?.map { it.id } ?: emptyList()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get user workgroups", e)
            emptyList()
        }
    }
    
    /**
     * Get current user ID from Bitrix24
     */
    private suspend fun getCurrentUserId(): String? {
        return try {
            if (context == null || userRepository == null) {
                Log.w(TAG, "Context not available, cannot get current user ID")
                return null
            }
            
            val userResult = userRepository.getCurrentUser()
            userResult.getOrNull()?.id
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get current user ID", e)
            null
        }
    }

    /**
     * Get a single task by ID
     */
    suspend fun getTask(taskId: String): Result<Task> {
        return try {
            val response = executeApiCall {
                api.getTask(taskId)
            }
            
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to get task: $error")
                Result.failure(Exception("Failed to get task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting task", e)
            Result.failure(e)
        }
    }

    /**
     * Create a new task
     */
    suspend fun createTask(
        title: String,
        description: String? = null,
        deadline: String? = null,
        priority: TaskPriority = TaskPriority.NORMAL,
        responsibleId: String? = null,
        groupId: String? = null,
        fileIds: List<String> = emptyList()
    ): Result<Task> {
        return try {
            val request = TaskCreateRequest(
                fields = TaskFields(
                    title = title,
                    description = description,
                    deadline = deadline,
                    priority = priority.value,
                    responsibleId = responsibleId,
                    groupId = groupId,
                    parentId = null,
                    tags = null,
                    ufTaskWebdavFiles = if (fileIds.isNotEmpty()) fileIds else null
                )
            )
            
            val response = executeApiCall {
                api.createTask(request)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task created successfully: ${task.id}")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to create task: $error")
                Result.failure(Exception("Failed to create task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error creating task", e)
            Result.failure(e)
        }
    }

    /**
     * Update an existing task
     */
    suspend fun updateTask(
        taskId: String,
        title: String,
        description: String? = null,
        deadline: String? = null,
        priority: TaskPriority = TaskPriority.NORMAL,
        responsibleId: String? = null,
        fileIds: List<String> = emptyList()
    ): Result<Task> {
        return try {
            val request = TaskCreateRequest(
                fields = TaskFields(
                    title = title,
                    description = description,
                    deadline = deadline,
                    priority = priority.value,
                    responsibleId = responsibleId,
                    groupId = null,
                    parentId = null,
                    tags = null,
                    ufTaskWebdavFiles = if (fileIds.isNotEmpty()) fileIds else null
                )
            )
            
            val response = executeApiCall {
                api.updateTask(taskId, request)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task updated successfully: ${task.id}")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to update task: $error")
                Result.failure(Exception("Failed to update task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating task", e)
            Result.failure(e)
        }
    }

    /**
     * Delegate a task to a different user by updating the RESPONSIBLE_ID.
     * The new responsible user must be a member of the task's workgroup.
     * Validation is enforced in the ViewModel before calling this method.
     *
     * @param taskId         ID of the task to delegate
     * @param taskTitle      Current title of the task (required by the update API)
     * @param newResponsibleId  User ID of the new responsible person
     */
    suspend fun delegateTask(
        taskId: String,
        taskTitle: String,
        newResponsibleId: String
    ): Result<Task> {
        return try {
            val request = TaskCreateRequest(
                fields = TaskFields(
                    title = taskTitle,
                    description = null,
                    deadline = null,
                    priority = null,
                    responsibleId = newResponsibleId,
                    groupId = null,
                    parentId = null,
                    tags = null,
                    ufTaskWebdavFiles = null
                )
            )
            val response = executeApiCall {
                api.updateTask(taskId, request)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task $taskId delegated to user $newResponsibleId")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to delegate task: $error")
                Result.failure(Exception("Failed to delegate task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error delegating task", e)
            Result.failure(e)
        }
    }

    /**
     * Delete a task
     */
    suspend fun deleteTask(taskId: String): Result<Boolean> {
        return try {
            val response = executeApiCall {
                api.deleteTask(taskId)
            }
            if (response.isSuccessful) {
                Log.d(TAG, "Task deleted successfully: $taskId")
                Result.success(true)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to delete task: $error")
                Result.failure(Exception("Failed to delete task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting task", e)
            Result.failure(e)
        }
    }

    /**
     * Complete a task
     */
    suspend fun completeTask(taskId: String): Result<Task> {
        return try {
            val response = executeApiCall {
                api.completeTask(taskId)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task completed successfully: ${task.id}")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to complete task: $error")
                Result.failure(Exception("Failed to complete task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error completing task", e)
            Result.failure(e)
        }
    }

    /**
     * Start a task (set to In Progress)
     */
    suspend fun startTask(taskId: String): Result<Task> {
        return try {
            val response = executeApiCall {
                api.startTask(taskId)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task started successfully: ${task.id}")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to start task: $error")
                Result.failure(Exception("Failed to start task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting task", e)
            Result.failure(e)
        }
    }

    /**
     * Defer a task
     */
    suspend fun deferTask(taskId: String): Result<Task> {
        return try {
            val response = executeApiCall {
                api.deferTask(taskId)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task deferred successfully: ${task.id}")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to defer task: $error")
                Result.failure(Exception("Failed to defer task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error deferring task", e)
            Result.failure(e)
        }
    }

    /**
     * Renew a task (reopen after completion)
     */
    suspend fun renewTask(taskId: String): Result<Task> {
        return try {
            val response = executeApiCall {
                api.renewTask(taskId)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                val task = mapDtoToDomain(taskDto)
                Log.d(TAG, "Task renewed successfully: ${task.id}")
                Result.success(task)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to renew task: $error")
                Result.failure(Exception("Failed to renew task: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error renewing task", e)
            Result.failure(e)
        }
    }

    /**
     * Get comments for a task
     */
    suspend fun getTaskComments(taskId: String): Result<List<DomainComment>> {
        return try {
            val request = mapOf("TASK_ID" to taskId)
            val response = executeApiCall {
                api.getTaskComments(request)
            }
            
            if (response.isSuccessful && response.body() != null) {
                // Bitrix24 returns comments in result array or object
                val commentsListResponse = response.body()!!
                val commentsList = commentsListResponse.result ?: emptyList()
                
                // Collect unique author IDs (using the helper method that handles both cases)
                val authorIds = commentsList.mapNotNull { it.getAuthorIdValue() }.distinct()
                
                Log.d(TAG, "Found ${authorIds.size} unique author IDs: $authorIds")
                
                // Fetch user information for all authors
                val userMap = mutableMapOf<String, String>()
                authorIds.forEach { authorId ->
                    try {
                        val userResponse = api.getUser(authorId)
                        if (userResponse.result?.isNotEmpty() == true) {
                            val user = userResponse.result!![0]
                            userMap[authorId] = user.fullName
                            Log.d(TAG, "Fetched user info for $authorId: ${user.fullName}")
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to fetch user info for author $authorId: ${e.message}")
                    }
                }
                
                Log.d(TAG, "User map contains ${userMap.size} entries")
                
                val comments = commentsList.mapNotNull { comment ->
                    try {
                        val commentAuthorId = comment.getAuthorIdValue()
                        // Get author name from map or from comment's author object
                        val authorName = comment.getAuthorName() 
                            ?: (commentAuthorId?.let { userMap[it] })
                            ?: null
                        
                        Log.d(TAG, "Comment ID: ${comment.getIdValue()}, Author ID: $commentAuthorId, Author Name: $authorName")
                        
                        mapCommentToDomain(comment, authorName, commentAuthorId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error mapping comment", e)
                        null
                    }
                }.sortedBy { it.createdDate }
                
                Log.d(TAG, "Loaded ${comments.size} comments for task $taskId")
                Result.success(comments)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to get comments: $error")
                Result.failure(Exception("Failed to get comments: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting comments", e)
            Result.failure(e)
        }
    }
    
    /**
     * Add a comment to a task
     * Uses OAuth authentication so the comment is posted as the logged-in user
     */
    suspend fun addComment(taskId: String, text: String, fileIds: List<String> = emptyList()): Result<DomainComment> {
        return try {
            // Convert taskId string to integer as Bitrix24 API requires
            val taskIdInt = taskId.toIntOrNull()
            if (taskIdInt == null) {
                Log.e(TAG, "Invalid taskId: $taskId (cannot convert to integer)")
                return Result.failure(Exception("Invalid task ID: $taskId"))
            }
            
            // Use OAuth authentication (not webhook) so comment is posted as logged-in user
            val commentId = addCommentWithOAuth(taskIdInt, text, fileIds)
            if (commentId != null) {
                Log.d(TAG, "Comment added successfully via OAuth: $commentId")
                
                // Fetch the newly created comment to get full details
                val commentsResult = getTaskComments(taskId)
                commentsResult.onSuccess { comments ->
                    val newComment = comments.find { it.id == commentId }
                    if (newComment != null) {
                        return Result.success(newComment)
                    }
                }
                
                // If we can't find the comment, return a minimal one
                Result.success(
                    DomainComment(
                        id = commentId,
                        taskId = taskId,
                        authorId = "",
                        authorName = null,
                        text = text,
                        createdDate = Date().toString(),
                        files = emptyList()
                    )
                )
            } else {
                Log.e(TAG, "Failed to add comment via OAuth")
                Result.failure(Exception("Failed to add comment via OAuth"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error adding comment", e)
            Result.failure(e)
        }
    }
    
    /**
     * Add comment using OAuth authentication (logged-in user)
     * Uses the same JSON array format but with OAuth token instead of webhook
     */
    private suspend fun addCommentWithOAuth(taskId: Int, text: String, fileIds: List<String>): String? {
        return try {
            // Get portal URL
            val portalUrl = if (context != null) {
                com.example.jbmarks.auth.data.TokenManager(context).getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
            } else {
                Config.DEFAULT_PORTAL_URL
            }
            
            // Get OAuth access token
            val tokenManager = if (context != null) {
                com.example.jbmarks.auth.data.TokenManager(context)
            } else {
                Log.w(TAG, "Context not available, cannot get OAuth token")
                return null
            }
            
            val accessToken = tokenManager.getAccessToken()
            if (accessToken == null) {
                Log.w(TAG, "OAuth token not available, cannot add comment")
                return null
            }
            
            // Construct OAuth API URL: /rest/task.commentitem.add.json?auth=<token>
            val oauthUrl = "$portalUrl/rest/task.commentitem.add.json?auth=$accessToken"
            Log.d(TAG, "Calling task.commentitem.add with OAuth: $oauthUrl")
            
            // Build JSON array request body (same format as webhook)
            // Bitrix24 expects: [taskId, {"POST_MESSAGE": "text", "UF_TASK_WEBDAV_FILES": [...]}]
            val commentFields = mutableMapOf<String, Any>(
                "POST_MESSAGE" to text
            )
            
            // Add files if provided - Bitrix24 requires UF_TASK_WEBDAV_FILES (disk file IDs)
            if (fileIds.isNotEmpty()) {
                commentFields["UF_TASK_WEBDAV_FILES"] = fileIds
            }
            
            // Create JSON array: [taskId, {fields}]
            val jsonArray = JsonArray()
            jsonArray.add(taskId) // Index 0: task ID
            jsonArray.add(Gson().toJsonTree(commentFields)) // Index 1: comment fields object
            
            val jsonBody = Gson().toJson(jsonArray)
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBodyObj = jsonBody.toRequestBody(mediaType)
            
            Log.d(TAG, "Request body (JSON array with OAuth): $jsonBody")
            
            // Make HTTP call using OkHttpClient with OAuth token in URL
            val response = withContext(Dispatchers.IO) {
                val client = OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(60, TimeUnit.SECONDS)
                    .build()
                
                val request = Request.Builder()
                    .url(oauthUrl)
                    .post(requestBodyObj)
                    .addHeader("Content-Type", "application/json; charset=utf-8")
                    .build()
                
                client.newCall(request).execute()
            }
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                if (responseBody != null) {
                    Log.d(TAG, "Response from task.commentitem.add (OAuth): $responseBody")
                    val gson = Gson()
                    
                    // Parse response (same as webhook - result can be number or object)
                    try {
                        val jsonObject = gson.fromJson(responseBody, JsonObject::class.java)
                        val resultElement = jsonObject.get("result")
                        
                        if (resultElement != null && !resultElement.isJsonNull) {
                            val commentId = when {
                                resultElement.isJsonPrimitive -> {
                                    val primitive = resultElement.asJsonPrimitive
                                    if (primitive.isNumber) {
                                        primitive.asInt.toString()
                                    } else {
                                        primitive.asString
                                    }
                                }
                                resultElement.isJsonObject -> {
                                    resultElement.asJsonObject.get("ID")?.asString
                                        ?: resultElement.asJsonObject.get("id")?.asString
                                }
                                else -> null
                            }
                            
                            if (commentId != null) {
                                Log.d(TAG, "Successfully parsed comment ID: $commentId")
                                return commentId
                            }
                        }
                        
                        Log.e(TAG, "No comment ID found in response: $responseBody")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing comment response: ${e.message}", e)
                    }
                }
            } else {
                val errorBody = response.body?.string()
                Log.e(TAG, "Failed to add comment via OAuth: HTTP ${response.code}, error: $errorBody")
            }
            
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error adding comment with OAuth: ${e.message}", e)
            null
        }
    }
    
    /**
     * Add comment using webhook authentication (user 1) - DEPRECATED
     * Kept for reference but not used anymore
     * Uses format: /rest/1/<webhook_token>/task.commentitem.add.json
     * This is separate from OAuth2 authentication
     */
    private suspend fun addCommentWithWebhook(taskId: Int, text: String, fileIds: List<String>): String? {
        return try {
            // Get portal URL
            val portalUrl = if (context != null) {
                com.example.jbmarks.auth.data.TokenManager(context).getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
            } else {
                Config.DEFAULT_PORTAL_URL
            }
            
            val webhookToken = getWebhookToken()
            if (webhookToken == null) {
                Log.w(TAG, "Webhook token not available, cannot add comment")
                return null
            }
            
            // Construct webhook URL: /rest/1/<token>/task.commentitem.add.json
            // Bitrix24 webhook expects task.commentitem.add.json (matches Retrofit interface)
            val webhookUrl = "$portalUrl/rest/${Config.WEBHOOK_USER_ID}/$webhookToken/task.commentitem.add.json"
            Log.d(TAG, "Calling task.commentitem.add with webhook: $webhookUrl")
            
            // Build JSON array request body
            // Bitrix24 expects: [taskId, {"POST_MESSAGE": "text", "AUTHOR_ID": "userId", "FILES": [...]}]
            // Format: [6, {"POST_MESSAGE": "comment text", "AUTHOR_ID": "123"}]
            val commentFields = mutableMapOf<String, Any>(
                "POST_MESSAGE" to text
            )
            
            // Add current user ID as author
            val currentUserId = getCurrentUserId()
            if (currentUserId != null) {
                commentFields["AUTHOR_ID"] = currentUserId
                Log.d(TAG, "Adding comment with author ID: $currentUserId")
            } else {
                Log.w(TAG, "Could not get current user ID, comment will use webhook user as author")
            }
            
            // Add files if provided
            if (fileIds.isNotEmpty()) {
                commentFields["FILES"] = fileIds
            }
            
            // Create JSON array: [taskId, {fields}]
            val jsonArray = JsonArray()
            jsonArray.add(taskId) // Index 0: task ID
            jsonArray.add(Gson().toJsonTree(commentFields)) // Index 1: comment fields object
            
            val jsonBody = Gson().toJson(jsonArray)
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBodyObj = jsonBody.toRequestBody(mediaType)
            
            Log.d(TAG, "Request body (JSON array): $jsonBody")
            
            // Make direct HTTP call using OkHttpClient (no OAuth interceptor)
            // Use withContext to run blocking call on IO dispatcher
            val response = withContext(Dispatchers.IO) {
                val client = OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(60, TimeUnit.SECONDS)
                    .build()
                
                val request = Request.Builder()
                    .url(webhookUrl)
                    .post(requestBodyObj)
                    .addHeader("Content-Type", "application/json; charset=utf-8")
                    .build()
                
                client.newCall(request).execute()
            }
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                if (responseBody != null) {
                    Log.d(TAG, "Response from task.commentitem.add: $responseBody")
                    val gson = Gson()
                    
                    // Bitrix24 webhook returns result as a number directly: {"result":31,...}
                    // Not as an object: {"result":{"ID":"31"}}
                    try {
                        val jsonObject = gson.fromJson(responseBody, com.google.gson.JsonObject::class.java)
                        val resultElement = jsonObject.get("result")
                        
                        if (resultElement != null && !resultElement.isJsonNull) {
                            // result can be a number or string
                            val commentId = when {
                                resultElement.isJsonPrimitive -> {
                                    val primitive = resultElement.asJsonPrimitive
                                    if (primitive.isNumber) {
                                        primitive.asInt.toString()
                                    } else {
                                        primitive.asString
                                    }
                                }
                                resultElement.isJsonObject -> {
                                    // Fallback: if it's an object, try to get ID field
                                    resultElement.asJsonObject.get("ID")?.asString
                                        ?: resultElement.asJsonObject.get("id")?.asString
                                }
                                else -> null
                            }
                            
                            if (commentId != null) {
                                Log.d(TAG, "Successfully parsed comment ID: $commentId")
                                return commentId
                            }
                        }
                        
                        Log.e(TAG, "No comment ID found in response: $responseBody")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing comment response: ${e.message}", e)
                    }
                }
            } else {
                val errorBody = response.body?.string()
                Log.e(TAG, "Failed to add comment via webhook: HTTP ${response.code}, error: $errorBody")
            }
            
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error adding comment with webhook: ${e.message}", e)
            null
        }
    }
    
    /**
     * Upload file to Bitrix24 Drive
     */
    suspend fun uploadFile(filePath: String, fileName: String): Result<DomainTaskFile> {
        return try {
            val file = File(filePath)
            if (!file.exists()) {
                return Result.failure(Exception("File not found: $filePath"))
            }

            // Compress images before upload to avoid HTTP 413 (Request Entity Too Large)
            val compressedFileName = if (fileName.lowercase().let {
                    it.endsWith(".jpg") || it.endsWith(".jpeg") ||
                    it.endsWith(".png") || it.endsWith(".webp") || it.endsWith(".bmp")
                }) {
                fileName.substringBeforeLast(".") + "_compressed.jpg"
            } else {
                fileName
            }
            val cacheDir = File(file.parent ?: context?.cacheDir?.path ?: filePath).also { it.mkdirs() }
            val compressedFile = com.example.jbmarks.utils.ImageCompressor.compress(
                inputPath = filePath,
                outputFile = File(cacheDir, compressedFileName)
            )

            val fileBytes = compressedFile.readBytes()
            Log.d(TAG, "Uploading file: ${compressedFile.name}, size: ${fileBytes.size / 1024}KB")
            val base64Content = Base64.encodeToString(fileBytes, Base64.NO_WRAP)
            
            // Upload to Bitrix24 root folder using disk.storage.uploadfile
            val request = com.example.jbmarks.tasks.data.FileUploadRequest(
                folderId = 1, // Root folder
                data = com.example.jbmarks.tasks.data.FileData(name = fileName),
                fileContent = base64Content
            )
            val response = executeApiCall {
                api.uploadFile(request)
            }
            
            if (response.isSuccessful && response.body()?.result != null) {
                val uploadResult = response.body()!!.result!!
                val fileId = uploadResult.id ?: ""
                
                if (fileId.isBlank()) {
                    Log.e(TAG, "Upload response missing file ID")
                    return Result.failure(Exception("Upload response missing file ID"))
                }
                
                Log.d(TAG, "File uploaded successfully, ID: $fileId")
                
                // Fetch file details to get authenticated DOWNLOAD_URL
                // The upload response might not include a proper authenticated download URL
                val fileDetails = fetchFileDetails(fileId)
                
                val taskFile = if (fileDetails != null) {
                    // Use the authenticated download URL from disk.file.get
                    Log.d(TAG, "Using authenticated download URL from disk.file.get: ${fileDetails.downloadUrl}")
                    fileDetails
                } else {
                    // Fallback: use download URL from upload response or construct one
                    val downloadUrl = uploadResult.downloadUrl ?: uploadResult.url
                    if (downloadUrl.isNullOrBlank()) {
                        // Construct download URL - disk.file.download includes auth via interceptor
                        val constructedUrl = "https://jbmarks.sdinmotion.co.za/rest/disk.file.download?ID=$fileId"
                        Log.d(TAG, "Constructed download URL: $constructedUrl")
                        DomainTaskFile(
                            id = fileId,
                            name = uploadResult.name ?: fileName,
                            size = uploadResult.size?.toLongOrNull() ?: fileBytes.size.toLong(),
                            type = uploadResult.type ?: "application/octet-stream",
                            downloadUrl = constructedUrl
                        )
                    } else {
                        DomainTaskFile(
                            id = fileId,
                            name = uploadResult.name ?: fileName,
                            size = uploadResult.size?.toLongOrNull() ?: fileBytes.size.toLong(),
                            type = uploadResult.type ?: "application/octet-stream",
                            downloadUrl = downloadUrl
                        )
                    }
                }
                
                Result.success(taskFile)
            } else {
                val rawError = response.errorBody()?.string() ?: "Unknown error"
                // Strip HTML tags from error response (e.g. 413 pages return HTML)
                val cleanError = rawError.replace(Regex("<[^>]+>"), "").trim()
                    .replace(Regex("\\s+"), " ")
                    .take(200)
                val statusCode = response.code()
                val userMessage = when (statusCode) {
                    413 -> "Photo is too large to upload. Please try a smaller image."
                    else -> "Upload failed ($statusCode): $cleanError"
                }
                Log.e(TAG, "Failed to upload file ($statusCode): $rawError")
                Result.failure(Exception(userMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error uploading file", e)
            Result.failure(e)
        }
    }
    
    /**
     * Attach file to task
     */
    suspend fun attachFileToTask(taskId: String, fileId: String): Result<Boolean> {
        return try {
            val request = com.example.jbmarks.tasks.data.AttachFileRequest(
                taskId = taskId,
                fileId = fileId
            )
            
            val response = executeApiCall {
                api.attachFileToTask(request)
            }
            
            if (response.isSuccessful) {
                Log.d(TAG, "File attached to task successfully")
                Result.success(true)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to attach file: $error")
                Result.failure(Exception("Failed to attach file: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error attaching file", e)
            Result.failure(e)
        }
    }
    
    /**
     * Get files from task (extracted from task details)
     * Files are already included in TaskDto when fetching task details
     */
    suspend fun getTaskFiles(taskId: String): Result<List<DomainTaskFile>> {
        return try {
            // Get task details which includes files
            val response = executeApiCall {
                api.getTask(taskId)
            }
            if (response.isSuccessful && response.body()?.result?.task != null) {
                val taskDto = response.body()!!.result!!.task!!
                
                // Try multiple possible file fields
                val filesData = taskDto.files ?: taskDto.filesUpper ?: taskDto.filesLower
                Log.d(TAG, "Task DTO - files: ${taskDto.files}, filesUpper: ${taskDto.filesUpper}, filesLower: ${taskDto.filesLower}")
                Log.d(TAG, "Using filesData: $filesData, type: ${filesData?.javaClass?.simpleName}")
                
                val files = parseFilesFromDto(filesData, taskId)
                Log.d(TAG, "Found ${files.size} files for task $taskId")
                if (files.isNotEmpty()) {
                    files.forEach { file ->
                        Log.d(TAG, "  - File: ${file.name} (${file.type}), URL: ${file.downloadUrl}")
                    }
                }
                Result.success(files)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to get task files: $error")
                Result.failure(Exception("Failed to get task files: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting task files", e)
            Result.failure(e)
        }
    }
    
    /**
     * Parse files from TaskDto.ufTaskWebdavFiles
     * Files can be objects, file IDs, a List, JsonArray, or a Map
     */
    private suspend fun parseFilesFromDto(files: Any?, taskId: String? = null): List<DomainTaskFile> {
        if (files == null) {
            Log.d(TAG, "Files field is null")
            return emptyList()
        }
        
        Log.d(TAG, "Parsing files, type: ${files::class.simpleName}, value: $files")
        
        val parsedFiles = mutableListOf<DomainTaskFile>()
        val fileItems: List<Any> = when (files) {
            is List<*> -> {
                @Suppress("UNCHECKED_CAST")
                files as List<Any>
            }
            is JsonArray -> {
                // Gson JsonArray - convert to list, handle both numbers and strings
                files.mapNotNull { element ->
                    when {
                        element.isJsonPrimitive && element.asJsonPrimitive.isNumber -> {
                            element.asInt.toString()
                        }
                        element.isJsonPrimitive && element.asJsonPrimitive.isString -> {
                            element.asString
                        }
                        else -> null
                    }
                }
            }
            is Map<*, *> -> {
                // Files are in a map, extract values
                @Suppress("UNCHECKED_CAST")
                (files as Map<String, Any>).values.toList()
            }
            else -> {
                Log.w(TAG, "Files field is unexpected type: ${files::class.simpleName}")
                return emptyList()
            }
        }
        
        if (fileItems.isEmpty()) {
            Log.d(TAG, "No file items found")
            return emptyList()
        }
        
        Log.d(TAG, "Processing ${fileItems.size} file items")
        
        for (fileItem in fileItems) {
            try {
                when {
                    fileItem is Map<*, *> -> {
                        // File is an object with properties
                        @Suppress("UNCHECKED_CAST")
                        val fileMap = fileItem as Map<String, Any?>
                        val fileDto = TaskFileDto(
                            id = fileMap["ID"] as? String ?: fileMap["id"] as? String,
                            idLower = fileMap["id"] as? String,
                            name = fileMap["NAME"] as? String ?: fileMap["name"] as? String,
                            nameLower = fileMap["name"] as? String,
                            size = fileMap["SIZE"] as? String ?: fileMap["size"] as? String,
                            sizeLower = fileMap["size"] as? String,
                            type = fileMap["TYPE"] as? String ?: fileMap["type"] as? String,
                            typeLower = fileMap["type"] as? String,
                            downloadUrl = fileMap["DOWNLOAD_URL"] as? String ?: fileMap["downloadUrl"] as? String,
                            downloadUrlLower = fileMap["downloadUrl"] as? String,
                            url = fileMap["URL"] as? String ?: fileMap["url"] as? String,
                            urlLower = fileMap["url"] as? String
                        )
                        
                        val fileId = fileDto.getIdValue()
                        if (fileId == null) {
                            Log.w(TAG, "File item missing ID, skipping: $fileMap")
                            continue
                        }
                        
                        val fileName = fileDto.getNameValue() ?: "Unknown"
                        val fileSize = fileDto.getSizeValue()?.toLongOrNull() ?: 0L
                        val fileType = fileDto.getTypeValue() ?: "application/octet-stream"
                        var downloadUrl = fileDto.getDownloadUrlValue()
                        
                        // If download URL is missing, construct it from file ID
                        if (downloadUrl.isNullOrBlank()) {
                            // Try to construct download URL from file ID
                            // Bitrix24 file download URL format: /rest/disk.file.get?ID={fileId}
                            downloadUrl = "https://jbmarks.sdinmotion.co.za/rest/disk.file.get?ID=$fileId"
                            Log.d(TAG, "Constructed download URL for file $fileId: $downloadUrl")
                        }
                        
                        Log.d(TAG, "Parsed file: id=$fileId, name=$fileName, type=$fileType, url=$downloadUrl")
                        
                        parsedFiles.add(
                            DomainTaskFile(
                                id = fileId,
                                name = fileName,
                                size = fileSize,
                                type = fileType,
                                downloadUrl = downloadUrl
                            )
                        )
                    }
                    fileItem is String || fileItem is Number -> {
                        // File is just an ID - these are attachment IDs from UF_TASK_WEBDAV_FILES
                        // Use OAuth REST API to fetch attached object details (match iOS)
                        val attachmentId = fileItem.toString()
                        Log.d(TAG, "File item is ID only: $attachmentId, fetching via disk.attachedObject.get with OAuth")
                        
                        try {
                            val attachedFile = fetchAttachedObjectWithOAuth(attachmentId)
                            if (attachedFile != null) {
                                parsedFiles.add(attachedFile)
                                Log.d(TAG, "Successfully fetched attached object for ID $attachmentId: ${attachedFile.name}, URL: ${attachedFile.downloadUrl}")
                            } else {
                                Log.w(TAG, "disk.attachedObject.get failed for ID $attachmentId, file will not be displayed")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error fetching attached object for ID $attachmentId: ${e.message}", e)
                        }
                    }
                    else -> {
                        Log.w(TAG, "Unknown file item type: ${fileItem::class.simpleName}")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error parsing file item: ${e.message}", e)
            }
        }
        
        Log.d(TAG, "Parsed ${parsedFiles.size} files from task")
        return parsedFiles
    }
    
    /**
     * Fetch attached object using OAuth REST API (match iOS implementation)
     * Uses disk.attachedObject.get.json with OAuth authentication
     */
    private suspend fun fetchAttachedObjectWithOAuth(attachmentId: String): DomainTaskFile? {
        return try {
            Log.d(TAG, "Fetching attached object via OAuth REST API: $attachmentId")
            
            val response = executeApiCall {
                api.getAttachedObject(attachmentId)
            }
            
            if (response.isSuccessful && response.body() != null) {
                val attachedResponse = response.body()!!
                
                if (attachedResponse.error != null) {
                    Log.e(TAG, "Error from disk.attachedObject.get: ${attachedResponse.error} - ${attachedResponse.errorDescription}")
                    return null
                }
                
                if (attachedResponse.result != null) {
                    val attachedData = attachedResponse.result!!
                    val fileName = attachedData.getNameValue() ?: "Unknown"
                    val fileSize = attachedData.getSizeValue()?.toLongOrNull() ?: 0L
                    var fileType = attachedData.getTypeValue() ?: "application/octet-stream"
                    
                    // If MIME type is generic, try to infer from filename
                    if (fileType == "application/octet-stream" || fileType.isEmpty()) {
                        fileType = inferMimeTypeFromFileName(fileName)
                        Log.d(TAG, "Inferred MIME type from filename: $fileName -> $fileType")
                    }
                    
                    val downloadUrl = attachedData.getDownloadableUrlValue()
                    
                    if (downloadUrl.isNullOrBlank()) {
                        Log.w(TAG, "No downloadableUrl returned for attachment ID $attachmentId")
                        return null
                    }
                    
                    Log.d(TAG, "Successfully fetched attached object via OAuth: id=$attachmentId, name=$fileName, type=$fileType, url=$downloadUrl")
                    
                    return DomainTaskFile(
                        id = attachmentId,
                        name = fileName,
                        size = fileSize,
                        type = fileType,
                        downloadUrl = downloadUrl
                    )
                }
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "OAuth API call failed: ${response.code()}, $errorBody")
            }
            
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching attached object with OAuth: ${e.message}", e)
            null
        }
    }
    
    /**
     * Get webhook token for user 1
     * Uses the webhook token from Config
     */
    private fun getWebhookToken(): String? {
        val token = Config.WEBHOOK_TOKEN
        Log.d(TAG, "getWebhookToken() called, token from Config: ${if (token != null) "***${token.takeLast(4)}" else "null"}")
        return token
    }
    
    /**
     * Fetch file details from Bitrix24 API using file ID
     * Calls disk.file.get to get DOWNLOAD_URL (which already includes auth token)
     * If this fails, use disk.file.download?ID={fileId} URL directly (auth added by interceptor)
     */
    private suspend fun fetchFileDetails(fileId: String): DomainTaskFile? {
        return try {
            Log.d(TAG, "Calling disk.file.get.json for file ID: $fileId")
            val response = executeApiCall {
                api.getFileDetails(fileId)
            }
            
            Log.d(TAG, "disk.file.get response - isSuccessful: ${response.isSuccessful}, code: ${response.code()}")
            
            if (response.isSuccessful) {
                val responseBody = response.body()
                Log.d(TAG, "Response body is null: ${responseBody == null}")
                
                if (responseBody?.result != null) {
                    val fileData = responseBody.result!!
                    Log.d(TAG, "File data received: id=${fileData.getIdValue()}, name=${fileData.getNameValue()}")
                    
                    val fileDetails = FileDetails(
                        id = fileData.id,
                        idLower = fileData.idLower,
                        name = fileData.name,
                        nameLower = fileData.nameLower,
                        size = fileData.size,
                        sizeLower = fileData.sizeLower,
                        type = fileData.type,
                        typeLower = fileData.typeLower,
                        downloadUrl = fileData.downloadUrl,
                        downloadUrlLower = fileData.downloadUrlLower,
                        url = fileData.url,
                        urlLower = fileData.urlLower
                    )
                    
                    val fileName = fileDetails.getNameValue() ?: "Unknown"
                    val fileSize = fileDetails.getSizeValue()?.toLongOrNull() ?: 0L
                    val fileType = fileDetails.getTypeValue() ?: "application/octet-stream"
                    val downloadUrl = fileDetails.getDownloadUrlValue()
                    
                    Log.d(TAG, "Parsed file details - name: $fileName, type: $fileType, downloadUrl: ${if (downloadUrl.isNullOrBlank()) "MISSING" else "PRESENT"}")
                    
                    // DOWNLOAD_URL from disk.file.get already includes auth token
                    if (downloadUrl.isNullOrBlank()) {
                        Log.w(TAG, "No DOWNLOAD_URL returned for file ID $fileId")
                        return null
                    }
                    
                    Log.d(TAG, "Successfully fetched file details: id=$fileId, name=$fileName, type=$fileType")
                    
                    DomainTaskFile(
                        id = fileId,
                        name = fileName,
                        size = fileSize,
                        type = fileType,
                        downloadUrl = downloadUrl // This URL already includes auth
                    )
                } else {
                    Log.w(TAG, "Response body result is null for file ID $fileId")
                    val responseString = responseBody?.toString() ?: "null"
                    Log.d(TAG, "Response body content: $responseString")
                    null
                }
            } else {
                val errorBody = response.errorBody()?.string()
                Log.e(TAG, "API call failed for file ID $fileId - HTTP ${response.code()}: $errorBody")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception fetching file details for ID $fileId: ${e.message}", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            e.printStackTrace()
            null
        }
    }
    
    // ===== TIME TRACKING =====

    /**
     * Get elapsed time entries for a task.
     * Bitrix24 API: task.elapseditem.getlist
     */
    suspend fun getElapsedTimeEntries(taskId: String): Result<List<com.example.jbmarks.tasks.domain.ElapsedTimeEntry>> {
        return try {
            val request = mapOf("TASK_ID" to taskId)
            val response = executeApiCall {
                api.getElapsedTimeEntries(request)
            }

            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                // Bitrix24 returns { "result": [ {...}, {...} ] }
                val items: List<ElapsedTimeItem> = body["result"] ?: emptyList()

                // Collect unique user IDs to resolve names
                val userIds = items.mapNotNull { it.userId }.distinct()
                val userMap = mutableMapOf<String, String>()
                userIds.forEach { uid ->
                    try {
                        val userResponse = api.getUser(uid)
                        userResponse.result?.firstOrNull()?.let { user ->
                            userMap[uid] = user.fullName
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not fetch user $uid for time entry: ${e.message}")
                    }
                }

                val entries = items.mapNotNull { item ->
                    val id = item.id ?: return@mapNotNull null
                    val secs = item.seconds?.toLongOrNull()
                        ?: item.minutes?.toLongOrNull()?.times(60)
                        ?: 0L
                    com.example.jbmarks.tasks.domain.ElapsedTimeEntry(
                        id = id,
                        taskId = item.taskId ?: taskId,
                        userId = item.userId ?: "",
                        userName = item.userId?.let { userMap[it] },
                        seconds = secs,
                        comment = item.comment,
                        createdDate = item.createdDate
                    )
                }
                Log.d(TAG, "Loaded ${entries.size} time entries for task $taskId")
                Result.success(entries)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to get elapsed time entries: $error")
                Result.failure(Exception("Failed to get time entries: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting elapsed time entries", e)
            Result.failure(e)
        }
    }

    /**
     * Add an elapsed time entry to a task.
     * Bitrix24 API: task.elapseditem.add
     * @param taskId  Task ID
     * @param hours   Hours component (>= 0)
     * @param minutes Minutes component (0-59)
     * @param comment Optional comment describing the work done
     */
    suspend fun addElapsedTime(
        taskId: String,
        hours: Int,
        minutes: Int,
        comment: String? = null
    ): Result<String> {
        return try {
            val totalSeconds = (hours * 3600) + (minutes * 60)
            if (totalSeconds <= 0) {
                return Result.failure(Exception("Time must be greater than zero"))
            }

            val request = AddElapsedTimeRequest(
                taskId = taskId,
                seconds = totalSeconds,
                comment = comment?.takeIf { it.isNotBlank() }
            )
            val response = executeApiCall {
                api.addElapsedTime(request)
            }

            if (response.isSuccessful && response.body()?.result?.id != null) {
                val newId = response.body()!!.result!!.id!!
                Log.d(TAG, "Elapsed time added, entry ID: $newId")
                Result.success(newId)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to add elapsed time: $error")
                Result.failure(Exception("Failed to log time: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error adding elapsed time", e)
            Result.failure(e)
        }
    }

    // ===== END TIME TRACKING =====

    /**
     * Map Comment data model to domain model
     */
    private fun mapCommentToDomain(comment: Comment, authorName: String? = null, authorId: String? = null): DomainComment {
        return DomainComment(
            id = comment.getIdValue() ?: "",
            taskId = comment.taskId ?: "",
            authorId = authorId ?: comment.getAuthorIdValue() ?: "",
            authorName = authorName,
            text = comment.getTextValue() ?: "",
            createdDate = comment.getDateValue() ?: "",
            files = comment.files?.mapNotNull { file ->
                try {
                    DomainCommentFile(
                        id = file.id ?: "",
                        name = file.name ?: "Unknown",
                        size = file.size?.toLongOrNull() ?: 0L,
                        type = file.type ?: "application/octet-stream",
                        downloadUrl = file.downloadUrl ?: file.url
                    )
                } catch (e: Exception) {
                    null
                }
            } ?: emptyList()
        )
    }
    
    /**
     * Map TaskDto to domain Task model
     */
    private fun mapDtoToDomain(dto: TaskDto): Task {
        return Task(
            id = dto.id ?: "",
            title = dto.title ?: "Untitled Task",
            description = dto.description ?: "",
            status = TaskStatus.fromValue(dto.status),
            priority = TaskPriority.fromValue(dto.priority),
            deadline = dto.deadline,
            createdDate = dto.createdDate,
            closedDate = dto.closedDate,
            createdBy = dto.createdBy,
            createdByName = dto.creator?.name,
            responsibleId = dto.responsibleId,
            responsibleName = dto.responsible?.name,
            groupId = dto.groupId,
            groupName = dto.group?.name,
            commentsCount = dto.commentsCount?.toIntOrNull() ?: 0,
            newCommentsCount = dto.newCommentsCount ?: 0,
            tags = dto.tags ?: emptyList()
        )
    }
    
    /**
     * Infer MIME type from file extension
     */
    private fun inferMimeTypeFromFileName(fileName: String): String {
        val extension = fileName.substringAfterLast('.', "").lowercase()
        return when (extension) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "bmp" -> "image/bmp"
            "svg" -> "image/svg+xml"
            "pdf" -> "application/pdf"
            "doc", "docx" -> "application/msword"
            "xls", "xlsx" -> "application/vnd.ms-excel"
            "txt" -> "text/plain"
            else -> "application/octet-stream"
        }
    }
}