//
//  TokenRefreshHelper.swift
//  JbmrksIOs
//
//  Helper for automatic token refresh on 401 errors
//

import Foundation

/// Thread-safe helper for token refresh operations
actor TokenRefreshHelper {
    static let shared = TokenRefreshHelper()
    
    private var isRefreshing = false
    private var refreshTask: _Concurrency.Task<TokenResponse, Error>?
    
    private init() {}
    
    /// Refresh token if not already refreshing, otherwise wait for existing refresh
    func refreshTokenIfNeeded(portalUrl: String, tokenStorage: TokenStorage) async throws -> String {
        // If already refreshing, wait for that task
        if let existingTask = refreshTask {
            do {
                let response = try await existingTask.value
                return response.access_token
            } catch {
                // Refresh failed, clear task and throw
                refreshTask = nil
                isRefreshing = false
                throw error
            }
        }
        
        // Check if we have a refresh token
        guard let refreshToken = tokenStorage.getRefreshToken(),
              !refreshToken.isEmpty else {
            throw OAuthError.noRefreshToken
        }
        
        // Start new refresh
        isRefreshing = true
        let task = _Concurrency.Task {
            let oauthService = OAuthService(tokenStorage: tokenStorage)
            return try await oauthService.refreshToken(portalUrl: portalUrl)
        }
        refreshTask = task
        
        do {
            let response = try await task.value
            refreshTask = nil
            isRefreshing = false
            return response.access_token
        } catch {
            refreshTask = nil
            isRefreshing = false
            throw error
        }
    }
    
    /// Reset refresh state (for testing or logout)
    func reset() {
        refreshTask = nil
        isRefreshing = false
    }
}
