package com.example.jbmarks.auth.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import com.example.jbmarks.MainActivity
import com.example.jbmarks.auth.data.OAuthService
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.config.Config
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.ui.theme.JBmarksTheme
import kotlinx.coroutines.launch

class AuthActivity : ComponentActivity() {
    
    private val tokenManager by lazy { TokenManager(this) }
    private val oAuthService = OAuthService()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            JBmarksTheme {
                AuthScreen(initialIntent = intent)
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent?.let { 
            setContent {
                JBmarksTheme {
                    AuthScreen(initialIntent = it)
                }
            }
        }
    }
    
    private fun handleOAuthCallback(intent: Intent, scope: kotlinx.coroutines.CoroutineScope) {
        val data = intent.data
        if (data != null && data.scheme == "jbmarks" && data.host == "oauth_redirect") {
            val code = data.getQueryParameter("code")
            if (code != null) {
                // Exchange code for tokens in a coroutine
                scope.launch {
                    exchangeCodeForTokens(code)
                }
            }
        }
    }
    
    @Composable
    private fun AuthScreen(initialIntent: Intent? = null) {
        val context = LocalContext.current
        var isLoading by remember { mutableStateOf(false) }
        var errorMessage by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        
        // Check if already authenticated
        LaunchedEffect(Unit) {
            val hasValidToken = tokenManager.getAccessToken() != null && 
                               !tokenManager.isTokenExpired()
            if (hasValidToken) {
                navigateToMain()
            }
        }
        
        // Handle OAuth callback from deep link
        LaunchedEffect(initialIntent) {
            initialIntent?.let { handleOAuthCallback(it, scope) }
        }
        
        LoginScreen(
            onLoginClick = { portalUrl ->
                isLoading = true
                errorMessage = null
                
                scope.launch {
                    try {
                        // Normalize portal URL (remove trailing slash, add https if missing)
                        val normalizedUrl = normalizePortalUrl(portalUrl)
                        tokenManager.savePortalUrl(normalizedUrl)
                        
                        // Build authorization URL
                        val authUrl = Config.buildAuthorizationUrl(
                            portalUrl = normalizedUrl,
                            clientId = Config.BITRIX_CLIENT_ID
                        )
                        
                        // Open Custom Tab or browser for OAuth
                        val customTabsIntent = CustomTabsIntent.Builder()
                            .setShowTitle(true)
                            .build()
                        
                        customTabsIntent.launchUrl(context, Uri.parse(authUrl))
                        
                        // Note: Token exchange will happen in handleOAuthCallback
                        // when the deep link is received
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Failed to start login"
                        isLoading = false
                    }
                }
            },
            isLoading = isLoading,
            errorMessage = errorMessage
        )
    }
    
    private suspend fun exchangeCodeForTokens(code: String) {
        val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
        
        val result = oAuthService.exchangeCodeForTokens(
            portalUrl = portalUrl,
            clientId = Config.BITRIX_CLIENT_ID,
            clientSecret = Config.BITRIX_CLIENT_SECRET,
            code = code
        )
        
        result.onSuccess { tokenResponse ->
            // Save tokens
            tokenManager.saveTokens(
                tokenResponse.access_token,
                tokenResponse.refresh_token
            )
            tokenManager.saveTokenExpiry(tokenResponse.expires_in)
            
            // Refresh Retrofit instance with new portal URL
            RetrofitInstance.refreshRetrofitInstance()
            
            // Navigate to main app
            navigateToMain()
        }.onFailure { error ->
            // Handle error - could show error message
            error.printStackTrace()
        }
    }
    
    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
    
    private fun normalizePortalUrl(url: String): String {
        var normalized = url.trim()
        
        // Remove trailing slash
        if (normalized.endsWith("/")) {
            normalized = normalized.dropLast(1)
        }
        
        // Add https if no protocol
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://$normalized"
        }
        
        return normalized
    }
}