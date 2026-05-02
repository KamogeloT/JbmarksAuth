package com.example.jbmarks.tasks.ui

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.graphics.Color
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.tasks.domain.Comment
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

@Composable
fun CommentSection(
    comments: List<Comment>,
    isLoading: Boolean,
    onAddComment: (String) -> Unit,
    onTakePhoto: () -> Unit = {},
    // Pending photo URI set by TaskDetailScreen after camera returns
    pendingPhotoUri: Uri? = null,
    onClearPendingPhoto: () -> Unit = {}
) {
    var commentText by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Whether the post button should be enabled
    val canPost = (commentText.isNotBlank() || pendingPhotoUri != null) && !isSubmitting

    Column(modifier = Modifier.fillMaxWidth()) {

        // ── Comments Header ──────────────────────────────────────────────────
        Text(
            text = "Comments (${comments.size})",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(vertical = 8.dp),
            color = MaterialTheme.colorScheme.onSurface
        )

        // ── Comments List ────────────────────────────────────────────────────
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

        // ── Add Comment Input ────────────────────────────────────────────────
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {

                // Photo preview (shown after camera returns, before posting)
                if (pendingPhotoUri != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .border(
                                1.dp,
                                MaterialTheme.colorScheme.outline,
                                RoundedCornerShape(8.dp)
                            )
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(pendingPhotoUri)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Photo preview",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                        // Remove photo button
                        IconButton(
                            onClick = onClearPendingPhoto,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(4.dp)
                                .size(28.dp)
                                .background(
                                    MaterialTheme.colorScheme.errorContainer,
                                    RoundedCornerShape(14.dp)
                                )
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Remove photo",
                                tint = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Text input
                OutlinedTextField(
                    value = commentText,
                    onValueChange = { commentText = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = {
                        Text(
                            if (pendingPhotoUri != null) "Add a caption (optional)..."
                            else "Add a comment..."
                        )
                    },
                    maxLines = 4,
                    enabled = !isSubmitting,
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Camera button
                    IconButton(
                        onClick = onTakePhoto,
                        enabled = !isSubmitting,
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Take Photo",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    // Post button
                    Button(
                        onClick = {
                            if (canPost) {
                                isSubmitting = true
                                onAddComment(commentText.trim())
                                commentText = ""
                                isSubmitting = false
                            }
                        },
                        enabled = canPost,
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
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Extract [DISK FILE ID=xxx] tags from message
    val diskFileIds = remember(comment.text) { extractDiskFileIds(comment.text) }

    // Strip the tags from displayed text
    val displayText = remember(comment.text) {
        cleanCommentText(comment.text.replace(Regex("\\[DISK FILE ID=\\d+\\]"), "").trim())
    }

    // Resolve download URLs for each disk file ID
    val imageUrls = remember(diskFileIds) { mutableStateListOf<String>() }
    LaunchedEffect(diskFileIds) {
        imageUrls.clear()
        diskFileIds.forEach { fileId ->
            scope.launch {
                try {
                    val api = RetrofitInstance.api
                    val response = api.getFileDetails(fileId)
                    if (response.isSuccessful) {
                        val result = response.body()?.result
                        val url = result?.getDownloadUrlValue()
                        if (!url.isNullOrBlank()) imageUrls.add(url)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("CommentItem", "Failed to fetch file $fileId: ${e.message}")
                }
            }
        }
    }

    // Full-screen image viewer state
    var fullScreenUrl by remember { mutableStateOf<String?>(null) }

    // Authenticated image loader
    val imageLoader = remember {
        val tokenManager = TokenManager(context)
        val client = OkHttpClient.Builder()
            .addInterceptor(com.example.jbmarks.network.AuthInterceptor(context, tokenManager))
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build()
        ImageLoader.Builder(context).okHttpClient(client).build()
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Author + date row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(
                        modifier = Modifier.size(32.dp).background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(16.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = comment.authorName?.firstOrNull()?.uppercaseChar()?.toString() ?: "",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Text(
                        text = comment.authorName?.takeIf { it.isNotBlank() } ?: "Unknown User",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Text(
                    text = formatCommentDate(comment.createdDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Text (only if non-empty after stripping tags)
            if (displayText.isNotBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = displayText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Inline images from [DISK FILE ID=xxx] tags
            if (imageUrls.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                imageUrls.forEach { url ->
                    AsyncImage(
                        model = ImageRequest.Builder(context).data(url).crossfade(true).build(),
                        imageLoader = imageLoader,
                        contentDescription = "Attached photo",
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 220.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { fullScreenUrl = url },
                        contentScale = ContentScale.Crop
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }
            } else if (diskFileIds.isNotEmpty()) {
                // Still loading
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            // Other file attachments
            if (comment.files.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Attachments:", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    comment.files.forEach { file -> FileAttachmentChip(file = file) }
                }
            }
        }
    }

    // Full-screen viewer
    fullScreenUrl?.let { url ->
        Dialog(onDismissRequest = { fullScreenUrl = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.95f))) {
                AsyncImage(
                    model = ImageRequest.Builder(context).data(url).crossfade(true).build(),
                    imageLoader = imageLoader,
                    contentDescription = "Full size image",
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    contentScale = ContentScale.Fit
                )
                IconButton(onClick = { fullScreenUrl = null }, modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }
        }
    }
}

/** Extract all file IDs from [DISK FILE ID=xxx] tags */
fun extractDiskFileIds(text: String): List<String> {
    val pattern = Pattern.compile("\\[DISK FILE ID=(\\d+)\\]")
    val matcher = pattern.matcher(text)
    val ids = mutableListOf<String>()
    while (matcher.find()) ids.add(matcher.group(1)!!)
    return ids
}

@Composable
fun FileAttachmentChip(file: com.example.jbmarks.tasks.domain.CommentFile) {
    AssistChip(
        onClick = { },
        label = {
            Text(text = file.name, style = MaterialTheme.typography.bodySmall)
        }
    )
}

fun formatCommentDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        date?.let {
            val outputFormat = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
            outputFormat.format(it)
        } ?: dateString
    } catch (e: Exception) {
        dateString
    }
}

fun cleanCommentText(text: String): String {
    val pattern = Pattern.compile("\\[USER=\\d+(?:\\s+REPLACE)?]([^\\[]+)\\[/USER]")
    val matcher = pattern.matcher(text)
    return matcher.replaceAll("$1")
}
