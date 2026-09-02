package com.example.jbmarks.comms.ui

import android.app.Application
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.chat.domain.Message
import com.example.jbmarks.user.data.Workgroup
import com.example.jbmarks.user.data.WorkgroupMember
import kotlinx.coroutines.launch
import kotlin.math.abs

// ── JBmarks brand palette (green + gold), futuristic dark-glass accents ──
private val Green = Color(0xFF1B5E20)
private val GreenLight = Color(0xFF2E7D32)
private val Gold = Color(0xFFF9A825)
private val Ink = Color(0xFF0D1B12)
private val PresenceColors = listOf(Color(0xFF34C759), Color(0xFFFFB020), Color(0xFF8E8E93))

private enum class CommsTab(val label: String, val icon: ImageVector) {
    Chat("Chat", Icons.Default.Email),
    Calls("Calls", Icons.Default.Call),
    People("People", Icons.Default.Person)
}

@Composable
fun CommsScreen() {
    val context = LocalContext.current
    val vm: CommsViewModel = viewModel(
        factory = ViewModelProvider.AndroidViewModelFactory.getInstance(
            context.applicationContext as Application
        )
    )
    val state by vm.state.collectAsState()

    var showCallScreen by remember { mutableStateOf(false) }
    var callTargetName by remember { mutableStateOf("") }
    var callTargetUserId by remember { mutableStateOf("") }
    var showGroupCall by remember { mutableStateOf(false) }
    var tab by remember { mutableStateOf(CommsTab.Chat) }

    if (showCallScreen) {
        com.example.jbmarks.comms.calling.CallScreen(
            calleeName = callTargetName, calleeUserId = callTargetUserId,
            onDismiss = { showCallScreen = false }
        )
        return
    }
    if (showGroupCall) {
        val memberIds = state.members.filter { it.userId != state.currentUserId }.map { it.userId }
        com.example.jbmarks.comms.calling.GroupCallScreen(
            groupName = state.selectedWorkgroup?.name ?: "Group Call",
            memberUserIds = memberIds,
            onDismiss = { showGroupCall = false }
        )
        return
    }

    // Conversation views take over the whole screen (no bottom nav)
    when (state.activeView) {
        ActiveView.GroupChat -> {
            ConversationView(
                title = state.selectedWorkgroup?.name ?: "Group",
                subtitle = "${state.members.size} members",
                isGroup = true, state = state,
                onBack = { vm.backToChatList() },
                onSend = { vm.sendMessage(it) },
                onStartGroupCall = { showGroupCall = true }
            )
            return
        }
        ActiveView.DirectMessage -> {
            val member = state.members.find { it.userId == state.currentDialogId }
            ConversationView(
                title = member?.fullName ?: "Chat",
                subtitle = member?.roleDisplayName ?: "",
                isGroup = false, state = state,
                onBack = { vm.backToChatList() },
                onSend = { vm.sendMessage(it) },
                onStartGroupCall = null,
                onCall = { member?.let { callTargetName = it.fullName; callTargetUserId = it.userId; showCallScreen = true } }
            )
            return
        }
        else -> Unit
    }

    // Home shell with bottom nav (Teams-style)
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { CommsBottomNav(tab) { tab = it } }
    ) { pad ->
        Box(Modifier.padding(pad)) {
            when (tab) {
                CommsTab.Chat -> ChatTab(
                    state = state,
                    onSelectWorkgroup = { vm.selectWorkgroup(it) },
                    onOpenGroupChat = { vm.openGroupChat() },
                    onOpenDirectMessage = { vm.loadDirectMessages(it.userId) },
                    onMeetNow = { showGroupCall = true }
                )
                CommsTab.Calls -> CallsTab(
                    state = state,
                    onMeetNow = { showGroupCall = true },
                    onCallMember = { callTargetName = it.fullName; callTargetUserId = it.userId; showCallScreen = true }
                )
                CommsTab.People -> PeopleTab(
                    state = state,
                    onOpenDirectMessage = { vm.loadDirectMessages(it.userId) },
                    onCallMember = { callTargetName = it.fullName; callTargetUserId = it.userId; showCallScreen = true }
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// BOTTOM NAV (Teams-style)
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun CommsBottomNav(selected: CommsTab, onSelect: (CommsTab) -> Unit) {
    Surface(shadowElevation = 12.dp, color = MaterialTheme.colorScheme.surface) {
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            CommsTab.entries.forEach { t ->
                val active = t == selected
                val color by animateColorAsState(if (active) Green else Color.Gray.copy(alpha = 0.6f), label = "nav")
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.clip(RoundedCornerShape(14.dp))
                        .clickable { onSelect(t) }
                        .padding(horizontal = 20.dp, vertical = 6.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (active) {
                            Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp))
                                .background(Green.copy(alpha = 0.12f)))
                        }
                        Icon(t.icon, t.label, tint = color, modifier = Modifier.size(24.dp))
                    }
                    Spacer(Modifier.height(3.dp))
                    Text(t.label, fontSize = 11.sp, color = color,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal)
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// SHARED — gradient header, presence avatar
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun GradientHeader(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Box(
        Modifier.fillMaxWidth()
            .background(Brush.linearGradient(listOf(Green, GreenLight, Green)))
            .padding(horizontal = 20.dp, vertical = 18.dp)
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(title, style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold, color = Color.White)
                if (subtitle != null) {
                    Text(subtitle, fontSize = 12.sp, color = Color.White.copy(alpha = 0.75f))
                }
            }
            action?.invoke()
        }
    }
}

@Composable
private fun PresenceAvatar(name: String, size: Int = 52, gradient: Boolean = false, seed: Int = 0) {
    Box {
        Box(
            modifier = Modifier.size(size.dp).clip(CircleShape)
                .background(
                    if (gradient) Brush.linearGradient(listOf(Green, GreenLight))
                    else Brush.linearGradient(listOf(GreenLight.copy(alpha = 0.85f), Green))
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""),
                color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size / 2.6).sp
            )
        }
        // Presence dot (deterministic per name so it's stable, not fake-random each frame)
        val presence = PresenceColors[abs(name.hashCode()) % PresenceColors.size]
        Box(
            Modifier.align(Alignment.BottomEnd).size((size / 3.6).dp).clip(CircleShape)
                .background(Color.White).padding(2.dp).clip(CircleShape).background(presence)
        )
    }
}

@Composable
private fun WorkgroupChips(state: CommsUiState, onSelect: (Workgroup) -> Unit) {
    if (state.workgroups.size <= 1) return
    LazyRow(
        Modifier.fillMaxWidth().padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(horizontal = 20.dp)
    ) {
        items(state.workgroups) { wg ->
            val sel = wg.id == state.selectedWorkgroup?.id
            Surface(
                onClick = { onSelect(wg) },
                shape = RoundedCornerShape(20.dp),
                color = if (sel) Green else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ) {
                Text(wg.name, Modifier.padding(horizontal = 16.dp, vertical = 9.dp),
                    color = if (sel) Color.White else MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (sel) FontWeight.SemiBold else FontWeight.Medium, fontSize = 13.sp)
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// CHAT TAB
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun ChatTab(
    state: CommsUiState,
    onSelectWorkgroup: (Workgroup) -> Unit,
    onOpenGroupChat: () -> Unit,
    onOpenDirectMessage: (WorkgroupMember) -> Unit,
    onMeetNow: () -> Unit
) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        GradientHeader("Chat", state.selectedWorkgroup?.name) {
            if (state.selectedWorkgroup != null && state.members.size > 1) MeetNowPill(onMeetNow)
        }
        WorkgroupChips(state, onSelectWorkgroup)

        if (state.isLoadingWorkgroups || state.isLoadingMembers) { LoadingBox(); return }
        if (state.selectedWorkgroup == null) { EmptyBox("Select a workgroup"); return }

        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(top = 4.dp, bottom = 12.dp)) {
            item { SectionHeader("Team channel") }
            item {
                ModernRow(
                    leading = {
                        Box(Modifier.size(52.dp).clip(RoundedCornerShape(16.dp))
                            .background(Brush.linearGradient(listOf(Green, Gold))), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Person, null, tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                    },
                    title = state.selectedWorkgroup!!.name,
                    subtitle = "${state.members.size} members • General",
                    onClick = onOpenGroupChat
                )
            }
            val others = state.members.filter { it.userId != state.currentUserId }
            if (others.isNotEmpty()) item { SectionHeader("Direct messages") }
            items(others) { m ->
                ModernRow(
                    leading = { PresenceAvatar(m.fullName) },
                    title = m.fullName, subtitle = m.roleDisplayName,
                    onClick = { onOpenDirectMessage(m) }
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// CALLS TAB
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun CallsTab(
    state: CommsUiState,
    onMeetNow: () -> Unit,
    onCallMember: (WorkgroupMember) -> Unit
) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        GradientHeader("Calls", state.selectedWorkgroup?.name)

        // Big "Meet now" hero card — futuristic gradient
        Surface(
            onClick = onMeetNow,
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color.Transparent
        ) {
            Box(
                Modifier.background(Brush.linearGradient(listOf(Green, GreenLight, Gold)))
                    .padding(24.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Box(Modifier.size(56.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Call, null, tint = Color.White, modifier = Modifier.size(30.dp))
                    }
                    Column(Modifier.weight(1f)) {
                        Text("Meet now", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Text("Ring everyone in ${state.selectedWorkgroup?.name ?: "the group"}",
                            color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp)
                    }
                    Icon(Icons.Default.Call, null, tint = Color.White)
                }
            }
        }

        SectionHeader("Call a teammate")
        LazyColumn(Modifier.fillMaxSize()) {
            items(state.members.filter { it.userId != state.currentUserId }) { m ->
                ModernRow(
                    leading = { PresenceAvatar(m.fullName) },
                    title = m.fullName, subtitle = m.roleDisplayName,
                    trailing = {
                        FilledIconButton(onClick = { onCallMember(m) },
                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = Green.copy(alpha = 0.12f))) {
                            Icon(Icons.Default.Call, "Call", tint = Green, modifier = Modifier.size(20.dp))
                        }
                    },
                    onClick = { onCallMember(m) }
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// PEOPLE TAB
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun PeopleTab(
    state: CommsUiState,
    onOpenDirectMessage: (WorkgroupMember) -> Unit,
    onCallMember: (WorkgroupMember) -> Unit
) {
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        GradientHeader("People", "${state.members.size} in ${state.selectedWorkgroup?.name ?: "group"}")
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(top = 8.dp)) {
            items(state.members) { m ->
                val isMe = m.userId == state.currentUserId
                ModernRow(
                    leading = { PresenceAvatar(m.fullName) },
                    title = m.fullName + if (isMe) " (You)" else "",
                    subtitle = m.roleDisplayName,
                    trailing = if (isMe) null else ({
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(onClick = { onOpenDirectMessage(m) }) {
                                Icon(Icons.Default.Email, "Message", tint = Green, modifier = Modifier.size(20.dp))
                            }
                            IconButton(onClick = { onCallMember(m) }) {
                                Icon(Icons.Default.Call, "Call", tint = Green, modifier = Modifier.size(20.dp))
                            }
                        }
                    }),
                    onClick = { if (!isMe) onOpenDirectMessage(m) }
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// SHARED ROWS
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun MeetNowPill(onClick: () -> Unit) {
    Surface(onClick = onClick, shape = RoundedCornerShape(20.dp), color = Gold) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.Default.Call, null, tint = Color.White, modifier = Modifier.size(18.dp))
            Text("Meet now", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun ModernRow(
    leading: @Composable () -> Unit,
    title: String,
    subtitle: String,
    trailing: (@Composable () -> Unit)? = null,
    onClick: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        leading()
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 16.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (trailing != null) trailing() else Text("›", fontSize = 22.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(text.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
        color = Green.copy(alpha = 0.7f), letterSpacing = 1.2.sp,
        modifier = Modifier.padding(start = 20.dp, top = 18.dp, bottom = 6.dp))
}

@Composable
private fun LoadingBox() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Green)
    }
}

@Composable
private fun EmptyBox(text: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ═══════════════════════════════════════════════════════════════════
// CONVERSATION VIEW (Teams-style flat messages, per-message avatar/name)
// ═══════════════════════════════════════════════════════════════════

@Composable
private fun ConversationView(
    title: String,
    subtitle: String,
    isGroup: Boolean,
    state: CommsUiState,
    onBack: () -> Unit,
    onSend: (String) -> Unit,
    onStartGroupCall: (() -> Unit)? = null,
    onCall: (() -> Unit)? = null
) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) scope.launch { listState.animateScrollToItem(state.messages.size - 1) }
    }

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Header with call action
        Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Green, GreenLight)))
            .statusBarsPadding().padding(horizontal = 6.dp, vertical = 8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
                }
                Box(Modifier.size(40.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center) {
                    if (isGroup) Icon(Icons.Default.Person, null, tint = Color.White, modifier = Modifier.size(22.dp))
                    else Text(title.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""),
                        color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                    if (subtitle.isNotBlank()) Text(subtitle, color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
                }
                if (isGroup && onStartGroupCall != null) {
                    IconButton(onClick = onStartGroupCall) { Icon(Icons.Default.Call, "Meet", tint = Gold) }
                }
                if (!isGroup && onCall != null) {
                    IconButton(onClick = onCall) { Icon(Icons.Default.Call, "Call", tint = Gold) }
                }
            }
        }

        Box(Modifier.weight(1f).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.12f))) {
            when {
                state.isLoadingMessages -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Green, strokeWidth = 2.dp)
                }
                state.messages.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("💬", fontSize = 48.sp)
                        Spacer(Modifier.height(10.dp))
                        Text("No messages yet", fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Start the conversation", fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
                else -> LazyColumn(
                    state = listState, modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    items(state.messages, key = { it.id }) { msg ->
                        TeamsMessageRow(
                            message = msg,
                            isCurrentUser = msg.senderId == state.currentUserId,
                            showSender = isGroup
                        )
                    }
                }
            }
        }

        TeamsInput(isSending = state.isSending, onSend = onSend)
    }
}

/** Teams-style flat message row: avatar + name + time + text (not iMessage bubbles). */
@Composable
private fun TeamsMessageRow(message: Message, isCurrentUser: Boolean, showSender: Boolean) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp, horizontal = 4.dp),
        horizontalArrangement = if (isCurrentUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isCurrentUser) {
            Box(Modifier.size(34.dp).clip(CircleShape)
                .background(Brush.linearGradient(listOf(GreenLight, Green))), contentAlignment = Alignment.Center) {
                Text(message.senderName.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""),
                    color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(8.dp))
        }
        Column(horizontalAlignment = if (isCurrentUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 300.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (!isCurrentUser && showSender && message.senderName.isNotBlank()) {
                    Text(message.senderName, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Green)
                }
                Text(message.getFormattedTime(), fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
            }
            Spacer(Modifier.height(2.dp))
            Surface(
                shape = RoundedCornerShape(
                    topStart = if (isCurrentUser) 16.dp else 4.dp, topEnd = if (isCurrentUser) 4.dp else 16.dp,
                    bottomStart = 16.dp, bottomEnd = 16.dp
                ),
                color = if (isCurrentUser) Green else MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp
            ) {
                Text(message.text, Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                    color = if (isCurrentUser) Color.White else MaterialTheme.colorScheme.onSurface,
                    fontSize = 15.sp, lineHeight = 20.sp)
            }
        }
    }
}

@Composable
private fun TeamsInput(isSending: Boolean, onSend: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    Surface(shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(Modifier.weight(1f), shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Green.copy(alpha = 0.15f))) {
                TextField(
                    value = text, onValueChange = { text = it },
                    placeholder = { Text("Type a message", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) },
                    modifier = Modifier.fillMaxWidth(), maxLines = 5,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = {
                        if (text.isNotBlank() && !isSending) { onSend(text); text = "" }
                    }),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent,
                        disabledIndicatorColor = Color.Transparent
                    )
                )
            }
            AnimatedVisibility(text.isNotBlank(),
                enter = scaleIn(tween(150)) + fadeIn(tween(150)),
                exit = scaleOut(tween(100)) + fadeOut(tween(100))) {
                FilledIconButton(
                    onClick = { if (text.isNotBlank() && !isSending) { onSend(text); text = "" } },
                    enabled = !isSending, modifier = Modifier.size(46.dp), shape = CircleShape,
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Green)
                ) {
                    if (isSending) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                    else Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}
