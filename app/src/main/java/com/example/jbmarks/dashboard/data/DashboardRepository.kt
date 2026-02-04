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
    private val tasksRepository = TasksRepository()
    private val chatRepository = ChatRepository()
    private val calendarRepository = CalendarRepository()
    
    /**
     * Fetch all dashboard statistics
     */
    suspend fun getDashboardStats(): Result<DashboardStats> {
        return try {
            // Fetch user info
            val userName = userRepository.getCurrentUser().getOrNull()?.fullName ?: "User"
            
            // Fetch tasks
            val tasks = tasksRepository.getTasks()
            val activeTasks = tasks.count { it.status.name != "COMPLETED" }
            
            // Count completed today
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val completedToday = tasks.count { task ->
                task.status.name == "COMPLETED" && task.deadline?.startsWith(today) == true
            }
            
            // Fetch unread messages (from chat conversations)
            val chats = chatRepository.getRecentChats()
            val unreadMessages = chats.size // Simplified - Bitrix API doesn't provide unread count easily
            
            // Fetch upcoming events
            val events = calendarRepository.getCalendarEvents()
            val upcomingEvents = events.size
            
            Result.success(
                DashboardStats(
                    activeTasks = activeTasks,
                    completedToday = completedToday,
                    unreadMessages = unreadMessages,
                    upcomingEvents = upcomingEvents,
                    userName = userName
                )
            )
        } catch (e: Exception) {
            android.util.Log.e("DashboardRepository", "Failed to fetch dashboard stats", e)
            Result.failure(e)
        }
    }
}
