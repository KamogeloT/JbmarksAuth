package com.example.jbmarks

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.auth.ui.AuthActivity
import com.example.jbmarks.navigation.AppNavigation
import com.example.jbmarks.ui.theme.JBmarksTheme

class MainActivity : ComponentActivity() {
    
    private val tokenManager by lazy { TokenManager(this) }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            JBmarksTheme {
                // Check authentication status
                LaunchedEffect(Unit) {
                    val hasValidToken = tokenManager.getAccessToken() != null && 
                                       !tokenManager.isTokenExpired()
                    if (!hasValidToken) {
                        // Redirect to login if not authenticated
                        startActivity(Intent(this@MainActivity, AuthActivity::class.java))
                        finish()
                    }
                }
                
                // Only show main app if authenticated
                AppNavigation()
            }
        }
    }
}