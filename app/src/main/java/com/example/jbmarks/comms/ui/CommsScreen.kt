package com.example.jbmarks.comms.ui

import android.app.Application
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.comms.calling.CallingService
import com.example.jbmarks.user.data.Workgroup
import com.example.jbmarks.user.data.WorkgroupMember
import kotlinx.coroutines.launch

@Composable
fun CommsScreen() {
    val context = LocalContext.current
    val vm: CommsViewModel = viewModel(
        factory = ViewModelProvider.AndroidViewModelFactory.getInstance(
            context.applicationContext as Application
        )
    )
    val state by vm.state.collectAsState()

    // Call states
    var showCallScreen by remember { mutableStateOf(false) }
    var callTargetName by remember { mutableStateOf("") }
    var callTargetUserId by remember { mutableStateOf("") }
    var showGroupCall by remember { mutableStateOf(false) }

    // Show 1:1 outgoing call screen
    if (showCallScreen) {
        com.example.jbmarks.comms.calling.CallScreen(
            calleeName = callTargetName,
            calleeUserId = callTargetUserId,
            onDismiss = { showCallScreen = false }
        )
        return
    }

    // Show group (conference) call screen — rings the whole workgroup
    if (showGroupCall) {
        val memberIds = state.members
            .filter { it.userId != state.currentUserId }
            .map { it.userId }
        com.example.jbmarks.comms.calling.GroupCallScreen(
            groupName = state.selectedWorkgroup?.name ?: "Group Call",
            memberUserIds = memberIds,
            onDismiss = { showGroupCall = false }
        )
        return
    }

    when (state.activeView) {
        ActiveView.ChatList -> {
            ChatListView(
                state = state,
                onSelectWorkgroup = { vm.selectWorkgroup(it) },
                onOpenGroupChat = { vm.openGroupChat() },
                onOpenDirectMessage = { member -> vm.loadDirectMessages(member.userId) },
                onCallMember = { member ->
                    callTargetName = member.fullName
                    callTargetUserId = member.userId
                    showCallScreen = true
                },
                onStartGroupCall = { showGroupCall = true }
            )
        }
        ActiveView.GroupChat -> {
            ConversationView(
                title = state.selectedWorkgroup?.name ?: "Group",
                subtitle = "${state.members.size} members",
                isGroup = true,
                state = state,
                onBack = { vm.backToChatList() },
                onSend = { vm.sendMessage(it) }
            )
        }
        ActiveView.DirectMessage -> {
            val member = state.members.find { it.userId == state.currentDialogId }
            ConversationView(
                title = member?.fullName ?: "Chat",
                subtitle = member?.roleDisplayName ?: "",
                isGroup = false,
                state = state,
                onBack = { vm.backToChatList() },
                onSend = { vm.sendMessage(it) }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// CHAT LIST VIEW (iOS-style)
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun ChatListView(
    state: CommsUiState,
    onSelectWorkgroup: (Workgroup) -> Unit,
    onOpenGroupChat: () -> Unit,
    onOpenDirectMessage: (WorkgroupMember) -> Unit,
    onCallMember: (WorkgroupMember) -> Unit = {},
    onStartGroupCall: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header — Teams-style with a "Meet now" action
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primary,
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.9f)
                        )
                    )
                )
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Comms",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                // Meet now — starts a conference call to the whole workgroup
                if (state.selectedWorkgroup != null && state.members.size > 1) {
                    Surface(
                        onClick = onStartGroupCall,
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFFF9A825)  // JBmarks gold accent
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Default.Call, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                            Text("Meet now", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Workgroup selector — modern card style
        if (state.workgroups.size > 1) {
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(horizontal = 20.dp)
            ) {
                items(state.workgroups) { workgroup ->
                    val isSelected = workgroup.id == state.selectedWorkgroup?.id
                    Surface(
                        onClick = { onSelectWorkgroup(workgroup) },
                        shape = RoundedCornerShape(16.dp),
                        color = if (isSelected) MaterialTheme.colorScheme.primary
                               else MaterialTheme.colorScheme.surface,
                        shadowElevation = if (isSelected) 4.dp else 1.dp,
                        modifier = if (!isSelected) Modifier.then(
                            Modifier.clip(RoundedCornerShape(16.dp))
                        ) else Modifier
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Workgroup icon
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (isSelected) Color.White.copy(alpha = 0.2f)
                                        else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = workgroup.name.take(1).uppercase(),
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White
                                           else MaterialTheme.colorScheme.primary
                                )
                            }
                            // Name
                            Column {
                                Text(
                                    text = workgroup.name,
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                                    color = if (isSelected) Color.White
                                           else MaterialTheme.colorScheme.onSurface,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            // Checkmark for selected
                            if (isSelected) {
                                Text(
                                    text = "✓",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
        } else if (state.selectedWorkgroup != null) {
            // Single workgroup — show as a compact bar
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = state.selectedWorkgroup!!.name.take(1).uppercase(),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    Text(
                        text = state.selectedWorkgroup!!.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        // Loading
        if (state.isLoadingWorkgroups || state.isLoadingMembers) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            return
        }

        if (state.selectedWorkgroup == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Select a workgroup", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return
        }

        // Chat list
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(top = 8.dp)
        ) {
            // Section header — Group
            item {
                SectionHeader("Group Chat")
            }

            // Group chat
            item {
                IOSChatListItem(
                    avatarContent = {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.linearGradient(
                                        colors = listOf(
                                            MaterialTheme.colorScheme.primary,
                                            MaterialTheme.colorScheme.secondary
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "👥",
                                fontSize = 24.sp
                            )
                        }
                    },
                    title = state.selectedWorkgroup!!.name,
                    subtitle = "${state.members.size} members • Tap to open",
                    onClick = { onOpenGroupChat() }
                )
            }

            // Section header — Direct Messages
            if (state.members.any { it.userId != state.currentUserId }) {
                item {
                    SectionHeader("Direct Messages")
                }
            }

            // Members
            items(state.members.filter { it.userId != state.currentUserId }) { member ->
                IOSChatListItem(
                    avatarContent = {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.secondaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = member.fullName
                                    .split(" ")
                                    .take(2)
                                    .map { it.firstOrNull()?.uppercase() ?: "" }
                                    .joinToString(""),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    },
                    title = member.fullName,
                    subtitle = member.roleDisplayName,
                    onCall = { onCallMember(member) },
                    onClick = { onOpenDirectMessage(member) }
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
        letterSpacing = 1.sp,
        modifier = Modifier.padding(start = 20.dp, top = 20.dp, bottom = 6.dp)
    )
}

@Composable
private fun IOSChatListItem(
    avatarContent: @Composable () -> Unit,
    title: String,
    subtitle: String,
    onCall: (() -> Unit)? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        avatarContent()
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        // Call button
        if (onCall != null) {
            IconButton(onClick = onCall) {
                Icon(
                    Icons.Default.Call,
                    contentDescription = "Call",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
        // Chevron
        Text(
            text = "›",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
        )
    }
}

// ═══════════════════════════════════════════════════════════════════
// CONVERSATION VIEW (iMessage-style)
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun ConversationView(
    title: String,
    subtitle: String,
    isGroup: Boolean,
    state: CommsUiState,
    onBack: () -> Unit,
    onSend: (String) -> Unit
) {
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            coroutineScope.launch {
                listState.animateScrollToItem(state.messages.size - 1)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // iOS-style navigation bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            tonalElevation = 0.dp,
            shadowElevation = 1.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Back button
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }

                // Avatar
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(
                            if (isGroup) Brush.linearGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.secondary
                                )
                            ) else Brush.linearGradient(
                                listOf(
                                    MaterialTheme.colorScheme.secondaryContainer,
                                    MaterialTheme.colorScheme.secondaryContainer
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isGroup) {
                        Text("👥", fontSize = 18.sp)
                    } else {
                        Text(
                            text = title.split(" ").take(2)
                                .map { it.firstOrNull()?.uppercase() ?: "" }
                                .joinToString(""),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (isGroup) Color.White 
                                   else MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }

                Spacer(Modifier.width(10.dp))

                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (subtitle.isNotBlank()) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }

        // Messages
        Box(
            modifier = Modifier
                .weight(1f)
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.15f))
        ) {
            when {
                state.isLoadingMessages -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            color = MaterialTheme.colorScheme.primary,
                            strokeWidth = 2.dp
                        )
                    }
                }
                state.messages.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("💬", fontSize = 48.sp)
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "No messages yet",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Start the conversation",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(state.messages, key = { it.id }) { message ->
                            IOSMessageBubble(
                                message = message,
                                isCurrentUser = message.senderId == state.currentUserId,
                                showSenderName = isGroup
                            )
                        }
                    }
                }
            }
        }

        // Input bar (iOS-style)
        IOSMessageInput(
            isSending = state.isSending,
            onSend = onSend
        )
    }
}

@Composable
private fun IOSMessageBubble(message: Message, isCurrentUser: Boolean, showSenderName: Boolean) {
    val alignment = if (isCurrentUser) Alignment.End else Alignment.Start

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 1.dp),
        horizontalAlignment = alignment
    ) {
        // Sender name for group chats
        if (!isCurrentUser && showSenderName && message.senderName.isNotBlank()) {
            Text(
                text = message.senderName,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                modifier = Modifier.padding(
                    start = if (!isCurrentUser) 14.dp else 0.dp,
                    bottom = 2.dp
                )
            )
        }

        // Bubble
        Surface(
            shape = RoundedCornerShape(
                topStart = 20.dp,
                topEnd = 20.dp,
                bottomStart = if (isCurrentUser) 20.dp else 6.dp,
                bottomEnd = if (isCurrentUser) 6.dp else 20.dp
            ),
            color = if (isCurrentUser)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.surface,
            shadowElevation = if (isCurrentUser) 0.dp else 0.5.dp,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                Text(
                    text = message.text,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isCurrentUser) Color.White
                           else MaterialTheme.colorScheme.onSurface,
                    lineHeight = 20.sp
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    text = message.getFormattedTime(),
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = if (isCurrentUser) Color.White.copy(alpha = 0.6f)
                           else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.align(Alignment.End)
                )
            }
        }
    }
}

@Composable
private fun IOSMessageInput(
    isSending: Boolean,
    onSend: (String) -> Unit
) {
    var text by remember { mutableStateOf("") }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 0.dp,
        shadowElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Input field (iOS-style pill)
            Surface(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                border = null
            ) {
                TextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = {
                        Text(
                            "Message",
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 5,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(
                        onSend = {
                            if (text.isNotBlank() && !isSending) {
                                onSend(text)
                                text = ""
                            }
                        }
                    ),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        disabledIndicatorColor = Color.Transparent
                    )
                )
            }

            // Send button (iOS-style circle)
            AnimatedVisibility(
                visible = text.isNotBlank(),
                enter = scaleIn(tween(150)) + fadeIn(tween(150)),
                exit = scaleOut(tween(100)) + fadeOut(tween(100))
            ) {
                FilledIconButton(
                    onClick = {
                        if (text.isNotBlank() && !isSending) {
                            onSend(text)
                            text = ""
                        }
                    },
                    enabled = !isSending,
                    modifier = Modifier.size(44.dp),
                    shape = CircleShape,
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    if (isSending) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = Color.White
                        )
                    } else {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Send",
                            modifier = Modifier.size(20.dp),
                            tint = Color.White
                        )
                    }
                }
            }
        }
    }
}
