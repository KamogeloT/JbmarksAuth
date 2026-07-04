package com.example.jbmarks.shared.domain.notifications

import com.example.jbmarks.shared.domain.tasks.PlatformClock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

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
        val now = PlatformClock.now().epochSeconds * 1000
        val diff = now - timestamp
        
        return when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000} minutes ago"
            diff < 86400000 -> "${diff / 3600000} hours ago"
            diff < 604800000 -> "${diff / 86400000} days ago"
            else -> {
                try {
                    val instant = Instant.fromEpochMilliseconds(timestamp)
                    val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
                    "${localDateTime.month.name.take(3)} ${localDateTime.dayOfMonth}, ${localDateTime.year}"
                } catch (e: Exception) {
                    ""
                }
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
