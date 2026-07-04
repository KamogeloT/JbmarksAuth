package com.example.jbmarks.dashboard.data

import android.content.Context
import com.example.jbmarks.calendar.data.CalendarRepository
import com.example.jbmarks.chat.data.ChatRepository
import com.example.jbmarks.tasks.data.TasksRepository
import com.example.jbmarks.user.data.UserRepository
import java.text.SimpleDateFormat
import java.util.*

/**
 * Repository for dashboard data
 */
class DashboardRepository(context: Context) {
    
    private val userRepository = UserRepository(context)
    private val tasksRepository = TasksRepository(context)
    private val chatRepository = ChatRepository(context)
    private val calendarRepository = CalendarRepository()
    
    /**
     * Fetch all dashboard statistics
     */
    suspend fun getDashboardStats(): Result<DashboardStats> {
        return try {
            android.util.Log.d("DashboardRepository", "Starting to fetch dashboard stats...")
            
            // Fetch user info
            val userName = userRepository.getCurrentUser().getOrNull()?.fullName ?: "User"
            android.util.Log.d("DashboardRepository", "User: $userName")
            
            // Fetch tasks
            android.util.Log.d("DashboardRepository", "Fetching tasks...")
            val tasks = try {
                tasksRepository.getTasks()
            } catch (e: Exception) {
                android.util.Log.e("DashboardRepository", "Exception fetching tasks", e)
                e.printStackTrace()
                emptyList()
            }
            android.util.Log.d("DashboardRepository", "Fetched ${tasks.size} tasks")
            
            // Log task statuses for debugging
            tasks.forEach { task ->
                android.util.Log.d("DashboardRepository", "Task: ${task.id} - ${task.title} - Status: ${task.status}")
            }
            
            val activeTasks = tasks.count { it.status != com.example.jbmarks.tasks.domain.TaskStatus.COMPLETED }
            android.util.Log.d("DashboardRepository", "Active tasks: $activeTasks (out of ${tasks.size} total)")
            
            // Get recent active tasks (limit to 3 for display)
            val recentActiveTasks = tasks
                .filter { it.status != com.example.jbmarks.tasks.domain.TaskStatus.COMPLETED }
                .take(3)
            android.util.Log.d("DashboardRepository", "Recent active tasks: ${recentActiveTasks.size}, first task: ${recentActiveTasks.firstOrNull()?.title}")
            
            // Count completed tasks
            val completedToday = tasks.count { task ->
                task.status == com.example.jbmarks.tasks.domain.TaskStatus.COMPLETED
            }
            android.util.Log.d("DashboardRepository", "Completed tasks: $completedToday (out of ${tasks.size} total)")
            
            // Get recent completed tasks (limit to 3 for display)
            val recentCompletedTasks = tasks
                .filter { it.status == com.example.jbmarks.tasks.domain.TaskStatus.COMPLETED }
                .take(3)
            android.util.Log.d("DashboardRepository", "Recent completed tasks: ${recentCompletedTasks.size}, first task: ${recentCompletedTasks.firstOrNull()?.title}")
            
            // Fetch unread messages (from chat conversations)
            android.util.Log.d("DashboardRepository", "Fetching chats...")
            val chats = chatRepository.getRecentChats()
            android.util.Log.d("DashboardRepository", "Fetched ${chats.size} chats")
            
            // Count unread messages from all chats
            val unreadMessages = chats.sumOf { it.unreadCount }
            android.util.Log.d("DashboardRepository", "Unread messages: $unreadMessages")
            
            // Fetch upcoming events (don't fail if this fails)
            val upcomingEvents = try {
                android.util.Log.d("DashboardRepository", "Fetching events...")
                val events = calendarRepository.getCalendarEvents()
                val count = events.size
                android.util.Log.d("DashboardRepository", "Upcoming events: $count")
                count
            } catch (e: Exception) {
                android.util.Log.w("DashboardRepository", "Failed to fetch calendar events, using 0", e)
                0
            }
            
            val stats = DashboardStats(
                activeTasks = activeTasks,
                completedToday = completedToday,
                unreadMessages = unreadMessages,
                upcomingEvents = upcomingEvents,
                userName = userName,
                recentActiveTasks = recentActiveTasks,
                recentCompletedTasks = recentCompletedTasks
            )
            
            android.util.Log.d("DashboardRepository", "Final stats: activeTasks=${stats.activeTasks}, completedToday=${stats.completedToday}, unreadMessages=${stats.unreadMessages}, upcomingEvents=${stats.upcomingEvents}")
            
            Result.success(stats)
        } catch (e: Exception) {
            android.util.Log.e("DashboardRepository", "Failed to fetch dashboard stats", e)
            e.printStackTrace()
            Result.failure(e)
        }
    }
}
