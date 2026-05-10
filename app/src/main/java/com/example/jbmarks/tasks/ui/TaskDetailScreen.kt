package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import android.content.Intent
import android.net.Uri
import coil.compose.AsyncImage
import coil.request.ImageRequest
import coil.ImageLoader
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.jbmarks.tasks.ui.isImageFile
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.provider.MediaStore
import android.content.ContentValues
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import android.content.ContentUris
import android.database.Cursor
import android.provider.DocumentsContract
import android.os.Environment
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.TaskPriority
import com.example.jbmarks.tasks.domain.TaskStatus
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailScreen(
    taskId: String,
    onNavigateBack: () -> Unit,
    onEditTask: (String) -> Unit
) {
    val context = LocalContext.current
    val viewModel: TaskDetailViewModel = viewModel(
        factory = TaskDetailViewModelFactory(
            taskId,
            application = context.applicationContext as? android.app.Application
        )
    )
    val uiState by viewModel.uiState.collectAsState()

    // Automatically load task details
    LaunchedEffect(taskId) {
        viewModel.loadTask()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Task Details") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (uiState is TaskDetailUiState.Success) {
                        IconButton(onClick = { onEditTask(taskId) }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (val state = uiState) {
                is TaskDetailUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                is TaskDetailUiState.Success -> {
                    val context = LocalContext.current
                    val comments by viewModel.comments.collectAsState()
                    val isLoadingComments by viewModel.isLoadingComments.collectAsState()
                    val files by viewModel.files.collectAsState()
                    val isUploadingFile by viewModel.isUploadingFile.collectAsState()
                    val uploadError by viewModel.uploadError.collectAsState()
                    val timeEntries by viewModel.timeEntries.collectAsState()
                    val isLoadingTimeEntries by viewModel.isLoadingTimeEntries.collectAsState()
                    val isLoggingTime by viewModel.isLoggingTime.collectAsState()
                    val timeTrackingError by viewModel.timeTrackingError.collectAsState()
                    val snackbarHostState = remember { SnackbarHostState() }
                    val showDelegateSheet by viewModel.showDelegateSheet.collectAsState()

                    // Show snackbar when upload error occurs
                    LaunchedEffect(uploadError) {
                        if (!uploadError.isNullOrBlank()) {
                            snackbarHostState.showSnackbar(
                                message = uploadError!!,
                                duration = SnackbarDuration.Long
                            )
                            viewModel.clearUploadError()
                        }
                    }

                    // Show snackbar when time tracking error occurs
                    LaunchedEffect(timeTrackingError) {
                        if (!timeTrackingError.isNullOrBlank()) {
                            snackbarHostState.showSnackbar(
                                message = timeTrackingError!!,
                                duration = SnackbarDuration.Long
                            )
                            viewModel.clearTimeTrackingError()
                        }
                    }
                    
                    // State for image viewer dialog
                    var showImageDialog by remember { mutableStateOf<String?>(null) }
                    
                    // Camera launcher for taking photos
                    var photoUri by remember { mutableStateOf<Uri?>(null) }
                    // Pending photo state - shown as preview before posting
                    var pendingPhotoUri by remember { mutableStateOf<Uri?>(null) }
                    var pendingPhotoPath by remember { mutableStateOf<String?>(null) }
                    var pendingPhotoName by remember { mutableStateOf<String?>(null) }

                    val cameraLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.TakePicture()
                    ) { success ->
                        if (success && photoUri != null) {
                            // Photo taken — copy to cache and show preview, don't upload yet
                            photoUri?.let { uri ->
                                try {
                                    var fileName: String? = null
                                    if (uri.scheme == "content") {
                                        val cursor: android.database.Cursor? = context.contentResolver.query(uri, null, null, null, null)
                                        cursor?.use {
                                            if (it.moveToFirst()) {
                                                val nameIndex = it.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                                                if (nameIndex >= 0) fileName = it.getString(nameIndex)
                                            }
                                        }
                                    }
                                    if (fileName == null) fileName = "photo_${System.currentTimeMillis()}.jpg"

                                    val cacheDir = java.io.File(context.cacheDir, "uploads")
                                    cacheDir.mkdirs()
                                    val tempFile = java.io.File(cacheDir, fileName)
                                    context.contentResolver.openInputStream(uri)?.use { inputStream ->
                                        java.io.FileOutputStream(tempFile).use { outputStream ->
                                            inputStream.copyTo(outputStream)
                                        }
                                    }

                                    // Store for preview — upload happens when user taps Post
                                    pendingPhotoPath = tempFile.absolutePath
                                    pendingPhotoName = fileName
                                    pendingPhotoUri = Uri.fromFile(tempFile)
                                } catch (e: Exception) {
                                    android.util.Log.e("TaskDetailScreen", "Error handling photo", e)
                                    android.widget.Toast.makeText(context, "Error processing photo: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                    
                    // Create photo URI
                    val photoUriLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.RequestPermission()
                    ) { isGranted ->
                        if (isGranted) {
                            try {
                                // Create a file URI for the photo
                                val picturesDir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES)
                                    ?: context.filesDir
                                picturesDir.mkdirs()
                                val photoFile = java.io.File(picturesDir, "photo_${System.currentTimeMillis()}.jpg")
                                val uri = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                                    FileProvider.getUriForFile(
                                        context,
                                        "${context.packageName}.fileprovider",
                                        photoFile
                                    )
                                } else {
                                    Uri.fromFile(photoFile)
                                }
                                photoUri = uri
                                cameraLauncher.launch(uri)
                            } catch (e: Exception) {
                                android.util.Log.e("TaskDetailScreen", "Error creating photo file", e)
                                android.widget.Toast.makeText(
                                    context,
                                    "Error setting up camera: ${e.message}",
                                    android.widget.Toast.LENGTH_SHORT
                                ).show()
                            }
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Camera permission is required to take photos",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                    
                    // Camera launcher for file attachments (separate from comment camera)
                    var attachmentPhotoUri by remember { mutableStateOf<Uri?>(null) }
                    val attachmentCameraLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.TakePicture()
                    ) { success ->
                        if (success && attachmentPhotoUri != null) {
                            // Photo was taken successfully, upload and attach to task
                            attachmentPhotoUri?.let { uri ->
                                try {
                                    // Get file name from URI
                                    var fileName: String? = null
                                    if (uri.scheme == "content") {
                                        val cursor: android.database.Cursor? = context.contentResolver.query(uri, null, null, null, null)
                                        cursor?.use {
                                            if (it.moveToFirst()) {
                                                val nameIndex = it.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME)
                                                if (nameIndex >= 0) {
                                                    fileName = it.getString(nameIndex)
                                                }
                                            }
                                        }
                                    }
                                    if (fileName == null) {
                                        fileName = "photo_${System.currentTimeMillis()}.jpg"
                                    }
                                    
                                    // Copy file to app's cache directory
                                    val cacheDir = java.io.File(context.cacheDir, "uploads")
                                    cacheDir.mkdirs()
                                    val tempFile = java.io.File(cacheDir, fileName)
                                    
                                    context.contentResolver.openInputStream(uri)?.use { inputStream ->
                                        java.io.FileOutputStream(tempFile).use { outputStream ->
                                            inputStream.copyTo(outputStream)
                                        }
                                    }
                                    
                                    // Upload photo and attach to task (not comment).
                                    // Temp file cleanup is handled in the ViewModel after upload finishes.
                                    viewModel.uploadAndAttachFile(tempFile.absolutePath, fileName)
                                } catch (e: Exception) {
                                    android.util.Log.e("TaskDetailScreen", "Error handling attachment photo", e)
                                    android.widget.Toast.makeText(
                                        context,
                                        "Error processing photo: ${e.message}",
                                        android.widget.Toast.LENGTH_SHORT
                                    ).show()
                                }
                            }
                        }
                    }
                    
                    // Permission launcher for attachment camera
                    val attachmentPhotoUriLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.RequestPermission()
                    ) { isGranted ->
                        if (isGranted) {
                            try {
                                // Create a file URI for the photo
                                val picturesDir = context.getExternalFilesDir(android.os.Environment.DIRECTORY_PICTURES)
                                    ?: context.filesDir
                                picturesDir.mkdirs()
                                val photoFile = java.io.File(picturesDir, "attachment_photo_${System.currentTimeMillis()}.jpg")
                                val uri = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                                    FileProvider.getUriForFile(
                                        context,
                                        "${context.packageName}.fileprovider",
                                        photoFile
                                    )
                                } else {
                                    Uri.fromFile(photoFile)
                                }
                                attachmentPhotoUri = uri
                                attachmentCameraLauncher.launch(uri)
                            } catch (e: Exception) {
                                android.util.Log.e("TaskDetailScreen", "Error creating attachment photo file", e)
                                android.widget.Toast.makeText(
                                    context,
                                    "Error setting up camera: ${e.message}",
                                    android.widget.Toast.LENGTH_SHORT
                                ).show()
                            }
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Camera permission is required to take photos",
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                    
                    // File picker launcher
                    val filePickerLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.GetContent()
                    ) { uri: Uri? ->
                        uri?.let { selectedUri ->
                            try {
                                // Get file name from URI
                                var fileName: String? = null
                                if (selectedUri.scheme == "content") {
                                    val cursor: android.database.Cursor? = context.contentResolver.query(selectedUri, null, null, null, null)
                                    cursor?.use {
                                        if (it.moveToFirst()) {
                                            val nameIndex = it.getColumnIndex(android.provider.MediaStore.MediaColumns.DISPLAY_NAME)
                                            if (nameIndex >= 0) {
                                                fileName = it.getString(nameIndex)
                                            }
                                        }
                                    }
                                }
                                if (fileName == null) {
                                    fileName = selectedUri.path
                                    val cut = fileName?.lastIndexOf('/')
                                    if (cut != null && cut != -1) {
                                        fileName = fileName?.substring(cut + 1)
                                    }
                                }
                                val finalFileName = fileName ?: "file_${System.currentTimeMillis()}"
                                
                                // Copy file to app's cache directory
                                val cacheDir = java.io.File(context.cacheDir, "uploads")
                                cacheDir.mkdirs()
                                val tempFile = java.io.File(cacheDir, finalFileName)
                                
                                context.contentResolver.openInputStream(selectedUri)?.use { inputStream ->
                                    java.io.FileOutputStream(tempFile).use { outputStream ->
                                        inputStream.copyTo(outputStream)
                                    }
                                }
                                
                                // Upload the file.
                                // Temp file cleanup is handled in the ViewModel after upload finishes.
                                viewModel.uploadAndAttachFile(tempFile.absolutePath, finalFileName)
                            } catch (e: Exception) {
                                android.util.Log.e("TaskDetailScreen", "Error handling file selection", e)
                            }
                        }
                    }
                    
                    TaskDetailContent(
                        task = state.task,
                        comments = comments,
                        isLoadingComments = isLoadingComments,
                        files = files,
                        isUploadingFile = isUploadingFile,
                        timeEntries = timeEntries,
                        isLoadingTimeEntries = isLoadingTimeEntries,
                        isLoggingTime = isLoggingTime,
                        onLogTime = { hours, minutes, comment ->
                            viewModel.logTime(hours, minutes, comment)
                        },
                        onCompleteTask = { viewModel.completeTask() },
                        onStartTask = { viewModel.startTask() },
                        onRenewTask = { viewModel.renewTask() },
                        onDeleteTask = { viewModel.deleteTask(onNavigateBack) },
                        onResumeTask = { viewModel.resumeTask() },
                        onDelegateTask = { viewModel.showDelegateSheet() },
                        onAddComment = { text ->
                            val path = pendingPhotoPath
                            val name = pendingPhotoName
                            if (path != null && name != null) {
                                viewModel.uploadPhotoAndAddComment(path, name, caption = text)
                                pendingPhotoPath = null
                                pendingPhotoName = null
                                pendingPhotoUri = null
                            } else {
                                viewModel.addComment(text)
                            }
                        },
                        onTakePhoto = {
                            photoUriLauncher.launch(android.Manifest.permission.CAMERA)
                        },
                        onTakePhotoForAttachment = {
                            attachmentPhotoUriLauncher.launch(android.Manifest.permission.CAMERA)
                        },
                        onUploadFileClick = { filePickerLauncher.launch("*/*") },
                        pendingPhotoUri = pendingPhotoUri,
                        onClearPendingPhoto = {
                            pendingPhotoPath?.let { java.io.File(it).delete() }
                            pendingPhotoUri = null
                            pendingPhotoPath = null
                            pendingPhotoName = null
                        },
                        onFileClick = { file -> 
                            val isImage = isImageFile(file.type) || 
                                         file.name.endsWith(".jpg", ignoreCase = true) ||
                                         file.name.endsWith(".jpeg", ignoreCase = true) ||
                                         file.name.endsWith(".png", ignoreCase = true) ||
                                         file.name.endsWith(".gif", ignoreCase = true) ||
                                         file.name.endsWith(".webp", ignoreCase = true) ||
                                         file.name.endsWith(".bmp", ignoreCase = true)
                            
                            if (isImage && file.downloadUrl != null) {
                                showImageDialog = file.downloadUrl
                            } else {
                                file.downloadUrl?.let { url ->
                                    try {
                                        if (url.startsWith("http://") || url.startsWith("https://")) {
                                            if (url.contains("/rest/") && (url.contains(".json") || url.contains("?"))) {
                                                android.widget.Toast.makeText(context, "File download URL is not available. Please try again later.", android.widget.Toast.LENGTH_LONG).show()
                                            } else {
                                                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                                                context.startActivity(intent)
                                            }
                                        } else {
                                            android.widget.Toast.makeText(context, "Cannot open file: Invalid URL format", android.widget.Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: Exception) {
                                        android.widget.Toast.makeText(context, "Cannot open file: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        }
                    )
                    
                    // Show image viewer dialog if image URL is set
                    showImageDialog?.let { imageUrl ->
                        ImageViewerDialog(
                            imageUrl = imageUrl,
                            onDismiss = { showImageDialog = null }
                        )
                    }

                    // Show delegate sheet when requested
                    if (showDelegateSheet) {
                        DelegateTaskSheet(
                            task = state.task,
                            onDismiss = { viewModel.hideDelegateSheet() },
                            onDelegated = { updatedTask ->
                                viewModel.onTaskDelegated(updatedTask)
                            }
                        )
                    }

                    // Snackbar for upload errors
                    SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier.align(Alignment.BottomCenter)
                    )
                }

                is TaskDetailUiState.Error -> {
                    TaskDetailErrorState(
                        errorMessage = state.message,
                        onRetryClick = { viewModel.loadTask() }
                    )
                }

                is TaskDetailUiState.Deleted -> {
                    LaunchedEffect(Unit) {
                        onNavigateBack()
                    }
                }
            }
            
        }
    }
}

@Composable
fun TaskDetailContent(
    task: Task,
    comments: List<com.example.jbmarks.tasks.domain.Comment>,
    isLoadingComments: Boolean,
    files: List<com.example.jbmarks.tasks.domain.TaskFile>,
    isUploadingFile: Boolean,
    timeEntries: List<com.example.jbmarks.tasks.domain.ElapsedTimeEntry>,
    isLoadingTimeEntries: Boolean,
    isLoggingTime: Boolean,
    onLogTime: (hours: Int, minutes: Int, comment: String) -> Unit,
    onCompleteTask: () -> Unit,
    onStartTask: () -> Unit,
    onRenewTask: () -> Unit,
    onDeleteTask: () -> Unit,
    onDelegateTask: () -> Unit = {},
    onAddComment: (String) -> Unit,
    onUploadFileClick: () -> Unit,
    onFileClick: (com.example.jbmarks.tasks.domain.TaskFile) -> Unit,
    onTakePhoto: () -> Unit = {},
    onTakePhotoForAttachment: () -> Unit = {},
    onResumeTask: () -> Unit = {},
    pendingPhotoUri: android.net.Uri? = null,
    onClearPendingPhoto: () -> Unit = {}
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Header Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            ),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                // Status & Priority Badges
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    StatusChip(task.status)
                    PriorityChip(task.priority)
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Title
                Text(
                    text = task.title,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Description Card
        if (task.description.isNotEmpty()) {
            InfoCard(
                icon = Icons.Default.Info,
                title = "Description",
                content = task.description
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Deadline Card
        if (task.deadline != null) {
            DeadlineCard(task)
            Spacer(modifier = Modifier.height(12.dp))
        }

        // People Card
        PeopleCard(task)
        Spacer(modifier = Modifier.height(12.dp))

        // Group Card
        if (task.groupName != null) {
            InfoCard(
                icon = Icons.Default.Person,
                title = "Group/Project",
                content = task.groupName
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Metadata Card
        MetadataCard(task)
        Spacer(modifier = Modifier.height(16.dp))

        // Action Buttons
        ActionButtons(
            task = task,
            onCompleteTask = onCompleteTask,
            onStartTask = onStartTask,
            onRenewTask = onRenewTask,
            onResumeTask = onResumeTask,
            onDeleteTask = { showDeleteDialog = true },
            onDelegateTask = onDelegateTask
        )

        Spacer(modifier = Modifier.height(24.dp))
        
        HorizontalDivider()
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // File Attachments Section
        FileAttachmentSection(
            files = files,
            onUploadFile = onUploadFileClick,
            onFileClick = onFileClick,
            onTakePhoto = onTakePhotoForAttachment
        )
        
        if (isUploadingFile) {
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            Text(
                text = "Uploading file...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(8.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        HorizontalDivider()
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Time Tracking Section
        TimeTrackingSection(
            entries = timeEntries,
            isLoading = isLoadingTimeEntries,
            isLoggingTime = isLoggingTime,
            onLogTime = onLogTime
        )

        Spacer(modifier = Modifier.height(16.dp))
        
        HorizontalDivider()
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Comments Section
        CommentSection(
            comments = comments,
            isLoading = isLoadingComments,
            onAddComment = onAddComment,
            onTakePhoto = onTakePhoto,
            pendingPhotoUri = pendingPhotoUri,
            onClearPendingPhoto = onClearPendingPhoto,
            isUploading = isUploadingFile
        )
        
        Spacer(modifier = Modifier.height(16.dp))
    }

    // Delete Confirmation Dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            icon = { Icon(Icons.Default.Delete, contentDescription = null) },
            title = { Text("Delete Task?") },
            text = { Text("Are you sure you want to delete \"${task.title}\"? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteDialog = false
                        onDeleteTask()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun StatusChip(status: TaskStatus) {
    val (color, icon) = when (status) {
        TaskStatus.COMPLETED -> MaterialTheme.colorScheme.tertiary to Icons.Default.CheckCircle
        TaskStatus.IN_PROGRESS -> MaterialTheme.colorScheme.primary to Icons.Default.PlayArrow
        TaskStatus.DEFERRED -> MaterialTheme.colorScheme.secondary to Icons.Default.DateRange
        TaskStatus.SUPPOSEDLY_COMPLETED -> MaterialTheme.colorScheme.primary to Icons.Default.Done
        TaskStatus.NEW -> MaterialTheme.colorScheme.onSurfaceVariant to Icons.Default.Star
    }

    AssistChip(
        onClick = { },
        label = { Text(status.displayName) },
        leadingIcon = { Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp)) },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = color.copy(alpha = 0.2f),
            labelColor = color,
            leadingIconContentColor = color
        )
    )
}

@Composable
fun PriorityChip(priority: TaskPriority) {
    val color = when (priority) {
        TaskPriority.HIGH -> MaterialTheme.colorScheme.error
        TaskPriority.NORMAL -> MaterialTheme.colorScheme.primary
        TaskPriority.LOW -> MaterialTheme.colorScheme.secondary
    }

    AssistChip(
        onClick = { },
        label = { Text("${priority.displayName} Priority") },
        leadingIcon = { Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(18.dp)) },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = color.copy(alpha = 0.2f),
            labelColor = color,
            leadingIconContentColor = color
        )
    )
}

@Composable
fun InfoCard(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, content: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = content,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

@Composable
fun DeadlineCard(task: Task) {
    val isOverdue = task.isOverdue()
    val formattedDeadline = task.getFormattedDeadline() ?: task.deadline ?: "N/A"
    
    val daysUntil = try {
        val deadlineDate = OffsetDateTime.parse(task.deadline)
        val now = OffsetDateTime.now()
        ChronoUnit.DAYS.between(now.toLocalDate(), deadlineDate.toLocalDate())
    } catch (e: Exception) {
        null
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isOverdue) MaterialTheme.colorScheme.errorContainer
            else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = if (isOverdue) Icons.Default.Warning else Icons.Default.DateRange,
                contentDescription = null,
                tint = if (isOverdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = if (isOverdue) "Overdue!" else "Deadline",
                    style = MaterialTheme.typography.labelLarge,
                    color = if (isOverdue) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = formattedDeadline,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (daysUntil != null && !isOverdue) {
                    Text(
                        text = when {
                            daysUntil == 0L -> "Due today!"
                            daysUntil == 1L -> "Due tomorrow"
                            else -> "In $daysUntil days"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun PeopleCard(task: Task) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "People",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            
            if (task.createdByName != null) {
                PersonRow("Created by", task.createdByName)
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            if (task.responsibleName != null) {
                PersonRow("Assigned to", task.responsibleName)
            }
        }
    }
}

@Composable
fun PersonRow(label: String, name: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = name,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun MetadataCard(task: Task) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Additional Info",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            
            if (task.createdDate != null) {
                MetadataRow("Created", formatDate(task.createdDate))
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            if (task.closedDate != null) {
                MetadataRow("Closed", formatDate(task.closedDate))
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            MetadataRow("Comments", task.commentsCount.toString())
            
            if (task.newCommentsCount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                MetadataRow("New Comments", task.newCommentsCount.toString())
            }
        }
    }
}

@Composable
fun MetadataRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun ActionButtons(
    task: Task,
    onCompleteTask: () -> Unit,
    onStartTask: () -> Unit,
    onRenewTask: () -> Unit,
    onResumeTask: () -> Unit,
    onDeleteTask: () -> Unit,
    onDelegateTask: () -> Unit = {}
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Actions",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        when (task.status) {
            TaskStatus.NEW -> {
                Button(
                    onClick = onStartTask,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Start Task")
                }
            }

            TaskStatus.IN_PROGRESS -> {
                Button(
                    onClick = onCompleteTask,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.tertiary
                    )
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Complete Task")
                }
            }

            TaskStatus.COMPLETED, TaskStatus.SUPPOSEDLY_COMPLETED -> {
                OutlinedButton(
                    onClick = onRenewTask,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Reopen Task")
                }
            }

            TaskStatus.DEFERRED -> {
                Button(
                    onClick = onResumeTask,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Resume Task")
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Delegate button — only shown when task belongs to a workgroup
        if (!task.groupId.isNullOrBlank()) {
            OutlinedButton(
                onClick = onDelegateTask,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Person, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Delegate Task")
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        Spacer(modifier = Modifier.height(8.dp))
        Divider()
        Spacer(modifier = Modifier.height(8.dp))

        // Delete Button
        OutlinedButton(
            onClick = onDeleteTask,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(Icons.Default.Delete, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Delete Task")
        }
    }
}

@Composable
fun TaskDetailErrorState(errorMessage: String, onRetryClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = "Error",
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Text(
                text = "Failed to load task",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Button(onClick = onRetryClick) {
                Text("Retry")
            }
        }
    }
}

fun formatDate(dateString: String): String {
    return try {
        val inputFormat = DateTimeFormatter.ISO_OFFSET_DATE_TIME
        val outputFormat = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm")
        val date = OffsetDateTime.parse(dateString, inputFormat)
        date.format(outputFormat)
    } catch (e: Exception) {
        dateString
    }
}

@Composable
fun ImageViewerDialog(
    imageUrl: String,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.95f))
        ) {
            // Close button
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp)
            ) {
                Icon(
                    Icons.Default.ArrowBack,
                    contentDescription = "Close",
                    tint = Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }
            
            // Image with authenticated ImageLoader
            val context = LocalContext.current
            val imageLoader = remember {
                // Create OkHttpClient with AuthInterceptor for authenticated image requests
                val tokenManager = com.example.jbmarks.auth.data.TokenManager(context)
                val logging = okhttp3.logging.HttpLoggingInterceptor().apply {
                    level = okhttp3.logging.HttpLoggingInterceptor.Level.BASIC
                }
                val okHttpClient = okhttp3.OkHttpClient.Builder()
                    .addInterceptor(com.example.jbmarks.network.AuthInterceptor(context, tokenManager))
                    .addInterceptor(logging)
                    .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                
                coil.ImageLoader.Builder(context)
                    .okHttpClient(okHttpClient)
                    .build()
            }
            
            val imageRequest = remember(imageUrl) {
                ImageRequest.Builder(context)
                    .data(imageUrl)
                    .crossfade(true)
                    .build()
            }
            
            AsyncImage(
                model = imageRequest,
                imageLoader = imageLoader,
                contentDescription = "Full size image",
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentScale = ContentScale.Fit
            )
        }
    }
}
