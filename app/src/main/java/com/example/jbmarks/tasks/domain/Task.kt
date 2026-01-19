package com.example.jbmarks.tasks.domain

// Using enums for status and priority, inspired by your file.
enum class TaskPriority {
    LOW, NORMAL, HIGH
}

enum class TaskStatus {
    NEW,
    PENDING,
    IN_PROGRESS,
    SUPPOSEDLY_COMPLETED,
    COMPLETED,
    DEFERRED
}

// This is our new, rich domain model for a Task.
data class Task(
    val id: String,
    val title: String,
    val description: String,
    val responsibleId: String,
    val deadline: String?,
    val status: TaskStatus,
    val priority: TaskPriority
)
