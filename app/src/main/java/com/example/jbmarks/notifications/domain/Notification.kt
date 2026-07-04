package com.example.jbmarks.notifications.domain

import java.util.*

/**
 * Notification types
 */
enum class NotificationType {
    TASK_ASSIGNED,
    TASK_UPDATED,
    TASK_COMMENT,
    TASK_DEADLINE,
    TASK_STATUS_CHANGED,
    FILE_ATTACHED,
    FEED_POST,
    CHAT_MESSAGE,
    GENERAL
}

/**
 * Notification priority
 */
enum class NotificationPriority {
    LOW,
    NORMAL,
    HIGH,
    URGENT
}

/**
 * Domain model for a notification
 */
data class Notification(
    val id: String,
    val type: NotificationType,
    val title: String,
    val message: String,
    val timestamp: Long,
    val isRead: Boolean,
    val priority: NotificationPriority,
    val relatedId: String?, // ID of related task, comment, etc.
    val actionUrl: String? // Deep link or action to take
) {
    fun getFormattedTime(): String {
        val now = System.currentTimeMillis()
        val diff = now - timestamp
        
        return when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000} minutes ago"
            diff < 86400000 -> "${diff / 3600000} hours ago"
            diff < 604800000 -> "${diff / 86400000} days ago"
            else -> {
                val date = Date(timestamp)
                java.text.SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(date)
            }
        }
    }
    
    fun getIcon(): String {
        return when (type) {
            NotificationType.TASK_ASSIGNED -> "📋"
            NotificationType.TASK_UPDATED -> "✏️"
            NotificationType.TASK_COMMENT -> "💬"
            NotificationType.TASK_DEADLINE -> "⏰"
            NotificationType.TASK_STATUS_CHANGED -> "🔄"
            NotificationType.FILE_ATTACHED -> "📎"
            NotificationType.FEED_POST -> "📰"
            NotificationType.CHAT_MESSAGE -> "💬"
            NotificationType.GENERAL -> "🔔"
        }
    }
}
