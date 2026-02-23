package com.example.jbmarks.shared.repository

import com.example.jbmarks.shared.domain.chat.Chat
import com.example.jbmarks.shared.domain.chat.Message
import com.example.jbmarks.shared.network.BitrixApi
import com.example.jbmarks.shared.storage.TokenStorage

/**
 * Repository interface for chat operations
 */
interface ChatRepository {
    suspend fun getRecentChats(): Result<List<Chat>>
    
    suspend fun getChatMessages(
        dialogId: String,
        limit: Int = 20,
        lastId: String? = null
    ): Result<List<Message>>
    
    suspend fun sendMessage(
        dialogId: String,
        message: String
    ): Result<Message>
    
    suspend fun createChat(title: String): Result<Chat>
}

/**
 * Implementation of ChatRepository
 */
class ChatRepositoryImpl(
    private val api: BitrixApi,
    private val tokenStorage: TokenStorage
) : ChatRepository {
    
    override suspend fun getRecentChats(): Result<List<Chat>> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.getRecentChats()
            val chats = response.result?.map { it.toDomain() } ?: emptyList()
            Result.success(chats)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun getChatMessages(
        dialogId: String,
        limit: Int,
        lastId: String?
    ): Result<List<Message>> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val response = api.getChatMessages(dialogId, limit, lastId)
            val messages = response.result?.map { it.toDomain(dialogId) } ?: emptyList()
            Result.success(messages)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun sendMessage(
        dialogId: String,
        message: String
    ): Result<Message> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val request = com.example.jbmarks.shared.network.SendMessageRequest(
                DIALOG_ID = dialogId,
                MESSAGE = message
            )
            val response = api.sendMessage(request)
            // After sending, fetch the message back or construct it
            // For now, return a simple success
            Result.success(Message(
                id = response.result?.toString() ?: "",
                chatId = dialogId,
                dialogId = dialogId,
                senderId = "",
                senderName = "",
                text = message,
                timestamp = com.example.jbmarks.shared.domain.tasks.PlatformClock.now().epochSeconds * 1000,
                isRead = false,
                isDelivered = true,
                files = emptyList()
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    override suspend fun createChat(title: String): Result<Chat> {
        return try {
            val accessToken = tokenStorage.getAccessToken()
                ?: return Result.failure(Exception("No access token available"))
            
            val request = com.example.jbmarks.shared.network.CreateChatRequest(TITLE = title)
            val response = api.createChat(request)
            // After creating, fetch the chat back
            // For now, return a simple success
            Result.success(Chat(
                id = response.result?.toString() ?: "",
                dialogId = response.result?.toString() ?: "",
                type = com.example.jbmarks.shared.domain.chat.ChatType.GROUP,
                name = title,
                avatar = null,
                lastMessage = null,
                unreadCount = 0,
                isPinned = false,
                lastMessageDate = 0
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Helper functions to convert DTOs to domain models
    private fun com.example.jbmarks.shared.network.ChatDto.toDomain(): Chat {
        return Chat(
            id = id ?: "",
            dialogId = dialogId ?: id ?: "",
            type = com.example.jbmarks.shared.domain.chat.ChatType.PRIVATE, // Default, should be determined from data
            name = name ?: "",
            avatar = avatar,
            lastMessage = lastMessage?.toDomain(dialogId ?: id ?: ""),
            unreadCount = unreadCount ?: 0,
            isPinned = false,
            lastMessageDate = 0 // Should be parsed from lastMessage date
        )
    }
    
    private fun com.example.jbmarks.shared.network.MessageDto.toDomain(dialogId: String): Message {
        return Message(
            id = id ?: "",
            chatId = dialogId,
            dialogId = this.dialogId ?: dialogId,
            senderId = userId ?: "",
            senderName = "", // Will be fetched separately if needed
            text = message ?: "",
            timestamp = parseTimestamp(date),
            isRead = false,
            isDelivered = true,
            files = emptyList()
        )
    }
    
    private fun parseTimestamp(dateString: String?): Long {
        if (dateString == null) return 0
        return try {
            kotlinx.datetime.Instant.parse(dateString).epochSeconds * 1000
        } catch (e: Exception) {
            0
        }
    }
}
