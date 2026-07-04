package com.example.jbmarks.tasks.domain

/**
 * Domain model for a task file attachment
 */
data class TaskFile(
    val id: String,
    val name: String,
    val size: Long,
    val type: String,
    val downloadUrl: String?
)
