package com.example.jbmarks.notifications.data

import android.content.Context
import android.content.SharedPreferences
import com.example.jbmarks.notifications.domain.Notification
import com.example.jbmarks.notifications.domain.NotificationPriority
import com.example.jbmarks.notifications.domain.NotificationType
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.*

class NotificationRepository(private val context: Context) {
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("notifications_prefs", Context.MODE_PRIVATE)
    
    private val gson = Gson()
    
    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications.asStateFlow()
    
    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()
    
    init {
        loadNotifications()
    }
    
    /**
     * Load notifications from SharedPreferences
     */
    private fun loadNotifications() {
        val json = sharedPreferences.getString("notifications", "[]") ?: "[]"
        val type = object : TypeToken<List<Notification>>() {}.type
        val loaded = gson.fromJson<List<Notification>>(json, type) ?: emptyList()
        _notifications.value = loaded.sortedByDescending { it.timestamp }
        updateUnreadCount()
    }
    
    /**
     * Save notifications to SharedPreferences
     */
    private fun saveNotifications() {
        val json = gson.toJson(_notifications.value)
        sharedPreferences.edit().putString("notifications", json).apply()
        updateUnreadCount()
    }
    
    /**
     * Add a new notification
     */
    fun addNotification(notification: Notification) {
        val current = _notifications.value.toMutableList()
        current.add(0, notification) // Add to beginning
        _notifications.value = current
        saveNotifications()
    }
    
    /**
     * Mark notification as read
     */
    fun markAsRead(notificationId: String) {
        val current = _notifications.value.toMutableList()
        val index = current.indexOfFirst { it.id == notificationId }
        if (index != -1) {
            current[index] = current[index].copy(isRead = true)
            _notifications.value = current
            saveNotifications()
        }
    }
    
    /**
     * Mark all notifications as read
     */
    fun markAllAsRead() {
        val current = _notifications.value.map { it.copy(isRead = true) }
        _notifications.value = current
        saveNotifications()
    }
    
    /**
     * Delete a notification
     */
    fun deleteNotification(notificationId: String) {
        val current = _notifications.value.toMutableList()
        current.removeAll { it.id == notificationId }
        _notifications.value = current
        saveNotifications()
    }
    
    /**
     * Clear all notifications
     */
    fun clearAll() {
        _notifications.value = emptyList()
        sharedPreferences.edit().remove("notifications").apply()
        updateUnreadCount()
    }
    
    /**
     * Update unread count
     */
    private fun updateUnreadCount() {
        _unreadCount.value = _notifications.value.count { !it.isRead }
    }
    
    /**
     * Get unread notifications
     */
    fun getUnreadNotifications(): List<Notification> {
        return _notifications.value.filter { !it.isRead }
    }
    
    /**
     * Create notification for task assigned
     */
    fun createTaskAssignedNotification(taskId: String, taskTitle: String): Notification {
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.TASK_ASSIGNED,
            title = "New Task Assigned",
            message = "You have been assigned: $taskTitle",
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = NotificationPriority.HIGH,
            relatedId = taskId,
            actionUrl = "task_detail/$taskId"
        )
    }
    
    /**
     * Create notification for task comment
     */
    fun createTaskCommentNotification(taskId: String, taskTitle: String, commentAuthor: String): Notification {
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.TASK_COMMENT,
            title = "New Comment",
            message = "$commentAuthor commented on: $taskTitle",
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = NotificationPriority.NORMAL,
            relatedId = taskId,
            actionUrl = "task_detail/$taskId"
        )
    }
    
    /**
     * Create notification for task update
     */
    fun createTaskUpdateNotification(taskId: String, taskTitle: String): Notification {
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.TASK_UPDATED,
            title = "Task Updated",
            message = "Task '$taskTitle' has been updated",
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = NotificationPriority.NORMAL,
            relatedId = taskId,
            actionUrl = "task_detail/$taskId"
        )
    }
    
    /**
     * Create notification for task deadline
     */
    fun createTaskDeadlineNotification(taskId: String, taskTitle: String, hoursUntil: Long): Notification {
        val timeText = when {
            hoursUntil < 1 -> "less than an hour"
            hoursUntil == 1L -> "1 hour"
            else -> "$hoursUntil hours"
        }
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.TASK_DEADLINE,
            title = "Deadline Approaching",
            message = "Task '$taskTitle' is due in $timeText",
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = if (hoursUntil < 24) NotificationPriority.URGENT else NotificationPriority.HIGH,
            relatedId = taskId,
            actionUrl = "task_detail/$taskId"
        )
    }
    
    /**
     * Create notification for file attachment
     */
    fun createFileAttachmentNotification(taskId: String, taskTitle: String, fileName: String): Notification {
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.FILE_ATTACHED,
            title = "File Attached",
            message = "A file was attached to task '$taskTitle'",
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = NotificationPriority.LOW,
            relatedId = taskId,
            actionUrl = "task_detail/$taskId"
        )
    }
    
    /**
     * Create notification for feed post
     */
    fun createFeedPostNotification(postId: String, authorName: String, postTitle: String?): Notification {
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.FEED_POST,
            title = "New Feed Post",
            message = if (postTitle != null) {
                "$authorName posted: $postTitle"
            } else {
                "$authorName posted in the feed"
            },
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = NotificationPriority.NORMAL,
            relatedId = postId,
            actionUrl = "feed"
        )
    }
    
    /**
     * Create notification for chat message
     */
    fun createChatMessageNotification(chatId: String, chatName: String, senderName: String, message: String): Notification {
        return Notification(
            id = UUID.randomUUID().toString(),
            type = NotificationType.CHAT_MESSAGE,
            title = "New message in $chatName",
            message = "$senderName: ${message.take(50)}${if (message.length > 50) "..." else ""}",
            timestamp = System.currentTimeMillis(),
            isRead = false,
            priority = NotificationPriority.HIGH,
            relatedId = chatId,
            actionUrl = "chat/$chatId"
        )
    }
}
