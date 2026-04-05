package com.example.jbmarks.network

import android.content.Context
import android.util.Log
import com.example.jbmarks.auth.data.OAuthService
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.config.Config
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

/**
 * Thread-safe helper for token refresh operations
 * Prevents multiple simultaneous refresh attempts
 * Similar to iOS TokenRefreshHelper actor
 */
class TokenRefreshHelper private constructor() {
    
    companion object {
        @Volatile
        private var INSTANCE: TokenRefreshHelper? = null
        
        fun getInstance(): TokenRefreshHelper {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: TokenRefreshHelper().also { INSTANCE = it }
            }
        }
    }
    
    private val mutex = Mutex()
    private var refreshTask: Deferred<String>? = null
    
    /**
     * Refresh token if not already refreshing, otherwise wait for existing refresh
     * Thread-safe: only one refresh operation at a time
     */
    suspend fun refreshTokenIfNeeded(
        context: Context,
        portalUrl: String
    ): String {
        return mutex.withLock {
            // If already refreshing, wait for that task
            val existingTask = refreshTask
            if (existingTask != null) {
                try {
                    val token = existingTask.await()
                    Log.d("TokenRefreshHelper", "✅ Reused existing token refresh")
                    return token
                } catch (e: Exception) {
                    // Refresh failed, clear task and continue to new refresh
                    Log.w("TokenRefreshHelper", "Existing refresh failed, starting new one", e)
                    refreshTask = null
                }
            }
            
            // Check if we have a refresh token
            val tokenManager = TokenManager(context)
            val refreshToken = tokenManager.getRefreshToken()
            
            if (refreshToken.isNullOrBlank()) {
                throw Exception("No refresh token available")
            }
            
            // Start new refresh
            Log.d("TokenRefreshHelper", "🔄 Starting new token refresh...")
            val task = CoroutineScope(Dispatchers.IO).async {
                val oAuthService = OAuthService()
                val result = oAuthService.refreshAccessToken(
                    portalUrl = portalUrl,
                    clientId = Config.BITRIX_CLIENT_ID,
                    clientSecret = Config.BITRIX_CLIENT_SECRET,
                    refreshToken = refreshToken
                )
                
                result.fold(
                    onSuccess = { tokenResponse ->
                        // Save new tokens
                        tokenManager.saveTokens(
                            tokenResponse.access_token,
                            tokenResponse.refresh_token
                        )
                        tokenManager.saveTokenExpiry(tokenResponse.expires_in)
                        Log.d("TokenRefreshHelper", "✅ Token refreshed successfully")
                        tokenResponse.access_token
                    },
                    onFailure = { error ->
                        Log.e("TokenRefreshHelper", "❌ Token refresh failed: ${error.message}", error)
                        throw error
                    }
                )
            }
            
            refreshTask = task
            
            try {
                val newToken = task.await()
                refreshTask = null
                return newToken
            } catch (e: Exception) {
                refreshTask = null
                throw e
            }
        }
    }
    
    /**
     * Reset refresh state (for testing or logout)
     */
    fun reset() {
        refreshTask = null
    }
}
