package com.example.jbmarks.notifications.fcm

import android.app.NotificationManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.jbmarks.MainActivity
import com.example.jbmarks.notifications.domain.Notification
import com.example.jbmarks.notifications.domain.NotificationPriority
import com.example.jbmarks.notifications.domain.NotificationType
import com.example.jbmarks.notifications.service.NotificationService
import com.example.jbmarks.notifications.data.NotificationRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Firebase Cloud Messaging Service
 * Handles incoming push notifications from Firebase
 */
class JBmarksFirebaseMessagingService : FirebaseMessagingService() {

    private val TAG = "FCMService"
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Lazy init — safe to call before onCreate() since applicationContext is always available
    private val notificationService by lazy { NotificationService(applicationContext) }
    private val notificationRepository by lazy { NotificationRepository(applicationContext) }

    override fun onCreate() {
        super.onCreate()
        // Trigger lazy init early so first access is fast
        notificationService
        notificationRepository
    }
    
    /**
     * Called when a new FCM token is generated
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: ${token.take(20)}...")
        
        // Register the new token with backend/Bitrix24
        serviceScope.launch {
            FCMTokenManager(applicationContext).registerToken(token)
        }
    }
    
    /**
     * Called when a message is received from FCM
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "Message received from: ${remoteMessage.from}")
        
        // Check if message contains data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            handleDataMessage(remoteMessage.data)
        }
        
        // Check if message contains notification payload
        remoteMessage.notification?.let {
            Log.d(TAG, "Message notification payload: ${it.title} - ${it.body}")
            handleNotificationMessage(it.title ?: "", it.body ?: "", remoteMessage.data)
        }
    }
    
    /**
     * Handle data-only messages (background messages)
     */
    private fun handleDataMessage(data: Map<String, String>) {
        try {
            val type = data["type"] ?: "GENERAL"

            // Handle incoming call push notification
            if (type == "INCOMING_CALL") {
                handleIncomingCallPush(data)
                return
            }

            val title = data["title"] ?: "New Notification"
            val message = data["message"] ?: ""
            val relatedId = data["related_id"]
            val actionUrl = data["action_url"]
            val priority = data["priority"] ?: "NORMAL"
            
            val notification = Notification(
                id = data["id"] ?: System.currentTimeMillis().toString(),
                type = parseNotificationType(type),
                title = title,
                message = message,
                timestamp = System.currentTimeMillis(),
                isRead = false,
                priority = parsePriority(priority),
                relatedId = relatedId,
                actionUrl = actionUrl
            )
            
            // Add to repository
            notificationRepository.addNotification(notification)
            
            // Show system notification
            notificationService.showNotification(notification)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error handling data message", e)
        }
    }

    /**
     * Handle incoming call push — initialize call agent and accept the call.
     * This wakes the app even when it's in the background.
     */
    private fun handleIncomingCallPush(data: Map<String, String>) {
        val callerName = data["caller_name"] ?: "Unknown"
        val callerUserId = data["caller_user_id"] ?: ""
        val targetUserId = data["target_user_id"] ?: ""

        Log.d(TAG, "📞 INCOMING CALL PUSH from $callerName ($callerUserId)")

        // Initialize the calling service in background so it can receive the ACS incoming call
        serviceScope.launch {
            try {
                val result = com.example.jbmarks.comms.calling.CallingService.initialize(
                    applicationContext, targetUserId
                )
                if (result.isSuccess) {
                    Log.d(TAG, "✅ Call agent ready for incoming call from $callerName")
                } else {
                    Log.e(TAG, "❌ Failed to init call agent for incoming call")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error handling incoming call push", e)
            }
        }

        // Show a high-priority notification to bring the user to the app
        showIncomingCallNotification(callerName)
    }

    /**
     * Show a full-screen incoming call notification (like WhatsApp).
     */
    private fun showIncomingCallNotification(callerName: String) {
        val channelId = "incoming_calls"
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId, "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "VoIP incoming calls"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }

        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = android.app.PendingIntent.getActivity(
            this, 0, intent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle("Incoming Call")
            .setContentText(callerName)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(pendingIntent, true)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVibrate(longArrayOf(0, 1000, 500, 1000, 500, 1000))
            .build()

        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(2001, notification)
    }
    
    /**
     * Handle notification messages (foreground/background)
     */
    private fun handleNotificationMessage(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        try {
            val type = data["type"] ?: "GENERAL"
            val relatedId = data["related_id"]
            val actionUrl = data["action_url"]
            val priority = data["priority"] ?: "NORMAL"
            
            val notification = Notification(
                id = data["id"] ?: System.currentTimeMillis().toString(),
                type = parseNotificationType(type),
                title = title,
                message = body,
                timestamp = System.currentTimeMillis(),
                isRead = false,
                priority = parsePriority(priority),
                relatedId = relatedId,
                actionUrl = actionUrl
            )
            
            // Add to repository
            notificationRepository.addNotification(notification)
            
            // Show system notification
            notificationService.showNotification(notification)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification message", e)
        }
    }
    
    /**
     * Parse notification type from string
     */
    private fun parseNotificationType(type: String): NotificationType {
        return try {
            NotificationType.valueOf(type.uppercase())
        } catch (e: IllegalArgumentException) {
            NotificationType.GENERAL
        }
    }
    
    /**
     * Parse priority from string
     */
    private fun parsePriority(priority: String): NotificationPriority {
        return try {
            NotificationPriority.valueOf(priority.uppercase())
        } catch (e: IllegalArgumentException) {
            NotificationPriority.NORMAL
        }
    }
}
