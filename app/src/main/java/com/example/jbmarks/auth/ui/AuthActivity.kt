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
import com.example.jbmarks.notifications.fcm.FCMTokenManager
import com.example.jbmarks.ui.theme.JBmarksTheme
import kotlinx.coroutines.launch

class AuthActivity : ComponentActivity() {
    
    private val tokenManager by lazy { TokenManager(this) }
    private val oAuthService = OAuthService()
    private var isProcessingOAuth = false // Class-level flag to prevent duplicate processing
    private var processedCode: String? = null // Track which code we've already processed
    private var isAuthInProgress = false // Prevent launching auth multiple times
    private var lastAuthStartedAt: Long = 0 // Timestamp of last auth launch
    private var lastProcessedCode: String? = null // Last code we processed
    
    // Shared error state that can trigger recomposition
    private var sharedErrorMessage: String? = null
        set(value) {
            field = value
            // Trigger recomposition when error is set
            if (value != null) {
                setContent {
                    JBmarksTheme {
                        AuthScreen(initialIntent = intent, errorMessageOverride = value)
                    }
                }
            }
        }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Log intent data for debugging
        android.util.Log.d("AuthActivity", "onCreate - Intent: ${intent.data}")
        
        setContent {
            JBmarksTheme {
                AuthScreen(initialIntent = intent)
            }
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        
        // Log new intent data for debugging
        android.util.Log.d("AuthActivity", "onNewIntent - Intent: ${intent?.data}")
        
        // Handle OAuth callback - process it directly here
        intent?.data?.let { data ->
            if (data.scheme == "jbmarks" && data.host == "oauth_redirect") {
                val code = data.getQueryParameter("code")
                val error = data.getQueryParameter("error")
                val domain = data.getQueryParameter("domain")
                val memberId = data.getQueryParameter("member_id")
                
                if (code != null && processedCode != code && !isProcessingOAuth) {
                    android.util.Log.d("AuthActivity", "onNewIntent - Processing OAuth callback with code")
                    processedCode = code
                    isProcessingOAuth = true
                    
                    // Process the token exchange directly
                    kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                        try {
                            android.util.Log.d("AuthActivity", "onNewIntent - Starting token exchange")
                            val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
                            
                            val result = oAuthService.exchangeCodeForTokens(
                                portalUrl = portalUrl,
                                clientId = Config.BITRIX_CLIENT_ID,
                                clientSecret = Config.BITRIX_CLIENT_SECRET,
                                code = code,
                                domain = domain,
                                memberId = memberId
                            )
                            
                            result.onSuccess { tokenResponse ->
                                android.util.Log.d("AuthActivity", "Token exchange successful in onNewIntent")
                                tokenManager.saveTokens(
                                    tokenResponse.access_token,
                                    tokenResponse.refresh_token
                                )
                                tokenManager.saveTokenExpiry(tokenResponse.expires_in)
                                RetrofitInstance.refreshRetrofitInstance()
                                
                                // Register FCM token after successful authentication
                                android.util.Log.d("AuthActivity", "Registering FCM token")
                                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                                    FCMTokenManager(this@AuthActivity).checkAndRegisterToken()
                                }
                                
                                isProcessingOAuth = false
                                isAuthInProgress = false
                                lastProcessedCode = code
                                navigateToMain()
                            }.onFailure { error ->
                                android.util.Log.e("AuthActivity", "Token exchange failed in onNewIntent", error)
                                isProcessingOAuth = false
                                isAuthInProgress = false // Allow retry
                                processedCode = null // Reset so user can retry with new code
                                lastProcessedCode = null
                                // Set error message to trigger recomposition
                                val errorMsg = error.message ?: "Authentication failed. The authorization code may have expired. Please try signing in again."
                                sharedErrorMessage = errorMsg
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("AuthActivity", "Exception in onNewIntent token exchange", e)
                            isProcessingOAuth = false
                        }
                    }
                } else if (code != null && processedCode == code) {
                    android.util.Log.w("AuthActivity", "onNewIntent - Code already processed, ignoring")
                } else if (error != null) {
                    android.util.Log.e("AuthActivity", "onNewIntent - OAuth error: $error")
                    isProcessingOAuth = false
                }
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        android.util.Log.d("AuthActivity", "onResume - Checking for missed deep link")
        
        // CRITICAL: onResume should NEVER launch auth automatically
        // Only check for missed deep links, never call openAuthUrl or buildAuthorizationUrl
        
        // Check if we have a deep link in the current intent that we might have missed
        intent?.data?.let { data ->
            if (data.scheme == "jbmarks" && data.host == "oauth_redirect") {
                val code = data.getQueryParameter("code")
                if (code != null && processedCode != code && !isProcessingOAuth) {
                    android.util.Log.d("AuthActivity", "onResume - Found missed deep link, processing")
                    processedCode = code
                    isProcessingOAuth = true
                    isAuthInProgress = false // Auth is complete, we're processing callback
                    
                    // Process the token exchange directly (same as onNewIntent)
                    kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.Main).launch {
                        try {
                            android.util.Log.d("AuthActivity", "onResume - Starting token exchange")
                            val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
                            
                            val result = oAuthService.exchangeCodeForTokens(
                                portalUrl = portalUrl,
                                clientId = Config.BITRIX_CLIENT_ID,
                                clientSecret = Config.BITRIX_CLIENT_SECRET,
                                code = code,
                                domain = data.getQueryParameter("domain"),
                                memberId = data.getQueryParameter("member_id")
                            )
                            
                            result.onSuccess { tokenResponse ->
                                android.util.Log.d("AuthActivity", "Token exchange successful in onResume")
                                tokenManager.saveTokens(
                                    tokenResponse.access_token,
                                    tokenResponse.refresh_token
                                )
                                tokenManager.saveTokenExpiry(tokenResponse.expires_in)
                                RetrofitInstance.refreshRetrofitInstance()
                                
                                // Register FCM token after successful authentication
                                android.util.Log.d("AuthActivity", "Registering FCM token")
                                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                                    FCMTokenManager(this@AuthActivity).checkAndRegisterToken()
                                }
                                
                                isProcessingOAuth = false
                                isAuthInProgress = false
                                lastProcessedCode = code
                                navigateToMain()
                            }.onFailure { error ->
                                android.util.Log.e("AuthActivity", "Token exchange failed in onResume", error)
                                isProcessingOAuth = false
                                isAuthInProgress = false // Allow retry
                                processedCode = null // Reset so user can retry with new code
                                lastProcessedCode = null
                                // Set error message to trigger recomposition
                                val errorMsg = error.message ?: "Authentication failed. The authorization code may have expired. Please try signing in again."
                                sharedErrorMessage = errorMsg
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("AuthActivity", "Exception in onResume token exchange", e)
                            isProcessingOAuth = false
                            isAuthInProgress = false
                        }
                    }
                } else {
                    // No code or already processed - check for timeout
                    if (isAuthInProgress && System.currentTimeMillis() - lastAuthStartedAt > 30000) {
                        android.util.Log.w("AuthActivity", "Auth timeout detected in onResume")
                        isAuthInProgress = false
                        // Don't auto-launch - let user retry manually
                    }
                }
            } else {
                // Not a deep link - check for timeout if auth was in progress
                if (isAuthInProgress && System.currentTimeMillis() - lastAuthStartedAt > 30000) {
                    android.util.Log.w("AuthActivity", "Auth timeout - no callback received")
                    isAuthInProgress = false
                }
            }
        } ?: run {
            // No intent data - check for timeout if auth was in progress
            if (isAuthInProgress && System.currentTimeMillis() - lastAuthStartedAt > 30000) {
                android.util.Log.w("AuthActivity", "Auth timeout - no callback received")
                isAuthInProgress = false
            }
        }
    }
    
    private fun handleOAuthCallback(
        intent: Intent, 
        scope: kotlinx.coroutines.CoroutineScope,
        setIsProcessing: (Boolean) -> Unit,
        setIsLoading: (Boolean) -> Unit,
        setErrorMessage: (String?) -> Unit
    ) {
        val data = intent.data
        android.util.Log.d("AuthActivity", "handleOAuthCallback - data: $data")
        
        if (data != null && data.scheme == "jbmarks" && data.host == "oauth_redirect") {
            val code = data.getQueryParameter("code")
            val error = data.getQueryParameter("error")
            val domain = data.getQueryParameter("domain")
            val memberId = data.getQueryParameter("member_id")
            
            android.util.Log.d("AuthActivity", "Deep link detected - code: ${code != null}, error: $error")
            android.util.Log.d("AuthActivity", "Domain: $domain, Member ID: $memberId")
            
            // Prevent duplicate processing of the same code
            if (code != null) {
                if (processedCode == code) {
                    android.util.Log.w("AuthActivity", "Code already processed, ignoring duplicate request")
                    return
                }
                processedCode = code
                isProcessingOAuth = true
                
                android.util.Log.d("AuthActivity", "Exchanging code for tokens...")
                setIsLoading(true)
                setIsProcessing(true)
                // Exchange code for tokens in a coroutine
                scope.launch {
                    exchangeCodeForTokens(
                        code = code,
                        domain = domain,
                        memberId = memberId,
                        setIsLoading = setIsLoading,
                        setErrorMessage = setErrorMessage,
                        setIsProcessing = { value ->
                            isProcessingOAuth = value
                            setIsProcessing(value)
                        }
                    )
                }
            } else if (error != null) {
                // Handle OAuth error
                val errorDescription = data.getQueryParameter("error_description") ?: "Unknown error"
                android.util.Log.e("AuthActivity", "OAuth error: $error - $errorDescription")
                isProcessingOAuth = false
                setIsLoading(false)
                setIsProcessing(false)
                setErrorMessage("OAuth error: $error - $errorDescription")
            } else {
                android.util.Log.w("AuthActivity", "Deep link received but no code or error parameter found")
                isProcessingOAuth = false
                setIsLoading(false)
                setIsProcessing(false)
                setErrorMessage("No authorization code received")
            }
        } else {
            android.util.Log.d("AuthActivity", "Not an OAuth redirect deep link")
            isProcessingOAuth = false
            setIsLoading(false)
            setIsProcessing(false)
        }
    }
    
    @Composable
    private fun AuthScreen(
        initialIntent: Intent? = null, 
        skipLaunchedEffect: Boolean = false,
        errorMessageOverride: String? = null
    ) {
        val context = LocalContext.current
        var isLoading by remember { mutableStateOf(false) }
        var errorMessage by remember { mutableStateOf<String?>(errorMessageOverride) }
        val scope = rememberCoroutineScope()
        
        // Update error message when override changes
        LaunchedEffect(errorMessageOverride) {
            if (errorMessageOverride != null) {
                errorMessage = errorMessageOverride
            }
        }
        
        // Check if already authenticated
        LaunchedEffect(Unit) {
            if (!isProcessingOAuth) {
                val hasValidToken = tokenManager.getAccessToken() != null && 
                                   !tokenManager.isTokenExpired()
                if (hasValidToken) {
                    android.util.Log.d("AuthActivity", "Already authenticated, navigating to main")
                    navigateToMain()
                }
            }
        }
        
        // Timeout mechanism: if loading for more than 30 seconds, show error
        LaunchedEffect(isLoading) {
            if (isLoading) {
                kotlinx.coroutines.delay(30000) // 30 seconds
                if (isLoading && !isProcessingOAuth) {
                    android.util.Log.w("AuthActivity", "OAuth timeout - no callback received")
                    errorMessage = "Authentication timed out. Please try again. Make sure you completed the login in the browser."
                    isLoading = false
                }
            }
        }
        
        // Handle OAuth callback - process ONLY once per code
        // Use processedCode check to prevent double processing
        LaunchedEffect(initialIntent?.data?.getQueryParameter("code")) {
            if (!skipLaunchedEffect && initialIntent != null) {
                val data = initialIntent.data
                val code = data?.getQueryParameter("code")
                // Only process if code exists, hasn't been processed, and we're not already processing
                if (data != null && data.scheme == "jbmarks" && data.host == "oauth_redirect" && 
                    code != null && processedCode != code && !isProcessingOAuth) {
                    android.util.Log.d("AuthActivity", "LaunchedEffect - Processing OAuth callback")
                    processedCode = code
                    isProcessingOAuth = true
                    isLoading = true
                    errorMessage = null
                    handleOAuthCallback(initialIntent, scope, 
                        { isProcessingOAuth = it }, 
                        { isLoading = it }, 
                        { errorMessage = it })
                } else if (code != null && processedCode == code) {
                    android.util.Log.w("AuthActivity", "LaunchedEffect - Code already processed, skipping")
                }
            }
        }
        
        LoginScreen(
            onLoginClick = { portalUrl ->
                android.util.Log.d("AuthActivity", "Login button clicked - Resetting state for fresh auth attempt")
                
                // RESET ALL ERROR STATES to allow retry
                errorMessage = null
                sharedErrorMessage = null // Clear shared error state
                processedCode = null
                lastProcessedCode = null
                isProcessingOAuth = false
                
                // CRITICAL: Prevent duplicate auth launches ONLY if currently loading
                if (isAuthInProgress && isLoading) {
                    android.util.Log.w("AuthActivity", "Auth already in progress, ignoring duplicate login click")
                    return@LoginScreen
                }
                
                // Allow retry if there was an error (even within 10 seconds)
                val timeSinceLastAuth = System.currentTimeMillis() - lastAuthStartedAt
                if (timeSinceLastAuth < 10000 && !errorMessage.isNullOrEmpty()) {
                    android.util.Log.d("AuthActivity", "Previous auth had error, allowing retry despite recent attempt")
                } else if (timeSinceLastAuth < 10000) {
                    android.util.Log.w("AuthActivity", "Auth launched too recently (${timeSinceLastAuth}ms ago), ignoring")
                    return@LoginScreen
                }
                
                // Set flags to prevent duplicate launches
                isAuthInProgress = true
                lastAuthStartedAt = System.currentTimeMillis()
                isLoading = true
                errorMessage = null
                
                android.util.Log.d("AuthActivity", "=== Starting OAuth Flow ===")
                
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
                        
                        android.util.Log.d("AuthActivity", "Opening browser with auth URL")
                        
                        // Open Custom Tab or browser for OAuth
                        val customTabsIntent = CustomTabsIntent.Builder()
                            .setShowTitle(true)
                            .build()
                        
                        customTabsIntent.launchUrl(context, Uri.parse(authUrl))
                        
                        // Note: Token exchange will happen in onNewIntent/onResume
                        // when the deep link is received
                    } catch (e: Exception) {
                        android.util.Log.e("AuthActivity", "Failed to start login", e)
                        errorMessage = e.message ?: "Failed to start login"
                        isLoading = false
                        isAuthInProgress = false
                    }
                }
            },
            isLoading = isLoading,
            errorMessage = errorMessage
        )
    }
    
    private suspend fun exchangeCodeForTokens(
        code: String,
        domain: String?,
        memberId: String?,
        setIsLoading: (Boolean) -> Unit,
        setErrorMessage: (String?) -> Unit,
        setIsProcessing: (Boolean) -> Unit
    ) {
        try {
            val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
            android.util.Log.d("AuthActivity", "Exchanging code for tokens with portal: $portalUrl")
            android.util.Log.d("AuthActivity", "Including domain: $domain, member_id: $memberId")
            
            val result = oAuthService.exchangeCodeForTokens(
                portalUrl = portalUrl,
                clientId = Config.BITRIX_CLIENT_ID,
                clientSecret = Config.BITRIX_CLIENT_SECRET,
                code = code,
                domain = domain,
                memberId = memberId
            )
            
            result.onSuccess { tokenResponse ->
                android.util.Log.d("AuthActivity", "Token exchange successful")
                // Save tokens
                tokenManager.saveTokens(
                    tokenResponse.access_token,
                    tokenResponse.refresh_token
                )
                tokenManager.saveTokenExpiry(tokenResponse.expires_in)
                
                android.util.Log.d("AuthActivity", "Tokens saved, refreshing Retrofit instance")
                // Refresh Retrofit instance with new portal URL
                RetrofitInstance.refreshRetrofitInstance()
                
                // Register FCM token after successful authentication
                android.util.Log.d("AuthActivity", "Registering FCM token")
                kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                    FCMTokenManager(this@AuthActivity).checkAndRegisterToken()
                }
                
                android.util.Log.d("AuthActivity", "Navigating to main app")
                setIsLoading(false)
                setIsProcessing(false)
                
                // Navigate to main app on main thread
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                    navigateToMain()
                }
            }.onFailure { error ->
                android.util.Log.e("AuthActivity", "Token exchange failed", error)
                setIsLoading(false)
                setIsProcessing(false)
                val errorMsg = "Failed to authenticate: ${error.message ?: "Unknown error"}. The authorization code may have expired. Please try signing in again."
                setErrorMessage(errorMsg)
                // Also update shared error state for consistency
                sharedErrorMessage = errorMsg
                error.printStackTrace()
            }
        } catch (e: Exception) {
            android.util.Log.e("AuthActivity", "Exception during token exchange", e)
            setIsLoading(false)
            setIsProcessing(false)
            setErrorMessage("Authentication error: ${e.message}")
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