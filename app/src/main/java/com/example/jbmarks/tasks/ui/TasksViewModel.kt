package com.example.jbmarks.tasks.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.tasks.domain.Task
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface TasksUiState {
    object Loading : TasksUiState
    // The state now holds a list of the rich domain model
    data class Success(val tasks: List<Task>) : TasksUiState
    data class Error(val message: String) : TasksUiState
}

class TasksViewModel : ViewModel() {

    private val repository = TasksRepository()

    private val _uiState = MutableStateFlow<TasksUiState>(TasksUiState.Success(emptyList()))
    val uiState: StateFlow<TasksUiState> = _uiState

    fun loadTasks() {
        viewModelScope.launch {
            _uiState.value = TasksUiState.Loading
            try {
                val tasks = repository.getTasks()
                _uiState.value = TasksUiState.Success(tasks)
            } catch (t: Throwable) {
                _uiState.value = TasksUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
}

@Suppress("UNCHECKED_CAST")
class TasksViewModelFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TasksViewModel::class.java)) {
            return TasksViewModel() as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}