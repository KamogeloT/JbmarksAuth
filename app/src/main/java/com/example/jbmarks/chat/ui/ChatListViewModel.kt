package com.example.jbmarks.chat.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.chat.data.ChatRepository
import com.example.jbmarks.chat.domain.Chat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ChatListViewModel(application: Application) : AndroidViewModel(application) {
    
    private val repository = ChatRepository(application.applicationContext)
    
    private val _chats = MutableStateFlow<List<Chat>>(emptyList())
    val chats: StateFlow<List<Chat>> = _chats.asStateFlow()
    
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _showCreateChatDialog = MutableStateFlow(false)
    val showCreateChatDialog: StateFlow<Boolean> = _showCreateChatDialog.asStateFlow()
    
    fun loadChats() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val allChats = repository.getRecentChats()
                val query = _searchQuery.value.lowercase()
                
                val filtered = if (query.isBlank()) {
                    allChats
                } else {
                    allChats.filter { 
                        it.name.lowercase().contains(query)
                    }
                }
                
                _chats.value = filtered
            } catch (e: Exception) {
                android.util.Log.e("ChatListViewModel", "Error loading chats", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        loadChats() // Reload with filter
    }
    
    fun pinChat(chatId: String) {
        repository.pinChat(chatId)
        loadChats() // Reload to update pin status
    }
    
    fun unpinChat(chatId: String) {
        repository.unpinChat(chatId)
        loadChats() // Reload to update pin status
    }
    
    fun showCreateChatDialog() {
        _showCreateChatDialog.value = true
    }
    
    fun hideCreateChatDialog() {
        _showCreateChatDialog.value = false
    }
    
    fun createChat(title: String, userIds: List<String>) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                repository.createChat(title, "CHAT", userIds)
                    .onSuccess {
                        hideCreateChatDialog()
                        loadChats() // Reload to show new chat
                    }
                    .onFailure { e ->
                        android.util.Log.e("ChatListViewModel", "Error creating chat", e)
                    }
            } finally {
                _isLoading.value = false
            }
        }
    }
}
