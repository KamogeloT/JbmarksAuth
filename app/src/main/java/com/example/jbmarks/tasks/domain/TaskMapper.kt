package com.example.jbmarks.tasks.domain

import com.example.jbmarks.tasks.data.Task as DataTask

// This mapper converts the raw data task into our clean domain task.
fun mapDataToDomain(dataTask: DataTask): Task? {
    // Filter out tasks with invalid IDs - they can't be fetched or edited
    val taskId = dataTask.id
    if (taskId.isNullOrBlank() || taskId == "0") {
        return null // Return null for invalid tasks - they will be filtered out
    }
    
    // Safely convert the status string from the API into our enum.
    val status = TaskStatus.fromValue(dataTask.status)

    // Safely convert the priority string from the API into our enum.
    val priority = TaskPriority.fromValue(dataTask.priority)

    return Task(
        id = taskId,
        title = dataTask.title ?: "No Title",
        description = dataTask.description ?: "",
        status = status,
        priority = priority,
        deadline = dataTask.deadline,
        createdDate = null,
        closedDate = null,
        createdBy = dataTask.createdBy,
        createdByName = dataTask.creator?.name,
        responsibleId = dataTask.responsibleId,
        responsibleName = dataTask.responsible?.name,
        groupId = dataTask.groupId,
        groupName = dataTask.group?.name,
        commentsCount = dataTask.commentsCount?.toIntOrNull() ?: 0,
        newCommentsCount = dataTask.newCommentsCount ?: 0,
        tags = emptyList()
    )
}
