package com.example.jbmarks.tasks.data

// The Bitrix24 API can return tasks as either an array or a map
// We'll handle both cases by using a custom deserializer or checking the actual response
// For now, let's try as an array first since the error suggests it's trying to parse as array
data class TasksListResponse(
    val result: ResultObject
)

data class ResultObject(
    val tasks: List<Task>? // Try as list first - API might return array format
)
