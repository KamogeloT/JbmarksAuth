package com.example.jbmarks.navigation

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.example.jbmarks.activity_feed.ui.ActivityFeedScreen
import com.example.jbmarks.calendar.ui.CalendarScreen
import com.example.jbmarks.chat.ui.ChatListScreen
import com.example.jbmarks.chat.ui.MessageScreen
import com.example.jbmarks.dashboard.ui.DashboardScreen
import com.example.jbmarks.notifications.ui.NotificationsScreen
import com.example.jbmarks.tasks.ui.TaskDetailScreen
import com.example.jbmarks.tasks.ui.TaskFormScreen
import com.example.jbmarks.tasks.ui.TasksScreen
import com.example.jbmarks.utils.AssetLoader

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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val context = LocalContext.current
                        val logoBitmap = remember {
                            AssetLoader.loadBitmap(context, "jbmarkslogo.jpg")
                                ?: AssetLoader.loadBitmap(context, "jbmarkslogo.png")
                        }
                        if (logoBitmap != null) {
                            Image(
                                bitmap = logoBitmap.asImageBitmap(),
                                contentDescription = "JBmarks Logo",
                                modifier = Modifier
                                    .height(32.dp)
                                    .width(120.dp),
                                contentScale = ContentScale.Fit
                            )
                        } else {
                            // Fallback to text if logo not found
                            Text(
                                text = "JBmarks",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                ),
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                screens.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = null) },
                        label = { 
                            Text(
                                text = screen.title,
                                style = MaterialTheme.typography.labelMedium
                            ) 
                        },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = androidx.compose.material3.NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
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
            composable(Screen.ActivityFeed.route) { ActivityFeedScreen() }
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
                        actionUrl?.let { url ->
                            // Handle deep link navigation
                            if (url.startsWith("task_detail/")) {
                                val taskId = url.removePrefix("task_detail/")
                                navController.navigate("task_detail/$taskId")
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