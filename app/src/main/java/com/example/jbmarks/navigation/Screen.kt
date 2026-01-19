package com.example.jbmarks.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object ActivityFeed : Screen("activity_feed", "Feed", Icons.Default.Home)
    object Chat : Screen("chat", "Chat", Icons.Default.Email)
    object Tasks : Screen("tasks", "Tasks", Icons.Default.List)
    object Calendar : Screen("calendar", "Calendar", Icons.Default.DateRange)
}
