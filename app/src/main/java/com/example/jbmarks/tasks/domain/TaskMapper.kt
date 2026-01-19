package com.example.jbmarks.tasks.domain

import com.example.jbmarks.tasks.data.Task as DataTask

// This mapper converts the raw data task into our clean domain task.
fun mapDataToDomain(dataTask: DataTask): Task {
    // Safely convert the status string from the API into our enum.
    val status = when (dataTask.status) {
        "-1" -> TaskStatus.NEW // Bitrix24 uses -1 for new/pending in some contexts
        "-2" -> TaskStatus.PENDING
        "2" -> TaskStatus.PENDING
        "3" -> TaskStatus.IN_PROGRESS
        "4" -> TaskStatus.SUPPOSEDLY_COMPLETED
        "5" -> TaskStatus.COMPLETED
        "6" -> TaskStatus.DEFERRED
        else -> TaskStatus.PENDING // Default to pending if unknown
    }

    // Safely convert the priority string from the API into our enum.
    val priority = when (dataTask.priority) {
        "0" -> TaskPriority.LOW
        "1" -> TaskPriority.NORMAL
        "2" -> TaskPriority.HIGH
        else -> TaskPriority.NORMAL
    }

    return Task(
        id = dataTask.id ?: "0", // Use a safe default
        title = dataTask.title ?: "No Title",
        description = dataTask.description ?: "",
        responsibleId = dataTask.responsibleId ?: "",
        deadline = dataTask.deadline,
        status = status,
        priority = priority
    )
}
