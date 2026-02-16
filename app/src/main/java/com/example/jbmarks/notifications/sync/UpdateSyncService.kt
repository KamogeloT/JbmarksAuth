package com.example.jbmarks.notifications.sync

import android.content.Context
import android.util.Log
import com.example.jbmarks.activity_feed.data.ActivityFeedRepository
import com.example.jbmarks.chat.data.ChatRepository
import com.example.jbmarks.notifications.data.NotificationRepository
import com.example.jbmarks.notifications.service.NotificationService
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.user.data.UserRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.*

/**
 * Service to sync and check for updates across all modules
 * Triggers notifications when new items are detected
 */
class UpdateSyncService(private val context: Context) {
    
    private val TAG = "UpdateSyncService"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val notificationRepository = NotificationRepository(context)
    private val notificationService = NotificationService(context)
    
    // Store last sync timestamps
    private val prefs = context.getSharedPreferences("sync_prefs", Context.MODE_PRIVATE)
    
    companion object {
        private const val KEY_LAST_FEED_SYNC = "last_feed_sync"
        private const val KEY_LAST_CHAT_SYNC = "last_chat_sync"
        private const val KEY_LAST_TASK_SYNC = "last_task_sync"
        private const val KEY_LAST_FEED_POST_ID = "last_feed_post_id"
        private const val KEY_LAST_CHAT_MESSAGE_ID = "last_chat_message_id"
    }
    
    /**
     * Sync all modules and check for updates
     */
    fun syncAll() {
        scope.launch {
            try {
                Log.d(TAG, "Starting sync for all modules...")
                
                // Sync in parallel
                syncFeed()
                syncChat()
                syncTasks()
                
                Log.d(TAG, "Sync completed")
            } catch (e: Exception) {
                Log.e(TAG, "Error during sync", e)
            }
        }
    }
    
    /**
     * Sync feed and check for new posts
     */
    private suspend fun syncFeed() {
        try {
            val repository = ActivityFeedRepository()
            val currentPosts = repository.getFeed()
            
            if (currentPosts.isNotEmpty()) {
                val lastPostId = prefs.getString(KEY_LAST_FEED_POST_ID, null)
                val latestPost = currentPosts.firstOrNull()
                
                // Check if there's a new post
                if (latestPost != null && latestPost.id != lastPostId) {
                    // New post detected - get author name if possible
                    var authorName = "Someone"
                    try {
                        val userRepository = UserRepository(context)
                        val authorResult = userRepository.getCurrentUser() // Try to get user info
                        // For now, use authorId - could enhance to fetch actual name
                        authorName = "User ${latestPost.authorId}"
                    } catch (e: Exception) {
                        // Use default
                    }
                    
                    val notification = notificationRepository.createFeedPostNotification(
                        postId = latestPost.id,
                        authorName = authorName,
                        postTitle = latestPost.title
                    )
                    
                    notificationRepository.addNotification(notification)
                    notificationService.showNotification(notification)
                    
                    Log.d(TAG, "New feed post detected: ${latestPost.id}")
                    
                    // Update last post ID
                    prefs.edit().putString(KEY_LAST_FEED_POST_ID, latestPost.id).apply()
                }
            }
            
            prefs.edit().putLong(KEY_LAST_FEED_SYNC, System.currentTimeMillis()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing feed", e)
        }
    }
    
    /**
     * Sync chat and check for new messages
     */
    private suspend fun syncChat() {
        try {
            val repository = ChatRepository(context)
            val recentChats = repository.getRecentChats()
            
            // Check each chat for new messages
            recentChats.forEach { chat ->
                try {
                    val messages = repository.getChatMessages(chat.id, limit = 1)
                    if (messages.isNotEmpty()) {
                        val latestMessage = messages.first()
                        val lastMessageKey = "${KEY_LAST_CHAT_MESSAGE_ID}_${chat.id}"
                        val lastMessageId = prefs.getString(lastMessageKey, null)
                        
                        // Check if there's a new message
                        if (latestMessage.id != lastMessageId) {
                            // Get current user ID to avoid notifying about own messages
                            val userRepository = UserRepository(context)
                            val currentUser = userRepository.getCurrentUser().getOrNull()
                            
                            // Only notify if message is not from current user
                            if (currentUser == null || latestMessage.senderId != currentUser.id) {
                                val notification = notificationRepository.createChatMessageNotification(
                                    chatId = chat.id,
                                    chatName = chat.name,
                                    senderName = latestMessage.senderName ?: "Someone",
                                    message = latestMessage.text
                                )
                                
                                notificationRepository.addNotification(notification)
                                notificationService.showNotification(notification)
                                
                                Log.d(TAG, "New chat message detected in ${chat.name}: ${latestMessage.id}")
                            }
                            
                            // Update last message ID
                            prefs.edit().putString(lastMessageKey, latestMessage.id).apply()
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error checking messages for chat ${chat.id}", e)
                }
            }
            
            prefs.edit().putLong(KEY_LAST_CHAT_SYNC, System.currentTimeMillis()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing chat", e)
        }
    }
    
    /**
     * Sync tasks and check for updates
     */
    private suspend fun syncTasks() {
        try {
            val repository = TasksRepository(context)
            val tasks = repository.getTasks()
            
            // Check for new tasks assigned to user
            val userRepository = UserRepository(context)
            val currentUser = userRepository.getCurrentUser().getOrNull()
            
            if (currentUser != null) {
                tasks.forEach { task ->
                    // Check if task was recently created/assigned
                    // This is a simplified check - in production, you'd want to track task IDs
                    val taskKey = "task_${task.id}_notified"
                    if (!prefs.getBoolean(taskKey, false)) {
                        // New task detected
                        val notification = notificationRepository.createTaskAssignedNotification(
                            taskId = task.id,
                            taskTitle = task.title
                        )
                        
                        notificationRepository.addNotification(notification)
                        notificationService.showNotification(notification)
                        
                        prefs.edit().putBoolean(taskKey, true).apply()
                        Log.d(TAG, "New task detected: ${task.id}")
                    }
                }
            }
            
            prefs.edit().putLong(KEY_LAST_TASK_SYNC, System.currentTimeMillis()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing tasks", e)
        }
    }
}
