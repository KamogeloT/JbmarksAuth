package com.example.jbmarks.notifications.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.notifications.data.NotificationRepository
import com.example.jbmarks.notifications.domain.Notification
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class NotificationsViewModel(application: Application) : AndroidViewModel(application) {
    
    private val repository = NotificationRepository(application.applicationContext)
    
    val notifications: StateFlow<List<Notification>> = repository.notifications
    val unreadCount: StateFlow<Int> = repository.unreadCount
    
    fun markAsRead(notificationId: String) {
        viewModelScope.launch {
            repository.markAsRead(notificationId)
        }
    }
    
    fun markAllAsRead() {
        viewModelScope.launch {
            repository.markAllAsRead()
        }
    }
    
    fun deleteNotification(notificationId: String) {
        viewModelScope.launch {
            repository.deleteNotification(notificationId)
        }
    }
    
    fun clearAll() {
        viewModelScope.launch {
            repository.clearAll()
        }
    }
}
