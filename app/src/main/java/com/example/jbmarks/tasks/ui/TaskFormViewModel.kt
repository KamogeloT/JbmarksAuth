package com.example.jbmarks.tasks.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.tasks.domain.TaskPriority
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface TaskFormUiState {
    object Loading : TaskFormUiState
    data class Editing(
        val title: String = "",
        val description: String = "",
        val deadline: String? = null,
        val priority: TaskPriority = TaskPriority.NORMAL,
        val isSaving: Boolean = false,
        val error: String? = null
    ) : TaskFormUiState
    object Saved : TaskFormUiState
}

class TaskFormViewModel(
    private val taskId: String?,
    private val repository: TasksRepository = TasksRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<TaskFormUiState>(
        if (taskId == null) {
            TaskFormUiState.Editing()
        } else {
            TaskFormUiState.Loading
        }
    )
    val uiState: StateFlow<TaskFormUiState> = _uiState

    fun loadTask(taskId: String) {
        viewModelScope.launch {
            _uiState.value = TaskFormUiState.Loading
            repository.getTask(taskId)
                .onSuccess { task ->
                    _uiState.value = TaskFormUiState.Editing(
                        title = task.title,
                        description = task.description,
                        deadline = task.deadline,
                        priority = task.priority
                    )
                }
                .onFailure { throwable ->
                    _uiState.value = TaskFormUiState.Editing(
                        error = throwable.message ?: "Failed to load task"
                    )
                }
        }
    }

    fun updateTitle(title: String) {
        val currentState = _uiState.value
        if (currentState is TaskFormUiState.Editing) {
            _uiState.value = currentState.copy(title = title, error = null)
        }
    }

    fun updateDescription(description: String) {
        val currentState = _uiState.value
        if (currentState is TaskFormUiState.Editing) {
            _uiState.value = currentState.copy(description = description, error = null)
        }
    }

    fun updateDeadline(deadline: String?) {
        val currentState = _uiState.value
        if (currentState is TaskFormUiState.Editing) {
            _uiState.value = currentState.copy(deadline = deadline, error = null)
        }
    }

    fun updatePriority(priority: TaskPriority) {
        val currentState = _uiState.value
        if (currentState is TaskFormUiState.Editing) {
            _uiState.value = currentState.copy(priority = priority, error = null)
        }
    }

    fun createTask(onSuccess: () -> Unit) {
        val currentState = _uiState.value
        if (currentState !is TaskFormUiState.Editing) return

        if (currentState.title.isBlank()) {
            _uiState.value = currentState.copy(error = "Title is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = currentState.copy(isSaving = true, error = null)
            
            repository.createTask(
                title = currentState.title,
                description = currentState.description.takeIf { it.isNotBlank() },
                deadline = currentState.deadline,
                priority = currentState.priority
            )
                .onSuccess {
                    android.util.Log.d("TaskFormViewModel", "Task created successfully, navigating back")
                    _uiState.value = TaskFormUiState.Saved
                    onSuccess()
                }
                .onFailure { throwable ->
                    _uiState.value = currentState.copy(
                        isSaving = false,
                        error = throwable.message ?: "Failed to create task"
                    )
                }
        }
    }

    fun updateTask(taskId: String, onSuccess: () -> Unit) {
        val currentState = _uiState.value
        if (currentState !is TaskFormUiState.Editing) return

        if (currentState.title.isBlank()) {
            _uiState.value = currentState.copy(error = "Title is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = currentState.copy(isSaving = true, error = null)
            
            repository.updateTask(
                taskId = taskId,
                title = currentState.title,
                description = currentState.description.takeIf { it.isNotBlank() },
                deadline = currentState.deadline,
                priority = currentState.priority
            )
                .onSuccess {
                    android.util.Log.d("TaskFormViewModel", "Task updated successfully, navigating back")
                    _uiState.value = TaskFormUiState.Saved
                    onSuccess()
                }
                .onFailure { throwable ->
                    _uiState.value = currentState.copy(
                        isSaving = false,
                        error = throwable.message ?: "Failed to update task"
                    )
                }
        }
    }
}

class TaskFormViewModelFactory(
    private val taskId: String?
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TaskFormViewModel::class.java)) {
            return TaskFormViewModel(taskId) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
