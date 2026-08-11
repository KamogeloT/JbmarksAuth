package com.example.jbmarks.comms.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.comms.data.CommsRepository
import com.example.jbmarks.user.data.Workgroup
import com.example.jbmarks.user.data.WorkgroupMember
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

data class CommsUiState(
    val workgroups: List<Workgroup> = emptyList(),
    val selectedWorkgroup: Workgroup? = null,
    val messages: List<Message> = emptyList(),
    val members: List<WorkgroupMember> = emptyList(),
    val currentDialogId: String? = null,
    val isLoadingWorkgroups: Boolean = true,
    val isLoadingMessages: Boolean = false,
    val isLoadingMembers: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val currentUserId: String = ""
)

class CommsViewModel(application: Application) : AndroidViewModel(application) {

    private val TAG = "CommsViewModel"
    private val repository = CommsRepository(application)
    private val userRepository = com.example.jbmarks.user.data.UserRepository(application)

    private val _state = MutableStateFlow(CommsUiState())
    val state: StateFlow<CommsUiState> = _state.asStateFlow()

    private var pollingActive = false

    init {
        loadWorkgroups()
        loadCurrentUserId()
    }

    private fun loadCurrentUserId() {
        viewModelScope.launch {
            try {
                val user = userRepository.getCurrentUser().getOrNull()
                if (user != null) {
                    _state.value = _state.value.copy(currentUserId = user.id)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading current user", e)
            }
        }
    }

    private fun loadWorkgroups() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoadingWorkgroups = true)
            try {
                val workgroups = repository.getUserWorkgroups()
                _state.value = _state.value.copy(
                    workgroups = workgroups,
                    isLoadingWorkgroups = false
                )
                // Auto-select first workgroup if none selected
                if (workgroups.isNotEmpty() && _state.value.selectedWorkgroup == null) {
                    selectWorkgroup(workgroups.first())
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error loading workgroups", e)
                _state.value = _state.value.copy(
                    isLoadingWorkgroups = false,
                    error = "Failed to load workgroups"
                )
            }
        }
    }

    fun selectWorkgroup(workgroup: Workgroup) {
        if (_state.value.selectedWorkgroup?.id == workgroup.id) return

        _state.value = _state.value.copy(
            selectedWorkgroup = workgroup,
            messages = emptyList(),
            members = emptyList(),
            currentDialogId = null,
            isLoadingMessages = true,
            isLoadingMembers = true
        )

        // Load chat and members for selected workgroup
        viewModelScope.launch {
            loadWorkgroupChat(workgroup)
        }
        viewModelScope.launch {
            loadWorkgroupMembers(workgroup)
        }
    }

    private suspend fun loadWorkgroupChat(workgroup: Workgroup) {
        try {
            val dialogId = repository.getOrCreateWorkgroupChat(workgroup)
            if (dialogId != null) {
                _state.value = _state.value.copy(currentDialogId = dialogId)
                loadMessages(dialogId)
                startPolling(dialogId)
            } else {
                _state.value = _state.value.copy(
                    isLoadingMessages = false,
                    error = "No chat found for ${workgroup.name}"
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading workgroup chat", e)
            _state.value = _state.value.copy(
                isLoadingMessages = false,
                error = "Failed to load chat"
            )
        }
    }

    private suspend fun loadMessages(dialogId: String) {
        try {
            val messages = repository.getMessages(dialogId)
            _state.value = _state.value.copy(
                messages = messages.sortedBy { it.timestamp },
                isLoadingMessages = false
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error loading messages", e)
            _state.value = _state.value.copy(
                isLoadingMessages = false,
                error = "Failed to load messages"
            )
        }
    }

    private suspend fun loadWorkgroupMembers(workgroup: Workgroup) {
        try {
            val members = repository.getWorkgroupMembers(workgroup.id)
            _state.value = _state.value.copy(
                members = members,
                isLoadingMembers = false
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error loading members", e)
            _state.value = _state.value.copy(isLoadingMembers = false)
        }
    }

    fun sendMessage(text: String) {
        val dialogId = _state.value.currentDialogId ?: return
        if (text.isBlank()) return

        _state.value = _state.value.copy(isSending = true)

        viewModelScope.launch {
            try {
                val result = repository.sendMessage(dialogId, text.trim())
                if (result.isSuccess) {
                    // Refresh messages after sending
                    loadMessages(dialogId)
                }
                _state.value = _state.value.copy(isSending = false)
            } catch (e: Exception) {
                Log.e(TAG, "Error sending message", e)
                _state.value = _state.value.copy(
                    isSending = false,
                    error = "Failed to send message"
                )
            }
        }
    }

    fun refreshMessages() {
        val dialogId = _state.value.currentDialogId ?: return
        viewModelScope.launch {
            loadMessages(dialogId)
        }
    }

    private fun startPolling(dialogId: String) {
        pollingActive = true
        viewModelScope.launch {
            while (pollingActive && _state.value.currentDialogId == dialogId) {
                delay(10_000) // Poll every 10 seconds
                if (pollingActive && _state.value.currentDialogId == dialogId) {
                    try {
                        val messages = repository.getMessages(dialogId)
                        _state.value = _state.value.copy(
                            messages = messages.sortedBy { it.timestamp }
                        )
                    } catch (e: Exception) {
                        // Silent fail on polling
                    }
                }
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    override fun onCleared() {
        super.onCleared()
        pollingActive = false
    }
}
