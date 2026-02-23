package com.example.jbmarks.shared.domain.tasks

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
