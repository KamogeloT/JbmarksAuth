package com.example.jbmarks.shared.domain.tasks

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
