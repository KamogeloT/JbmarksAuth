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
import com.example.jbmarks.tasks.domain.mapDataToDomain
import com.example.jbmarks.user.data.UserRepository
import java.io.File
import java.util.*
import android.util.Base64

class TasksRepository(private val context: Context? = null) {

    private val api = RetrofitInstance.api
    private val TAG = "TasksRepository"
    
    private val userRepository: UserRepository? = if (context != null) UserRepository(context) else null

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
            
            // Fetch all tasks without filters - Bitrix24 will automatically return
            // only tasks the user has access to based on their permissions
            // This includes tasks where user is responsible, creator, accomplice, or auditor
            val response = api.getTasks(
                responsibleId = null,
                createdBy = null,
                status = null
            )
            
            // Bitrix24 API returns tasks - handle both array and map formats
            val rawData = response.result.tasks ?: emptyList()
            
            Log.d(TAG, "Found ${rawData.size} accessible tasks from API")
            
            // Bitrix24 API already filters by permissions including workgroups
            // Trust the API and return all tasks it provides
            // Log workgroup information for debugging
            if (userWorkgroups.isNotEmpty()) {
                Log.d(TAG, "User is in workgroups: $userWorkgroups")
                rawData.forEach { task ->
                    if (task.groupId != null) {
                        if (userWorkgroups.contains(task.groupId)) {
                            Log.d(TAG, "✓ Task ${task.id} '${task.title}' is in workgroup ${task.groupId}")
                        } else {
                            Log.d(TAG, "  Task ${task.id} '${task.title}' has groupId ${task.groupId} (not in user workgroups)")
                        }
                    } else {
                        Log.d(TAG, "  Task ${task.id} '${task.title}' has no groupId")
                    }
                }
            }
            
            // Return all tasks from API - Bitrix24 already filtered by permissions
            // This includes tasks from user's workgroups, tasks assigned to user, etc.
            // The API respects Bitrix24 permissions automatically
            // Filter out tasks with invalid IDs (null or "0")
            val validTasks = rawData.mapNotNull { dataTask ->
                val taskId = dataTask.id
                if (taskId.isNullOrBlank() || taskId == "0") {
                    Log.w(TAG, "Skipping task with invalid ID: $taskId, title: ${dataTask.title}")
                    null
                } else {
                    mapDataToDomain(dataTask)
                }
            }
            Log.d(TAG, "Returning ${validTasks.size} valid tasks from ${rawData.size} API tasks (Bitrix24 already filtered by permissions including workgroups)")
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
            val response = api.getTask(taskId)
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
        groupId: String? = null
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
                    tags = null
                )
            )
            
            val response = api.createTask(request)
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
        responsibleId: String? = null
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
                    tags = null
                )
            )
            
            val response = api.updateTask(taskId, request)
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
     * Delete a task
     */
    suspend fun deleteTask(taskId: String): Result<Boolean> {
        return try {
            val response = api.deleteTask(taskId)
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
            val response = api.completeTask(taskId)
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
            val response = api.startTask(taskId)
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
            val response = api.deferTask(taskId)
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
            val response = api.renewTask(taskId)
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
            val response = api.getTaskComments(request)
            
            if (response.isSuccessful && response.body() != null) {
                // Bitrix24 returns comments in result array or object
                val commentsListResponse = response.body()!!
                val commentsList = commentsListResponse.result ?: emptyList()
                
                val comments = commentsList.mapNotNull { comment ->
                    try {
                        mapCommentToDomain(comment)
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
     */
    suspend fun addComment(taskId: String, text: String): Result<DomainComment> {
        return try {
            val request = AddCommentRequest(
                taskId = taskId,
                text = text
            )
            val response = api.addTaskComment(request)
            
            if (response.isSuccessful && response.body()?.result?.id != null) {
                val commentId = response.body()!!.result!!.id!!
                Log.d(TAG, "Comment added successfully: $commentId")
                
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
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to add comment: $error")
                Result.failure(Exception("Failed to add comment: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error adding comment", e)
            Result.failure(e)
        }
    }
    
    /**
     * Upload file to Bitrix24 Drive
     */
    suspend fun uploadFile(filePath: String, fileName: String): Result<DomainTaskFile> {
        return try {
            // Read file and convert to Base64
            val file = File(filePath)
            if (!file.exists()) {
                return Result.failure(Exception("File not found: $filePath"))
            }
            
            val fileBytes = file.readBytes()
            val base64Content = Base64.encodeToString(fileBytes, Base64.NO_WRAP)
            
            val request = com.example.jbmarks.tasks.data.FileUploadRequest(
                folderId = 1, // Default to root folder
                data = com.example.jbmarks.tasks.data.FileData(name = fileName),
                fileContent = base64Content
            )
            
            val response = api.uploadFile(request)
            
            if (response.isSuccessful && response.body()?.result != null) {
                val uploadResult = response.body()!!.result!!
                val taskFile = DomainTaskFile(
                    id = uploadResult.id ?: "",
                    name = uploadResult.name ?: fileName,
                    size = uploadResult.size?.toLongOrNull() ?: fileBytes.size.toLong(),
                    type = uploadResult.type ?: "application/octet-stream",
                    downloadUrl = uploadResult.downloadUrl ?: uploadResult.url
                )
                Log.d(TAG, "File uploaded successfully: ${taskFile.id}")
                Result.success(taskFile)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to upload file: $error")
                Result.failure(Exception("Failed to upload file: $error"))
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
            
            val response = api.attachFileToTask(request)
            
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
            // For now, return empty list as files need to be extracted from TaskDto
            // This will be enhanced when we parse files from task response
            // Files are typically in ufTaskWebdavFiles field
            Result.success(emptyList())
        } catch (e: Exception) {
            Log.e(TAG, "Error getting task files", e)
            Result.failure(e)
        }
    }
    
    /**
     * Map Comment data model to domain model
     */
    private fun mapCommentToDomain(comment: Comment): DomainComment {
        return DomainComment(
            id = comment.id ?: "",
            taskId = comment.taskId ?: "",
            authorId = comment.authorId ?: "",
            authorName = null, // Will be populated if we fetch user info
            text = comment.text ?: "",
            createdDate = comment.createdDate ?: comment.postDate ?: "",
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
}