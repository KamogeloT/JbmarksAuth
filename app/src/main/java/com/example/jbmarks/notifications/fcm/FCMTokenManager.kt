package com.example.jbmarks.notifications.fcm

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.config.Config
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.net.URL
import java.net.HttpURLConnection

/**
 * Manages FCM token registration and storage
 */
class FCMTokenManager(private val context: Context) {
    
    private val TAG = "FCMTokenManager"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("fcm_prefs", Context.MODE_PRIVATE)
    
    private val tokenManager = TokenManager(context)
    
    companion object {
        private const val KEY_FCM_TOKEN = "fcm_token"
        private const val KEY_TOKEN_REGISTERED = "token_registered"
    }
    
    /**
     * Get current FCM token
     */
    suspend fun getToken(): String? {
        return try {
            FirebaseMessaging.getInstance().token.await()
        } catch (e: Exception) {
            Log.e(TAG, "Error getting FCM token", e)
            null
        }
    }
    
    /**
     * Register FCM token with backend/Bitrix24
     * This should be called whenever a new token is generated
     */
    suspend fun registerToken(token: String) {
        val storedToken = sharedPreferences.getString(KEY_FCM_TOKEN, null)
        
        // Skip if token hasn't changed
        if (storedToken == token && sharedPreferences.getBoolean(KEY_TOKEN_REGISTERED, false)) {
            Log.d(TAG, "Token already registered")
            return
        }
        
        Log.d(TAG, "Registering FCM token: ${token.take(20)}...")
        
        // Store token locally
        sharedPreferences.edit()
            .putString(KEY_FCM_TOKEN, token)
            .putBoolean(KEY_TOKEN_REGISTERED, false)
            .apply()
        
        // Register with backend if user is authenticated
        val accessToken = tokenManager.getAccessToken()
        if (accessToken != null && !tokenManager.isTokenExpired()) {
            registerWithBackend(token, accessToken)
        } else {
            Log.d(TAG, "User not authenticated, token will be registered after login")
        }
    }
    
    /**
     * Register token with backend API
     * Note: This requires a backend endpoint to receive the token
     * You can integrate this with Bitrix24 webhooks or your own backend
     */
    private suspend fun registerWithBackend(token: String, accessToken: String) {
        try {
            val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
            
            // Option 1: Register with Bitrix24 via REST API (if supported)
            // Note: Bitrix24 may not have a direct FCM token registration endpoint
            // You might need to use webhooks or a custom backend
            
            // Option 2: Register with your own backend
            // Example: POST to your backend endpoint
            // registerWithCustomBackend(token, accessToken)
            
            // For now, we'll log the token registration
            // In production, you should implement one of the above options
            Log.d(TAG, "Token registration (implement backend endpoint):")
            Log.d(TAG, "  Portal: $portalUrl")
            Log.d(TAG, "  Token: ${token.take(20)}...")
            Log.d(TAG, "  Access Token: ${accessToken.take(20)}...")
            
            // Mark as registered (even if backend call fails, we'll retry later)
            sharedPreferences.edit()
                .putBoolean(KEY_TOKEN_REGISTERED, true)
                .apply()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error registering token with backend", e)
            // Don't mark as registered so we can retry
        }
    }
    
    /**
     * Register with custom backend endpoint
     * Uncomment and implement if you have a backend service
     */
    /*
    private suspend fun registerWithCustomBackend(token: String, accessToken: String) {
        try {
            val url = URL("${Config.BFF_API_TOKEN_EXCHANGE_URL}/register-fcm-token")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
            connection.doOutput = true
            
            val json = """
                {
                    "fcm_token": "$token",
                    "platform": "android"
                }
            """.trimIndent()
            
            connection.outputStream.use { it.write(json.toByteArray()) }
            
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                Log.d(TAG, "Token registered successfully with backend")
                sharedPreferences.edit()
                    .putBoolean(KEY_TOKEN_REGISTERED, true)
                    .apply()
            } else {
                Log.e(TAG, "Backend registration failed: $responseCode")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error registering with custom backend", e)
            throw e
        }
    }
    */
    
    /**
     * Check if token needs to be registered (e.g., after login)
     */
    fun checkAndRegisterToken() {
        scope.launch {
            val token = getToken()
            if (token != null) {
                registerToken(token)
            }
        }
    }
    
    /**
     * Get stored token (for debugging)
     */
    fun getStoredToken(): String? {
        return sharedPreferences.getString(KEY_FCM_TOKEN, null)
    }
    
    /**
     * Check if token is registered
     */
    fun isTokenRegistered(): Boolean {
        return sharedPreferences.getBoolean(KEY_TOKEN_REGISTERED, false)
    }
}
