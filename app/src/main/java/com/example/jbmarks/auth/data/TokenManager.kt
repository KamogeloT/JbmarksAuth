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
            remove("USER_ID")
            remove("USER_NAME")
            remove("USER_LAST_NAME")
            remove("USER_EMAIL")
            remove("USER_PHOTO_URL")
            remove("USER_POSITION")
            apply()
        }
    }
    
    // ── User Profile Cache ──────────────────────────────────────────────────

    fun saveUserProfile(id: String, name: String, lastName: String, email: String?, photoUrl: String?, position: String?) {
        with(sharedPreferences.edit()) {
            putString("USER_ID", id)
            putString("USER_NAME", name)
            putString("USER_LAST_NAME", lastName)
            if (email != null) putString("USER_EMAIL", email)
            if (photoUrl != null) putString("USER_PHOTO_URL", photoUrl)
            if (position != null) putString("USER_POSITION", position)
            apply()
        }
    }

    fun getUserId(): String? = sharedPreferences.getString("USER_ID", null)
    fun getUserName(): String? = sharedPreferences.getString("USER_NAME", null)
    fun getUserLastName(): String? = sharedPreferences.getString("USER_LAST_NAME", null)
    fun getUserEmail(): String? = sharedPreferences.getString("USER_EMAIL", null)
    fun getUserPhotoUrl(): String? = sharedPreferences.getString("USER_PHOTO_URL", null)
    fun getUserPosition(): String? = sharedPreferences.getString("USER_POSITION", null)

    fun getUserFullName(): String? {
        val name = getUserName() ?: return null
        val lastName = getUserLastName() ?: return name
        return "$name $lastName"
    }

    fun hasUserProfile(): Boolean = getUserId() != null
    
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