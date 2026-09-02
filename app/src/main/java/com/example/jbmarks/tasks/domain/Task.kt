package com.example.jbmarks.tasks.domain

import java.text.SimpleDateFormat
import java.util.*

/**
 * Task Priority Levels
 */
enum class TaskPriority(val value: String, val displayName: String) {
    LOW("0", "Low"),
    NORMAL("1", "Normal"),
    HIGH("2", "High");
    
    companion object {
        fun fromValue(value: String?): TaskPriority {
            return when (value) {
                "0" -> LOW
                "2" -> HIGH
                else -> NORMAL
            }
        }
    }
}

/**
 * Task Status
 * Bitrix24 Status Values:
 * 2 = NEW/PENDING
 * 3 = IN_PROGRESS  
 * 4 = SUPPOSEDLY_COMPLETED (waiting for approval)
 * 5 = COMPLETED
 * 6 = DEFERRED
 */
enum class TaskStatus(val value: String, val displayName: String) {
    NEW("2", "New"),
    IN_PROGRESS("3", "In Progress"),
    SUPPOSEDLY_COMPLETED("4", "Awaiting Approval"),
    COMPLETED("5", "Completed"),
    DEFERRED("6", "Deferred");
    
    /**
     * A task counts as "completed" once the doer has marked it done — this is
     * true for both COMPLETED (5) and SUPPOSEDLY_COMPLETED (4, awaiting the
     * creator's approval). Such tasks belong under the Completed tile, not Open.
     */
    val isCompletedLike: Boolean
        get() = this == COMPLETED || this == SUPPOSEDLY_COMPLETED

    companion object {
        fun fromValue(value: String?): TaskStatus {
            return when (value) {
                "2" -> NEW
                "3" -> IN_PROGRESS
                "4" -> SUPPOSEDLY_COMPLETED
                "5" -> COMPLETED
                "6" -> DEFERRED
                else -> NEW
            }
        }
    }
}

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
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
            val outputFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
            val date = inputFormat.parse(deadline)
            date?.let { outputFormat.format(it) }
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
            val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
            val deadlineDate = format.parse(deadline)
            deadlineDate?.before(Date()) == true
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Check if task is active (not completed or deferred)
     */
    fun isActive(): Boolean {
        return !status.isCompletedLike && status != TaskStatus.DEFERRED
    }
}
