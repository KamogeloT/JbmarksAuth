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
import com.example.jbmarks.comms.calling.CallingService
import com.example.jbmarks.comms.calling.CallForegroundService
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

            // Handle new chat message — wake the phone with a heads-up/full-screen
            // notification (like calls) so it's seen even when the app is closed.
            if (type == "CHAT_MESSAGE" || type == "NEW_MESSAGE") {
                handleChatMessagePush(data)
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
     * Handle incoming call push — show notification and set state.
     * The receiver doesn't need to initialize a call agent until they accept.
     */
    private fun handleIncomingCallPush(data: Map<String, String>) {
        val callerName = data["caller_name"] ?: "Unknown"
        val callerUserId = data["caller_user_id"] ?: ""
        val roomId = data["room_id"] ?: ""
        val isGroup = data["call_kind"] == "group"
        val groupName = data["group_name"] ?: ""

        Log.d(TAG, "📞 INCOMING ${if (isGroup) "GROUP " else ""}CALL PUSH from $callerName | Room: $roomId")

        // Set the call state (the UI will react to this)
        CallingService.onIncomingCallPush(callerName, callerUserId, roomId, isGroup, groupName)

        // Start foreground service with ringtone + persistent notification.
        // For group calls, show the group name as the caller label.
        val displayName = if (isGroup && groupName.isNotBlank()) "$groupName (group call)" else callerName
        CallForegroundService.start(applicationContext, displayName, callerUserId, roomId)
    }

    /**
     * Show a new chat message as a high-priority, phone-waking notification.
     * Uses a HIGH-importance channel + full-screen intent + CATEGORY_MESSAGE so the
     * screen turns on and a heads-up shows even when the app is backgrounded/killed —
     * matching the incoming-call behavior. Also records it in the in-app repository.
     */
    private fun handleChatMessagePush(data: Map<String, String>) {
        val senderName = data["sender_name"]?.takeIf { it.isNotBlank() } ?: "New message"
        val messageText = data["message"] ?: ""
        val dialogId = data["dialog_id"] ?: ""

        Log.d(TAG, "💬 CHAT MESSAGE push from $senderName | dialog: $dialogId")

        val channelId = "urgent_messages"
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "New chat messages"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 200, 400)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        // Tapping (or the full-screen intent) opens the app to the conversation.
        val intent = android.content.Intent(this, MainActivity::class.java).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_chat", true)
            putExtra("dialog_id", dialogId)
        }
        val pendingIntent = android.app.PendingIntent.getActivity(
            this,
            dialogId.hashCode(),
            intent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(senderName)
            .setContentText(messageText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(messageText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(pendingIntent)
            .setFullScreenIntent(pendingIntent, true) // wakes the screen like a call
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()

        // Distinct id per dialog so multiple conversations don't overwrite each other.
        val notifId = 4000 + (dialogId.hashCode() and 0x0FFF)
        getSystemService(NotificationManager::class.java).notify(notifId, notification)

        // Also record it in-app so it appears in the notifications list.
        try {
            notificationRepository.addNotification(
                Notification(
                    id = data["timestamp"] ?: System.currentTimeMillis().toString(),
                    type = NotificationType.CHAT_MESSAGE,
                    title = senderName,
                    message = messageText,
                    timestamp = System.currentTimeMillis(),
                    isRead = false,
                    priority = NotificationPriority.HIGH,
                    relatedId = dialogId,
                    actionUrl = null
                )
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to record chat notification in-app: ${e.message}")
        }
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
