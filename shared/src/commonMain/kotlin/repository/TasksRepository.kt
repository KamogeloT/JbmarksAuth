package com.example.jbmarks.shared.repository

import com.example.jbmarks.shared.domain.tasks.Task
import com.example.jbmarks.shared.domain.tasks.TaskStatus
import com.example.jbmarks.shared.network.BitrixApi
import com.example.jbmarks.shared.storage.TokenStorage

/**
 * Repository interface for task operations
 */
interface TasksRepository {
    suspend fun getTasks(
        responsibleId: String? = null,
        createdBy: String? = null,
        status: String? = null,
        groupId: String? = null
    ): Result<List<Task>>
    
    suspend fun getTask(id: String): Result<Task>
    
    suspend fun createTask(
        title: String,
        description: String,
        responsibleId: String?,
        deadline: String? = null
    ): Result<Task>
    
    suspend fun updateTask(
        id: String,
        title: String? = null,
        description: String? = null,
        status: TaskStatus? = null,
        responsibleId: String? = null
    ): Result<Task>
    
    suspend fun deleteTask(id: String): Result<Unit>
    
    suspend fun completeTask(id: String): Result<Task>
    
    suspend fun startTask(id: String): Result<Task>
    
    suspend fun deferTask(id: String): Result<Task>
    
    suspend fun renewTask(id: String): Result<Task>
}

/**
 * Implementation of TasksRepository
 */
class TasksRepositoryImpl(
    private val api: BitrixApi,
    private val tokenStorage: TokenStorage
) : TasksRepository {
    
    override suspend fun getTasks(
        responsibleId: String?,
        createdBy: String?,
        status: String?,
        groupId: String?
    ): Result<List<Task>> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.getTasks(responsibleId, createdBy, status, groupId)
            val tasks = response.result?.values?.flatten()?.map { it.toDomain() } ?: emptyList()
            Result.success(tasks)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getTask(id: String): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.getTask(id)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Task not found"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun createTask(
        title: String,
        description: String,
        responsibleId: String?,
        deadline: String?
    ): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val fields = mutableMapOf<String, String>(
                "TITLE" to title,
                "DESCRIPTION" to description
            )
            if (responsibleId != null) fields["RESPONSIBLE_ID"] = responsibleId
            if (deadline != null) fields["DEADLINE"] = deadline
            
            val request = com.example.jbmarks.shared.network.TaskCreateRequest(fields)
            val response = api.createTask(request)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Failed to create task"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun updateTask(
        id: String,
        title: String?,
        description: String?,
        status: TaskStatus?,
        responsibleId: String?
    ): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val fields = mutableMapOf<String, String>()
            title?.let { fields["TITLE"] = it }
            description?.let { fields["DESCRIPTION"] = it }
            status?.let { fields["STATUS"] = it.value }
            responsibleId?.let { fields["RESPONSIBLE_ID"] = it }
            
            val request = com.example.jbmarks.shared.network.TaskCreateRequest(fields)
            val response = api.updateTask(id, request)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Failed to update task"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun deleteTask(id: String): Result<Unit> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            api.deleteTask(id)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun completeTask(id: String): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.completeTask(id)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Failed to complete task"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun startTask(id: String): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.startTask(id)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Failed to start task"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun deferTask(id: String): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.deferTask(id)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Failed to defer task"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun renewTask(id: String): Result<Task> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.renewTask(id)
            val task = response.result?.toDomain()
                ?: return Result.failure(Exception("Failed to renew task"))
            Result.success(task)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Helper function to convert DTO to domain model
    private fun com.example.jbmarks.shared.network.TaskDto.toDomain(): Task {
        return Task(
            id = id ?: "",
            title = title ?: "",
            description = description ?: "",
            status = TaskStatus.fromValue(status),
            priority = com.example.jbmarks.shared.domain.tasks.TaskPriority.fromValue(priority),
            deadline = deadline,
            createdDate = createdDate,
            closedDate = closedDate,
            createdBy = createdBy,
            createdByName = null, // Will be fetched separately if needed
            responsibleId = responsibleId,
            responsibleName = null, // Will be fetched separately if needed
            groupId = groupId,
            groupName = null, // Will be fetched separately if needed
            commentsCount = 0, // Will be fetched separately if needed
            newCommentsCount = 0,
            tags = tags ?: emptyList()
        )
    }
}
