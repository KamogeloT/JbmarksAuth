package com.example.jbmarks.navigation

sealed class Screen(val route: String, val title: String, val iconResId: Int) {
    object Dashboard : Screen("dashboard", "Home", com.example.jbmarks.R.drawable.home)
    object ActivityFeed : Screen("activity_feed", "Feed", com.example.jbmarks.R.drawable.home) // Using home as fallback
    object Chat : Screen("chat", "Chat", com.example.jbmarks.R.drawable.chats)
    object Tasks : Screen("tasks", "Tasks", com.example.jbmarks.R.drawable.tasks)
    object Calendar : Screen("calendar", "Calendar", com.example.jbmarks.R.drawable.calender)
    object Feed : Screen("feed", "Feed", com.example.jbmarks.R.drawable.home) // Using home as fallback
}
