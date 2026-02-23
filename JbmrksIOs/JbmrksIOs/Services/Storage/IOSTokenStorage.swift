//
//  IOSTokenStorage.swift
//  JbmrksIOs
//
//  iOS implementation of TokenStorage interface
//  Uses Keychain Services for secure token storage
//

import Foundation

/// iOS implementation of TokenStorage using Keychain Services
nonisolated class IOSTokenStorage: TokenStorage {
    private let keychain = KeychainHelper.shared
    
    // Keychain keys
    private let accessTokenKey = "access_token"
    private let refreshTokenKey = "refresh_token"
    private let portalUrlKey = "portal_url"
    private let tokenExpiryKey = "token_expiry"
    
    func saveAccessToken(token: String) {
        _ = keychain.save(key: accessTokenKey, value: token)
    }
    
    func getAccessToken() -> String? {
        return keychain.get(key: accessTokenKey)
    }
    
    func saveRefreshToken(token: String) {
        _ = keychain.save(key: refreshTokenKey, value: token)
    }
    
    func getRefreshToken() -> String? {
        return keychain.get(key: refreshTokenKey)
    }
    
    func savePortalUrl(url: String) {
        _ = keychain.save(key: portalUrlKey, value: url)
    }
    
    func getPortalUrl() -> String? {
        return keychain.get(key: portalUrlKey)
    }
    
    func saveTokenExpiry(expiresIn: Int) {
        // Calculate expiry timestamp (current time + expiresIn seconds)
        let currentTime = Int64(Date().timeIntervalSince1970)
        let expiryTimestamp = currentTime + Int64(expiresIn)
        print("💾 Saving token expiry: expiresIn=\(expiresIn), currentTime=\(currentTime), expiryTimestamp=\(expiryTimestamp)")
        _ = keychain.save(key: tokenExpiryKey, value: String(expiryTimestamp))
    }
    
    func getTokenExpiry() -> Int64? {
        guard let expiryString = keychain.get(key: tokenExpiryKey),
              let expiryTimestamp = Int64(expiryString) else {
            return nil
        }
        return expiryTimestamp
    }
    
    func isTokenExpired() -> Bool {
        guard let expiryString = keychain.get(key: tokenExpiryKey),
              let expiryTimestamp = Int64(expiryString) else {
            print("⚠️ Token expiry not found in keychain - considering expired")
            return true // If no expiry stored, consider expired
        }
        
        let currentTimestamp = Int64(Date().timeIntervalSince1970)
        let isExpired = currentTimestamp >= expiryTimestamp
        print("🔍 Token expiry check: current=\(currentTimestamp), expiry=\(expiryTimestamp), expired=\(isExpired)")
        return isExpired
    }
    
    func clear() {
        _ = keychain.delete(key: accessTokenKey)
        _ = keychain.delete(key: refreshTokenKey)
        _ = keychain.delete(key: portalUrlKey)
        _ = keychain.delete(key: tokenExpiryKey)
    }
}
