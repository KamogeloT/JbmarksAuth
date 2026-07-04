package com.example.jbmarks.splash

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import com.example.jbmarks.MainActivity
import com.example.jbmarks.ui.theme.JBmarksTheme
import com.example.jbmarks.update.UpdateDialogHost
import com.example.jbmarks.utils.AssetLoader
import kotlinx.coroutines.delay

@SuppressLint("CustomSplashScreen")
class SplashActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            JBmarksTheme {
                val context = LocalContext.current

                // Gate: only navigate when update check is resolved
                var readyToNavigate by remember { mutableStateOf(false) }

                // Update check — blocks navigation until resolved
                UpdateDialogHost(
                    onReadyToNavigate = { readyToNavigate = true }
                )

                // Navigate only after update check says it's OK
                LaunchedEffect(readyToNavigate) {
                    if (!readyToNavigate) return@LaunchedEffect

                    delay(300) // brief pause so splash is visible

                    val tokenManager = com.example.jbmarks.auth.data.TokenManager(context)
                    val hasValidToken = tokenManager.getAccessToken() != null &&
                                       !tokenManager.isTokenExpired()

                    if (hasValidToken) {
                        startActivity(Intent(this@SplashActivity, MainActivity::class.java))
                    } else {
                        startActivity(Intent(this@SplashActivity, com.example.jbmarks.auth.ui.AuthActivity::class.java))
                    }
                    finish()
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        val splashBitmap = AssetLoader.loadBitmap(context, "splash_banner.jpg")
                            ?: AssetLoader.loadBitmap(context, "splash_banner.png")
                            ?: AssetLoader.loadBitmap(context, "splash.jpg")
                            ?: AssetLoader.loadBitmap(context, "splash.png")
                            ?: AssetLoader.loadBitmap(context, "jbmarkslogo.jpg")

                        if (splashBitmap != null) {
                            Image(
                                bitmap = splashBitmap.asImageBitmap(),
                                contentDescription = "JBmarks Splash Screen",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Fit
                            )
                        }
                    }
                }
            }
        }
    }
}