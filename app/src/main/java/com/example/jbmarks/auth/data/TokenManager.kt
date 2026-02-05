package com.example.jbmarks.auth.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "secret_shared_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveTokens(accessToken: String, refreshToken: String) {
        with(sharedPreferences.edit()) {
            putString("ACCESS_TOKEN", accessToken)
            putString("REFRESH_TOKEN", refreshToken)
            apply()
        }
    }

    fun getAccessToken(): String? {
        return sharedPreferences.getString("ACCESS_TOKEN", null)
    }

    fun getRefreshToken(): String? {
        return sharedPreferences.getString("REFRESH_TOKEN", null)
    }

    fun savePortalUrl(portalUrl: String) {
        with(sharedPreferences.edit()) {
            putString("PORTAL_URL", portalUrl)
            apply()
        }
    }

    fun getPortalUrl(): String? {
        return sharedPreferences.getString("PORTAL_URL", null)
    }

    fun clearTokens() {
        with(sharedPreferences.edit()) {
            remove("ACCESS_TOKEN")
            remove("REFRESH_TOKEN")
            remove("PORTAL_URL")
            remove("TOKEN_EXPIRY_TIME")
            apply()
        }
    }
    
    fun saveTokenExpiry(expiresIn: Int) {
        val expiryTime = System.currentTimeMillis() + (expiresIn * 1000L)
        with(sharedPreferences.edit()) {
            putLong("TOKEN_EXPIRY_TIME", expiryTime)
            apply()
        }
    }
    
    fun getTokenExpiry(): Long? {
        val expiryTime = sharedPreferences.getLong("TOKEN_EXPIRY_TIME", -1)
        return if (expiryTime > 0) expiryTime else null
    }
    
    fun isTokenExpired(): Boolean {
        val expiryTime = getTokenExpiry() ?: return true
        // Consider token expired if it expires in less than 5 minutes
        return System.currentTimeMillis() >= (expiryTime - (5 * 60 * 1000))
    }
}