package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Complete Task Data Transfer Object from Bitrix24 API
 * Based on tasks.task.* API methods
 */
data class TaskDto(
    @SerializedName("id") val id: String?,
    @SerializedName("title") val title: String?,
    @SerializedName("description") val description: String?,
    @SerializedName("descriptionInBbcode") val descriptionInBbcode: String?,
    
    // People
    @SerializedName("createdBy") val createdBy: String?,
    @SerializedName("responsibleId") val responsibleId: String?,
    @SerializedName("accomplices") val accomplices: List<String>?,
    @SerializedName("auditors") val auditors: List<String>?,
    
    // Status & Priority
    @SerializedName("status") val status: String?,
    @SerializedName("priority") val priority: String?,
    @SerializedName("mark") val mark: String?,
    
    // Dates
    @SerializedName("createdDate") val createdDate: String?,
    @SerializedName("changedDate") val changedDate: String?,
    @SerializedName("closedDate") val closedDate: String?,
    @SerializedName("deadline") val deadline: String?,
    @SerializedName("startDatePlan") val startDatePlan: String?,
    @SerializedName("endDatePlan") val endDatePlan: String?,
    
    // Group & Project
    @SerializedName("groupId") val groupId: String?,
    @SerializedName("parentId") val parentId: String?,
    
    // Additional Info
    @SerializedName("timeEstimate") val timeEstimate: String?,
    @SerializedName("timeSpentInLogs") val timeSpentInLogs: String?,
    @SerializedName("commentsCount") val commentsCount: String?,
    @SerializedName("newCommentsCount") val newCommentsCount: Int?,
    @SerializedName("forumTopicId") val forumTopicId: String?,
    @SerializedName("tags") val tags: List<String>?,
    
    // Files - can be List or Map
    @SerializedName("ufTaskWebdavFiles") val files: Any?,
    @SerializedName("FILES") val filesUpper: Any?,
    @SerializedName("files") val filesLower: Any?,
    
    // Nested Objects
    @SerializedName("group") val group: TaskGroup?,
    @SerializedName("creator") val creator: TaskUser?,
    @SerializedName("responsible") val responsible: TaskUser?
)

data class TaskGroup(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("opened") val opened: Boolean?,
    @SerializedName("membersCount") val membersCount: Int?
)

data class TaskUser(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("link") val link: String?,
    @SerializedName("icon") val icon: String?,
    @SerializedName("workPosition") val workPosition: String?
)

/**
 * Request body for creating/updating tasks
 */
data class TaskCreateRequest(
    val fields: TaskFields
)

data class TaskFields(
    @SerializedName("TITLE") val title: String,
    @SerializedName("DESCRIPTION") val description: String?,
    @SerializedName("RESPONSIBLE_ID") val responsibleId: String?,
    @SerializedName("DEADLINE") val deadline: String?,
    @SerializedName("PRIORITY") val priority: String?,
    @SerializedName("GROUP_ID") val groupId: String?,
    @SerializedName("PARENT_ID") val parentId: String?,
    @SerializedName("TAGS") val tags: List<String>?,
    @SerializedName("UF_TASK_WEBDAV_FILES") val ufTaskWebdavFiles: List<String>? = null
)

/**
 * Response wrapper for task operations
 */
data class TaskResponse(
    @SerializedName("result") val result: TaskResult?,
    @SerializedName("time") val time: TimeInfo?
)

data class TaskResult(
    @SerializedName("task") val task: TaskDto?
)

data class TimeInfo(
    @SerializedName("start") val start: Double?,
    @SerializedName("finish") val finish: Double?,
    @SerializedName("duration") val duration: Double?
)
