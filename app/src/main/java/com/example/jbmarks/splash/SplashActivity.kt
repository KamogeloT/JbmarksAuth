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

                // Check for updates on every launch — force update blocks navigation
                UpdateDialogHost()

                LaunchedEffect(Unit) {
                    delay(2000)

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