package com.example.jbmarks.tasks.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.notifications.data.NotificationRepository
import com.example.jbmarks.notifications.service.NotificationService
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.tasks.domain.Comment
import com.example.jbmarks.tasks.domain.ElapsedTimeEntry
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.TaskFile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import java.io.File

sealed interface TaskDetailUiState {
    object Loading : TaskDetailUiState
    data class Success(val task: Task) : TaskDetailUiState
    data class Error(val message: String) : TaskDetailUiState
    object Deleted : TaskDetailUiState
}

class TaskDetailViewModel(
    private val taskId: String,
    private val repository: TasksRepository,
    private val application: Application? = null
) : ViewModel() {
    
    private val notificationRepository = application?.let { NotificationRepository(it.applicationContext) }
    private val notificationService = application?.let { NotificationService(it.applicationContext) }

    private val _uiState = MutableStateFlow<TaskDetailUiState>(TaskDetailUiState.Loading)
    val uiState: StateFlow<TaskDetailUiState> = _uiState
    
    private val _comments = MutableStateFlow<List<Comment>>(emptyList())
    val comments: StateFlow<List<Comment>> = _comments
    
    private val _isLoadingComments = MutableStateFlow(false)
    val isLoadingComments: StateFlow<Boolean> = _isLoadingComments
    
    private val _files = MutableStateFlow<List<TaskFile>>(emptyList())
    val files: StateFlow<List<TaskFile>> = _files
    
    private val _isUploadingFile = MutableStateFlow(false)
    val isUploadingFile: StateFlow<Boolean> = _isUploadingFile

    private val _uploadError = MutableStateFlow<String?>(null)
    val uploadError: StateFlow<String?> = _uploadError

    // ── Time Tracking ────────────────────────────────────────────────────────
    private val _timeEntries = MutableStateFlow<List<ElapsedTimeEntry>>(emptyList())
    val timeEntries: StateFlow<List<ElapsedTimeEntry>> = _timeEntries

    private val _isLoadingTimeEntries = MutableStateFlow(false)
    val isLoadingTimeEntries: StateFlow<Boolean> = _isLoadingTimeEntries

    private val _isLoggingTime = MutableStateFlow(false)
    val isLoggingTime: StateFlow<Boolean> = _isLoggingTime

    private val _timeTrackingError = MutableStateFlow<String?>(null)
    val timeTrackingError: StateFlow<String?> = _timeTrackingError

    fun clearTimeTrackingError() { _timeTrackingError.value = null }

    fun clearUploadError() { _uploadError.value = null }

    fun loadTask() {
        viewModelScope.launch {
            _uiState.value = TaskDetailUiState.Loading
            repository.getTask(taskId)
                .onSuccess { task ->
                    _uiState.value = TaskDetailUiState.Success(task)
                    // Load comments and files when task is loaded
                    loadComments()
                    loadFiles()
                    loadTimeEntries()
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(
                        throwable.message ?: "Failed to load task"
                    )
                }
        }
    }
    
    fun loadComments() {
        viewModelScope.launch {
            _isLoadingComments.value = true
            repository.getTaskComments(taskId)
                .onSuccess { commentsList ->
                    _comments.value = commentsList
                    _isLoadingComments.value = false
                }
                .onFailure { throwable ->
                    _isLoadingComments.value = false
                    // Don't show error for comments, just log it
                    android.util.Log.e("TaskDetailViewModel", "Failed to load comments", throwable)
                }
        }
    }
    
    fun addComment(text: String, fileIds: List<String> = emptyList()) {
        // Input validation (match iOS)
        val trimmedText = text.trim()
        if (trimmedText.isEmpty()) {
            android.util.Log.w("TaskDetailViewModel", "Cannot add comment: text is empty")
            return
        }
        
        viewModelScope.launch {
            repository.addComment(taskId, trimmedText, fileIds)
                .onSuccess { comment ->
                    // Add new comment to list optimistically
                    _comments.value = _comments.value + comment
                    
                    // Wait a moment for Bitrix24 to process the comment, then reload to get full details
                    delay(500) // 500ms delay to ensure Bitrix24 has processed the comment
                    loadComments()
                    
                    // Create notification for comment (if not from current user)
                    val currentState = _uiState.value
                    if (currentState is TaskDetailUiState.Success) {
                        notificationRepository?.let { repo ->
                            val notification = repo.createTaskCommentNotification(
                                taskId = taskId,
                                taskTitle = currentState.task.title,
                                commentAuthor = "You" // TODO: Get actual user name
                            )
                            repo.addNotification(notification)
                            notificationService?.showNotification(notification)
                        }
                    }
                }
                .onFailure { throwable ->
                    android.util.Log.e("TaskDetailViewModel", "Failed to add comment", throwable)
                }
        }
    }
    
    fun uploadPhotoAndAddComment(photoPath: String, fileName: String, caption: String = "") {
        viewModelScope.launch {
            _isUploadingFile.value = true
            try {
                repository.uploadFile(photoPath, fileName)
                    .onSuccess { uploadedFile ->
                        // Embed the file using Bitrix24 disk BBCode tag.
                        // Prepend caption if provided, otherwise just the tag.
                        val message = if (caption.isNotBlank()) {
                            "$caption\n[DISK FILE ID=${uploadedFile.id}]"
                        } else {
                            "[DISK FILE ID=${uploadedFile.id}]"
                        }
                        addComment(message)
                    }
                    .onFailure { throwable ->
                        android.util.Log.e("TaskDetailViewModel", "Failed to upload photo", throwable)
                    }
            } finally {
                _isUploadingFile.value = false
                runCatching { File(photoPath).delete() }
            }
        }
    }
    
    fun uploadAndAttachFile(filePath: String, fileName: String) {
        viewModelScope.launch {
            _isUploadingFile.value = true
            _uploadError.value = null
            try {
                repository.uploadFile(filePath, fileName)
                    .onSuccess { uploadedFile ->
                        // Show the file in the UI immediately (optimistic update)
                        _files.value = _files.value + uploadedFile

                        // Try to attach to task via API
                        repository.attachFileToTask(taskId, uploadedFile.id)
                            .onSuccess {
                                // Reload task to get the official file list from server
                                loadFiles()
                                val currentState = _uiState.value
                                if (currentState is TaskDetailUiState.Success) {
                                    notificationRepository?.let { repo ->
                                        val notification = repo.createFileAttachmentNotification(
                                            taskId = taskId,
                                            taskTitle = currentState.task.title,
                                            fileName = fileName
                                        )
                                        repo.addNotification(notification)
                                        notificationService?.showNotification(notification)
                                    }
                                }
                            }
                            .onFailure { throwable ->
                                android.util.Log.e("TaskDetailViewModel", "Failed to attach file to task: ${throwable.message}", throwable)
                                // File was uploaded to disk but couldn't be attached to task
                                // Keep it visible in UI (already added above) but show a warning
                                _uploadError.value = "Photo uploaded but could not be attached to task. You may not have permission to edit this task."
                            }
                    }
                    .onFailure { throwable ->
                        android.util.Log.e("TaskDetailViewModel", "Failed to upload file", throwable)
                        _uploadError.value = "Failed to upload photo: ${throwable.message}"
                    }
            } finally {
                _isUploadingFile.value = false
                runCatching { File(filePath).delete() }
            }
        }
    }
    
    fun loadFiles() {
        viewModelScope.launch {
            repository.getTaskFiles(taskId)
                .onSuccess { filesList ->
                    _files.value = filesList
                }
                .onFailure { throwable ->
                    android.util.Log.e("TaskDetailViewModel", "Failed to load files", throwable)
                }
        }
    }

    // ── Time Tracking ────────────────────────────────────────────────────────

    fun loadTimeEntries() {
        viewModelScope.launch {
            _isLoadingTimeEntries.value = true
            repository.getElapsedTimeEntries(taskId)
                .onSuccess { entries ->
                    _timeEntries.value = entries
                    _isLoadingTimeEntries.value = false
                }
                .onFailure { throwable ->
                    _isLoadingTimeEntries.value = false
                    android.util.Log.e("TaskDetailViewModel", "Failed to load time entries", throwable)
                }
        }
    }

    fun logTime(hours: Int, minutes: Int, comment: String) {
        if (hours == 0 && minutes == 0) {
            _timeTrackingError.value = "Please enter a time greater than zero"
            return
        }
        viewModelScope.launch {
            _isLoggingTime.value = true
            repository.addElapsedTime(taskId, hours, minutes, comment.takeIf { it.isNotBlank() })
                .onSuccess {
                    _isLoggingTime.value = false
                    // Reload entries to show the new one
                    loadTimeEntries()
                }
                .onFailure { throwable ->
                    _isLoggingTime.value = false
                    _timeTrackingError.value = throwable.message ?: "Failed to log time"
                    android.util.Log.e("TaskDetailViewModel", "Failed to log time", throwable)
                }
        }
    }

    fun completeTask() {
        viewModelScope.launch {
            repository.completeTask(taskId)
                .onSuccess { updatedTask ->
                    _uiState.value = TaskDetailUiState.Success(updatedTask)
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(
                        throwable.message ?: "Failed to complete task"
                    )
                }
        }
    }

    fun startTask() {
        viewModelScope.launch {
            repository.startTask(taskId)
                .onSuccess { updatedTask ->
                    _uiState.value = TaskDetailUiState.Success(updatedTask)
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(
                        throwable.message ?: "Failed to start task"
                    )
                }
        }
    }

    fun deferTask() {
        // Deferred feature removed
    }

    fun renewTask() {
        viewModelScope.launch {
            repository.renewTask(taskId)
                .onSuccess { updatedTask ->
                    _uiState.value = TaskDetailUiState.Success(updatedTask)
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(
                        throwable.message ?: "Failed to renew task"
                    )
                }
        }
    }

    // Resume = renew (DEFERRED → NEW) then start (NEW → IN_PROGRESS)
    fun resumeTask() {
        viewModelScope.launch {
            repository.renewTask(taskId)
                .onSuccess {
                    repository.startTask(taskId)
                        .onSuccess { updatedTask -> _uiState.value = TaskDetailUiState.Success(updatedTask) }
                        .onFailure { throwable -> _uiState.value = TaskDetailUiState.Error(throwable.message ?: "Failed to resume task") }
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(throwable.message ?: "Failed to resume task")
                }
        }
    }

    fun deleteTask(onSuccess: () -> Unit) {
        viewModelScope.launch {
            repository.deleteTask(taskId)
                .onSuccess {
                    _uiState.value = TaskDetailUiState.Deleted
                    onSuccess()
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(
                        throwable.message ?: "Failed to delete task"
                    )
                }
        }
    }
}

class TaskDetailViewModelFactory(
    private val taskId: String,
    private val application: Application? = null
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TaskDetailViewModel::class.java)) {
            val context = application?.applicationContext
            val repository = TasksRepository(context)
            return TaskDetailViewModel(taskId, repository, application) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
