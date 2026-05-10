package com.example.jbmarks.tasks.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.TaskPriority
import com.example.jbmarks.tasks.domain.TaskStatus
import com.example.jbmarks.user.data.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale

sealed interface TasksUiState {
    object Loading : TasksUiState
    // The state now holds a list of the rich domain model
    data class Success(val tasks: List<Task>) : TasksUiState
    data class Error(val message: String) : TasksUiState
}

class TasksViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = TasksRepository(application.applicationContext)

    private val _uiState = MutableStateFlow<TasksUiState>(TasksUiState.Loading)
    val uiState: StateFlow<TasksUiState> = _uiState
    
    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing
    
    // Search and filter state
    private val _allTasks = MutableStateFlow<List<Task>>(emptyList())
    private val _searchQuery = MutableStateFlow("")
    private val _selectedStatus = MutableStateFlow<TaskStatus?>(null)
    private val _selectedPriority = MutableStateFlow<TaskPriority?>(null)
    
    val searchQuery: StateFlow<String> = _searchQuery
    val selectedStatus: StateFlow<TaskStatus?> = _selectedStatus
    val selectedPriority: StateFlow<TaskPriority?> = _selectedPriority

    private val _userWorkgroupIds = MutableStateFlow<Set<String>>(emptySet())
    private val _userWorkgroupNamesLower = MutableStateFlow<Set<String>>(emptySet())
    private val _membershipKnown = MutableStateFlow(false)
    private val _workgroupMembershipSignature = MutableStateFlow("")
    val workgroupMembershipSignature: StateFlow<String> = _workgroupMembershipSignature.asStateFlow()

    // Current user ID — used for "My Tasks" filter
    private val _currentUserId = MutableStateFlow<String?>(null)

    // My Tasks toggle — true = show only tasks assigned to me
    private val _showMyTasksOnly = MutableStateFlow(false)
    val showMyTasksOnly: StateFlow<Boolean> = _showMyTasksOnly.asStateFlow()

    init {
        loadTasks()
    }

    private fun updateWorkgroupMembershipSignature() {
        val ids = _userWorkgroupIds.value.sorted().joinToString(",")
        _workgroupMembershipSignature.value = "${_membershipKnown.value}|$ids"
    }

    /**
     * If workgroups could not be loaded, allow expand/collapse. "No Workgroup" is always interactive.
     */
    fun isUserMemberOfGroup(groupName: String, tasks: List<Task>): Boolean {
        if (!_membershipKnown.value) return true
        if (groupName == "No Workgroup") return true
        val ids = tasks.mapNotNull { it.groupId }.toSet()
        if (ids.any { it in _userWorkgroupIds.value }) return true
        val namesLower = _userWorkgroupNamesLower.value
        if (tasks.any { t ->
                val n = t.groupName?.trim()?.lowercase(Locale.getDefault())
                n != null && n in namesLower
            }
        ) return true
        val titleLower = groupName.trim().lowercase(Locale.getDefault())
        return titleLower in namesLower
    }

    private suspend fun refreshWorkgroupMembership() {
        val userRepo = UserRepository(getApplication())

        // Fetch current user ID for "My Tasks" filter
        userRepo.getCurrentUser().onSuccess { user ->
            _currentUserId.value = user.id
        }

        userRepo.getUserWorkgroups()
            .onSuccess { list ->
                _userWorkgroupIds.value = list.map { it.id }.toSet()
                _userWorkgroupNamesLower.value = list.map { it.name.trim().lowercase(Locale.getDefault()) }
                    .filter { it.isNotEmpty() }
                    .toSet()
                _membershipKnown.value = true
            }
            .onFailure {
                _userWorkgroupIds.value = emptySet()
                _userWorkgroupNamesLower.value = emptySet()
                _membershipKnown.value = false
            }
        updateWorkgroupMembershipSignature()
    }

    private fun applyFilters() {
        val currentState = _uiState.value
        if (currentState is TasksUiState.Success || currentState is TasksUiState.Loading) {
            val myUserId = _currentUserId.value
            val filtered = _allTasks.value.filter { task ->
                // "My Tasks" toggle — only show tasks assigned to the current user
                val matchesOwnership = if (_showMyTasksOnly.value && myUserId != null) {
                    task.responsibleId == myUserId
                } else {
                    true
                }

                // Search filter
                val matchesSearch = _searchQuery.value.isBlank() ||
                    task.title.contains(_searchQuery.value, ignoreCase = true) ||
                    task.description.contains(_searchQuery.value, ignoreCase = true)

                // Status filter
                val matchesStatus = _selectedStatus.value == null || task.status == _selectedStatus.value

                // Priority filter
                val matchesPriority = _selectedPriority.value == null || task.priority == _selectedPriority.value

                matchesOwnership && matchesSearch && matchesStatus && matchesPriority
            }
            _uiState.value = TasksUiState.Success(filtered)
        }
    }

    fun toggleMyTasksOnly() {
        _showMyTasksOnly.value = !_showMyTasksOnly.value
        applyFilters()
    }

    fun loadTasks() {
        viewModelScope.launch {
            _uiState.value = TasksUiState.Loading
            try {
                val tasks = repository.getTasks()
                refreshWorkgroupMembership()
                _allTasks.value = tasks
                applyFilters()
            } catch (t: Throwable) {
                _uiState.value = TasksUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
    
    /**
     * Refresh tasks from portal (used for pull-to-refresh and screen resume)
     * Keeps current UI state while refreshing in background
     */
    fun refreshTasks() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                val tasks = repository.getTasks()
                refreshWorkgroupMembership()
                _allTasks.value = tasks
                applyFilters()
            } catch (t: Throwable) {
                // Keep current state on refresh error, just stop refreshing indicator
                android.util.Log.e("TasksViewModel", "Refresh failed", t)
            } finally {
                _isRefreshing.value = false
            }
        }
    }
    
    fun setSearchQuery(query: String) {
        _searchQuery.value = query
        applyFilters()
    }
    
    fun setStatusFilter(status: TaskStatus?) {
        _selectedStatus.value = status
        applyFilters()
    }
    
    fun setPriorityFilter(priority: TaskPriority?) {
        _selectedPriority.value = priority
        applyFilters()
    }
    
    fun clearFilters() {
        _searchQuery.value = ""
        _selectedStatus.value = null
        _selectedPriority.value = null
        _showMyTasksOnly.value = false
        applyFilters()
    }
    
    /**
     * Change task status
     */
    fun changeTaskStatus(taskId: String, newStatus: TaskStatus) {
        viewModelScope.launch {
            val currentTask = (_uiState.value as? TasksUiState.Success)
                ?.tasks?.find { it.id == taskId }

            val result = when (newStatus) {
                TaskStatus.IN_PROGRESS -> {
                    // DEFERRED → IN_PROGRESS requires renew (→ NEW) then start (→ IN_PROGRESS)
                    if (currentTask?.status == TaskStatus.DEFERRED) {
                        val renewResult = repository.renewTask(taskId)
                        if (renewResult.isSuccess) {
                            repository.startTask(taskId)
                        } else {
                            renewResult // propagate the renew failure
                        }
                    } else {
                        repository.startTask(taskId)
                    }
                }
                TaskStatus.COMPLETED -> repository.completeTask(taskId)
                TaskStatus.DEFERRED -> Result.failure(Exception("Defer not supported"))
                TaskStatus.NEW -> repository.renewTask(taskId)
                TaskStatus.SUPPOSEDLY_COMPLETED -> repository.completeTask(taskId)
            }

            result.onSuccess {
                loadTasks()
            }.onFailure { throwable ->
                android.util.Log.e("TasksViewModel", "Failed to change task status", throwable)
            }
        }
    }
}

@Suppress("UNCHECKED_CAST")
class TasksViewModelFactory(
    private val application: Application
) : ViewModelProvider.Factory {
    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TasksViewModel::class.java)) {
            return TasksViewModel(application) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}