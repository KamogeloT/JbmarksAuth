package com.example.jbmarks.tasks.domain

/**
 * Domain model for a time tracking entry on a task.
 * Corresponds to Bitrix24 task.elapseditem.* API.
 */
data class ElapsedTimeEntry(
    val id: String,
    val taskId: String,
    val userId: String,
    val userName: String?,
    /** Total time logged in seconds */
    val seconds: Long,
    val comment: String?,
    val createdDate: String?
) {
    /** Human-readable duration, e.g. "1h 30m" */
    fun formattedDuration(): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        return when {
            hours > 0 && minutes > 0 -> "${hours}h ${minutes}m"
            hours > 0 -> "${hours}h"
            minutes > 0 -> "${minutes}m"
            else -> "${seconds}s"
        }
    }
}
