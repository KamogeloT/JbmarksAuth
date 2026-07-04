package com.example.jbmarks.navigation

sealed class Screen(val route: String, val title: String, val iconResId: Int) {
    object Dashboard : Screen("dashboard", "Home", com.example.jbmarks.R.drawable.home)
    object Tasks : Screen("tasks", "Tasks", com.example.jbmarks.R.drawable.tasks)
    object Chat : Screen("chat", "Chat", com.example.jbmarks.R.drawable.chats)
    object Calendar : Screen("calendar", "Calendar", com.example.jbmarks.R.drawable.calender)
    object Notifications : Screen("notifications", "Alerts", com.example.jbmarks.R.drawable.notifications)
}
