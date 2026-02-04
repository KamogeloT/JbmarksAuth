package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.tasks.domain.TaskPriority
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskFormScreen(
    taskId: String? = null, // null for create, non-null for edit
    onNavigateBack: () -> Unit
) {
    // Prevent task creation - only allow editing existing tasks
    LaunchedEffect(taskId) {
        if (taskId == null) {
            // Navigate back if trying to create a task
            onNavigateBack()
        }
    }
    
    if (taskId == null) {
        // Show nothing while navigating back
        return
    }
    
    val isEditMode = true // Always in edit mode now
    val viewModel: TaskFormViewModel = viewModel(
        factory = TaskFormViewModelFactory(taskId)
    )
    val uiState by viewModel.uiState.collectAsState()

    // Load task for editing
    LaunchedEffect(taskId) {
        viewModel.loadTask(taskId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Task") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
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
                is TaskFormUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                is TaskFormUiState.Editing -> {
                    TaskForm(
                        title = state.title,
                        description = state.description,
                        deadline = state.deadline,
                        priority = state.priority,
                        onTitleChange = { viewModel.updateTitle(it) },
                        onDescriptionChange = { viewModel.updateDescription(it) },
                        onDeadlineChange = { viewModel.updateDeadline(it) },
                        onPriorityChange = { viewModel.updatePriority(it) },
                        onSaveClick = {
                            viewModel.updateTask(taskId!!, onNavigateBack)
                        },
                        isEditMode = isEditMode,
                        isSaving = state.isSaving,
                        error = state.error
                    )
                }

                is TaskFormUiState.Saved -> {
                    LaunchedEffect(Unit) {
                        onNavigateBack()
                    }
                }
            }
        }
    }
}

@Composable
fun TaskForm(
    title: String,
    description: String,
    deadline: String?,
    priority: TaskPriority,
    onTitleChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onDeadlineChange: (String?) -> Unit,
    onPriorityChange: (TaskPriority) -> Unit,
    onSaveClick: () -> Unit,
    isEditMode: Boolean,
    isSaving: Boolean,
    error: String?
) {
    val scrollState = rememberScrollState()
    var showPriorityMenu by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Error message
        if (error != null) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = error,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
        }

        // Title Field
        OutlinedTextField(
            value = title,
            onValueChange = onTitleChange,
            label = { Text("Title *") },
            placeholder = { Text("Enter task title") },
            leadingIcon = {
                Icon(Icons.Default.Create, contentDescription = null)
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isSaving,
            singleLine = true,
            isError = title.isBlank()
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Description Field
        OutlinedTextField(
            value = description,
            onValueChange = onDescriptionChange,
            label = { Text("Description") },
            placeholder = { Text("Enter task description") },
            leadingIcon = {
                Icon(Icons.Default.List, contentDescription = null)
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp),
            enabled = !isSaving,
            maxLines = 6
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Priority Selector
        OutlinedCard(
            modifier = Modifier.fillMaxWidth(),
            onClick = { showPriorityMenu = true }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = when (priority) {
                            TaskPriority.HIGH -> MaterialTheme.colorScheme.error
                            TaskPriority.NORMAL -> MaterialTheme.colorScheme.primary
                            TaskPriority.LOW -> MaterialTheme.colorScheme.secondary
                        }
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Priority",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${priority.displayName} Priority",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                Icon(
                    imageVector = Icons.Default.ArrowDropDown,
                    contentDescription = null
                )
            }
        }

        // Priority Menu
        DropdownMenu(
            expanded = showPriorityMenu,
            onDismissRequest = { showPriorityMenu = false }
        ) {
            TaskPriority.values().forEach { priorityOption ->
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                tint = when (priorityOption) {
                                    TaskPriority.HIGH -> MaterialTheme.colorScheme.error
                                    TaskPriority.NORMAL -> MaterialTheme.colorScheme.primary
                                    TaskPriority.LOW -> MaterialTheme.colorScheme.secondary
                                },
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("${priorityOption.displayName} Priority")
                        }
                    },
                    onClick = {
                        onPriorityChange(priorityOption)
                        showPriorityMenu = false
                    },
                    leadingIcon = {
                        if (priority == priorityOption) {
                            Icon(Icons.Default.Check, contentDescription = null)
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Deadline Field
        OutlinedTextField(
            value = deadline ?: "",
            onValueChange = { onDeadlineChange(if (it.isBlank()) null else it) },
            label = { Text("Deadline (Optional)") },
            placeholder = { Text("YYYY-MM-DDTHH:MM:SS+00:00") },
            leadingIcon = {
                Icon(Icons.Default.DateRange, contentDescription = null)
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !isSaving,
            supportingText = {
                Text(
                    text = "Format: 2026-02-15T14:30:00+02:00",
                    style = MaterialTheme.typography.labelSmall
                )
            }
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Helper text
        Text(
            text = "* Required fields",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Save Button
        Button(
            onClick = onSaveClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            enabled = title.isNotBlank() && !isSaving,
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isSaving) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Saving...")
            } else {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Update Task",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}
