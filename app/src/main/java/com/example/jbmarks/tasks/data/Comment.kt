package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Comment data model for task comments
 * Bitrix24 API returns lowercase field names
 */
data class Comment(
    @SerializedName("id") val id: String?,
    @SerializedName("taskId") val taskId: String?,
    @SerializedName("authorId") val authorId: String?,
    @SerializedName("postMessage") val text: String?,
    @SerializedName("createdDate") val createdDate: String?,
    @SerializedName("postDate") val postDate: String?,
    @SerializedName("files") val files: List<CommentFile>?
)

/**
 * Comment file attachment
 * Bitrix24 API returns lowercase field names
 */
data class CommentFile(
    @SerializedName("id") val id: String?,
    @SerializedName("name") val name: String?,
    @SerializedName("size") val size: String?,
    @SerializedName("type") val type: String?,
    @SerializedName("downloadUrl") val downloadUrl: String?,
    @SerializedName("url") val url: String?
)

/**
 * Request body for adding a comment
 * Updated to use task.commentitem.add (recommended) instead of deprecated tasks.task.comment.add
 */
data class AddCommentRequest(
    @SerializedName("TASK_ID") val taskId: String,
    @SerializedName("POST_MESSAGE") val text: String,
    @SerializedName("FILES") val files: List<String>? = null,
    @SerializedName("AUTHOR_ID") val authorId: String? = null // Optional, defaults to current user
)

/**
 * Response wrapper for comment operations
 */
data class CommentResponse(
    @SerializedName("result") val result: CommentResult?
)

data class CommentResult(
    @SerializedName("ID") val id: String?
)

/**
 * Response wrapper for comment list
 * Bitrix24 returns comments directly in result array
 */
data class CommentsListResponse(
    @SerializedName("result") val result: List<Comment>?
)

/**
 * Alternative: Direct list response (if API returns array directly)
 */
typealias CommentsResponse = List<Comment>
