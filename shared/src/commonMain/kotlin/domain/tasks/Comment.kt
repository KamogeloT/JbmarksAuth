package com.example.jbmarks.shared.domain.tasks

/**
 * Domain model for a task comment
 */
data class Comment(
    val id: String,
    val taskId: String,
    val authorId: String,
    val authorName: String?,
    val text: String,
    val createdDate: String,
    val files: List<CommentFile>
)

/**
 * Domain model for a comment file attachment
 */
data class CommentFile(
    val id: String,
    val name: String,
    val size: Long,
    val type: String,
    val downloadUrl: String?
)
