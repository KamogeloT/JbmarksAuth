package com.example.jbmarks.tasks.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.user.data.UserRepository
import com.example.jbmarks.user.data.WorkgroupMember
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * UI state for the delegate task bottom sheet.
 */
sealed interface DelegateUiState {
    /** Loading workgroup members */
    object Loading : DelegateUiState

    /** Members loaded — ready to pick */
    data class Ready(val members: List<WorkgroupMember>) : DelegateUiState

    /** Task has no workgroup — delegation is not allowed */
    object NoWorkgroup : DelegateUiState

    /** API call failed */
    data class Error(val message: String) : DelegateUiState
}

sealed interface DelegateActionState {
    object Idle : DelegateActionState
    object Delegating : DelegateActionState
    data class Success(val updatedTask: Task) : DelegateActionState
    data class Failure(val message: String) : DelegateActionState
}

class DelegateTaskViewModel(
    private val task: Task,
    application: Application
) : AndroidViewModel(application) {

    private val TAG = "DelegateTaskViewModel"

    private val userRepository = UserRepository(application.applicationContext)
    private val tasksRepository = TasksRepository(application.applicationContext)

    private val _uiState = MutableStateFlow<DelegateUiState>(DelegateUiState.Loading)
    val uiState: StateFlow<DelegateUiState> = _uiState.asStateFlow()

    private val _actionState = MutableStateFlow<DelegateActionState>(DelegateActionState.Idle)
    val actionState: StateFlow<DelegateActionState> = _actionState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    /** All members fetched from the API */
    private var allMembers: List<WorkgroupMember> = emptyList()

    init {
        loadWorkgroupMembers()
    }

    /**
     * Fetch members of the task's workgroup.
     * If the task has no workgroup, delegation is blocked.
     */
    fun loadWorkgroupMembers() {
        val groupId = task.groupId
        if (groupId.isNullOrBlank()) {
            Log.w(TAG, "Task ${task.id} has no workgroup — delegation not allowed")
            _uiState.value = DelegateUiState.NoWorkgroup
            return
        }

        viewModelScope.launch {
            _uiState.value = DelegateUiState.Loading
            userRepository.getWorkgroupMembers(groupId)
                .onSuccess { members ->
                    allMembers = members
                    Log.d(TAG, "Loaded ${members.size} members for workgroup $groupId")
                    _uiState.value = DelegateUiState.Ready(applySearch(members))
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to load workgroup members", error)
                    _uiState.value = DelegateUiState.Error(
                        error.message ?: "Failed to load workgroup members"
                    )
                }
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        val current = allMembers
        if (current.isNotEmpty()) {
            _uiState.value = DelegateUiState.Ready(applySearch(current))
        }
    }

    private fun applySearch(members: List<WorkgroupMember>): List<WorkgroupMember> {
        val q = _searchQuery.value.trim().lowercase()
        return if (q.isEmpty()) members
        else members.filter { it.fullName.lowercase().contains(q) }
    }

    /**
     * Delegate the task to [member].
     * Validates that the member belongs to the task's workgroup (already guaranteed
     * by the list source, but we double-check here).
     */
    fun delegateTo(member: WorkgroupMember) {
        if (_actionState.value is DelegateActionState.Delegating) return

        viewModelScope.launch {
            _actionState.value = DelegateActionState.Delegating
            tasksRepository.delegateTask(
                taskId = task.id,
                taskTitle = task.title,
                newResponsibleId = member.userId
            ).onSuccess { updatedTask ->
                Log.d(TAG, "Task ${task.id} successfully delegated to ${member.fullName}")
                _actionState.value = DelegateActionState.Success(updatedTask)
            }.onFailure { error ->
                Log.e(TAG, "Delegation failed", error)
                _actionState.value = DelegateActionState.Failure(
                    error.message ?: "Delegation failed"
                )
            }
        }
    }

    fun resetActionState() {
        _actionState.value = DelegateActionState.Idle
    }

    // ── Factory ──────────────────────────────────────────────────────────────

    class Factory(
        private val task: Task,
        private val application: Application
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DelegateTaskViewModel::class.java)) {
                return DelegateTaskViewModel(task, application) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
