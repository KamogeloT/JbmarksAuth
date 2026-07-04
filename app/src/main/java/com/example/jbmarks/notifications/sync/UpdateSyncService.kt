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
        private const val KEY_INITIAL_SYNC_DONE = "initial_sync_done"
    }

    /** True after the first full sync seeds the "last seen" markers without notifying. */
    private val isInitialSyncDone: Boolean
        get() = prefs.getBoolean(KEY_INITIAL_SYNC_DONE, false)

    private fun markInitialSyncDone() {
        prefs.edit().putBoolean(KEY_INITIAL_SYNC_DONE, true).apply()
    }
    
    /**
     * Sync all modules and check for updates.
     * On the very first run, seeds "last seen" markers without firing notifications
     * to avoid spamming the user with existing data.
     */
    fun syncAll() {
        scope.launch {
            try {
                val silent = !isInitialSyncDone
                if (silent) {
                    Log.d(TAG, "First sync — seeding markers silently (no notifications)")
                } else {
                    Log.d(TAG, "Starting sync for all modules...")
                }
                
                syncFeed(silent)
                syncChat(silent)
                syncTasks(silent)
                
                if (silent) {
                    markInitialSyncDone()
                    Log.d(TAG, "Initial sync seeding complete")
                } else {
                    Log.d(TAG, "Sync completed")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error during sync", e)
            }
        }
    }
    
    /**
     * Sync feed and check for new posts
     */
    private suspend fun syncFeed(silent: Boolean = false) {
        try {
            val repository = ActivityFeedRepository()
            val currentPosts = repository.getFeed()
            
            if (currentPosts.isNotEmpty()) {
                val lastPostId = prefs.getString(KEY_LAST_FEED_POST_ID, null)
                val latestPost = currentPosts.firstOrNull()
                
                if (latestPost != null && latestPost.id != lastPostId) {
                    if (!silent) {
                        var authorName = "Someone"
                        try {
                            val userRepository = UserRepository(context)
                            authorName = "User ${latestPost.authorId}"
                        } catch (e: Exception) { }
                        
                        val notification = notificationRepository.createFeedPostNotification(
                            postId = latestPost.id,
                            authorName = authorName,
                            postTitle = latestPost.title
                        )
                        notificationRepository.addNotification(notification)
                        notificationService.showNotification(notification)
                        Log.d(TAG, "New feed post detected: ${latestPost.id}")
                    }
                    
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
    private suspend fun syncChat(silent: Boolean = false) {
        try {
            val repository = ChatRepository(context)
            val recentChats = repository.getRecentChats()
            
            recentChats.forEach { chat ->
                try {
                    val messages = repository.getChatMessages(chat.id, limit = 1)
                    if (messages.isNotEmpty()) {
                        val latestMessage = messages.first()
                        val lastMessageKey = "${KEY_LAST_CHAT_MESSAGE_ID}_${chat.id}"
                        val lastMessageId = prefs.getString(lastMessageKey, null)
                        
                        if (latestMessage.id != lastMessageId) {
                            if (!silent) {
                                val userRepository = UserRepository(context)
                                val currentUser = userRepository.getCurrentUser().getOrNull()
                                
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
                            }
                            
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
    private suspend fun syncTasks(silent: Boolean = false) {
        try {
            val repository = TasksRepository(context)
            val tasks = repository.getTasks()
            
            val userRepository = UserRepository(context)
            val currentUser = userRepository.getCurrentUser().getOrNull()
            
            if (currentUser != null) {
                tasks.forEach { task ->
                    val taskKey = "task_${task.id}_notified"
                    if (!prefs.getBoolean(taskKey, false)) {
                        if (!silent) {
                            val notification = notificationRepository.createTaskAssignedNotification(
                                taskId = task.id,
                                taskTitle = task.title
                            )
                            notificationRepository.addNotification(notification)
                            notificationService.showNotification(notification)
                            Log.d(TAG, "New task detected: ${task.id}")
                        }
                        
                        prefs.edit().putBoolean(taskKey, true).apply()
                    }
                }
            }
            
            prefs.edit().putLong(KEY_LAST_TASK_SYNC, System.currentTimeMillis()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error syncing tasks", e)
        }
    }
}
