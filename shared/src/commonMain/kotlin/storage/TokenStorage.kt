package com.example.jbmarks.shared.storage

/**
 * Interface for token storage operations
 * Handles OAuth tokens and portal URL storage
 * 
 * NOTE: This interface uses regular (non-suspend) functions to allow Swift implementations.
 * For async operations, implementations should handle asynchrony internally.
 */
interface TokenStorage {
    fun saveAccessToken(token: String)
    fun getAccessToken(): String?
    
    fun saveRefreshToken(token: String)
    fun getRefreshToken(): String?
    
    fun savePortalUrl(url: String)
    fun getPortalUrl(): String?
    
    fun saveTokenExpiry(expiresIn: Int)
    fun getTokenExpiry(): Long?
    
    fun isTokenExpired(): Boolean
    
    fun clear()
}
