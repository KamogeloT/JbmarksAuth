package com.example.jbmarks.network

import android.content.Context
import android.util.Log
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.config.Config
import retrofit2.Response

/**
 * Helper to execute API requests with automatic token refresh on 401 errors
 * Similar to iOS APIRequestHelper
 * 
 * Usage:
 * ```
 * val helper = APIRequestHelper(context)
 * val response = helper.executeWithTokenRefresh {
 *     RetrofitInstance.api.getTasks(...)
 * }
 * ```
 */
class APIRequestHelper(private val context: Context) {
    
    private val tokenManager = TokenManager(context)
    private val tokenRefreshHelper = TokenRefreshHelper.getInstance()
    
    /**
     * Execute an API call, automatically refreshing the token and retrying on 401 Unauthorized errors
     */
    suspend fun <T> executeWithTokenRefresh(
        operation: suspend () -> Response<T>
    ): Response<T> {
        // First attempt
        val response = operation()
        
        // Check for 401 error
        if (response.code() == 401) {
            Log.d("APIRequestHelper", "🔄 Token expired (401), attempting refresh...")
            
            val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
            
            try {
                // Refresh token
                val newToken = tokenRefreshHelper.refreshTokenIfNeeded(context, portalUrl)
                
                // Update Retrofit instance with new token (it will pick up new token from TokenManager)
                RetrofitInstance.refreshRetrofitInstance()
                
                Log.d("APIRequestHelper", "✅ Token refreshed, retrying request...")
                
                // Retry the operation with refreshed token
                return operation()
            } catch (e: Exception) {
                Log.e("APIRequestHelper", "❌ Token refresh failed: ${e.message}", e)
                // Return the original 401 response if refresh fails
                return response
            }
        }
        
        // Return response if not 401
        return response
    }
    
    /**
     * Execute an API call that returns a Result type (for operations that don't use Retrofit Response)
     */
    suspend fun <T> executeWithTokenRefreshResult(
        operation: suspend () -> Result<T>
    ): Result<T> {
        return try {
            val result = operation()
            
            // Check if result is failure with 401 error
            result.onFailure { error ->
                if (error.message?.contains("401") == true || 
                    error.message?.contains("Unauthorized") == true) {
                    Log.d("APIRequestHelper", "🔄 Token expired (401 in Result), attempting refresh...")
                    
                    val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
                    
                    try {
                        // Refresh token
                        val newToken = tokenRefreshHelper.refreshTokenIfNeeded(context, portalUrl)
                        
                        // Update Retrofit instance with new token
                        RetrofitInstance.refreshRetrofitInstance()
                        
                        Log.d("APIRequestHelper", "✅ Token refreshed, retrying request...")
                        
                        // Retry the operation
                        return operation()
                    } catch (e: Exception) {
                        Log.e("APIRequestHelper", "❌ Token refresh failed: ${e.message}", e)
                        return Result.failure(e)
                    }
                }
            }
            
            result
        } catch (e: Exception) {
            // Check if exception is 401-related
            if (e.message?.contains("401") == true || 
                e.message?.contains("Unauthorized") == true) {
                Log.d("APIRequestHelper", "🔄 Token expired (401 in Exception), attempting refresh...")
                
                val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
                
                try {
                    // Refresh token
                    val newToken = tokenRefreshHelper.refreshTokenIfNeeded(context, portalUrl)
                    
                    // Update Retrofit instance with new token
                    RetrofitInstance.refreshRetrofitInstance()
                    
                    Log.d("APIRequestHelper", "✅ Token refreshed, retrying request...")
                    
                    // Retry the operation
                    return operation()
                } catch (refreshError: Exception) {
                    Log.e("APIRequestHelper", "❌ Token refresh failed: ${refreshError.message}", refreshError)
                    return Result.failure(refreshError)
                }
            }
            
            Result.failure(e)
        }
    }
}
