package com.example.jbmarks.shared.domain.tasks

import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * Rich domain model for a Task
 */
data class Task(
    val id: String,
    val title: String,
    val description: String,
    val status: TaskStatus,
    val priority: TaskPriority,
    val deadline: String?,
    val createdDate: String?,
    val closedDate: String?,
    
    // People
    val createdBy: String?,
    val createdByName: String?,
    val responsibleId: String?,
    val responsibleName: String?,
    
    // Group/Project
    val groupId: String?,
    val groupName: String?,
    
    // Metadata
    val commentsCount: Int,
    val newCommentsCount: Int,
    val tags: List<String>
) {
    /**
     * Format deadline for display
     */
    fun getFormattedDeadline(): String? {
        if (deadline == null) return null
        return try {
            val instant = Instant.parse(deadline)
            val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
            // Format: "MMM dd, yyyy HH:mm"
            "${localDateTime.month.name.take(3)} ${localDateTime.dayOfMonth}, ${localDateTime.year} ${localDateTime.hour}:${localDateTime.minute.toString().padStart(2, '0')}"
        } catch (e: Exception) {
            deadline
        }
    }
    
    /**
     * Check if task is overdue
     */
    fun isOverdue(): Boolean {
        if (deadline == null || status == TaskStatus.COMPLETED) return false
        return try {
            val deadlineInstant = Instant.parse(deadline)
            deadlineInstant < PlatformClock.now()
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Check if task is active (not completed or deferred)
     */
    fun isActive(): Boolean {
        return status != TaskStatus.COMPLETED && status != TaskStatus.DEFERRED
    }
}

// Platform-agnostic clock for getting current time
expect object PlatformClock {
    fun now(): Instant
}
