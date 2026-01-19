package com.example.jbmarks.tasks.data

// The Bitrix24 API returns a complex object for task lists.
// This structure is designed to capture the nested 'tasks' array within the 'result' object.
data class TasksListResponse(
    val result: ResultObject
)

data class ResultObject(
    val tasks: List<Task>
)
