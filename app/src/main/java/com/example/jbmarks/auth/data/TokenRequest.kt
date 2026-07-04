package com.example.jbmarks.auth.data

data class TokenRequest(
    val grant_type: String,
    val client_id: String,
    val client_secret: String,
    val code: String,
    val redirect_uri: String
)