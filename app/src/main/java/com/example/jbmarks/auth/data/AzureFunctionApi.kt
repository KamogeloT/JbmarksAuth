package com.example.jbmarks.auth.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Request body for BFF API token exchange
 * 
 * NOTE: We use 'oauth_code' instead of 'code' to avoid any potential conflicts.
 * The BFF API uses standard REST authentication (API key header) instead of query parameters.
 */
data class AzureTokenExchangeRequest(
    val oauth_code: String,
    val domain: String,
    val member_id: String
    // Note: redirect_uri is not sent - BFF API uses env variable only
)

/**
 * Retrofit interface for BFF API token exchange endpoint
 * This replaces the Azure Function with a proper Backend-for-Frontend API
 */
interface AzureFunctionApi {
    
    /**
     * Exchange authorization code for tokens via BFF API
     * This is used for Bitrix24 Box/on-prem installations that require server-side token exchange
     */
    @POST("api/auth/bitrix/exchange")
    suspend fun exchangeCodeForTokens(
        @Body request: AzureTokenExchangeRequest
    ): Response<TokenResponse>
}

/**
 * Legacy Azure Function API interface (for fallback during migration)
 */
interface LegacyAzureFunctionApi {
    
    /**
     * Exchange authorization code for tokens via Azure Function (legacy endpoint)
     * Used as fallback when BFF API is unavailable
     */
    @POST("api/exchangetoken")
    suspend fun exchangeCodeForTokens(
        @Body request: AzureTokenExchangeRequest
    ): Response<TokenResponse>
}
