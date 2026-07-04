package com.example.jbmarks.chat.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.chat.data.ChatRepository
import com.example.jbmarks.chat.domain.Chat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// The state now holds a list of the rich domain model
sealed interface ChatUiState {
    object Loading : ChatUiState
    data class Success(val conversations: List<Chat>) : ChatUiState
    data class Error(val message: String) : ChatUiState
}

class ChatViewModel : ViewModel() {

    private val repository = ChatRepository()

    private val _uiState = MutableStateFlow<ChatUiState>(ChatUiState.Loading)
    val uiState: StateFlow<ChatUiState> = _uiState

    init {
        loadRecentChats()
    }

    fun loadRecentChats() {
        viewModelScope.launch {
            _uiState.value = ChatUiState.Loading
            try {
                val conversations = repository.getRecentChats()
                _uiState.value = ChatUiState.Success(conversations)
            } catch (t: Throwable) {
                _uiState.value = ChatUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
}

@Suppress("UNCHECKED_CAST")
class ChatViewModelFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ChatViewModel::class.java)) {
            return ChatViewModel() as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}