//
//  APIRequestHelper.swift
//  JbmrksIOs
//
//  Helper for automatic token refresh and retry on 401 errors
//

import Foundation

/// Helper to execute API requests with automatic token refresh on 401 errors
struct APIRequestHelper {
    let baseApiClient: BitrixApiClient
    let tokenStorage: TokenStorage
    let baseUrl: String
    
    /// Execute an API request with automatic token refresh on 401
    func executeWithTokenRefresh<T>(
        operation: (BitrixApiClient) async throws -> T
    ) async throws -> T {
        do {
            return try await operation(baseApiClient)
        } catch APIError.httpError(401, _) {
            // Token expired - refresh and retry
            print("🔄 Token expired (401), attempting refresh...")
            
            guard let portalUrl = tokenStorage.getPortalUrl() else {
                throw APIError.httpError(401, "Token expired and no portal URL available")
            }
            
            do {
                let newToken = try await TokenRefreshHelper.shared.refreshTokenIfNeeded(
                    portalUrl: portalUrl,
                    tokenStorage: tokenStorage
                )
                
                // Create new API client with refreshed token
                let refreshedClient = BitrixApiClient(baseUrl: baseUrl, accessToken: newToken)
                print("✅ Token refreshed, retrying request...")
                
                // Retry the operation with new client
                return try await operation(refreshedClient)
            } catch {
                print("❌ Token refresh failed: \(error.localizedDescription)")
                // If refresh fails, throw original 401 error
                throw APIError.httpError(401, "Token expired and refresh failed: \(error.localizedDescription)")
            }
        }
    }
}
