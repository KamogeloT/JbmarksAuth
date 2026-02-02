package com.example.jbmarks.auth.data

import retrofit2.Response
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.POST

/**
 * Retrofit interface for Bitrix24 OAuth endpoints
 */
interface OAuthApi {
    
    /**
     * Exchange authorization code for access and refresh tokens
     * Note: For Bitrix24 standard/local applications, this should use oauth.bitrix.info
     * not the portal's /oauth/token/ endpoint
     */
    @FormUrlEncoded
    @POST("oauth/token/")
    suspend fun exchangeCodeForTokens(
        @Field("grant_type") grantType: String = "authorization_code",
        @Field("client_id") clientId: String,
        @Field("client_secret") clientSecret: String,
        @Field("code") code: String,
        @Field("redirect_uri") redirectUri: String,
        @Field("domain") domain: String? = null,
        @Field("member_id") memberId: String? = null
    ): Response<TokenResponse>
    
    /**
     * Refresh access token using refresh token
     */
    @FormUrlEncoded
    @POST("oauth/token/")
    suspend fun refreshAccessToken(
        @Field("grant_type") grantType: String = "refresh_token",
        @Field("client_id") clientId: String,
        @Field("client_secret") clientSecret: String,
        @Field("refresh_token") refreshToken: String
    ): Response<TokenResponse>
}
