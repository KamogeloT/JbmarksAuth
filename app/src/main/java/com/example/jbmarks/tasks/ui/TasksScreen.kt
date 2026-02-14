package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.tasks.domain.TaskPriority
import com.example.jbmarks.tasks.domain.TaskStatus
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState

@Composable
fun TasksScreen(
    onTaskClick: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val viewModel: TasksViewModel = viewModel(
        factory = TasksViewModelFactory(context.applicationContext as android.app.Application)
    )
    val uiState by viewModel.uiState.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedStatus by viewModel.selectedStatus.collectAsState()
    val selectedPriority by viewModel.selectedPriority.collectAsState()
    
    val swipeRefreshState = rememberSwipeRefreshState(isRefreshing)
    
    // Automatically load tasks on first composition
    LaunchedEffect(Unit) {
        viewModel.loadTasks()
    }
    
    // Reload tasks when returning to this screen (lifecycle aware)
    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(lifecycleOwner) {
        viewModel.refreshTasks()
    }

    Scaffold() { padding ->
        SwipeRefresh(
            state = swipeRefreshState,
            onRefresh = { viewModel.refreshTasks() },
            modifier = Modifier.padding(padding)
        ) {
            when (val state = uiState) {
                is TasksUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }

                is TasksUiState.Success -> {
                    Column(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        // Search and Filter Section
                        SearchAndFilterSection(
                            searchQuery = searchQuery,
                            selectedStatus = selectedStatus,
                            selectedPriority = selectedPriority,
                            onSearchQueryChange = { viewModel.setSearchQuery(it) },
                            onStatusFilterChange = { viewModel.setStatusFilter(it) },
                            onPriorityFilterChange = { viewModel.setPriorityFilter(it) },
                            onClearFilters = { viewModel.clearFilters() }
                        )
                        
                        // Tasks List
                    if (state.tasks.isEmpty() && !isRefreshing) {
                            EmptyState()
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            contentPadding = PaddingValues(vertical = 8.dp)
                        ) {
                            items(state.tasks) { task ->
                                android.util.Log.d("TasksScreen", "Rendering task: id=${task.id}, title='${task.title}', description='${task.description}', responsibleName='${task.responsibleName}', createdByName='${task.createdByName}'")
                                TaskItem(
                                    task = task,
                                        onClick = { onTaskClick(task.id) },
                                        onStatusChange = { newStatus ->
                                            viewModel.changeTaskStatus(task.id, newStatus)
                                        }
                                )
                                }
                            }
                        }
                    }
                }

                is TasksUiState.Error -> {
                    ErrorState(errorMessage = state.message, onRetryClick = { viewModel.loadTasks() })
                }
            }
        }
    }
}

@Composable
fun EmptyState() {
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
            Text(
                text = "📋",
                style = MaterialTheme.typography.displayLarge
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "No Tasks Yet",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "When you have tasks assigned to you,\nthey will appear here.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun ErrorState(errorMessage: String, onRetryClick: () -> Unit) {
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
            Text(
                text = "An Error Occurred",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.SemiBold
            )
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = errorMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(16.dp)
                )
            }
            Button(
                onClick = onRetryClick,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.height(48.dp)
            ) {
                Text(
                    "Retry",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun TaskItem(
    task: Task,
    onClick: () -> Unit,
    onStatusChange: ((TaskStatus) -> Unit)? = null
) {
    var showStatusDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    val statusColor = when (task.status) {
        TaskStatus.COMPLETED -> MaterialTheme.colorScheme.tertiaryContainer
        TaskStatus.IN_PROGRESS -> MaterialTheme.colorScheme.primaryContainer
        TaskStatus.DEFERRED -> MaterialTheme.colorScheme.secondaryContainer
        else -> MaterialTheme.colorScheme.surfaceVariant
    }
    
    val statusText = when (task.status) {
        TaskStatus.COMPLETED -> "Completed"
        TaskStatus.IN_PROGRESS -> "In Progress"
        TaskStatus.DEFERRED -> "Deferred"
        TaskStatus.SUPPOSEDLY_COMPLETED -> "Awaiting Approval"
        else -> "New"
    }
    
    val priorityColor = when (task.priority) {
        TaskPriority.HIGH -> MaterialTheme.colorScheme.errorContainer
        TaskPriority.NORMAL -> MaterialTheme.colorScheme.primaryContainer
        TaskPriority.LOW -> MaterialTheme.colorScheme.surfaceVariant
    }
    
    // Status Color Bar on Left Edge
    Row(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Colored Status Bar
        Box(
            modifier = Modifier
                .width(6.dp)
                .heightIn(min = 100.dp)
                .background(
                    color = statusColor,
                    shape = RoundedCornerShape(
                        topStart = 20.dp,
                        bottomStart = 20.dp,
                        topEnd = 0.dp,
                        bottomEnd = 0.dp
                    )
                )
        )
    
    Card(
        modifier = Modifier
                .weight(1f)
                .padding(horizontal = 4.dp, vertical = 6.dp),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 4.dp,
            pressedElevation = 8.dp
        ),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(20.dp)
        ) {
            // Top Row: Status Badge and Menu
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                AssistChip(
                    onClick = { /* Status is informational */ },
                    label = { 
                        Text(
                            text = statusText,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold
                        ) 
                    },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = statusColor,
                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                
                // Menu Button for Status Change
                if (onStatusChange != null) {
                    Box {
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "More options",
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Change Status") },
                                onClick = {
                                    showMenu = false
                                    showStatusDialog = true
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Info, contentDescription = null)
                                }
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Main Content Row: Status Icon + Title/Description
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Status Indicator Circle with Icon
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            color = statusColor,
                            shape = RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when (task.status) {
                            TaskStatus.COMPLETED -> Icons.Default.CheckCircle
                            TaskStatus.IN_PROGRESS -> Icons.Default.PlayArrow
                            TaskStatus.DEFERRED -> Icons.Default.DateRange
                            TaskStatus.NEW -> Icons.Default.Star
                            TaskStatus.SUPPOSEDLY_COMPLETED -> Icons.Default.CheckCircle
                        },
                        contentDescription = "Status",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Title and Description Column
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    // Title - Always show, even if empty
                    Text(
                        text = task.title.ifEmpty { "No Title" },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        minLines = 1
                    )
                
                    // Description - Always show
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = task.description.ifEmpty { "No description" },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        minLines = 1
                    )
                
                    Spacer(modifier = Modifier.height(8.dp))
                
                    // Assigned To
                    if (task.responsibleName != null || task.responsibleId != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "Assigned to",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Assigned to: ${task.responsibleName ?: "User ${task.responsibleId}"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                
                    // Created By
                    if (task.createdByName != null || task.createdBy != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Created by",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Created by: ${task.createdByName ?: "User ${task.createdBy}"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Priority, Deadline Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Priority Badge
                AssistChip(
                    onClick = { /* Priority is informational */ },
                    label = { Text(task.priority.displayName) },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = priorityColor,
                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                
                Spacer(modifier = Modifier.weight(1f))
                
                // Deadline
                if (task.deadline != null) {
                    val formattedDeadline = task.getFormattedDeadline() ?: task.deadline
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.DateRange,
                            contentDescription = "Deadline",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = formattedDeadline,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
            
            // Comments count if available
            if (task.commentsCount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = "Comments",
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${task.commentsCount} comment${if (task.commentsCount != 1) "s" else ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (task.newCommentsCount > 0) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Badge {
                            Text("${task.newCommentsCount} new")
                        }
                    }
                }
            }
        }
    }
    }
    
    // Status Change Dialog
    if (showStatusDialog && onStatusChange != null) {
        StatusChangeDialog(
            currentStatus = task.status,
            onStatusSelected = { newStatus ->
                onStatusChange(newStatus)
            },
            onDismiss = { showStatusDialog = false }
        )
    }
}

@Composable
fun SearchAndFilterSection(
    searchQuery: String,
    selectedStatus: TaskStatus?,
    selectedPriority: TaskPriority?,
    onSearchQueryChange: (String) -> Unit,
    onStatusFilterChange: (TaskStatus?) -> Unit,
    onPriorityFilterChange: (TaskPriority?) -> Unit,
    onClearFilters: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search tasks...") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = "Search")
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchQueryChange("") }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear")
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
            )
        )
        
        // Filter Chips Row - Horizontal Scrollable
        Column(
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Status Filters
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Status:",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(end = 4.dp)
                )
                listOf(
                    TaskStatus.NEW,
                    TaskStatus.IN_PROGRESS,
                    TaskStatus.COMPLETED
                ).forEach { status ->
                    TaskFilterChip(
                        label = status.displayName,
                        selected = selectedStatus == status,
                        onClick = {
                            onStatusFilterChange(if (selectedStatus == status) null else status)
                        }
                    )
                }
            }
            
            // Priority Filters
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Priority:",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(end = 4.dp)
                )
                listOf(
                    TaskPriority.LOW,
                    TaskPriority.NORMAL,
                    TaskPriority.HIGH
                ).forEach { priority ->
                    TaskFilterChip(
                        label = priority.displayName,
                        selected = selectedPriority == priority,
                        onClick = {
                            onPriorityFilterChange(if (selectedPriority == priority) null else priority)
                        }
                    )
                }
            }
            
            // Clear Filters Button
            if (selectedStatus != null || selectedPriority != null || searchQuery.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onClearFilters) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Clear filters",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Clear Filters")
                    }
                }
            }
        }
    }
}

@Composable
fun TaskFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    FilterChip(
        onClick = onClick,
        label = { Text(label) },
        selected = selected,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
        )
    )
}
