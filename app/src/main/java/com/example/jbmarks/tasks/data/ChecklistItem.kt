package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Checklist item data model
 * Bitrix24 API: task.checklistitem.*
 */
data class ChecklistItem(
    @SerializedName("ID") val id: String?,
    @SerializedName("TASK_ID") val taskId: String?,
    @SerializedName("TITLE") val title: String?,
    @SerializedName("IS_COMPLETE") val isComplete: String?, // "Y" or "N"
    @SerializedName("SORT_INDEX") val sortIndex: String?,
    @SerializedName("PARENT_ID") val parentId: String?
)

/**
 * Request to add a checklist item
 */
data class AddChecklistItemRequest(
    @SerializedName("TASK_ID") val taskId: String,
    @SerializedName("TITLE") val title: String,
    @SerializedName("PARENT_ID") val parentId: String? = null,
    @SerializedName("SORT_INDEX") val sortIndex: Int? = null
)

/**
 * Request to update a checklist item
 */
data class UpdateChecklistItemRequest(
    @SerializedName("ITEM_ID") val itemId: String,
    @SerializedName("TITLE") val title: String? = null,
    @SerializedName("IS_COMPLETE") val isComplete: String? = null // "Y" or "N"
)

/**
 * Response for checklist item operations
 */
data class ChecklistItemResponse(
    @SerializedName("result") val result: ChecklistItemResult?
)

data class ChecklistItemResult(
    @SerializedName("ID") val id: String?
)
