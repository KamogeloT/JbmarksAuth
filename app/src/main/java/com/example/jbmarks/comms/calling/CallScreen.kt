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
 * Outgoing call screen — shown when user initiates a call.
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
        val currentUser = userRepo.getCurrentUser().getOrNull()
        if (currentUser == null) {
            onDismiss()
            return@LaunchedEffect
        }

        // Initialize if not already done
        if (!CallingService.isInCall()) {
            val initResult = CallingService.initialize(context, currentUser.id)
            if (initResult.isFailure) {
                onDismiss()
                return@LaunchedEffect
            }
        }

        CallingService.callUser(calleeUserId, calleeName)
    }

    // Duration timer
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.InCall) {
            while (true) {
                delay(1000)
                callDuration++
            }
        }
    }

    // Auto-dismiss when ended
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.Ended) {
            delay(2000)
            CallingService.resetState()
            onDismiss()
        }
    }

    CallUI(
        name = calleeName,
        state = callState,
        duration = callDuration,
        isMuted = isMuted,
        isSpeaker = isSpeaker,
        onMuteToggle = { isMuted = CallingService.toggleMute() },
        onSpeakerToggle = { isSpeaker = CallingService.toggleSpeaker() },
        onHangUp = { CallingService.hangUp() },
        onDismiss = {
            CallingService.resetState()
            onDismiss()
        }
    )
}

/**
 * Incoming call screen — shown when someone calls us.
 */
@Composable
fun IncomingCallScreen(
    callerName: String,
    onDismiss: () -> Unit
) {
    val callState by CallingService.callState.collectAsState()
    var callDuration by remember { mutableIntStateOf(0) }
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(false) }

    // Duration timer
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.InCall) {
            while (true) {
                delay(1000)
                callDuration++
            }
        }
    }

    // Auto-dismiss when ended
    LaunchedEffect(callState) {
        if (callState is CallingService.CallUiState.Ended || callState is CallingService.CallUiState.Idle) {
            if (callDuration > 0 || callState is CallingService.CallUiState.Ended) {
                delay(2000)
                CallingService.resetState()
                onDismiss()
            }
        }
    }

    // Show accept/reject UI if still ringing, otherwise show in-call UI
    if (callState is CallingService.CallUiState.Ringing && CallingService.incomingCall.value != null) {
        IncomingCallRingingUI(
            callerName = callerName,
            onAccept = { CallingService.acceptIncomingCall() },
            onReject = {
                CallingService.rejectIncomingCall()
                onDismiss()
            }
        )
    } else {
        CallUI(
            name = callerName,
            state = callState,
            duration = callDuration,
            isMuted = isMuted,
            isSpeaker = isSpeaker,
            onMuteToggle = { isMuted = CallingService.toggleMute() },
            onSpeakerToggle = { isSpeaker = CallingService.toggleSpeaker() },
            onHangUp = { CallingService.hangUp() },
            onDismiss = {
                CallingService.resetState()
                onDismiss()
            }
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// SHARED CALL UI
// ═══════════════════════════════════════════════════════════════

@Composable
private fun CallUI(
    name: String,
    state: CallingService.CallUiState,
    duration: Int,
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
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF1B5E20), Color(0xFF0D3311))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp)
        ) {
            Spacer(Modifier.height(80.dp))

            // Avatar + name + status
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                val pulseScale = if (state is CallingService.CallUiState.Ringing || state is CallingService.CallUiState.Connecting) {
                    val transition = rememberInfiniteTransition(label = "pulse")
                    transition.animateFloat(
                        initialValue = 1f, targetValue = 1.12f,
                        animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
                        label = "scale"
                    ).value
                } else 1f

                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(pulseScale)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = name.split(" ").take(2)
                            .mapNotNull { it.firstOrNull()?.uppercase() }
                            .joinToString(""),
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(Modifier.height(20.dp))

                Text(name, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Spacer(Modifier.height(8.dp))

                Text(
                    text = when (state) {
                        is CallingService.CallUiState.Connecting -> "Connecting..."
                        is CallingService.CallUiState.Ringing -> "Ringing..."
                        is CallingService.CallUiState.InCall -> formatDuration(duration)
                        is CallingService.CallUiState.Ended -> "Call Ended"
                        is CallingService.CallUiState.Error -> (state as CallingService.CallUiState.Error).message
                        else -> ""
                    },
                    fontSize = 16.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }

            Spacer(Modifier.weight(1f))

            // Controls
            when (state) {
                is CallingService.CallUiState.InCall,
                is CallingService.CallUiState.Ringing,
                is CallingService.CallUiState.Connecting -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        CallBtn(if (isMuted) "🔇" else "🎤", if (isMuted) "Unmute" else "Mute", isMuted) { onMuteToggle() }

                        // End call (red)
                        FloatingActionButton(
                            onClick = onHangUp,
                            containerColor = Color(0xFFD32F2F),
                            modifier = Modifier.size(72.dp),
                            shape = CircleShape
                        ) {
                            Icon(Icons.Default.Call, "End", tint = Color.White, modifier = Modifier.size(32.dp))
                        }

                        CallBtn(if (isSpeaker) "🔊" else "🔈", "Speaker", isSpeaker) { onSpeakerToggle() }
                    }
                }
                else -> {
                    Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f))) {
                        Text("Close", color = Color.White)
                    }
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun IncomingCallRingingUI(
    callerName: String,
    onAccept: () -> Unit,
    onReject: () -> Unit
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
                val transition = rememberInfiniteTransition(label = "ring")
                val scale by transition.animateFloat(
                    1f, 1.15f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "s"
                )

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

            // Accept / Reject
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                // Reject (red)
                FloatingActionButton(
                    onClick = onReject,
                    containerColor = Color(0xFFD32F2F),
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape
                ) {
                    Text("✕", fontSize = 28.sp, color = Color.White)
                }

                // Accept (green)
                FloatingActionButton(
                    onClick = onAccept,
                    containerColor = Color(0xFF4CAF50),
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape
                ) {
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
        FloatingActionButton(
            onClick = onClick,
            containerColor = if (active) Color.White.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f),
            modifier = Modifier.size(56.dp),
            shape = CircleShape
        ) { Text(icon, fontSize = 24.sp) }
        Spacer(Modifier.height(6.dp))
        Text(label, fontSize = 12.sp, color = Color.White.copy(alpha = 0.7f))
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "%02d:%02d".format(mins, secs)
}
