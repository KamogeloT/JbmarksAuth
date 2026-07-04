package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Elapsed time entry data model
 * Bitrix24 API: task.elapseditem.*
 */
data class ElapsedTimeItem(
    @SerializedName("ID") val id: String?,
    @SerializedName("TASK_ID") val taskId: String?,
    @SerializedName("USER_ID") val userId: String?,
    @SerializedName("SECONDS") val seconds: String?, // Time in seconds
    @SerializedName("MINUTES") val minutes: String?, // Time in minutes (alternative)
    @SerializedName("COMMENT_TEXT") val comment: String?,
    @SerializedName("CREATED_DATE") val createdDate: String?
)

/**
 * Request to add elapsed time entry
 */
data class AddElapsedTimeRequest(
    @SerializedName("TASK_ID") val taskId: String,
    @SerializedName("SECONDS") val seconds: Int? = null,
    @SerializedName("MINUTES") val minutes: Int? = null,
    @SerializedName("COMMENT_TEXT") val comment: String? = null
)

/**
 * Request to update elapsed time entry
 */
data class UpdateElapsedTimeRequest(
    @SerializedName("ITEM_ID") val itemId: String,
    @SerializedName("SECONDS") val seconds: Int? = null,
    @SerializedName("MINUTES") val minutes: Int? = null,
    @SerializedName("COMMENT_TEXT") val comment: String? = null
)

/**
 * Response for elapsed time operations
 */
data class ElapsedTimeResponse(
    @SerializedName("result") val result: ElapsedTimeResult?
)

data class ElapsedTimeResult(
    @SerializedName("ID") val id: String?
)
