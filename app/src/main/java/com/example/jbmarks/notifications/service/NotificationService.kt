package com.example.jbmarks.notifications.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.jbmarks.MainActivity
import com.example.jbmarks.R
import com.example.jbmarks.notifications.domain.Notification
import com.example.jbmarks.notifications.domain.NotificationPriority
import com.example.jbmarks.notifications.domain.NotificationType

class NotificationService(private val context: Context) {
    
    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    
    companion object {
        private const val CHANNEL_ID_TASKS = "tasks_channel"
        private const val CHANNEL_ID_COMMENTS = "comments_channel"
        private const val CHANNEL_ID_DEADLINES = "deadlines_channel"
        private const val CHANNEL_ID_GENERAL = "general_channel"
    }
    
    init {
        createNotificationChannels()
    }
    
    /**
     * Create notification channels for Android O and above
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Tasks channel
            val tasksChannel = NotificationChannel(
                CHANNEL_ID_TASKS,
                "Tasks",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for task assignments and updates"
            }
            
            // Comments channel
            val commentsChannel = NotificationChannel(
                CHANNEL_ID_COMMENTS,
                "Comments",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for task comments"
            }
            
            // Deadlines channel
            val deadlinesChannel = NotificationChannel(
                CHANNEL_ID_DEADLINES,
                "Deadlines",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for approaching deadlines"
                enableVibration(true)
            }
            
            // General channel
            val generalChannel = NotificationChannel(
                CHANNEL_ID_GENERAL,
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General notifications"
            }
            
            notificationManager.createNotificationChannels(
                listOf(tasksChannel, commentsChannel, deadlinesChannel, generalChannel)
            )
        }
    }
    
    /**
     * Show a notification
     */
    fun showNotification(notification: Notification) {
        val channelId = getChannelId(notification.type)
        val priority = getNotificationPriority(notification.priority)
        
        // Create intent for when notification is clicked
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            // Add deep link data if available
            notification.actionUrl?.let {
                putExtra("deep_link", it)
            }
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            notification.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(notification.title)
            .setContentText(notification.message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(notification.message))
            .setPriority(priority)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setShowWhen(true)
            .setWhen(notification.timestamp)
        
        // Add icon emoji if available
        notification.getIcon().let { icon ->
            builder.setContentTitle("$icon ${notification.title}")
        }
        
        // Set sound and vibration based on priority
        when (notification.priority) {
            NotificationPriority.URGENT, NotificationPriority.HIGH -> {
                builder.setDefaults(NotificationCompat.DEFAULT_ALL)
            }
            else -> {
                builder.setDefaults(NotificationCompat.DEFAULT_LIGHTS)
            }
        }
        
        notificationManager.notify(notification.id.hashCode(), builder.build())
    }
    
    /**
     * Cancel a notification
     */
    fun cancelNotification(notificationId: String) {
        notificationManager.cancel(notificationId.hashCode())
    }
    
    /**
     * Cancel all notifications
     */
    fun cancelAll() {
        notificationManager.cancelAll()
    }
    
    /**
     * Get channel ID based on notification type
     */
    private fun getChannelId(type: NotificationType): String {
        return when (type) {
            NotificationType.TASK_ASSIGNED,
            NotificationType.TASK_UPDATED,
            NotificationType.TASK_STATUS_CHANGED,
            NotificationType.FILE_ATTACHED -> CHANNEL_ID_TASKS
            NotificationType.TASK_COMMENT -> CHANNEL_ID_COMMENTS
            NotificationType.TASK_DEADLINE -> CHANNEL_ID_DEADLINES
            NotificationType.GENERAL -> CHANNEL_ID_GENERAL
        }
    }
    
    /**
     * Convert domain priority to Android notification priority
     */
    private fun getNotificationPriority(priority: NotificationPriority): Int {
        return when (priority) {
            NotificationPriority.URGENT -> NotificationCompat.PRIORITY_MAX
            NotificationPriority.HIGH -> NotificationCompat.PRIORITY_HIGH
            NotificationPriority.NORMAL -> NotificationCompat.PRIORITY_DEFAULT
            NotificationPriority.LOW -> NotificationCompat.PRIORITY_LOW
        }
    }
}
