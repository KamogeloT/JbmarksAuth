package com.example.jbmarks.chat.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.jbmarks.chat.domain.Chat
import com.example.jbmarks.chat.domain.ChatType
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.chat.domain.MessageFile
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.user.data.BitrixResponse
import com.example.jbmarks.user.data.User
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import retrofit2.Response
import java.text.SimpleDateFormat
import java.util.*

class ChatRepository(private val context: Context? = null) {
    
    private val api = RetrofitInstance.api
    private val TAG = "ChatRepository"
    
    private val sharedPreferences: SharedPreferences? = 
        context?.getSharedPreferences("chat_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    /**
     * Get recent chats
     */
    suspend fun getRecentChats(): List<Chat> {
        return try {
            val rawData = api.getRecentChats().result
            val chats = rawData.map { mapDataToDomain(it) }
            
            // Load pinned chats from preferences
            val pinnedChats = getPinnedChats()
            chats.map { chat ->
                chat.copy(isPinned = pinnedChats.contains(chat.id))
            }.sortedWith(compareBy<Chat> { !it.isPinned }.thenByDescending { it.lastMessageDate })
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching recent chats", e)
            emptyList()
        }
    }
    
    /**
     * Get messages for a chat
     */
    suspend fun getChatMessages(dialogId: String, limit: Int = 50, lastId: String? = null): List<Message> {
        return try {
            val response = api.getChatMessages(dialogId, limit, lastId)
            if (response.isSuccessful && response.body()?.result?.messages != null) {
                val messages = response.body()!!.result!!.messages!!
                
                // Collect unique sender IDs
                val senderIds = messages.mapNotNull { it.authorId }.filter { it.isNotBlank() }.distinct()
                
                // Fetch user information for all senders
                val userMap = mutableMapOf<String, String>()
                for (senderId in senderIds) {
                    try {
                        val userResponse = api.getUser(senderId)
                        if (userResponse.result?.isNotEmpty() == true) {
                            val user = userResponse.result!![0]
                            userMap[senderId] = user.fullName
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to fetch user info for sender $senderId: ${e.message}")
                    }
                }
                
                // Map messages with sender names
                messages.map { dto ->
                    val senderName = userMap[dto.authorId ?: ""] ?: ""
                    mapMessageDtoToDomain(dto, dialogId, senderName)
                }
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to get messages: $error")
                emptyList()
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.w(TAG, "Timeout fetching messages for dialog $dialogId, retrying...", e)
            // Retry once on timeout
            return try {
                val retryResponse = api.getChatMessages(dialogId, limit, lastId)
                if (retryResponse.isSuccessful && retryResponse.body()?.result?.messages != null) {
                    val messages = retryResponse.body()!!.result!!.messages!!
                    
                    // Collect unique sender IDs
                    val senderIds = messages.mapNotNull { it.authorId }.filter { it.isNotBlank() }.distinct()
                    
                    // Fetch user information for all senders
                    val userMap = mutableMapOf<String, String>()
                    for (senderId in senderIds) {
                        try {
                            val userResponse = api.getUser(senderId)
                            if (userResponse.result?.isNotEmpty() == true) {
                                val user = userResponse.result!![0]
                                userMap[senderId] = user.fullName
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed to fetch user info for sender $senderId: ${e.message}")
                        }
                    }
                    
                    // Map messages with sender names
                    messages.map { dto ->
                        val senderName = userMap[dto.authorId ?: ""] ?: ""
                        mapMessageDtoToDomain(dto, dialogId, senderName)
                    }
                } else {
                    emptyList()
                }
            } catch (retryException: Exception) {
                Log.e(TAG, "Error fetching messages after retry", retryException)
                emptyList()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching messages", e)
            emptyList()
        }
    }
    
    /**
     * Send a message
     */
    suspend fun sendMessage(dialogId: String, text: String, fileIds: List<String>? = null): Result<String> {
        return try {
            val request = SendMessageRequest(
                dialogId = dialogId,
                message = text,
                system = "N",
                files = fileIds
            )
            val response = api.sendMessage(request)
            if (response.isSuccessful && response.body()?.result?.messageId != null) {
                Result.success(response.body()!!.result!!.messageId!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to send message: $error")
                Result.failure(Exception("Failed to send message: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message", e)
            Result.failure(e)
        }
    }
    
    /**
     * Create a new chat
     */
    suspend fun createChat(title: String?, type: String, userIds: List<String>?): Result<String> {
        return try {
            val request = CreateChatRequest(
                title = title,
                type = type,
                users = userIds
            )
            val response = api.createChat(request)
            if (response.isSuccessful && response.body()?.result?.chatId != null) {
                Result.success(response.body()!!.result!!.chatId!!)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to create chat: $error")
                Result.failure(Exception("Failed to create chat: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error creating chat", e)
            Result.failure(e)
        }
    }
    
    /**
     * Mark messages as read
     */
    suspend fun markMessagesAsRead(dialogId: String, messageId: String? = null): Result<Boolean> {
        return try {
            val response = api.markMessagesAsRead(dialogId, messageId)
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                val error = response.errorBody()?.string() ?: "Unknown error"
                Log.e(TAG, "Failed to mark messages as read: $error")
                Result.failure(Exception("Failed to mark messages as read: $error"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error marking messages as read", e)
            Result.failure(e)
        }
    }
    
    /**
     * Pin a chat
     */
    fun pinChat(chatId: String) {
        val pinned = getPinnedChats().toMutableSet()
        pinned.add(chatId)
        savePinnedChats(pinned)
    }
    
    /**
     * Unpin a chat
     */
    fun unpinChat(chatId: String) {
        val pinned = getPinnedChats().toMutableSet()
        pinned.remove(chatId)
        savePinnedChats(pinned)
    }
    
    /**
     * Get pinned chats
     */
    private fun getPinnedChats(): Set<String> {
        val json = sharedPreferences?.getString("pinned_chats", "[]") ?: "[]"
        val type = object : TypeToken<Set<String>>() {}.type
        return gson.fromJson<Set<String>>(json, type) ?: emptySet()
    }
    
    /**
     * Save pinned chats
     */
    private fun savePinnedChats(pinned: Set<String>) {
        val json = gson.toJson(pinned)
        sharedPreferences?.edit()?.putString("pinned_chats", json)?.apply()
    }
    
    /**
     * Map message DTO to domain model
     */
    private fun mapMessageDtoToDomain(dto: MessageDto, dialogId: String, senderName: String = ""): Message {
        val timestamp = parseDate(dto.date) ?: System.currentTimeMillis()
        return Message(
            id = dto.id ?: "",
            chatId = extractChatId(dialogId),
            dialogId = dialogId,
            senderId = dto.authorId ?: "",
            senderName = senderName,
            text = dto.text ?: "",
            timestamp = timestamp,
            isRead = dto.unread != "Y",
            isDelivered = true, // Assume delivered if message exists
            files = dto.files?.map { mapFileDtoToDomain(it) } ?: emptyList()
        )
    }
    
    /**
     * Map file DTO to domain model
     */
    private fun mapFileDtoToDomain(dto: MessageFileDto): MessageFile {
        return MessageFile(
            id = dto.id ?: "",
            name = dto.name ?: "Unknown",
            size = dto.size?.toLongOrNull() ?: 0,
            type = dto.type ?: "application/octet-stream",
            downloadUrl = dto.downloadUrl,
            previewUrl = dto.previewUrl
        )
    }
    
    /**
     * Extract numeric chat ID from dialog ID
     */
    private fun extractChatId(dialogId: String): String {
        return when {
            dialogId.startsWith("chat") -> dialogId.removePrefix("chat")
            dialogId.startsWith("user") -> dialogId.removePrefix("user")
            else -> dialogId
        }
    }
    
    /**
     * Parse date string to timestamp
     */
    private fun parseDate(dateString: String?): Long? {
        if (dateString == null) return null
        return try {
            // Try ISO format first
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
            isoFormat.parse(dateString)?.time
        } catch (e: Exception) {
            try {
                // Try Unix timestamp
                dateString.toLongOrNull()?.let { it * 1000 }
            } catch (e2: Exception) {
                null
            }
        }
    }
}

/**
 * Map data model to domain model
 */
fun mapDataToDomain(data: ChatConversation): Chat {
    val chatType = when (data.type) {
        "user" -> ChatType.PRIVATE
        "chat" -> ChatType.GROUP
        "open" -> ChatType.OPEN
        else -> ChatType.PRIVATE
    }
    
    val lastMessage = data.lastMessage?.let {
        val timestamp = parseChatDate(it.date) ?: System.currentTimeMillis()
        Message(
            id = it.id?.toString() ?: "",
            chatId = extractChatIdFromDialog(data.id ?: ""),
            dialogId = data.id ?: "",
            senderId = it.authorId?.toString() ?: "",
            senderName = "",
            text = it.text ?: "",
            timestamp = timestamp,
            isRead = true,
            isDelivered = true,
            files = emptyList()
        )
    }
    
    val lastMessageDate = lastMessage?.timestamp ?: 0
    
    return Chat(
        id = extractChatIdFromDialog(data.id ?: ""),
        dialogId = data.id ?: "",
        type = chatType,
        name = data.title ?: "Unknown",
        avatar = data.getAvatarUrl(), // Use helper function to extract URL
        lastMessage = lastMessage,
        unreadCount = data.unreadCount ?: 0,
        isPinned = false,
        lastMessageDate = lastMessageDate
    )
}

private fun extractChatIdFromDialog(dialogId: String): String {
    return when {
        dialogId.startsWith("chat") -> dialogId.removePrefix("chat")
        dialogId.startsWith("user") -> dialogId.removePrefix("user")
        else -> dialogId
    }
}

private fun parseChatDate(dateString: String?): Long? {
    if (dateString == null) return null
    return try {
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
        isoFormat.parse(dateString)?.time
    } catch (e: Exception) {
        dateString.toLongOrNull()?.let { it * 1000 }
    }
}
