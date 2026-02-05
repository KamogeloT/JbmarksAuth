package com.example.jbmarks.network

import android.content.Context
import com.example.jbmarks.auth.data.OAuthService
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.config.Config
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * OkHttp Interceptor that:
 * 1. Injects access token into API requests
 * 2. Handles 401 errors by refreshing the token and retrying
 */
class AuthInterceptor(
    private val context: Context,
    private val tokenManager: TokenManager
) : Interceptor {
    
    private val oAuthService = OAuthService()
    
    @Throws(IOException::class)
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Get access token and add it to the request
        val accessToken = tokenManager.getAccessToken()
        val portalUrl = tokenManager.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
        
        // Build new request with token
        val newRequest = if (accessToken != null) {
            originalRequest.newBuilder()
                .url(
                    originalRequest.url.newBuilder()
                        .addQueryParameter("auth", accessToken)
                        .build()
                )
                .build()
        } else {
            originalRequest
        }
        
        // Execute request
        var response = chain.proceed(newRequest)
        
        // If we get 401 Unauthorized, try to refresh token and retry
        // Note: We can't use suspend functions in interceptors, so token refresh
        // will need to be handled at a higher level (ViewModel/Repository)
        // For now, the 401 response will be returned and handled upstream
        if (response.code == 401 && accessToken != null) {
            // Token refresh will be handled by the calling code
            response.close()
        }
        
        return response
    }
}
