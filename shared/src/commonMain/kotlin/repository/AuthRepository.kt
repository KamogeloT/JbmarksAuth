package com.example.jbmarks.shared.repository

import com.example.jbmarks.shared.storage.TokenStorage

/**
 * Repository interface for authentication operations
 * 
 * NOTE: Using suspend functions here is OK because this interface is only implemented in Kotlin,
 * not in Swift. Swift will consume these suspend functions as async functions.
 */
interface AuthRepository {
    suspend fun isAuthenticated(): Boolean
    suspend fun getAccessToken(): String?
    suspend fun clearAuth()
}

/**
 * Implementation of AuthRepository
 */
class AuthRepositoryImpl(
    private val tokenStorage: TokenStorage
) : AuthRepository {
    
    override suspend fun isAuthenticated(): Boolean {
        val token = tokenStorage.getAccessToken()
        // Authenticated = token exists AND is NOT expired
        return token != null && !tokenStorage.isTokenExpired()
    }
    
    override suspend fun getAccessToken(): String? {
        return tokenStorage.getAccessToken()
    }
    
    override suspend fun clearAuth() {
        tokenStorage.clear()
    }
}
