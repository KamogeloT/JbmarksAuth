package com.example.jbmarks.auth.data

data class TokenResponse(
    val access_token: String,
    val expires_in: Int,
    val refresh_token: String,
    val scope: String,
    val user_id: Int
)