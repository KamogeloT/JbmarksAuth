package com.example.jbmarks.chat.domain

/**
 * Chat message domain model
 */
data class Message(
    val id: String,
    val chatId: String,
    val dialogId: String, // Original Bitrix24 dialog ID format
    val senderId: String,
    val senderName: String,
    val text: String,
    val timestamp: Long,
    val isRead: Boolean,
    val isDelivered: Boolean,
    val files: List<MessageFile>,
    val replyTo: MessageReply? = null
) {
    fun getFormattedTime(): String {
        val now = System.currentTimeMillis()
        val diff = now - timestamp
        
        return when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000}m ago"
            diff < 86400000 -> "${diff / 3600000}h ago"
            else -> {
                val date = java.util.Date(timestamp)
                java.text.SimpleDateFormat("MMM dd, HH:mm", java.util.Locale.getDefault()).format(date)
            }
        }
    }
}

/**
 * File attachment in message
 */
data class MessageFile(
    val id: String,
    val name: String,
    val size: Long,
    val type: String,
    val downloadUrl: String?,
    val previewUrl: String?
)

/**
 * Reply to another message
 */
data class MessageReply(
    val messageId: String,
    val senderName: String,
    val text: String
)
