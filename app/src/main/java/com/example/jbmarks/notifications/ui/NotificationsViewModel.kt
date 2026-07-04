package com.example.jbmarks.notifications.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.notifications.data.NotificationRepository
import com.example.jbmarks.notifications.domain.Notification
import com.example.jbmarks.notifications.domain.NotificationPriority
import com.example.jbmarks.notifications.domain.NotificationType
import com.example.jbmarks.user.data.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

class NotificationsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = NotificationRepository(application.applicationContext)
    private val userRepository = UserRepository(application.applicationContext)

    val notifications: StateFlow<List<Notification>> = repository.notifications
    val unreadCount: StateFlow<Int> = repository.unreadCount

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        // Pull live notifications from Bitrix24 on startup
        syncLiveNotifications()
    }

    /**
     * Sync live notifications from Bitrix24:
     * - Workgroup invitations (ROLE = "K")
     * Add more sources here as needed (task assignments, etc.)
     */
    fun syncLiveNotifications() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Fetch pending workgroup invitations
                val invitations = userRepository.getPendingInvitations().getOrNull() ?: emptyList()

                invitations.forEach { group ->
                    val notifId = "invite_${group.id}"
                    // Only add if not already in the list
                    val alreadyExists = repository.notifications.value.any { it.id == notifId }
                    if (!alreadyExists) {
                        repository.addNotification(
                            Notification(
                                id = notifId,
                                type = NotificationType.GENERAL,
                                title = "Workgroup Invitation",
                                message = "You have been invited to join: ${group.name}",
                                timestamp = System.currentTimeMillis(),
                                isRead = false,
                                priority = NotificationPriority.HIGH,
                                relatedId = group.id,
                                actionUrl = null // handled via accept/decline
                            )
                        )
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("NotificationsViewModel", "Failed to sync notifications", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun markAsRead(notificationId: String) {
        viewModelScope.launch { repository.markAsRead(notificationId) }
    }

    fun markAllAsRead() {
        viewModelScope.launch { repository.markAllAsRead() }
    }

    fun deleteNotification(notificationId: String) {
        viewModelScope.launch { repository.deleteNotification(notificationId) }
    }

    fun clearAll() {
        viewModelScope.launch { repository.clearAll() }
    }
}
