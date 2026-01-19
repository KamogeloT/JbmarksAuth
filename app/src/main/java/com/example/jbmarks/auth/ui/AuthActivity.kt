package com.example.jbmarks.auth.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.jbmarks.MainActivity
import com.example.jbmarks.ui.theme.JBmarksTheme
import com.example.jbmarks.utils.AssetLoader
import kotlinx.coroutines.delay

class AuthActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            JBmarksTheme {
                SplashScreen()
            }
        }
    }

    @Composable
    private fun SplashScreen() {
        val context = LocalContext.current
        
        LaunchedEffect(Unit) {
            delay(2000) // Wait for 2 seconds
            startActivity(Intent(this@AuthActivity, MainActivity::class.java))
            finish()
        }

        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.primary) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    // Display JBmarks Logo
                    val logoBitmap = AssetLoader.loadBitmap(context, "jbmarkslogo.jpg")
                        ?: AssetLoader.loadBitmap(context, "splash-icon.png")
                        ?: AssetLoader.loadBitmap(context, "icon.png")
                    
                    if (logoBitmap != null) {
                        Image(
                            bitmap = logoBitmap.asImageBitmap(),
                            contentDescription = "JBmarks Logo",
                            modifier = Modifier.size(200.dp)
                        )
                    } else {
                        // Fallback to text if no image available
                        androidx.compose.material3.Text(
                            text = "JBmarks",
                            style = MaterialTheme.typography.displayMedium,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    // Loading indicator
                    CircularProgressIndicator(
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(48.dp)
                    )
                }
            }
        }
    }
}