package com.example.jbmarks.dashboard.data

import com.example.jbmarks.tasks.domain.Task

/**
 * Dashboard statistics data
 */
data class DashboardStats(
    val activeTasks: Int = 0,
    val completedToday: Int = 0,
    val unreadMessages: Int = 0,
    val upcomingEvents: Int = 0,
    val userName: String = "User",
    val recentActiveTasks: List<Task> = emptyList(),
    val recentCompletedTasks: List<Task> = emptyList()
)
