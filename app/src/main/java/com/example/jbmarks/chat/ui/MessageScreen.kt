package com.example.jbmarks.chat.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import android.app.Application
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.user.data.UserRepository
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import java.io.File
import java.io.FileOutputStream
import java.util.*
import java.util.regex.Pattern

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessageScreen(
    dialogId: String,
    chatName: String,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val application = context.applicationContext as Application
    val viewModel: MessageViewModel = viewModel(factory = MessageViewModelFactory(dialogId, application))
    val messages by viewModel.messages.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSending by viewModel.isSending.collectAsState()
    val currentUserId by viewModel.currentUserId.collectAsState()
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    
    // File picker launcher
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { selectedUri ->
            try {
                // Get file name from URI
                var fileName: String? = null
                if (selectedUri.scheme == "content") {
                    val cursor: android.database.Cursor? = context.contentResolver.query(selectedUri, null, null, null, null)
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val nameIndex = it.getColumnIndex(android.provider.MediaStore.MediaColumns.DISPLAY_NAME)
                            if (nameIndex >= 0) {
                                fileName = it.getString(nameIndex)
                            }
                        }
                    }
                }
                if (fileName == null) {
                    fileName = selectedUri.path
                    val cut = fileName?.lastIndexOf('/')
                    if (cut != null && cut != -1) {
                        fileName = fileName?.substring(cut + 1)
                    }
                }
                val finalFileName = fileName ?: "file_${System.currentTimeMillis()}"
                
                // Copy file to app's cache directory
                val cacheDir = java.io.File(context.cacheDir, "chat_uploads")
                cacheDir.mkdirs()
                val tempFile = java.io.File(cacheDir, finalFileName)
                
                context.contentResolver.openInputStream(selectedUri)?.use { inputStream ->
                    java.io.FileOutputStream(tempFile).use { outputStream ->
                        inputStream.copyTo(outputStream)
                    }
                }
                
                // Upload file and send message with file
                viewModel.sendMessageWithFile(tempFile.absolutePath, finalFileName)
                
                // Clean up temp file after upload
                tempFile.delete()
            } catch (e: Exception) {
                android.util.Log.e("MessageScreen", "Error handling file selection", e)
            }
        }
    }
    
    LaunchedEffect(Unit) {
        viewModel.loadMessages()
    }
    
    // Scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(chatName) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* TODO: Chat info */ }) {
                        Icon(Icons.Default.Info, contentDescription = "Chat Info")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFECE5DD)) // WhatsApp-like background
        ) {
            // Messages List
            if (isLoading && messages.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentPadding = PaddingValues(
                        start = 8.dp,
                        end = 8.dp,
                        top = 8.dp,  // Add top padding to prevent overlap with top bar
                        bottom = 4.dp
                    ),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                    reverseLayout = true
                ) {
                    items(messages.reversed()) { message ->
                        MessageBubble(message = message, currentUserId = currentUserId)
                    }
                }
            }
            
            // Message Input
            MessageInputBar(
                messageText = messageText,
                onMessageTextChange = { messageText = it },
                onSendClick = {
                    if (messageText.isNotBlank() && !isSending) {
                        viewModel.sendMessage(messageText)
                        messageText = ""
                    }
                },
                onAttachClick = { filePickerLauncher.launch("*/*") },
                isSending = isSending
            )
        }
    }
}

@Composable
fun MessageBubble(
    message: Message,
    currentUserId: String?
) {
    val isSent = message.senderId == currentUserId
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 2.dp),
        horizontalArrangement = if (isSent) Arrangement.End else Arrangement.Start
    ) {
        
        Column(
            modifier = Modifier.widthIn(max = 280.dp),
            horizontalAlignment = if (isSent) Alignment.End else Alignment.Start
        ) {
            // WhatsApp-style bubble with tail
            Box(
                modifier = Modifier
                    .clip(
                        RoundedCornerShape(
                            topStart = 8.dp,
                            topEnd = 8.dp,
                            bottomStart = if (isSent) 8.dp else 2.dp,
                            bottomEnd = if (isSent) 2.dp else 8.dp
                        )
                    )
                    .background(
                        color = if (isSent) Color(0xFFDCF8C6) else Color.White // WhatsApp green for sent, white for received
                    )
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = cleanMessageText(message.text),
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontSize = 15.sp,
                            lineHeight = 20.sp
                        ),
                        color = Color(0xFF111B21) // WhatsApp text color
                    )
                    
                    // File attachments
                    if (message.files.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        message.files.forEach { file ->
                            FileAttachmentChip(file = file)
                        }
                    }
                    
                    // Timestamp and read indicator (WhatsApp style - bottom right)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = message.getFormattedTime(),
                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                            color = Color(0xFF667781).copy(alpha = 0.8f), // WhatsApp timestamp color
                            modifier = Modifier.padding(start = 4.dp)
                        )
                        if (isSent) {
                            Spacer(modifier = Modifier.width(2.dp))
                            Icon(
                                if (message.isRead) Icons.Default.CheckCircle else Icons.Default.Done,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = if (message.isRead) 
                                    Color(0xFF53BDEB) // Blue for read (WhatsApp style)
                                else 
                                    Color(0xFF667781) // Gray for sent
                            )
                        }
                    }
                }
            }
        }
        
        if (isSent) {
            Spacer(modifier = Modifier.width(6.dp))
        }
    }
}

@Composable
fun FileAttachmentChip(file: com.example.jbmarks.chat.domain.MessageFile) {
    AssistChip(
        onClick = { /* TODO: Open file */ },
        label = { 
            Text(
                text = file.name,
                style = MaterialTheme.typography.bodySmall
            ) 
        },
        leadingIcon = {
            Text("📎", style = MaterialTheme.typography.bodySmall)
        }
    )
}

@Composable
fun MessageInputBar(
    messageText: String,
    onMessageTextChange: (String) -> Unit,
    onSendClick: () -> Unit,
    onAttachClick: () -> Unit,
    isSending: Boolean
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFFF0F2F5), // WhatsApp input bar color
        shadowElevation = 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Attachment button
            IconButton(
                onClick = onAttachClick,
                modifier = Modifier.size(40.dp)
            ) {
                Text("📎", style = MaterialTheme.typography.bodyLarge)
            }
            
            // Input field (WhatsApp style - rounded, filled)
            OutlinedTextField(
                value = messageText,
                onValueChange = onMessageTextChange,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 40.dp, max = 100.dp),
                placeholder = { 
                    Text(
                        "Type a message...",
                        color = Color(0xFF667781).copy(alpha = 0.6f)
                    ) 
                },
                maxLines = 4,
                shape = RoundedCornerShape(24.dp),
                enabled = !isSending,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent,
                    cursorColor = MaterialTheme.colorScheme.primary
                ),
                textStyle = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp)
            )
            
            // Send button (WhatsApp style - circular when active)
            if (messageText.isNotBlank() && !isSending) {
                FloatingActionButton(
                    onClick = onSendClick,
                    modifier = Modifier.size(40.dp),
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White
                ) {
                    Icon(
                        Icons.Default.Send,
                        contentDescription = "Send",
                        modifier = Modifier.size(20.dp)
                    )
                }
            } else if (isSending) {
                Box(
                    modifier = Modifier.size(40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            } else {
                // Empty space when no text
                Spacer(modifier = Modifier.size(40.dp))
            }
        }
    }
}

/**
 * Clean message text by removing [USER=...] tags and keeping only the names
 */
fun cleanMessageText(text: String): String {
    // Pattern to match [USER=ID REPLACE]Name[/USER] or [USER=ID]Name[/USER] or [USER=ID REPLACE][/USER] (empty tags)
    // First, remove empty USER tags: [USER=ID REPLACE][/USER] or [USER=ID][/USER]
    var cleaned = Pattern.compile("\\[USER=\\d+(?:\\s+REPLACE)?]\\[/USER]").matcher(text).replaceAll("")
    // Then, extract names from non-empty USER tags: [USER=ID REPLACE]Name[/USER] or [USER=ID]Name[/USER]
    cleaned = Pattern.compile("\\[USER=\\d+(?:\\s+REPLACE)?]([^\\[]+)\\[/USER]").matcher(cleaned).replaceAll("$1")
    return cleaned
}
