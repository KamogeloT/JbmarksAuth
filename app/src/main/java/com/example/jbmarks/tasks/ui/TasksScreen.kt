package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
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
import androidx.compose.material.icons.filled.Lock
import androidx.compose.runtime.mutableStateMapOf
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
    val showMyTasksOnly by viewModel.showMyTasksOnly.collectAsState()
    val workgroupMembershipKey by viewModel.workgroupMembershipSignature.collectAsState()
    
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
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Search and Filter Section
                        SearchAndFilterSection(
                            searchQuery = searchQuery,
                            selectedStatus = selectedStatus,
                            selectedPriority = selectedPriority,
                            showMyTasksOnly = showMyTasksOnly,
                            onSearchQueryChange = { viewModel.setSearchQuery(it) },
                            onStatusFilterChange = { viewModel.setStatusFilter(it) },
                            onPriorityFilterChange = { viewModel.setPriorityFilter(it) },
                            onToggleMyTasks = { viewModel.toggleMyTasksOnly() },
                            onClearFilters = { viewModel.clearFilters() }
                        )

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
                                items(state.tasks, key = { it.id }) { task ->
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
                    } // end Column
                } // end Success

                is TasksUiState.Error -> {
                    ErrorState(errorMessage = state.message, onRetryClick = { viewModel.loadTasks() })
                }
            }
        }
    }
}

@Composable
fun WorkgroupHeader(
    title: String,
    taskCount: Int,
    isExpanded: Boolean,
    canToggle: Boolean = true,
    restrictionMessage: String? = null,
    onToggle: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 4.dp)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = canToggle, onClick = onToggle),
            colors = CardDefaults.cardColors(
                containerColor = if (canToggle) {
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                } else {
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
                }
            ),
            shape = RoundedCornerShape(12.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "$title ($taskCount)",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = if (canToggle) {
                        if (isExpanded) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight
                    } else {
                        Icons.Default.Lock
                    },
                    contentDescription = if (canToggle) {
                        if (isExpanded) "Collapse group" else "Expand group"
                    } else {
                        "Section locked"
                    },
                    tint = if (canToggle) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.tertiary
                    }
                )
            }
        }
        if (!canToggle && restrictionMessage != null) {
            Text(
                text = restrictionMessage,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.padding(start = 8.dp, top = 4.dp, end = 8.dp)
            )
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
        TaskStatus.SUPPOSEDLY_COMPLETED -> MaterialTheme.colorScheme.primaryContainer
        TaskStatus.NEW -> MaterialTheme.colorScheme.surfaceVariant
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

    // Parse structured fields from the description.
    // Expected format (each on its own line, case-insensitive):
    //   Reported by: <name>
    //   Contact: <number>
    //   Location: <address>
    //   Specific issue: <issue text>
    fun parseField(label: String): String? {
        val pattern = Regex("(?i)^${Regex.escape(label)}\\s*:?\\s*(.+)")
        return task.description.lines()
            .firstNotNullOfOrNull { line -> pattern.find(line.trim())?.groupValues?.get(1)?.trim() }
            ?.takeIf { it.isNotEmpty() }
    }

    val reportedBy  = parseField("Reported by")
    val contact     = parseField("Contact")
    val location    = parseField("Location")
    val specificIssue = parseField("Specific issue")
    val assignedTo  = task.responsibleName ?: task.responsibleId?.let { "User $it" }

    Row(modifier = Modifier.fillMaxWidth()) {
        // Coloured left-edge status bar
        Box(
            modifier = Modifier
                .width(6.dp)
                .heightIn(min = 100.dp)
                .background(
                    color = statusColor,
                    shape = RoundedCornerShape(
                        topStart = 20.dp, bottomStart = 20.dp,
                        topEnd = 0.dp, bottomEnd = 0.dp
                    )
                )
        )

        Card(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 4.dp, vertical = 6.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp, pressedElevation = 8.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onClick)
                    .padding(16.dp)
            ) {
                // ── Top row: Ref # · Status chip · Menu ──────────────────
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Reference number — prominent, muted colour
                    Text(
                        text = "Ref #${task.id}",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        AssistChip(
                            onClick = {},
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
                                        onClick = { showMenu = false; showStatusDialog = true },
                                        leadingIcon = { Icon(Icons.Default.Info, null) }
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // ── Title ────────────────────────────────────────────────
                Text(
                    text = task.title.ifEmpty { "No Title" },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(10.dp))

                // ── Structured info rows ──────────────────────────────────
                if (reportedBy != null)    TaskInfoRow(Icons.Default.Person,  "Reported by",    reportedBy)
                if (contact != null)       TaskInfoRow(Icons.Default.Info,    "Contact",        contact)
                if (location != null)      TaskInfoRow(Icons.Default.Info,    "Location",       location)
                if (specificIssue != null) TaskInfoRow(Icons.Default.Warning, "Specific issue", specificIssue)
                if (assignedTo != null)    TaskInfoRow(Icons.Default.Person,  "Assigned to",    assignedTo)

                Spacer(modifier = Modifier.height(10.dp))

                // ── Bottom row: Priority · Deadline · Comments ───────────
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AssistChip(
                        onClick = {},
                        label = { Text(task.priority.displayName, style = MaterialTheme.typography.labelSmall) },
                        colors = AssistChipDefaults.assistChipColors(
                            containerColor = priorityColor,
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )

                    Spacer(modifier = Modifier.weight(1f))

                    if (task.deadline != null) {
                        val formattedDeadline = task.getFormattedDeadline() ?: task.deadline
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.DateRange,
                                contentDescription = "Deadline",
                                modifier = Modifier.size(14.dp),
                                tint = if (task.isOverdue()) MaterialTheme.colorScheme.error
                                       else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = formattedDeadline,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (task.isOverdue()) MaterialTheme.colorScheme.error
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = if (task.isOverdue()) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }

                    if (task.commentsCount > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Info,
                                contentDescription = "Comments",
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = "${task.commentsCount}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (task.newCommentsCount > 0) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Badge { Text("${task.newCommentsCount}") }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showStatusDialog && onStatusChange != null) {
        StatusChangeDialog(
            currentStatus = task.status,
            onStatusSelected = { newStatus -> onStatusChange(newStatus) },
            onDismiss = { showStatusDialog = false }
        )
    }
}

/** Compact single-line info row used inside a task tile. */
@Composable
private fun TaskInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(13.dp),
            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = "$label: ",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = value,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun SearchAndFilterSection(
    searchQuery: String,
    selectedStatus: TaskStatus?,
    selectedPriority: TaskPriority?,
    showMyTasksOnly: Boolean,
    onSearchQueryChange: (String) -> Unit,
    onStatusFilterChange: (TaskStatus?) -> Unit,
    onPriorityFilterChange: (TaskPriority?) -> Unit,
    onToggleMyTasks: () -> Unit,
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

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {

            // ── My Tasks / All Tasks toggle ──────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "View:",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                TaskFilterChip(label = "All", selected = !showMyTasksOnly, onClick = { if (showMyTasksOnly) onToggleMyTasks() })
                TaskFilterChip(label = "Mine", selected = showMyTasksOnly, onClick = { if (!showMyTasksOnly) onToggleMyTasks() })
            }

            // ── Clear Filters ────────────────────────────────────────────
            if (searchQuery.isNotEmpty() || showMyTasksOnly) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onClearFilters, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Clear filters", modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Clear", style = MaterialTheme.typography.labelSmall)
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
        label = {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1
            )
        },
        selected = selected,
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
            selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
        )
    )
}
