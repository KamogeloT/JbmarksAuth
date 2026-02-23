//
//  AuthViewModel.swift
//  JbmrksIOs
//
//  Created by Kamogelo Tshukudu on 2025-01-27.
//

import Foundation
import Combine

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var errorMessage: String?
    
    private let authRepository: AuthRepository
    private let oauthService: OAuthService
    
    init(
        authRepository: AuthRepository? = nil,
        oauthService: OAuthService? = nil
    ) {
        // Access RepositoryFactory inside init body (MainActor context) instead of default parameter
        self.authRepository = authRepository ?? RepositoryFactory.shared.authRepository
        let tokenStorage = StorageFactory.shared.tokenStorage
        self.oauthService = oauthService ?? OAuthService(tokenStorage: tokenStorage)
    }
    
    func checkAuth() async {
        isLoading = true
        errorMessage = nil
        
        // isAuthenticated() doesn't throw, so no need for do-catch
        isAuthenticated = await authRepository.isAuthenticated()
        
        isLoading = false
    }
    
    func logout() async {
        await authRepository.clearAuth()
        isAuthenticated = false
    }
    
    func handleOAuthCallback(url: URL) async {
        isLoading = true
        errorMessage = nil
        
        // Extract authorization code and domain from URL
        // Handle both deep link format: jbmarks://oauth_redirect?code=...&domain=...
        // and HTTPS redirect format: https://...?code=...&domain=...
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value,
              !code.isEmpty else {
            errorMessage = "Invalid OAuth callback URL: missing authorization code"
            isLoading = false
            return
        }
        
        // Extract domain and member_id from query parameters (if present)
        let domain = components.queryItems?.first(where: { $0.name == "domain" })?.value
        let memberId = components.queryItems?.first(where: { $0.name == "member_id" })?.value
        
        // Get portal URL from storage or use default
        let portalUrl = StorageFactory.shared.tokenStorage.getPortalUrl() ?? OAuthConfig.defaultPortalUrl
        
        do {
            _ = try await oauthService.exchangeCodeForTokens(
                portalUrl: portalUrl,
                code: code,
                domain: domain,
                memberId: memberId
            )
            // Check auth status after token exchange
            print("✅ Token exchange successful, checking authentication status...")
            let authStatus = await authRepository.isAuthenticated()
            print("🔐 Authentication status: \(authStatus)")
            isAuthenticated = authStatus
            
            if !authStatus {
                print("⚠️ Warning: Token exchange succeeded but isAuthenticated returned false")
                // Force set to true if we have a token (token expiry check might be wrong)
                if let token = await authRepository.getAccessToken(), !token.isEmpty {
                    print("🔧 Token exists, forcing isAuthenticated to true")
                    isAuthenticated = true
                }
            }
        } catch let error as OAuthError {
            switch error {
            case .tokenExchangeFailed(let message):
                errorMessage = "Token exchange failed: \(message)"
            case .networkError(let underlyingError):
                errorMessage = "Network error: \(underlyingError.localizedDescription)"
            case .decodingError(let underlyingError):
                errorMessage = "Failed to parse response: \(underlyingError.localizedDescription)"
            default:
                errorMessage = "Authentication failed: \(error.localizedDescription)"
            }
            isAuthenticated = false
        } catch {
            errorMessage = "Failed to exchange authorization code: \(error.localizedDescription)"
            isAuthenticated = false
        }
        
        isLoading = false
    }
}
