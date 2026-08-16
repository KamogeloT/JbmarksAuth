package com.example.jbmarks.comms.calling

import android.app.Application
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call

import androidx.compose.material.icons.filled.Person
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.azure.android.communication.calling.CallState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

sealed class CallScreenState {
    object Connecting : CallScreenState()
    object Ringing : CallScreenState()
    object InCall : CallScreenState()
    object Ended : CallScreenState()
    data class Error(val message: String) : CallScreenState()
}

@Composable
fun CallScreen(
    calleeName: String,
    calleeUserId: String,
    isGroupCall: Boolean = false,
    groupMemberIds: List<String> = emptyList(),
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val callingService = remember { CallingService(context) }
    val coroutineScope = rememberCoroutineScope()

    var callState by remember { mutableStateOf<CallScreenState>(CallScreenState.Connecting) }
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(false) }
    var callDuration by remember { mutableIntStateOf(0) }

    // Initialize and start call
    LaunchedEffect(Unit) {
        // Get current user ID
        val userRepo = com.example.jbmarks.user.data.UserRepository(context)
        val currentUser = userRepo.getCurrentUser().getOrNull()
        if (currentUser == null) {
            callState = CallScreenState.Error("Not authenticated")
            return@LaunchedEffect
        }

        // Initialize calling service
        val initResult = callingService.initialize(currentUser.id)
        if (initResult.isFailure) {
            callState = CallScreenState.Error("Failed to initialize: ${initResult.exceptionOrNull()?.message}")
            return@LaunchedEffect
        }

        callState = CallScreenState.Ringing

        // Start the call
        val callResult = if (isGroupCall) {
            callingService.groupCall(groupMemberIds)
        } else {
            callingService.callUser(calleeUserId)
        }

        if (callResult.isSuccess) {
            callState = CallScreenState.InCall
            // Start duration timer
            while (callingService.isInCall()) {
                delay(1000)
                callDuration++
            }
            callState = CallScreenState.Ended
        } else {
            callState = CallScreenState.Error(callResult.exceptionOrNull()?.message ?: "Call failed")
        }
    }

    // Auto-dismiss after call ends
    LaunchedEffect(callState) {
        if (callState is CallScreenState.Ended) {
            delay(2000)
            onDismiss()
        }
    }

    // Full-screen call UI
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1B5E20),
                        Color(0xFF0D3311)
                    )
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
            Spacer(Modifier.height(60.dp))

            // Callee info
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Avatar with pulse animation when ringing
                val pulseScale = if (callState is CallScreenState.Ringing) {
                    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
                    infiniteTransition.animateFloat(
                        initialValue = 1f,
                        targetValue = 1.15f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(800),
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "pulseScale"
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
                        text = calleeName.split(" ").take(2)
                            .mapNotNull { it.firstOrNull()?.uppercase() }
                            .joinToString(""),
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }

                Spacer(Modifier.height(20.dp))

                Text(
                    text = calleeName,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )

                Spacer(Modifier.height(8.dp))

                // Status text
                Text(
                    text = when (callState) {
                        is CallScreenState.Connecting -> "Connecting..."
                        is CallScreenState.Ringing -> "Ringing..."
                        is CallScreenState.InCall -> formatDuration(callDuration)
                        is CallScreenState.Ended -> "Call Ended"
                        is CallScreenState.Error -> (callState as CallScreenState.Error).message
                    },
                    fontSize = 16.sp,
                    color = Color.White.copy(alpha = 0.7f)
                )
            }

            Spacer(Modifier.weight(1f))

            // Call controls
            if (callState is CallScreenState.InCall || callState is CallScreenState.Ringing) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Mute button
                    CallControlButton(
                        icon = if (isMuted) "🔇" else "🎤",
                        label = if (isMuted) "Unmute" else "Mute",
                        isActive = isMuted,
                        onClick = {
                            isMuted = callingService.toggleMute()
                        }
                    )

                    // End call button (large, red)
                    FloatingActionButton(
                        onClick = {
                            callingService.hangUp()
                            callState = CallScreenState.Ended
                        },
                        containerColor = Color(0xFFD32F2F),
                        modifier = Modifier.size(72.dp),
                        shape = CircleShape
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "End Call",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    // Speaker button
                    CallControlButton(
                        icon = if (isSpeaker) "🔊" else "🔈",
                        label = if (isSpeaker) "Speaker" else "Earpiece",
                        isActive = isSpeaker,
                        onClick = {
                            isSpeaker = callingService.toggleSpeaker()
                        }
                    )
                }
            } else if (callState is CallScreenState.Error || callState is CallScreenState.Ended) {
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f))
                ) {
                    Text("Close", color = Color.White)
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun CallControlButton(
    icon: String,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FloatingActionButton(
            onClick = onClick,
            containerColor = if (isActive) Color.White.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f),
            modifier = Modifier.size(56.dp),
            shape = CircleShape
        ) {
            Text(icon, fontSize = 24.sp)
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color.White.copy(alpha = 0.7f)
        )
    }
}

private fun formatDuration(seconds: Int): String {
    val mins = seconds / 60
    val secs = seconds % 60
    return "%02d:%02d".format(mins, secs)
}
