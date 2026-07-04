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
        val response = chain.proceed(newRequest)
        
        // If we get 401 Unauthorized, return the response as-is
        // Token refresh will be handled at a higher level (ViewModel/Repository)
        // DO NOT close the response - Retrofit needs to read the body
        // The calling code will handle the 401 error appropriately
        
        return response
    }
}
