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

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val permission = Manifest.permission.POST_NOTIFICATIONS
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                notificationPermissionLauncher.launch(permission)
            }
        }
    }
}