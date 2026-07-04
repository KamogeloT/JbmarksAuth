package com.example.jbmarks.shared.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.parameter
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

/**
 * Bitrix24 API client using Ktor
 * This is a simplified version - full implementation will be added incrementally
 */
class BitrixApi(
    private val httpClient: HttpClient,
    private val baseUrl: String,
    private val accessToken: String
) {
    private val baseApiUrl = if (baseUrl.endsWith("/")) {
        "${baseUrl}rest/"
    } else {
        "$baseUrl/rest/"
    }
    
    /**
     * Build full URL with authentication token
     */
    private fun buildUrl(endpoint: String): String {
        return "$baseApiUrl$endpoint"
    }
    
    // ===== TASK OPERATIONS =====
    
    suspend fun getTasks(
        responsibleId: String? = null,
        createdBy: String? = null,
        status: String? = null,
        groupId: String? = null
    ): TasksListResponse {
        return httpClient.get(buildUrl("tasks.task.list.json")) {
            url {
                parameter("auth", accessToken)
                if (responsibleId != null) parameter("filter[RESPONSIBLE_ID]", responsibleId)
                if (createdBy != null) parameter("filter[CREATED_BY]", createdBy)
                if (status != null) parameter("filter[STATUS]", status)
                if (groupId != null) parameter("filter[GROUP_ID]", groupId)
            }
        }.body()
    }
    
    suspend fun getTask(taskId: String): TaskResponse {
        return httpClient.get(buildUrl("tasks.task.get.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
        }.body()
    }
    
    suspend fun createTask(request: TaskCreateRequest): TaskResponse {
        return httpClient.post(buildUrl("tasks.task.add.json")) {
            url {
                parameter("auth", accessToken)
            }
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }
    
    suspend fun updateTask(taskId: String, request: TaskCreateRequest): TaskResponse {
        return httpClient.post(buildUrl("tasks.task.update.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }
    
    suspend fun deleteTask(taskId: String): BitrixResponse<Boolean> {
        return httpClient.post(buildUrl("tasks.task.delete.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
        }.body()
    }
    
    suspend fun completeTask(taskId: String): TaskResponse {
        return httpClient.post(buildUrl("tasks.task.complete.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
        }.body()
    }
    
    suspend fun startTask(taskId: String): TaskResponse {
        return httpClient.post(buildUrl("tasks.task.start.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
        }.body()
    }
    
    suspend fun deferTask(taskId: String): TaskResponse {
        return httpClient.post(buildUrl("tasks.task.defer.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
        }.body()
    }
    
    suspend fun renewTask(taskId: String): TaskResponse {
        return httpClient.post(buildUrl("tasks.task.renew.json")) {
            url {
                parameter("auth", accessToken)
                parameter("taskId", taskId)
            }
        }.body()
    }
    
    // ===== CHAT OPERATIONS =====
    
    suspend fun getRecentChats(): ChatRecentResponse {
        return httpClient.get(buildUrl("im.recent.get.json")) {
            url {
                parameter("auth", accessToken)
            }
        }.body()
    }
    
    suspend fun getChatMessages(
        dialogId: String,
        limit: Int = 20,
        lastId: String? = null
    ): ChatMessagesResponse {
        return httpClient.get(buildUrl("im.dialog.messages.get.json")) {
            url {
                parameter("auth", accessToken)
                parameter("DIALOG_ID", dialogId)
                parameter("LIMIT", limit.toString())
                if (lastId != null) parameter("LAST_ID", lastId)
            }
        }.body()
    }
    
    suspend fun sendMessage(request: SendMessageRequest): SendMessageResponse {
        return httpClient.post(buildUrl("im.message.add.json")) {
            url {
                parameter("auth", accessToken)
            }
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }
    
    suspend fun createChat(request: CreateChatRequest): CreateChatResponse {
        return httpClient.post(buildUrl("im.chat.add.json")) {
            url {
                parameter("auth", accessToken)
            }
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }
    
    // ===== CALENDAR OPERATIONS =====
    
    suspend fun getCalendarEvents(request: CalendarEventsRequest): CalendarEventsResponse {
        return httpClient.post(buildUrl("calendar.event.get.json")) {
            url {
                parameter("auth", accessToken)
            }
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }
    
    // ===== FEED OPERATIONS =====
    
    suspend fun getBlogFeed(postId: String? = null): BlogFeedResponse {
        return httpClient.get(buildUrl("log.blogpost.get.json")) {
            url {
                parameter("auth", accessToken)
                if (postId != null) parameter("POST_ID", postId)
            }
        }.body()
    }
    
    suspend fun addBlogPost(request: AddBlogPostRequest): AddBlogPostResponse {
        return httpClient.post(buildUrl("log.blogpost.add.json")) {
            url {
                parameter("auth", accessToken)
            }
            contentType(ContentType.Application.Json)
            setBody(request)
        }.body()
    }
    
    // ===== USER OPERATIONS =====
    
    suspend fun getCurrentUser(): BitrixResponse<UserDto> {
        return httpClient.get(buildUrl("user.current.json")) {
            url {
                parameter("auth", accessToken)
            }
        }.body()
    }
    
    suspend fun getUser(userId: String): BitrixResponse<List<UserDto>> {
        return httpClient.get(buildUrl("user.get.json")) {
            url {
                parameter("auth", accessToken)
                parameter("ID", userId)
            }
        }.body()
    }
    
    suspend fun getUserWorkgroups(): BitrixResponse<List<WorkgroupDto>> {
        return httpClient.get(buildUrl("sonet_group.user.groups.json")) {
            url {
                parameter("auth", accessToken)
            }
        }.body()
    }
}

// ===== DATA TRANSFER OBJECTS =====

@Serializable
data class TasksListResponse(
    val result: Map<String, List<TaskDto>>? = null,
    val total: Int? = null
)

@Serializable
data class TaskResponse(
    val result: TaskDto? = null
)

@Serializable
data class TaskDto(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val deadline: String? = null,
    val createdDate: String? = null,
    val closedDate: String? = null,
    val createdBy: String? = null,
    val responsibleId: String? = null,
    val groupId: String? = null,
    val tags: List<String>? = null
)

@Serializable
data class TaskCreateRequest(
    val fields: Map<String, String>
)

@Serializable
data class ChatRecentResponse(
    val result: List<ChatDto>? = null
)

@Serializable
data class ChatDto(
    val id: String? = null,
    val dialogId: String? = null,
    val name: String? = null,
    val avatar: String? = null,
    val lastMessage: MessageDto? = null,
    val unreadCount: Int? = null
)

@Serializable
data class ChatMessagesResponse(
    val result: List<MessageDto>? = null
)

@Serializable
data class MessageDto(
    val id: String? = null,
    val dialogId: String? = null,
    val userId: String? = null,
    val message: String? = null,
    val date: String? = null
)

@Serializable
data class SendMessageRequest(
    val DIALOG_ID: String,
    val MESSAGE: String
)

@Serializable
data class SendMessageResponse(
    val result: Int? = null
)

@Serializable
data class CreateChatRequest(
    val TITLE: String,
    val TYPE: String = "OPEN"
)

@Serializable
data class CreateChatResponse(
    val result: Int? = null
)

@Serializable
data class CalendarEventsRequest(
    val from: String,
    val to: String
)

@Serializable
data class CalendarEventsResponse(
    val result: List<CalendarEventDto>? = null
)

@Serializable
data class CalendarEventDto(
    val id: String? = null,
    val name: String? = null,
    val description: String? = null,
    val from: String? = null,
    val to: String? = null,
    val location: String? = null
)

@Serializable
data class BlogFeedResponse(
    val result: List<BlogPostDto>? = null
)

@Serializable
data class BlogPostDto(
    val id: String? = null,
    val title: String? = null,
    val message: String? = null,
    val authorId: String? = null,
    val date: String? = null
)

@Serializable
data class AddBlogPostRequest(
    val POST_TITLE: String,
    val POST_MESSAGE: String
)

@Serializable
data class AddBlogPostResponse(
    val result: Int? = null
)

@Serializable
data class UserDto(
    val ID: String? = null,
    val NAME: String? = null,
    val LAST_NAME: String? = null,
    val EMAIL: String? = null,
    val PERSONAL_PHOTO: String? = null,
    val WORK_POSITION: String? = null
)

@Serializable
data class WorkgroupDto(
    val GROUP_ID: String? = null,
    val GROUP_NAME: String? = null,
    val ROLE: String? = null,
    val GROUP_IMAGE: String? = null
)

@Serializable
data class BitrixResponse<T>(
    val result: T,
    val total: Int? = null
)
