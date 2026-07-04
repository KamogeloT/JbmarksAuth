package com.example.jbmarks.shared.auth

import com.example.jbmarks.shared.network.BitrixApi
import com.example.jbmarks.shared.storage.TokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.parameter
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.Serializable

/**
 * OAuth service for Bitrix24 authentication
 */
class OAuthService(
    private val httpClient: HttpClient,
    private val tokenStorage: TokenStorage
) {
    /**
     * Build authorization URL for OAuth flow
     */
    fun buildAuthorizationUrl(
        portalUrl: String,
        clientId: String,
        redirectUri: String,
        scopes: String
    ): String {
        val baseUrl = if (portalUrl.endsWith("/")) portalUrl else "$portalUrl/"
        val encodedRedirectUri = redirectUri // Should be URL encoded in production
        return "${baseUrl}oauth/authorize/?client_id=$clientId&response_type=code&redirect_uri=$encodedRedirectUri&scope=$scopes"
    }
    
    /**
     * Exchange authorization code for tokens
     */
    suspend fun exchangeCodeForTokens(
        portalUrl: String,
        clientId: String,
        clientSecret: String,
        code: String,
        redirectUri: String,
        domain: String? = null,
        memberId: String? = null
    ): Result<TokenResponse> {
        return try {
            // Determine token endpoint URL
            val tokenUrl = if (clientId.startsWith("local.")) {
                "https://oauth.bitrix.info/oauth/token/"
            } else {
                val baseUrl = if (portalUrl.endsWith("/")) portalUrl else "$portalUrl/"
                "${baseUrl}oauth/token/"
            }
            
            // Use backend token exchange service (Railway/Azure)
            // For now, we'll use a simplified approach
            // In production, this should call the backend token exchange service
            val response = httpClient.post(tokenUrl) {
                contentType(ContentType.Application.FormUrlEncoded)
                setBody(
                    mapOf(
                        "grant_type" to "authorization_code",
                        "client_id" to clientId,
                        "client_secret" to clientSecret,
                        "code" to code,
                        "redirect_uri" to redirectUri
                    )
                )
            }.body<TokenResponse>()
            
            // Save tokens
            tokenStorage.saveAccessToken(response.access_token)
            tokenStorage.saveRefreshToken(response.refresh_token)
            tokenStorage.saveTokenExpiry(response.expires_in)
            if (domain != null) {
                tokenStorage.savePortalUrl("https://$domain")
            }
            
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    /**
     * Refresh access token using refresh token
     */
    suspend fun refreshToken(
        portalUrl: String,
        clientId: String,
        clientSecret: String
    ): Result<TokenResponse> {
        return try {
            val refreshToken = tokenStorage.getRefreshToken()
                ?: return Result.failure(Exception("No refresh token available"))
            
            val tokenUrl = if (clientId.startsWith("local.")) {
                "https://oauth.bitrix.info/oauth/token/"
            } else {
                val baseUrl = if (portalUrl.endsWith("/")) portalUrl else "$portalUrl/"
                "${baseUrl}oauth/token/"
            }
            
            val response = httpClient.post(tokenUrl) {
                contentType(ContentType.Application.FormUrlEncoded)
                setBody(
                    mapOf(
                        "grant_type" to "refresh_token",
                        "client_id" to clientId,
                        "client_secret" to clientSecret,
                        "refresh_token" to refreshToken
                    )
                )
            }.body<TokenResponse>()
            
            // Save new tokens
            tokenStorage.saveAccessToken(response.access_token)
            tokenStorage.saveRefreshToken(response.refresh_token)
            tokenStorage.saveTokenExpiry(response.expires_in)
            
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

@Serializable
data class TokenResponse(
    val access_token: String,
    val refresh_token: String,
    val expires_in: Int,
    val token_type: String = "Bearer"
)
