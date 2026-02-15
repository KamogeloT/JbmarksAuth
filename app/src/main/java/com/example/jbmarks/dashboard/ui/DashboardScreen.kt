package com.example.jbmarks.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import android.app.Application
import com.example.jbmarks.activity_feed.domain.BlogPost
import com.example.jbmarks.dashboard.data.DashboardStats
import com.example.jbmarks.tasks.domain.Task
import com.example.jbmarks.user.ui.UserProfileHeader

@Composable
fun DashboardScreen(
    onNavigateTo: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val viewModel: DashboardViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return DashboardViewModel(context.applicationContext as Application) as T
            }
        }
    )
    val uiState by viewModel.uiState.collectAsState()
    
    // Refresh dashboard when screen is composed/resumed
    LaunchedEffect(Unit) {
        viewModel.loadDashboard()
    }
    
    // Also refresh when returning to this screen
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    LaunchedEffect(lifecycleOwner) {
        viewModel.loadDashboard()
    }
    
    when (val state = uiState) {
        is DashboardUiState.Loading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
        
        is DashboardUiState.Success -> {
            // Log the stats to verify they're being passed
            android.util.Log.d("DashboardScreen", "Displaying stats: activeTasks=${state.stats.activeTasks}, completedToday=${state.stats.completedToday}, unreadMessages=${state.stats.unreadMessages}, upcomingEvents=${state.stats.upcomingEvents}")
            
            DashboardContent(
                stats = state.stats,
                recentActivity = state.recentActivity,
                onRefresh = { viewModel.loadDashboard() },
                onNavigateTo = onNavigateTo
            )
        }
        
        is DashboardUiState.Error -> {
            ErrorState(
                message = state.message,
                onRetry = { viewModel.loadDashboard() }
            )
        }
    }
}

@Composable
fun DashboardContent(
    stats: DashboardStats,
    recentActivity: List<BlogPost>,
    onRefresh: () -> Unit,
    onNavigateTo: (String) -> Unit
) {
    LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(vertical = 16.dp)
        ) {
        // Stats Cards
        item {
            Text(
                text = "Overview",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                color = MaterialTheme.colorScheme.onBackground
            )
            StatsGrid(stats = stats, onNavigateTo = onNavigateTo)
            Spacer(modifier = Modifier.height(24.dp))
        }
        
        // Quick Actions
        item {
            Text(
                text = "Quick Actions",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                color = MaterialTheme.colorScheme.onBackground
            )
            QuickActionsRow(onNavigateTo = onNavigateTo)
            Spacer(modifier = Modifier.height(24.dp))
        }
        
        // Recent Activity
        item {
            Text(
                text = "Recent Activity",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                color = MaterialTheme.colorScheme.onBackground
            )
        }
        
        if (recentActivity.isEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Text(
                        text = "No recent activity",
                        modifier = Modifier.padding(32.dp),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            items(recentActivity) { post ->
                CompactBlogPostItem(post = post)
            }
        }
    }
}

@Composable
fun StatsGrid(stats: DashboardStats, onNavigateTo: (String) -> Unit) {
    android.util.Log.d("StatsGrid", "Rendering stats: activeTasks=${stats.activeTasks}, completedToday=${stats.completedToday}, unreadMessages=${stats.unreadMessages}, upcomingEvents=${stats.upcomingEvents}")
    android.util.Log.d("StatsGrid", "Recent active tasks count: ${stats.recentActiveTasks.size}, Recent completed tasks count: ${stats.recentCompletedTasks.size}")
    if (stats.recentActiveTasks.isNotEmpty()) {
        android.util.Log.d("StatsGrid", "First active task: id=${stats.recentActiveTasks[0].id}, title='${stats.recentActiveTasks[0].title}', description='${stats.recentActiveTasks[0].description}'")
    }
    if (stats.recentCompletedTasks.isNotEmpty()) {
        android.util.Log.d("StatsGrid", "First completed task: id=${stats.recentCompletedTasks[0].id}, title='${stats.recentCompletedTasks[0].title}', description='${stats.recentCompletedTasks[0].description}'")
    }
    
    Column(
        modifier = Modifier.padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            // Active Tasks Tile - Show task details if available
            if (stats.recentActiveTasks.isNotEmpty()) {
                TaskStatCard(
                    task = stats.recentActiveTasks[0],
                    count = stats.activeTasks,
                    title = "Active Tasks",
                    icon = Icons.Default.List,
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigateTo("tasks") }
                )
            } else {
                StatCard(
                    title = "Active Tasks",
                    value = stats.activeTasks.toString(),
                    icon = Icons.Default.List,
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigateTo("tasks") }
                )
            }
            
            // Completed Tasks Tile - Show task details if available
            if (stats.recentCompletedTasks.isNotEmpty()) {
                TaskStatCard(
                    task = stats.recentCompletedTasks[0],
                    count = stats.completedToday,
                    title = "Completed",
                    subtitle = "Today",
                    icon = Icons.Default.CheckCircle,
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigateTo("tasks") }
                )
            } else {
                StatCard(
                    title = "Completed",
                    value = stats.completedToday.toString(),
                    subtitle = "Today",
                    icon = Icons.Default.CheckCircle,
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.weight(1f),
                    onClick = { onNavigateTo("tasks") }
                )
            }
        }
        
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            StatCard(
                title = "Messages",
                value = stats.unreadMessages.toString(),
                icon = Icons.Default.Email,
                containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
                modifier = Modifier.weight(1f),
                onClick = { onNavigateTo("chat") }
            )
            StatCard(
                title = "Events",
                value = stats.upcomingEvents.toString(),
                subtitle = "Upcoming",
                icon = Icons.Default.DateRange,
                containerColor = MaterialTheme.colorScheme.errorContainer,
                contentColor = MaterialTheme.colorScheme.onErrorContainer,
                modifier = Modifier.weight(1f),
                onClick = { onNavigateTo("calendar") }
            )
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    containerColor: Color,
    contentColor: Color,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onClick: () -> Unit = {}
) {
    Card(
        modifier = modifier
            .height(140.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = containerColor
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Icon at top
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = contentColor,
                modifier = Modifier.size(36.dp)
            )
            
            // Value and title at bottom
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = contentColor,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = contentColor.copy(alpha = 0.9f),
                    modifier = Modifier.fillMaxWidth()
                )
                if (subtitle != null) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = contentColor.copy(alpha = 0.7f),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
fun QuickActionsRow(onNavigateTo: (String) -> Unit) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(horizontal = 20.dp)
    ) {
        item {
            QuickActionCard(
                title = "My Tasks",
                icon = Icons.Default.List,
                containerColor = MaterialTheme.colorScheme.primary,
                onClick = { onNavigateTo("tasks") }
            )
        }
        item {
            QuickActionCard(
                title = "Messages",
                icon = Icons.Default.Email,
                containerColor = MaterialTheme.colorScheme.secondary,
                onClick = { onNavigateTo("chat") }
            )
        }
        item {
            QuickActionCard(
                title = "Calendar",
                icon = Icons.Default.DateRange,
                containerColor = MaterialTheme.colorScheme.tertiary,
                onClick = { onNavigateTo("calendar") }
            )
        }
        item {
            QuickActionCard(
                title = "Activity",
                icon = Icons.Default.Home,
                containerColor = MaterialTheme.colorScheme.error,
                onClick = { onNavigateTo("activity_feed") }
            )
        }
    }
}

@Composable
fun QuickActionCard(
    title: String,
    icon: ImageVector,
    containerColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(140.dp)
            .height(100.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = containerColor
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onPrimary,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun CompactBlogPostItem(post: BlogPost) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = post.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = post.text,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }
        }
    }
}

@Composable
fun TaskStatCard(
    task: Task,
    count: Int,
    title: String,
    icon: ImageVector,
    containerColor: Color,
    contentColor: Color,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onClick: () -> Unit = {}
) {
    Card(
        modifier = modifier
            .height(140.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = containerColor
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Icon and count at top
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = contentColor,
                    modifier = Modifier.size(32.dp)
                )
                Text(
                    text = count.toString(),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = contentColor
                )
            }
            
            // Task details at bottom
            Column(modifier = Modifier.fillMaxWidth()) {
                // Always show task title
                Text(
                    text = task.title.ifEmpty { "No Title" },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = contentColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 1
                )
                // Always show description (or placeholder)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = task.description.ifEmpty { "No description" },
                    style = MaterialTheme.typography.bodySmall,
                    color = contentColor.copy(alpha = 0.8f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 1
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelSmall,
                    color = contentColor.copy(alpha = 0.7f),
                    modifier = Modifier.fillMaxWidth()
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = contentColor.copy(alpha = 0.6f),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

@Composable
fun ErrorState(message: String, onRetry: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.error
            )
            Text(
                text = "Something went wrong",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Button(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}

