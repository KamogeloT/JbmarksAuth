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
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.TaskFile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

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

    fun loadTask() {
        viewModelScope.launch {
            _uiState.value = TaskDetailUiState.Loading
            repository.getTask(taskId)
                .onSuccess { task ->
                    _uiState.value = TaskDetailUiState.Success(task)
                    // Load comments and files when task is loaded
                    loadComments()
                    loadFiles()
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
        viewModelScope.launch {
            repository.addComment(taskId, text, fileIds)
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
    
    fun uploadPhotoAndAddComment(photoPath: String, fileName: String) {
        viewModelScope.launch {
            _isUploadingFile.value = true
            repository.uploadFile(photoPath, fileName)
                .onSuccess { uploadedFile ->
                    // Add comment with the uploaded photo attached
                    addComment("📷 Photo attached", listOf(uploadedFile.id))
                    _isUploadingFile.value = false
                }
                .onFailure { throwable ->
                    _isUploadingFile.value = false
                    android.util.Log.e("TaskDetailViewModel", "Failed to upload photo", throwable)
                }
        }
    }
    
    fun uploadAndAttachFile(filePath: String, fileName: String) {
        viewModelScope.launch {
            _isUploadingFile.value = true
            repository.uploadFile(filePath, fileName)
                .onSuccess { uploadedFile ->
                    // Attach the uploaded file to the task
                    repository.attachFileToTask(taskId, uploadedFile.id)
                        .onSuccess {
                            // Reload task to get updated file list
                            loadTask()
                            _isUploadingFile.value = false
                            
                            // Create notification for file attachment
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
                            _isUploadingFile.value = false
                            android.util.Log.e("TaskDetailViewModel", "Failed to attach file", throwable)
                        }
                }
                .onFailure { throwable ->
                    _isUploadingFile.value = false
                    android.util.Log.e("TaskDetailViewModel", "Failed to upload file", throwable)
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
        viewModelScope.launch {
            repository.deferTask(taskId)
                .onSuccess { updatedTask ->
                    _uiState.value = TaskDetailUiState.Success(updatedTask)
                }
                .onFailure { throwable ->
                    _uiState.value = TaskDetailUiState.Error(
                        throwable.message ?: "Failed to defer task"
                    )
                }
        }
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
