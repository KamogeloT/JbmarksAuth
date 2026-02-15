package com.example.jbmarks.tasks.data

import com.google.gson.annotations.SerializedName

/**
 * Comment data model for task comments
 * Bitrix24 API returns lowercase field names
 */
data class Comment(
    @SerializedName("id") val id: String?,
    @SerializedName("ID") val idUpper: String? = null,
    @SerializedName("taskId") val taskId: String?,
    @SerializedName("authorId") val authorId: String?,
    @SerializedName("AUTHOR_ID") val authorIdUpper: String? = null,
    @SerializedName("postMessage") val text: String?,
    @SerializedName("POST_MESSAGE") val textUpper: String? = null,
    @SerializedName("createdDate") val createdDate: String?,
    @SerializedName("postDate") val postDate: String?,
    @SerializedName("POST_DATE") val postDateUpper: String? = null,
    @SerializedName("files") val files: List<CommentFile>?,
    // Author information (may be nested object)
    @SerializedName("author") val author: CommentAuthor?,
    @SerializedName("AUTHOR") val authorUpper: CommentAuthor? = null
) {
    fun getAuthorIdValue(): String? {
        return authorId ?: authorIdUpper ?: author?.authorId ?: author?.authorIdUpper ?: authorUpper?.authorId ?: authorUpper?.authorIdUpper
    }
    
    fun getAuthorName(): String? {
        return author?.getAuthorDisplayName() ?: authorUpper?.getAuthorDisplayName()
    }
    
    fun getTextValue(): String? {
        return text ?: textUpper
    }
    
    fun getDateValue(): String? {
        return createdDate ?: postDate ?: postDateUpper
    }
    
    fun getIdValue(): String? {
        return id ?: idUpper
    }
}

/**
 * Author information in comment response
 */
data class CommentAuthor(
    @SerializedName("id") val authorId: String?,
    @SerializedName("name") val authorFirstName: String?,
    @SerializedName("lastName") val authorLastName: String?,
    @SerializedName("fullName") val authorFullName: String?,
    // Also support uppercase
    @SerializedName("ID") val authorIdUpper: String? = null,
    @SerializedName("NAME") val authorFirstNameUpper: String? = null,
    @SerializedName("LAST_NAME") val authorLastNameUpper: String? = null,
    @SerializedName("FULL_NAME") val authorFullNameUpper: String? = null
) {
    fun getAuthorDisplayName(): String? {
        return authorFullName ?: authorFullNameUpper ?: run {
            val first = authorFirstName ?: authorFirstNameUpper ?: ""
            val last = authorLastName ?: authorLastNameUpper ?: ""
            if (first.isNotEmpty() || last.isNotEmpty()) {
                "$first $last".trim()
            } else null
        }
    }
}

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
 * Bitrix24 expects arFields as an array containing the comment fields
 */
data class AddCommentRequest(
    @SerializedName("arFields") val arFields: List<CommentFields>
)

data class CommentFields(
    @SerializedName("TASK_ID") val taskId: Int, // Bitrix24 expects integer, not string
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
