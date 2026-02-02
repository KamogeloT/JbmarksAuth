package com.example.jbmarks.auth.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Retrofit API interface for Railway token exchange server
 * Endpoint: POST /api/exchangetoken
 */
interface RailwayTokenExchangeApi {
    
    @POST("api/exchangetoken")
    suspend fun exchangeCodeForTokens(
        @Body request: AzureTokenExchangeRequest
    ): Response<TokenResponse>
}
