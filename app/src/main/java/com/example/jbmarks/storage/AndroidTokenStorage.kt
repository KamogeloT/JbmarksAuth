package com.example.jbmarks.storage

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.shared.storage.TokenStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Android implementation of TokenStorage interface
 * Uses EncryptedSharedPreferences for secure token storage
 */
class AndroidTokenStorage(context: Context) : TokenStorage {
    
    private val tokenManager = TokenManager(context)
    
    override suspend fun saveAccessToken(token: String) {
        withContext(Dispatchers.IO) {
            val refreshToken = tokenManager.getRefreshToken() ?: ""
            tokenManager.saveTokens(token, refreshToken)
        }
    }
    
    override suspend fun getAccessToken(): String? {
        return withContext(Dispatchers.IO) {
            tokenManager.getAccessToken()
        }
    }
    
    override suspend fun saveRefreshToken(token: String) {
        withContext(Dispatchers.IO) {
            val accessToken = tokenManager.getAccessToken() ?: ""
            tokenManager.saveTokens(accessToken, token)
        }
    }
    
    override suspend fun getRefreshToken(): String? {
        return withContext(Dispatchers.IO) {
            tokenManager.getRefreshToken()
        }
    }
    
    override suspend fun savePortalUrl(url: String) {
        withContext(Dispatchers.IO) {
            tokenManager.savePortalUrl(url)
        }
    }
    
    override suspend fun getPortalUrl(): String? {
        return withContext(Dispatchers.IO) {
            tokenManager.getPortalUrl()
        }
    }
    
    override suspend fun saveTokenExpiry(expiresIn: Int) {
        withContext(Dispatchers.IO) {
            tokenManager.saveTokenExpiry(expiresIn)
        }
    }
    
    override suspend fun getTokenExpiry(): Long? {
        return withContext(Dispatchers.IO) {
            tokenManager.getTokenExpiry()
        }
    }
    
    override suspend fun isTokenExpired(): Boolean {
        return withContext(Dispatchers.IO) {
            tokenManager.isTokenExpired()
        }
    }
    
    override suspend fun clear() {
        withContext(Dispatchers.IO) {
            tokenManager.clearTokens()
        }
    }
}
