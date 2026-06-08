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
     * Register with Railway backend endpoint
     * Sends FCM token + user_id so the server can route push notifications.
     */
    private suspend fun registerWithBackend(token: String, accessToken: String) {
        try {
            val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
            
            // Get current user ID from Bitrix24
            val userId = try {
                val userRepository = com.example.jbmarks.user.data.UserRepository(context)
                userRepository.getCurrentUser().getOrNull()?.id
            } catch (e: Exception) {
                Log.w(TAG, "Could not fetch user ID for token registration", e)
                null
            }
            
            if (userId == null) {
                Log.w(TAG, "Cannot register FCM token - user ID not available")
                return
            }
            
            val railwayUrl = "https://jbmarksauth-production.up.railway.app/api/push/register-token"
            val url = URL(railwayUrl)
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 30000
            connection.readTimeout = 30000
            
            val json = """
                {
                    "fcm_token": "$token",
                    "platform": "android",
                    "portal_url": "$portalUrl",
                    "user_id": "$userId"
                }
            """.trimIndent()
            
            Log.d(TAG, "Registering FCM token for user $userId")
            
            connection.outputStream.use { it.write(json.toByteArray()) }
            
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
                Log.d(TAG, "✅ Token registered successfully with Railway backend for user $userId")
                sharedPreferences.edit()
                    .putBoolean(KEY_TOKEN_REGISTERED, true)
                    .apply()
            } else {
                val errorStream = connection.errorStream
                val errorMessage = errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown error"
                Log.e(TAG, "Railway registration failed: $responseCode, $errorMessage")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error registering with Railway backend", e)
            // Don't mark as registered so we can retry
        }
    }
    
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
