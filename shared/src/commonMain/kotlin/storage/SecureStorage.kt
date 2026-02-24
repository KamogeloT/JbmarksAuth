package com.example.jbmarks.shared.storage

/**
 * Interface for secure storage operations
 * Platform-specific implementations will use:
 * - Android: EncryptedSharedPreferences
 * - iOS: Keychain Services
 */
interface SecureStorage {
    suspend fun save(key: String, value: String)
    suspend fun get(key: String): String?
    suspend fun delete(key: String)
    suspend fun clear()
}
