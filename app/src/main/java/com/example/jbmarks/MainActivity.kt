package com.example.jbmarks

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.auth.ui.AuthActivity
import com.example.jbmarks.navigation.AppNavigation
import com.example.jbmarks.ui.theme.JBmarksTheme

class MainActivity : ComponentActivity() {

    private val tokenManager by lazy { TokenManager(this) }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            android.util.Log.d("MainActivity", "Notification permission granted")
        } else {
            android.util.Log.w("MainActivity", "Notification permission denied")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Request notification permission on Android 13+ (API 33)
        requestNotificationPermission()

        // Restore an incoming call if launched from the call notification
        // (handles the case where the app process had been killed).
        handleCallIntent(intent)

        setContent {
            JBmarksTheme {
                // Auth check state — null = checking, true = authenticated, false = not
                var authChecked by remember { mutableStateOf<Boolean?>(null) }

                LaunchedEffect(Unit) {
                    val hasValidToken = tokenManager.getAccessToken() != null &&
                            !tokenManager.isTokenExpired()
                    if (!hasValidToken) {
                        startActivity(Intent(this@MainActivity, AuthActivity::class.java))
                        finish()
                    } else {
                        authChecked = true
                    }
                }

                when (authChecked) {
                    true -> AppNavigation()
                    else -> {
                        // Show spinner while auth check is in progress
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleCallIntent(intent)
    }

    /**
     * Restore the incoming-call state from a notification/full-screen intent.
     * Works even after process death because all call data is in the extras.
     */
    private fun handleCallIntent(intent: Intent?) {
        if (intent == null) return
        val isIncoming = intent.getBooleanExtra("incoming_call", false)
        val isAccept = intent.getBooleanExtra("accept_call", false)
        if (!isIncoming && !isAccept) return

        val callerName = intent.getStringExtra("caller_name") ?: "Unknown"
        val callerId = intent.getStringExtra("caller_id") ?: ""
        val roomId = intent.getStringExtra("room_id") ?: ""
        val isGroup = intent.getStringExtra("call_kind") == "group"
        val groupName = intent.getStringExtra("group_name") ?: ""
        if (roomId.isEmpty()) return

        android.util.Log.d("MainActivity", "Restoring incoming call | room=$roomId accept=$isAccept group=$isGroup")
        com.example.jbmarks.comms.calling.CallingService.restoreIncomingCall(
            callerName, callerId, roomId, autoAccept = isAccept, isGroup = isGroup, groupName = groupName
        )
        // Clear the flags so a config change / relaunch doesn't re-trigger.
        intent.removeExtra("incoming_call")
        intent.removeExtra("accept_call")
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val permission = Manifest.permission.POST_NOTIFICATIONS
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(permission)
            }
        }
    }
}