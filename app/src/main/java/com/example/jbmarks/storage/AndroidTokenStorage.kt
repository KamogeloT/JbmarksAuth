package com.example.jbmarks.storage

import android.content.Context
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.shared.storage.TokenStorage

/**
 * Android implementation of TokenStorage interface
 * Uses EncryptedSharedPreferences for secure token storage
 */
class AndroidTokenStorage(context: Context) : TokenStorage {
    
    private val tokenManager = TokenManager(context)
    
    override fun saveAccessToken(token: String) {
        val refreshToken = tokenManager.getRefreshToken() ?: ""
        tokenManager.saveTokens(token, refreshToken)
    }
    
    override fun getAccessToken(): String? {
        return tokenManager.getAccessToken()
    }
    
    override fun saveRefreshToken(token: String) {
        val accessToken = tokenManager.getAccessToken() ?: ""
        tokenManager.saveTokens(accessToken, token)
    }
    
    override fun getRefreshToken(): String? {
        return tokenManager.getRefreshToken()
    }
    
    override fun savePortalUrl(url: String) {
        tokenManager.savePortalUrl(url)
    }
    
    override fun getPortalUrl(): String? {
        return tokenManager.getPortalUrl()
    }
    
    override fun saveTokenExpiry(expiresIn: Int) {
        tokenManager.saveTokenExpiry(expiresIn)
    }
    
    override fun getTokenExpiry(): Long? {
        return tokenManager.getTokenExpiry()
    }
    
    override fun isTokenExpired(): Boolean {
        return tokenManager.isTokenExpired()
    }
    
    override fun clear() {
        tokenManager.clearTokens()
    }
}
