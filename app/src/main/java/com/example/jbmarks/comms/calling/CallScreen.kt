package com.example.jbmarks.comms.calling

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Outgoing call screen.
 */
@Composable
fun CallScreen(
    calleeName: String,
    calleeUserId: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val callState by CallingService.callState.collectAsState()
    var callDuration by remember { mutableIntStateOf(0) }
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(false) }

    // Start the call
    LaunchedEffect(Unit) {
        val userRepo = com.example.jbmarks.user.data.UserRepository(context)
        val currentUser = userRepo.getCurrentUser().getOrNull() ?: run {
            onDismiss(); return@LaunchedEffect
        }
        CallingService.startCall(context, currentUser.id, currentUser.fullName, calleeUserId)
    }

    // Duration timer
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.InCall) {
            while (true) { delay(1000); callDuration++ }
        }
    }

    // Auto-dismiss when ended
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.Ended) {
            delay(2000); CallingService.resetState(); onDismiss()
        }
    }

    CallUI(
        name = calleeName,
        statusText = when (callState) {
            is CallingService.CallUiState.Connecting -> "Connecting..."
            is CallingService.CallUiState.WaitingForAnswer -> "Ringing..."
            is CallingService.CallUiState.InCall -> formatDuration(callDuration)
            is CallingService.CallUiState.Ended -> "Call Ended"
            is CallingService.CallUiState.Error -> (callState as CallingService.CallUiState.Error).message
            else -> ""
        },
        isRinging = callState is CallingService.CallUiState.WaitingForAnswer || callState is CallingService.CallUiState.Connecting,
        showControls = callState is CallingService.CallUiState.InCall || callState is CallingService.CallUiState.WaitingForAnswer || callState is CallingService.CallUiState.Connecting,
        isMuted = isMuted,
        isSpeaker = isSpeaker,
        onMuteToggle = { isMuted = CallingService.toggleMute() },
        onSpeakerToggle = { isSpeaker = CallingService.toggleSpeaker() },
        onHangUp = { CallingService.hangUp() },
        onDismiss = { CallingService.resetState(); onDismiss() }
    )
}

/**
 * Incoming call screen — shown when push arrives.
 */
@Composable
fun IncomingCallScreen(
    callerName: String,
    roomId: String,
    callerUserId: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val callState by CallingService.callState.collectAsState()
    var callDuration by remember { mutableIntStateOf(0) }
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(false) }
    var accepted by remember { mutableStateOf(false) }

    // Duration timer after accepting
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.InCall) {
            while (true) { delay(1000); callDuration++ }
        }
    }

    // Auto-dismiss
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.Ended) {
            delay(2000); CallingService.resetState(); onDismiss()
        }
        if (callState is CallingService.CallUiState.Idle && accepted) {
            onDismiss()
        }
    }

    if (!accepted && callState is CallingService.CallUiState.IncomingCall) {
        // Show Accept / Decline
        IncomingCallRingingUI(
            callerName = callerName,
            onAccept = {
                accepted = true
                coroutineScope.launch {
                    try {
                        val userRepo = com.example.jbmarks.user.data.UserRepository(context)
                        val currentUser = userRepo.getCurrentUser().getOrNull()
                        if (currentUser != null) {
                            CallingService.acceptCall(context, currentUser.id, currentUser.fullName, roomId)
                        } else {
                            CallingService.resetState()
                            onDismiss()
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("IncomingCallScreen", "Accept failed", e)
                        CallingService.resetState()
                        onDismiss()
                    }
                }
            },
            onDecline = {
                CallingService.declineCall(context)
                onDismiss()
            }
        )
    } else {
        // In-call UI
        CallUI(
            name = callerName,
            statusText = when (callState) {
                is CallingService.CallUiState.Connecting -> "Connecting..."
                is CallingService.CallUiState.InCall -> formatDuration(callDuration)
                is CallingService.CallUiState.Ended -> "Call Ended"
                is CallingService.CallUiState.Error -> (callState as CallingService.CallUiState.Error).message
                else -> "Connecting..."
            },
            isRinging = false,
            showControls = true,
            isMuted = isMuted,
            isSpeaker = isSpeaker,
            onMuteToggle = { isMuted = CallingService.toggleMute() },
            onSpeakerToggle = { isSpeaker = CallingService.toggleSpeaker() },
            onHangUp = { CallingService.hangUp() },
            onDismiss = { CallingService.resetState(); onDismiss() }
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

@Composable
private fun CallUI(
    name: String,
    statusText: String,
    isRinging: Boolean,
    showControls: Boolean,
    isMuted: Boolean,
    isSpeaker: Boolean,
    onMuteToggle: () -> Unit,
    onSpeakerToggle: () -> Unit,
    onHangUp: () -> Unit,
    onDismiss: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFF1B5E20), Color(0xFF0D3311)))),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxSize().padding(32.dp)
        ) {
            Spacer(Modifier.height(80.dp))

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                val pulse = if (isRinging) {
                    val t = rememberInfiniteTransition(label = "p")
                    t.animateFloat(1f, 1.12f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "s").value
                } else 1f

                Box(
                    modifier = Modifier.size(120.dp).scale(pulse).clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""),
                        fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Color.White
                    )
                }
                Spacer(Modifier.height(20.dp))
                Text(name, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Spacer(Modifier.height(8.dp))
                Text(statusText, fontSize = 16.sp, color = Color.White.copy(alpha = 0.7f))
            }

            Spacer(Modifier.weight(1f))

            if (showControls) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    CallBtn(if (isMuted) "🔇" else "🎤", if (isMuted) "Unmute" else "Mute", isMuted) { onMuteToggle() }
                    FloatingActionButton(onClick = onHangUp, containerColor = Color(0xFFD32F2F), modifier = Modifier.size(72.dp), shape = CircleShape) {
                        Icon(Icons.Default.Call, "End", tint = Color.White, modifier = Modifier.size(32.dp))
                    }
                    CallBtn(if (isSpeaker) "🔊" else "🔈", "Speaker", isSpeaker) { onSpeakerToggle() }
                }
            } else {
                Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f))) {
                    Text("Close", color = Color.White)
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun IncomingCallRingingUI(callerName: String, onAccept: () -> Unit, onDecline: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF1B5E20), Color(0xFF0D3311)))),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxSize().padding(32.dp)
        ) {
            Spacer(Modifier.height(80.dp))

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                val t = rememberInfiniteTransition(label = "ring")
                val scale by t.animateFloat(1f, 1.15f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "s")

                Box(
                    modifier = Modifier.size(120.dp).scale(scale).clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        callerName.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString(""),
                        fontSize = 40.sp, fontWeight = FontWeight.Bold, color = Color.White
                    )
                }
                Spacer(Modifier.height(20.dp))
                Text(callerName, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Spacer(Modifier.height(8.dp))
                Text("Incoming Call...", fontSize = 16.sp, color = Color.White.copy(alpha = 0.7f))
            }

            Spacer(Modifier.weight(1f))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                FloatingActionButton(onClick = onDecline, containerColor = Color(0xFFD32F2F), modifier = Modifier.size(72.dp), shape = CircleShape) {
                    Text("✕", fontSize = 28.sp, color = Color.White)
                }
                FloatingActionButton(onClick = onAccept, containerColor = Color(0xFF4CAF50), modifier = Modifier.size(72.dp), shape = CircleShape) {
                    Icon(Icons.Default.Call, "Accept", tint = Color.White, modifier = Modifier.size(32.dp))
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun CallBtn(icon: String, label: String, active: Boolean, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FloatingActionButton(onClick = onClick, containerColor = if (active) Color.White.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f), modifier = Modifier.size(56.dp), shape = CircleShape) {
            Text(icon, fontSize = 24.sp)
        }
        Spacer(Modifier.height(6.dp))
        Text(label, fontSize = 12.sp, color = Color.White.copy(alpha = 0.7f))
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60; val secs = seconds % 60
    return "%02d:%02d".format(mins, secs)
}
