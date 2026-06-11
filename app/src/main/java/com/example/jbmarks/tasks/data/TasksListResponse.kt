package com.example.jbmarks.tasks.data

// The Bitrix24 API can return tasks as either an array or a map
// We'll handle both cases by using a custom deserializer or checking the actual response
data class TasksListResponse(
    val result: ResultObject,
    val total: Int? = null,
    val next: Int? = null
)

data class ResultObject(
    val tasks: List<Task>? // Try as list first - API might return array format
)
