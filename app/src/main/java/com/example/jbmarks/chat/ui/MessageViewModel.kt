package com.example.jbmarks.chat.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.chat.data.ChatRepository
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.user.data.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class MessageViewModel(
    private val dialogId: String,
    application: Application
) : AndroidViewModel(application) {
    
    private val repository = ChatRepository(application.applicationContext)
    private val userRepository = UserRepository(application.applicationContext)
    
    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()
    
    private val _currentUserId = MutableStateFlow<String?>(null)
    val currentUserId: StateFlow<String?> = _currentUserId.asStateFlow()
    
    init {
        loadCurrentUserId()
    }
    
    private fun loadCurrentUserId() {
        viewModelScope.launch {
            try {
                userRepository.getCurrentUser()
                    .onSuccess { user ->
                        _currentUserId.value = user.id
                    }
                    .onFailure { e ->
                        if (e is java.net.SocketTimeoutException) {
                            android.util.Log.w("MessageViewModel", "Timeout getting current user ID, will retry", e)
                            // Retry once after a short delay
                            kotlinx.coroutines.delay(1000)
                            userRepository.getCurrentUser()
                                .onSuccess { user ->
                                    _currentUserId.value = user.id
                                }
                                .onFailure {
                                    android.util.Log.e("MessageViewModel", "Failed to get current user ID after retry", it)
                                }
                        } else {
                            android.util.Log.e("MessageViewModel", "Failed to get current user ID", e)
                        }
                    }
            } catch (e: Exception) {
                android.util.Log.e("MessageViewModel", "Error getting current user ID", e)
            }
        }
    }
    
    fun loadMessages() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val loadedMessages = repository.getChatMessages(dialogId, limit = 50)
                _messages.value = loadedMessages
                
                // Mark messages as read
                repository.markMessagesAsRead(dialogId)
            } catch (e: Exception) {
                android.util.Log.e("MessageViewModel", "Error loading messages", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun sendMessage(text: String) {
        viewModelScope.launch {
            _isSending.value = true
            try {
                repository.sendMessage(dialogId, text)
                    .onSuccess {
                        // Reload messages to get the new one
                        loadMessages()
                    }
                    .onFailure { e ->
                        android.util.Log.e("MessageViewModel", "Error sending message", e)
                    }
            } finally {
                _isSending.value = false
            }
        }
    }
    
    fun sendMessageWithFile(filePath: String, fileName: String) {
        viewModelScope.launch {
            _isSending.value = true
            try {
                // Upload file first (reuse task file upload logic)
                val tasksRepository = com.example.jbmarks.tasks.data.TasksRepository(getApplication<Application>().applicationContext)
                tasksRepository.uploadFile(filePath, fileName)
                    .onSuccess { uploadedFile ->
                        // Send message with file ID
                        repository.sendMessage(dialogId, "📎 $fileName", listOf(uploadedFile.id))
                            .onSuccess {
                                loadMessages()
                            }
                            .onFailure { e ->
                                android.util.Log.e("MessageViewModel", "Error sending message with file", e)
                            }
                    }
                    .onFailure { e ->
                        android.util.Log.e("MessageViewModel", "Error uploading file", e)
                    }
            } finally {
                _isSending.value = false
            }
        }
    }
}

class MessageViewModelFactory(
    private val dialogId: String,
    private val application: Application
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MessageViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MessageViewModel(dialogId, application) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
