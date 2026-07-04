package com.example.jbmarks.auth.data

import com.example.jbmarks.config.Config
import retrofit2.Retrofit
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import okio.Buffer

/**
 * Service for handling OAuth 2.0 flow with Bitrix24
 */
class OAuthService {
    
    private fun createOAuthRetrofit(baseUrl: String): Retrofit {
        // Ensure base URL ends with /
        val normalizedBaseUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        
        // Use HEADERS level to avoid logging client_secret in request body
        // Request details are logged manually in exchangeCodeForTokens
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.HEADERS
        }
        
        // Add interceptor to log response body before parsing (clone it so Retrofit can still read it)
        val responseInterceptor = okhttp3.Interceptor { chain ->
            val response = chain.proceed(chain.request())
            val responseBody = response.body
            if (responseBody != null) {
                val source = responseBody.source()
                source.request(Long.MAX_VALUE) // Buffer the entire body
                val buffer = source.buffer
                val responseBodyString = buffer.clone().readUtf8()
                android.util.Log.d("OAuthService", "Raw response body (before parsing): $responseBodyString")
                // Create a new response body so Retrofit can still read it
                val contentType = responseBody.contentType()
                val clonedBody = okhttp3.ResponseBody.create(contentType, responseBodyString)
                response.newBuilder().body(clonedBody).build()
            } else {
                response
            }
        }
        
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .addInterceptor(responseInterceptor)
            .build()
        
        // Create Gson with lenient mode to handle edge cases
        val gson = com.google.gson.GsonBuilder()
            .setLenient()
            .create()
        
        return Retrofit.Builder()
            .baseUrl(normalizedBaseUrl)
            .client(client)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create(gson))
            .build()
    }
    
    /**
     * Exchange authorization code for tokens
     * For local.* client IDs (on-prem/Box): uses portal endpoint directly
     * For cloud apps: tries oauth.bitrix.info first, falls back to portal
     */
    suspend fun exchangeCodeForTokens(
        portalUrl: String,
        clientId: String,
        clientSecret: String,
        code: String,
        domain: String? = null,
        memberId: String? = null
    ): Result<TokenResponse> {
        val redirectUri = Config.BITRIX_REDIRECT_URI_HTTPS
        
        android.util.Log.d("OAuthService", "=== Token Exchange Request ===")
        android.util.Log.d("OAuthService", "Portal URL: $portalUrl")
        android.util.Log.d("OAuthService", "Client ID: $clientId")
        android.util.Log.d("OAuthService", "Redirect URI: $redirectUri")
        android.util.Log.d("OAuthService", "Domain: ${domain ?: "not provided"}")
        android.util.Log.d("OAuthService", "Member ID: ${memberId ?: "not provided"}")
        android.util.Log.d("OAuthService", "Code (first 20 chars): ${code.take(20)}...")
        
        // local.* client IDs are on-prem/Box - use Azure Function proxy
        // Bitrix24 Box requires server-side token exchange with authenticated session
        if (clientId.startsWith("local.")) {
            android.util.Log.d("OAuthService", "Detected local.* client ID - using Azure Function proxy (on-prem/Box)")
            return tryAzureFunction(portalUrl, code, domain, memberId)
        }
        
        // For cloud apps (app.*), try oauth.bitrix.info first
        val tokenServerUrl = Config.BITRIX_OAUTH_TOKEN_SERVER
        android.util.Log.d("OAuthService", "Cloud app detected - trying: $tokenServerUrl")
        
        return try {
            val retrofit = createOAuthRetrofit(tokenServerUrl)
            val api = retrofit.create(OAuthApi::class.java)
            
            val response = api.exchangeCodeForTokens(
                clientId = clientId,
                clientSecret = clientSecret,
                code = code,
                redirectUri = redirectUri,
                domain = domain,
                memberId = memberId
            )
            
            android.util.Log.d("OAuthService", "Response code: ${response.code()}, Success: ${response.isSuccessful}")
            val contentType = response.headers()["content-type"] ?: ""
            android.util.Log.d("OAuthService", "Response content-type: $contentType")
            
            if (response.isSuccessful) {
                // CRITICAL: Check content-type before parsing JSON
                if (!contentType.contains("application/json", ignoreCase = true)) {
                    val errorBody = try {
                        response.errorBody()?.string()?.take(200) ?: "Unknown"
                    } catch (e: Exception) {
                        "Could not read response"
                    }
                    android.util.Log.e("OAuthService", "Non-JSON response from $tokenServerUrl")
                    android.util.Log.e("OAuthService", "Content-Type: $contentType")
                    android.util.Log.e("OAuthService", "Response body (first 200 chars): $errorBody")
                    return Result.failure(Exception("Token exchange failed: Server returned non-JSON response. Content-Type: $contentType"))
                }
                
                val tokenResponse = response.body()
                if (tokenResponse != null) {
                    android.util.Log.d("OAuthService", "Token exchange successful via $tokenServerUrl")
                    Result.success(tokenResponse)
                } else {
                    Result.failure(Exception("Token exchange failed: Empty response from server"))
                }
            } else {
                val errorBody = try {
                    response.errorBody()?.string() ?: "Unknown error"
                } catch (e: Exception) {
                    "Error reading response: ${e.message}"
                }
                android.util.Log.e("OAuthService", "Token exchange failed on $tokenServerUrl: $errorBody")
                
                // If invalid_client, fall back to portal endpoint
                if (response.code() == 400 && errorBody.contains("invalid_client")) {
                    android.util.Log.w("OAuthService", "invalid_client - falling back to portal endpoint")
                    return tryPortalEndpoint(portalUrl, clientId, clientSecret, code, redirectUri, domain, memberId)
                }
                
                Result.failure(Exception("Token exchange failed (${response.code()}): $errorBody"))
            }
        } catch (e: com.google.gson.JsonSyntaxException) {
            // Server returned a string instead of JSON
            // The interceptor should have logged the raw response body
            android.util.Log.e("OAuthService", "JSON parsing exception from $tokenServerUrl - response is a string, not JSON", e)
            android.util.Log.e("OAuthService", "Check logs above for 'Raw response body' to see the actual error message")
            // Fall back to portal endpoint - it might work better for local.* client IDs
            return tryPortalEndpoint(portalUrl, clientId, clientSecret, code, redirectUri, domain, memberId)
        } catch (e: Exception) {
            android.util.Log.e("OAuthService", "Exception during token exchange on $tokenServerUrl", e)
            // Fall back to portal endpoint
            return tryPortalEndpoint(portalUrl, clientId, clientSecret, code, redirectUri, domain, memberId)
        }
    }
    
    /**
     * Token exchange using portal endpoint (for on-prem/Box installations)
     * Tries with domain/member_id first, then without if that fails
     */
    private suspend fun tryPortalEndpoint(
        portalUrl: String,
        clientId: String,
        clientSecret: String,
        code: String,
        redirectUri: String,
        domain: String?,
        memberId: String?
    ): Result<TokenResponse> {
        return try {
            android.util.Log.d("OAuthService", "=== Portal Token Exchange ===")
            android.util.Log.d("OAuthService", "Endpoint: $portalUrl/oauth/token/")
            
            val retrofit = createOAuthRetrofit(portalUrl)
            val api = retrofit.create(OAuthApi::class.java)
            
            // Try with domain/member_id first
            android.util.Log.d("OAuthService", "Attempt 1: With domain and member_id")
            var response = api.exchangeCodeForTokens(
                clientId = clientId,
                clientSecret = clientSecret,
                code = code,
                redirectUri = redirectUri,
                domain = domain,
                memberId = memberId
            )
            
            android.util.Log.d("OAuthService", "Response code: ${response.code()}, Success: ${response.isSuccessful}")
            var contentType = response.headers()["content-type"] ?: ""
            android.util.Log.d("OAuthService", "Response content-type: $contentType")
            
            // CRITICAL: Check content-type before parsing JSON
            // If HTML, try without domain/member_id
            if (response.isSuccessful && contentType.contains("text/html", ignoreCase = true)) {
                android.util.Log.w("OAuthService", "Got HTML response - trying without domain/member_id")
                response = api.exchangeCodeForTokens(
                    clientId = clientId,
                    clientSecret = clientSecret,
                    code = code,
                    redirectUri = redirectUri,
                    domain = null,
                    memberId = null
                )
                contentType = response.headers()["content-type"] ?: ""
                android.util.Log.d("OAuthService", "Retry - Code: ${response.code()}, Content-Type: $contentType")
            }
            
            if (response.isSuccessful) {
                // CRITICAL: Don't parse as JSON if content-type isn't JSON
                if (!contentType.contains("application/json", ignoreCase = true)) {
                    val errorBody = try {
                        response.errorBody()?.string()?.take(200) ?: "Unknown"
                    } catch (e: Exception) {
                        "Could not read response"
                    }
                    android.util.Log.e("OAuthService", "Portal returned non-JSON response")
                    android.util.Log.e("OAuthService", "Content-Type: $contentType")
                    android.util.Log.e("OAuthService", "Response body (first 200 chars): $errorBody")
                    android.util.Log.e("OAuthService", "This indicates:")
                    android.util.Log.e("OAuthService", "  - Portal OAuth endpoint requires server-side exchange")
                    android.util.Log.e("OAuthService", "  - OR redirect_uri mismatch in Bitrix24")
                    android.util.Log.e("OAuthService", "  - OR OAuth module not properly configured")
                    return Result.failure(Exception("Portal token endpoint returned HTML (login page). " +
                            "OAuth endpoint needs server-side exchange or portal configuration fix. " +
                            "Verify redirect URI matches exactly: $redirectUri"))
                }
                
                // Safe to parse as JSON
                val tokenResponse = response.body()
                if (tokenResponse != null) {
                    android.util.Log.d("OAuthService", "Token exchange successful via portal endpoint")
                    Result.success(tokenResponse)
                } else {
                    Result.failure(Exception("Token exchange failed: Empty response from portal"))
                }
            } else {
                val errorBody = try {
                    response.errorBody()?.string() ?: "Unknown error"
                } catch (e: Exception) {
                    "Error reading response: ${e.message}"
                }
                android.util.Log.e("OAuthService", "Portal token exchange failed: $errorBody")
                Result.failure(Exception("Token exchange failed (${response.code()}): $errorBody"))
            }
        } catch (e: com.google.gson.JsonSyntaxException) {
            // Server returned a string instead of JSON
            // The interceptor should have logged the raw response body
            android.util.Log.e("OAuthService", "JSON parsing exception from portal - response is a string, not JSON", e)
            android.util.Log.e("OAuthService", "Check logs above for 'Raw response body' to see the actual error message")
            return Result.failure(Exception("Token exchange failed: Portal returned error message instead of JSON. Check Logcat for 'Raw response body' to see details."))
        } catch (e: IllegalStateException) {
            android.util.Log.e("OAuthService", "Response parsing exception from portal", e)
            // This might also be a string response issue
            Result.failure(Exception("Token exchange failed: Portal returned unexpected format - ${e.message}"))
        } catch (e: Exception) {
            android.util.Log.e("OAuthService", "Exception during portal token exchange", e)
            Result.failure(e)
        }
    }
    
    /**
     * Exchange authorization code for tokens using BFF API
     * This is required for Bitrix24 Box/on-prem installations
     * Falls back to Azure Function if BFF API fails (during migration period)
     */
    private suspend fun tryAzureFunction(
        portalUrl: String,
        code: String,
        domain: String?,
        memberId: String?
    ): Result<TokenResponse> {
        android.util.Log.d("OAuthService", "=== tryAzureFunction called ===")
        android.util.Log.d("OAuthService", "About to try Railway token exchange...")
        
        // Try Railway token exchange server first (most reliable)
        val railwayResult = tryRailwayTokenExchange(portalUrl, code, domain)
        android.util.Log.d("OAuthService", "Railway result: success=${railwayResult.isSuccess}")
        if (railwayResult.isSuccess) {
            return railwayResult
        }
        
        // Fallback to BFF API if Railway fails
        android.util.Log.w("OAuthService", "Railway server failed, trying BFF API")
        val bffResult = tryBffApi(portalUrl, code, domain, memberId)
        if (bffResult.isSuccess) {
            return bffResult
        }
        
        // Final fallback to Azure Function
        android.util.Log.w("OAuthService", "BFF API failed, falling back to Azure Function")
        return tryAzureFunctionFallback(portalUrl, code, domain, memberId)
    }
    
    /**
     * Exchange authorization code for tokens using Railway token exchange server
     * This is the primary method - simple, reliable, no auth required
     */
    private suspend fun tryRailwayTokenExchange(
        portalUrl: String,
        code: String,
        domain: String?
    ): Result<TokenResponse> {
        return try {
            android.util.Log.d("OAuthService", "=== Railway Token Exchange ===")
            android.util.Log.d("OAuthService", "Token Exchange URL: ${Config.TOKEN_EXCHANGE_URL}")
            
            // Create Retrofit instance for Railway server
            val gson = com.google.gson.GsonBuilder()
                .setLenient()
                .create()
            
            // Extract base URL from token exchange URL
            val tokenExchangeUrl = Config.TOKEN_EXCHANGE_URL
            val baseUrl = tokenExchangeUrl.substringBefore("/api/exchangetoken")
            val normalizedBaseUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
            
            val client = OkHttpClient.Builder().build()
            
            val retrofit = Retrofit.Builder()
                .baseUrl(normalizedBaseUrl)
                .client(client)
                .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create(gson))
                .build()
            
            val api = retrofit.create(RailwayTokenExchangeApi::class.java)
            
            // Railway server only needs oauth_code and domain (member_id is optional)
            val request = AzureTokenExchangeRequest(
                oauth_code = code,
                domain = domain ?: portalUrl.substringAfter("://").substringBefore("/"),
                member_id = "" // Not required by Railway server, but must be non-null
            )
            
            android.util.Log.d("OAuthService", "Sending token exchange request to Railway")
            android.util.Log.d("OAuthService", "Request: oauth_code=${code.take(20)}..., domain=${request.domain}")
            
            val response = api.exchangeCodeForTokens(request)
            
            android.util.Log.d("OAuthService", "Response code: ${response.code()}, Success: ${response.isSuccessful}")
            
            if (response.isSuccessful) {
                val tokenResponse = response.body()
                if (tokenResponse != null) {
                    android.util.Log.d("OAuthService", "Token exchange successful via Railway")
                    Result.success(tokenResponse)
                } else {
                    Result.failure(Exception("Token exchange failed: Empty response from Railway"))
                }
            } else {
                val errorBody = try {
                    response.errorBody()?.string() ?: "No error body"
                } catch (e: Exception) {
                    "Error reading response: ${e.message}"
                }
                android.util.Log.e("OAuthService", "Railway token exchange failed: HTTP ${response.code()}")
                android.util.Log.e("OAuthService", "Error body: $errorBody")
                Result.failure(Exception("Token exchange failed (${response.code()}): $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("OAuthService", "Exception during Railway token exchange", e)
            Result.failure(e)
        }
    }
    
    /**
     * Exchange authorization code for tokens using BFF API (fallback method)
     */
    private suspend fun tryBffApi(
        portalUrl: String,
        code: String,
        domain: String?,
        memberId: String?
    ): Result<TokenResponse> {
        return try {
            android.util.Log.d("OAuthService", "=== BFF API Token Exchange ===")
            android.util.Log.d("OAuthService", "BFF API URL: ${Config.BFF_API_TOKEN_EXCHANGE_URL}")
            
            // Create Retrofit instance for BFF API
            val gson = com.google.gson.GsonBuilder()
                .setLenient()
                .create()
            
            // Extract base URL from BFF API URL (remove /api/auth/bitrix/exchange)
            val bffUrl = Config.BFF_API_TOKEN_EXCHANGE_URL
            val baseUrl = bffUrl.substringBefore("/api/auth/bitrix/exchange")
            val normalizedBaseUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
            
            // BFF API doesn't use function keys - uses standard REST authentication
            // If API key is needed, it would be added as a header (not implemented yet)
            val client = OkHttpClient.Builder().build()
            
            val retrofit = Retrofit.Builder()
                .baseUrl(normalizedBaseUrl)
                .client(client)
                .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create(gson))
                .build()
            
            val api = retrofit.create(AzureFunctionApi::class.java)
            
            // Validate required fields
            if (domain == null || memberId == null) {
                android.util.Log.e("OAuthService", "Missing domain or memberId for BFF API request")
                return Result.failure(Exception("Missing required parameters: domain and memberId are required"))
            }
            
            // Note: redirect_uri is not sent - BFF API uses env variable only
            val request = AzureTokenExchangeRequest(
                oauth_code = code,
                domain = domain,
                member_id = memberId
            )
            
            android.util.Log.d("OAuthService", "Sending token exchange request to BFF API")
            android.util.Log.d("OAuthService", "Request: oauth_code=${code.take(20)}..., domain=$domain, member_id=$memberId")
            
            val response = api.exchangeCodeForTokens(request)
            
            android.util.Log.d("OAuthService", "Response code: ${response.code()}, Success: ${response.isSuccessful}")
            
            if (response.isSuccessful) {
                val tokenResponse = response.body()
                if (tokenResponse != null) {
                    android.util.Log.d("OAuthService", "Token exchange successful via BFF API")
                    Result.success(tokenResponse)
                } else {
                    Result.failure(Exception("Token exchange failed: Empty response from BFF API"))
                }
            } else {
                // Read error body
                val errorBody = try {
                    val errorBodySource = response.errorBody()
                    if (errorBodySource != null) {
                        val source = errorBodySource.source()
                        source.request(Long.MAX_VALUE) // Buffer the entire body
                        val buffer = source.buffer.clone()
                        val body = buffer.readUtf8()
                        android.util.Log.e("OAuthService", "BFF API error response body: $body")
                        body.ifEmpty { "Unknown error" }
                    } else {
                        "No error body"
                    }
                } catch (e: Exception) {
                    android.util.Log.e("OAuthService", "Error reading response body", e)
                    "Error reading response: ${e.message}"
                }
                android.util.Log.e("OAuthService", "BFF API token exchange failed: HTTP ${response.code()}")
                android.util.Log.e("OAuthService", "Error body: $errorBody")
                Result.failure(Exception("Token exchange failed (${response.code()}): $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("OAuthService", "Exception during BFF API token exchange", e)
            Result.failure(e)
        }
    }
    
    /**
     * Fallback to Azure Function (legacy, for migration period)
     */
    private suspend fun tryAzureFunctionFallback(
        portalUrl: String,
        code: String,
        domain: String?,
        memberId: String?
    ): Result<TokenResponse> {
        return try {
            android.util.Log.d("OAuthService", "=== Azure Function Token Exchange (Fallback) ===")
            android.util.Log.d("OAuthService", "Function URL: ${Config.AZURE_FUNCTION_TOKEN_EXCHANGE_URL}")
            
            // Create Retrofit instance for Azure Function
            val gson = com.google.gson.GsonBuilder()
                .setLenient()
                .create()
            
            // Extract base URL from function URL (remove /api/exchangetoken and query parameters)
            val functionUrl = Config.AZURE_FUNCTION_TOKEN_EXCHANGE_URL
            val baseUrl = functionUrl.substringBefore("/api/exchangetoken").substringBefore("?")
            val normalizedBaseUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
            
            // Extract function key from URL if present
            val functionKey = functionUrl.substringAfter("code=", "").substringBefore("&")
            
            // Create OkHttp client with interceptor to add function key
            val client = if (functionKey.isNotEmpty()) {
                OkHttpClient.Builder()
                    .addInterceptor { chain ->
                        val original = chain.request()
                        val newUrl = original.url.newBuilder()
                            .addQueryParameter("code", functionKey)
                            .build()
                        chain.proceed(original.newBuilder().url(newUrl).build())
                    }
                    .build()
            } else {
                OkHttpClient.Builder().build()
            }
            
            val retrofit = Retrofit.Builder()
                .baseUrl(normalizedBaseUrl)
                .client(client)
                .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create(gson))
                .build()
            
            // Use the legacy Azure Function interface with old endpoint path
            val api = retrofit.create(LegacyAzureFunctionApi::class.java)
            
            // Validate required fields
            if (domain == null || memberId == null) {
                android.util.Log.e("OAuthService", "Missing domain or memberId for Azure Function request")
                return Result.failure(Exception("Missing required parameters: domain and memberId are required"))
            }
            
            val request = AzureTokenExchangeRequest(
                oauth_code = code,
                domain = domain,
                member_id = memberId
            )
            
            android.util.Log.d("OAuthService", "Sending token exchange request to Azure Function (fallback)")
            
            val response = api.exchangeCodeForTokens(request)
            
            if (response.isSuccessful) {
                val tokenResponse = response.body()
                if (tokenResponse != null) {
                    android.util.Log.d("OAuthService", "Token exchange successful via Azure Function (fallback)")
                    Result.success(tokenResponse)
                } else {
                    Result.failure(Exception("Token exchange failed: Empty response from Azure Function"))
                }
            } else {
                val errorBody = try {
                    val errorBodySource = response.errorBody()
                    if (errorBodySource != null) {
                        val source = errorBodySource.source()
                        source.request(Long.MAX_VALUE)
                        val buffer = source.buffer.clone()
                        buffer.readUtf8()
                    } else {
                        "No error body"
                    }
                } catch (e: Exception) {
                    "Error reading response: ${e.message}"
                }
                Result.failure(Exception("Token exchange failed (${response.code()}): $errorBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("OAuthService", "Exception during Azure Function token exchange (fallback)", e)
            // Final fallback to direct portal endpoint
            android.util.Log.w("OAuthService", "Falling back to direct portal endpoint")
            val redirectUri = Config.BITRIX_REDIRECT_URI_HTTPS
            return tryPortalEndpoint(portalUrl, Config.BITRIX_CLIENT_ID, Config.BITRIX_CLIENT_SECRET, code, redirectUri, domain, memberId)
        }
    }
    
    /**
     * Refresh access token
     * Uses oauth.bitrix.info for token refresh (Bitrix24 best practice)
     */
    suspend fun refreshAccessToken(
        portalUrl: String,
        clientId: String,
        clientSecret: String,
        refreshToken: String
    ): Result<TokenResponse> {
        return try {
            // Use Bitrix OAuth token server for refresh as well
            val tokenServerUrl = Config.BITRIX_OAUTH_TOKEN_SERVER
            val retrofit = createOAuthRetrofit(tokenServerUrl)
            val api = retrofit.create(OAuthApi::class.java)
            
            android.util.Log.d("OAuthService", "Refreshing token using: $tokenServerUrl")
            
            val response = api.refreshAccessToken(
                clientId = clientId,
                clientSecret = clientSecret,
                refreshToken = refreshToken
            )
            
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Result.failure(Exception("Token refresh failed: $errorBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
