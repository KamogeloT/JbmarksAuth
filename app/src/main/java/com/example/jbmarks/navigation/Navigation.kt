package com.example.jbmarks.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.res.painterResource
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.draw.clip
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.draw.scale
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.example.jbmarks.user.data.User
import com.example.jbmarks.user.data.UserRepository
import kotlinx.coroutines.launch
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.jbmarks.calendar.ui.CalendarScreen
import com.example.jbmarks.chat.ui.ChatListScreen
import com.example.jbmarks.chat.ui.MessageScreen
import com.example.jbmarks.dashboard.ui.DashboardScreen
import com.example.jbmarks.notifications.data.NotificationRepository
import com.example.jbmarks.notifications.ui.NotificationsScreen
import com.example.jbmarks.tasks.ui.TaskDetailScreen
import com.example.jbmarks.tasks.ui.TaskFormScreen
import com.example.jbmarks.tasks.ui.TasksScreen
import com.example.jbmarks.utils.AssetLoader
import com.example.jbmarks.user.data.Workgroup

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val screens = listOf(
        Screen.Dashboard,
        Screen.Tasks,
        Screen.Chat,
        Screen.Calendar,
        Screen.Notifications
    )

    // Track unread notification count for badge
    val context = LocalContext.current
    val notificationRepo = remember { NotificationRepository(context) }
    val unreadCount by notificationRepo.unreadCount.collectAsState()

    Scaffold(
        topBar = {
            val context = LocalContext.current
            val userRepository = remember { UserRepository(context) }
            var user by remember { mutableStateOf<User?>(null) }
            var workgroups by remember { mutableStateOf<List<Workgroup>>(emptyList()) }
            var isLoadingUser by remember { mutableStateOf(true) }
            
            // Fetch user data — LaunchedEffect already provides a coroutine scope
            LaunchedEffect(Unit) {
                userRepository.getCurrentUser().onSuccess { fetchedUser ->
                    user = fetchedUser
                }
                userRepository.getUserWorkgroups().onSuccess { fetchedGroups ->
                    workgroups = fetchedGroups
                }
                isLoadingUser = false
            }
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .shadow(
                        elevation = 4.dp,
                        shape = RoundedCornerShape(0.dp),
                        spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                        ambientColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                    )
            ) {
                // Header content with logo and user info
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Logo on the left
                    val logoBitmap = remember {
                        AssetLoader.loadBitmap(context, "jbmarkslogo.jpg")
                            ?: AssetLoader.loadBitmap(context, "jbmarkslogo.png")
                    }
                    if (logoBitmap != null) {
                        Image(
                            bitmap = logoBitmap.asImageBitmap(),
                            contentDescription = "JBmarks Logo",
                            modifier = Modifier
                                .height(48.dp)
                                .width(160.dp),
                            contentScale = ContentScale.Fit
                        )
                    } else {
                        Text(
                            text = "JBmarks",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    
                    Spacer(modifier = Modifier.width(12.dp))
                    
                    // User info on the right
                    if (isLoadingUser) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else if (user != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // User avatar
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Person,
                                    contentDescription = "User",
                                    modifier = Modifier.size(24.dp),
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                            
                            // User details
                            Column(
                                modifier = Modifier.weight(1f),
                                horizontalAlignment = Alignment.End
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = user?.fullName ?: "",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )

                                    val workgroupsLabel = remember(workgroups) { buildWorkgroupsLabel(workgroups) }
                                    if (workgroupsLabel != null) {
                                        Text(
                                            text = workgroupsLabel,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                                
                                if (!user?.position.isNullOrEmpty()) {
                                    Text(
                                        text = user?.position ?: "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                    )
                                }
                                
                                if (!user?.email.isNullOrEmpty()) {
                                    Text(
                                        text = user?.email ?: "",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                        maxLines = 1,
                                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
                
                // Enhanced fading border separator at bottom
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.05f),
                                    MaterialTheme.colorScheme.surface.copy(alpha = 0f)
                                )
                            )
                        )
                )
            }
        },
        bottomBar = {
            Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(
                            elevation = 12.dp,
                            shape = RoundedCornerShape(
                                topStart = 20.dp,
                                topEnd = 20.dp
                            ),
                            spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        )
            ) {
                // Gradient top border
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.dp)
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                                )
                            )
                        )
                )
                
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                    modifier = Modifier
                        .background(
                            MaterialTheme.colorScheme.surface,
                            shape = RoundedCornerShape(
                                topStart = 24.dp,
                                topEnd = 24.dp
                            )
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    val navBackStackEntry by navController.currentBackStackEntryAsState()
                    val currentDestination = navBackStackEntry?.destination

                    screens.forEach { screen ->
                        val isSelected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                        
                        // Animated scale for selected icon
                        val iconScale by animateFloatAsState(
                            targetValue = if (isSelected) 1.15f else 1f,
                            animationSpec = tween(durationMillis = 300),
                            label = "iconScale"
                        )
                        
                        NavigationBarItem(
                            icon = {
                                if (screen == Screen.Notifications && unreadCount > 0) {
                                    BadgedBox(badge = {
                                        Badge { Text(if (unreadCount > 99) "99+" else unreadCount.toString()) }
                                    }) {
                                        Image(
                                            painter = painterResource(id = screen.iconResId),
                                            contentDescription = null,
                                            modifier = Modifier.size(64.dp)
                                        )
                                    }
                                } else {
                                    Image(
                                        painter = painterResource(id = screen.iconResId),
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp)
                                    )
                                }
                            },
                            label = { 
                                Text(
                                    text = screen.title,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = if (isSelected) {
                                        FontWeight.SemiBold
                                    } else {
                                        FontWeight.Normal
                                    },
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.padding(horizontal = 2.dp)
                                ) 
                            },
                            selected = isSelected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                            ),
                            modifier = Modifier.padding(horizontal = 2.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) { 
                DashboardScreen(
                    onNavigateTo = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            composable(Screen.Chat.route) {
                ChatListScreen(
                    onChatClick = { dialogId ->
                        navController.navigate("chat_message/$dialogId")
                    }
                )
            }
            
            composable(
                route = "chat_message/{dialogId}",
                arguments = listOf(navArgument("dialogId") { type = NavType.StringType })
            ) { backStackEntry ->
                val dialogId = backStackEntry.arguments?.getString("dialogId") ?: return@composable
                MessageScreen(
                    dialogId = dialogId,
                    chatName = "Chat", // TODO: Get actual chat name
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Tasks.route) { 
                TasksScreen(
                    onTaskClick = { taskId ->
                        navController.navigate("task_detail/$taskId")
                    }
                )
            }
            composable(Screen.Calendar.route) { CalendarScreen() }

            composable(Screen.Notifications.route) {
                NotificationsScreen(
                    onNotificationClick = { actionUrl ->
                        if (!actionUrl.isNullOrBlank()) {
                            navController.navigate(actionUrl) {
                                launchSingleTop = true
                            }
                        }
                    }
                )
            }

            // Task Detail Screen
            composable(
                route = "task_detail/{taskId}",
                arguments = listOf(
                    navArgument("taskId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getString("taskId") ?: return@composable
                TaskDetailScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() },
                    onEditTask = { taskId ->
                        navController.navigate("task_edit/$taskId")
                    }
                )
            }
            
            // Task Edit Screen
            composable(
                route = "task_edit/{taskId}",
                arguments = listOf(
                    navArgument("taskId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getString("taskId") ?: return@composable
                TaskFormScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}

private fun buildWorkgroupsLabel(workgroups: List<Workgroup>, maxVisible: Int = 2): String? {
    if (workgroups.isEmpty()) return null
    val visible = workgroups.take(maxVisible).map { it.name.trim() }.filter { it.isNotEmpty() }
    if (visible.isEmpty()) return null
    val remaining = workgroups.size - visible.size
    val base = visible.joinToString(", ")
    return if (remaining > 0) "$base +$remaining" else base
}