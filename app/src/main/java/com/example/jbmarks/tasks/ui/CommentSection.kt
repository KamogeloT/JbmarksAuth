package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.jbmarks.tasks.domain.Comment
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun CommentSection(
    comments: List<Comment>,
    isLoading: Boolean,
    onAddComment: (String) -> Unit
) {
    var commentText by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Comments Header
        Text(
            text = "Comments (${comments.size})",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(vertical = 8.dp),
            color = MaterialTheme.colorScheme.onSurface
        )

        // Comments List
        if (comments.isEmpty() && !isLoading) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Text(
                    text = "No comments yet. Be the first to comment!",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(comments) { comment ->
                    CommentItem(comment = comment)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Add Comment Input
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                OutlinedTextField(
                    value = commentText,
                    onValueChange = { commentText = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Add a comment...") },
                    maxLines = 4,
                    enabled = !isSubmitting,
                    shape = RoundedCornerShape(8.dp)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Button(
                        onClick = {
                            if (commentText.isNotBlank()) {
                                isSubmitting = true
                                onAddComment(commentText.trim())
                                commentText = ""
                                isSubmitting = false
                            }
                        },
                        enabled = commentText.isNotBlank() && !isSubmitting,
                        modifier = Modifier.height(40.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                Icons.Default.Send,
                                contentDescription = "Send",
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Post")
                    }
                }
            }
        }
    }
}

@Composable
fun CommentItem(comment: Comment) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Author and Date Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Author Name with Icon
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Avatar Circle
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(16.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (comment.authorName?.firstOrNull()?.uppercaseChar()?.toString() 
                                ?: comment.authorId.firstOrNull()?.toString() 
                                ?: "?"),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    
                    Column {
                        Text(
                            text = comment.authorName ?: "User ${comment.authorId}",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        if (comment.authorId.isNotEmpty()) {
                            Text(
                                text = "ID: ${comment.authorId}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                
                // Date
                Text(
                    text = formatCommentDate(comment.createdDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Comment Text
            Text(
                text = comment.text.ifEmpty { "No message" },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.fillMaxWidth()
            )
            
            // Files
            if (comment.files.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Attachments:",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    comment.files.forEach { file ->
                        FileAttachmentChip(file = file)
                    }
                }
            }
        }
    }
}

@Composable
fun FileAttachmentChip(file: com.example.jbmarks.tasks.domain.CommentFile) {
    AssistChip(
        onClick = { /* TODO: Open file */ },
        label = { 
            Text(
                text = file.name,
                style = MaterialTheme.typography.bodySmall
            ) 
        }
    )
}

fun formatCommentDate(dateString: String): String {
    return try {
        // Try ISO format first
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        date?.let {
            val outputFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
            outputFormat.format(it)
        } ?: dateString
    } catch (e: Exception) {
        // If parsing fails, return as-is
        dateString
    }
}
