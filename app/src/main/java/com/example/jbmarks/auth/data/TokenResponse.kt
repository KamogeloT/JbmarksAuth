package com.example.jbmarks.auth.data

import com.google.gson.annotations.SerializedName

/**
 * Response from Bitrix24 OAuth token endpoint
 */
data class TokenResponse(
    @SerializedName("access_token")
    val access_token: String,
    
    @SerializedName("refresh_token")
    val refresh_token: String,
    
    @SerializedName("expires_in")
    val expires_in: Int,
    
    @SerializedName("token_type")
    val token_type: String = "Bearer",
    
    @SerializedName("scope")
    val scope: String? = null
)
