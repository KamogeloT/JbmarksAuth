package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest
import coil.ImageLoader
import com.example.jbmarks.tasks.domain.TaskFile
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.network.AuthInterceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

@Composable
fun FileAttachmentSection(
    files: List<TaskFile>,
    onUploadFile: () -> Unit,
    onFileClick: (TaskFile) -> Unit,
    onTakePhoto: () -> Unit = {}
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        // Files Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Attachments (${files.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Take photo button
                IconButton(onClick = onTakePhoto) {
                    Icon(
                        Icons.Default.PhotoCamera,
                        contentDescription = "Take Photo",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                // Attach file from device button
                IconButton(onClick = onUploadFile) {
                    Icon(
                        Icons.Default.AttachFile,
                        contentDescription = "Attach File",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Files List
        if (files.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Text(
                    text = "No attachments. Use the camera or attach icon to add files.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(files) { file ->
                    FileAttachmentCard(
                        file = file,
                        onClick = { onFileClick(file) }
                    )
                }
            }
        }
    }
}

@Composable
fun FileAttachmentCard(
    file: TaskFile,
    onClick: () -> Unit
) {
    // Check if it's an image by MIME type OR by file extension
    val isImage = isImageFile(file.type) || 
                 file.name.endsWith(".jpg", ignoreCase = true) ||
                 file.name.endsWith(".jpeg", ignoreCase = true) ||
                 file.name.endsWith(".png", ignoreCase = true) ||
                 file.name.endsWith(".gif", ignoreCase = true) ||
                 file.name.endsWith(".webp", ignoreCase = true) ||
                 file.name.endsWith(".bmp", ignoreCase = true)
    
    android.util.Log.d("FileAttachmentCard", "File: ${file.name}, type: ${file.type}, isImage: $isImage")
    
    Card(
        modifier = Modifier
            .width(200.dp)
            .height(if (isImage) 150.dp else 100.dp),
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        if (isImage && file.downloadUrl != null) {
            // Display image thumbnail
            // Need to use authenticated OkHttpClient for image loading
            val context = LocalContext.current
            val imageLoader = remember {
                // Create OkHttpClient that handles both OAuth and webhook URLs
                val tokenManager = TokenManager(context)
                val logging = HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.BASIC
                }
                
                // Interceptor that handles both OAuth and webhook authentication
                val authInterceptor = object : okhttp3.Interceptor {
                    override fun intercept(chain: okhttp3.Interceptor.Chain): okhttp3.Response {
                        val originalRequest = chain.request()
                        val url = originalRequest.url.toString()
                        
                        // Check if this is a webhook URL (contains /rest/1/ or /rest/{userId}/)
                        val isWebhookUrl = url.contains("/rest/1/") || url.matches(Regex(".*/rest/\\d+/.*"))
                        
                        return if (isWebhookUrl) {
                            // Webhook URLs already include authentication in the path, no need to add auth header
                            chain.proceed(originalRequest)
                        } else {
                            // Use OAuth authentication for regular API calls
                            val accessToken = tokenManager.getAccessToken()
                            if (accessToken != null) {
                                val newRequest = originalRequest.newBuilder()
                                    .header("Authorization", "Bearer $accessToken")
                                    .url(originalRequest.url.newBuilder().addQueryParameter("auth", accessToken).build())
                                    .build()
                                chain.proceed(newRequest)
                            } else {
                                chain.proceed(originalRequest)
                            }
                        }
                    }
                }
                
                val okHttpClient = OkHttpClient.Builder()
                    .addInterceptor(authInterceptor)
                    .addInterceptor(logging)
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(60, TimeUnit.SECONDS)
                    .build()
                
                ImageLoader.Builder(context)
                    .okHttpClient(okHttpClient)
                    .build()
            }
            
            val imageRequest = remember(file.downloadUrl) {
                ImageRequest.Builder(context)
                    .data(file.downloadUrl)
                    .crossfade(true)
                    .build()
            }
            
            Box(modifier = Modifier.fillMaxSize()) {
                AsyncImage(
                    model = imageRequest,
                    imageLoader = imageLoader,
                    contentDescription = file.name,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop,
                    onError = {
                        // If image fails to load, show placeholder
                        android.util.Log.e("FileAttachmentCard", "Failed to load image: ${file.downloadUrl}")
                    },
                    onSuccess = {
                        android.util.Log.d("FileAttachmentCard", "Successfully loaded image: ${file.downloadUrl}")
                    }
                )
                // Make sure the image doesn't intercept clicks - the Card's onClick should handle it
                // Overlay with file name
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.9f)
                        )
                        .padding(8.dp)
                ) {
                    Text(
                        text = file.name,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
            }
        } else {
            // Display file icon for non-images
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = "↓",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Column {
                    Text(
                        text = file.name,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 2
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = formatFileSize(file.size),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

fun isImageFile(mimeType: String): Boolean {
    return mimeType.startsWith("image/", ignoreCase = true) ||
           mimeType.endsWith("jpg", ignoreCase = true) ||
           mimeType.endsWith("jpeg", ignoreCase = true) ||
           mimeType.endsWith("png", ignoreCase = true) ||
           mimeType.endsWith("gif", ignoreCase = true) ||
           mimeType.endsWith("webp", ignoreCase = true) ||
           mimeType.endsWith("bmp", ignoreCase = true)
}

fun formatFileSize(bytes: Long): String {
    return when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${bytes / 1024} KB"
        bytes < 1024 * 1024 * 1024 -> "${bytes / (1024 * 1024)} MB"
        else -> "${bytes / (1024 * 1024 * 1024)} GB"
    }
}
