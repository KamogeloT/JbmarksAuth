//
//  AuthRepositoryImpl.swift
//  JbmrksIOs
//
//  Native Swift implementation of AuthRepository
//

import Foundation

nonisolated class AuthRepositoryImpl: AuthRepository {
    private let tokenStorage: TokenStorage
    
    init(tokenStorage: TokenStorage) {
        self.tokenStorage = tokenStorage
    }
    
    func isAuthenticated() async -> Bool {
        guard let token = tokenStorage.getAccessToken(),
              !token.isEmpty else {
            print("🔐 isAuthenticated: No access token found")
            return false
        }
        let isExpired = tokenStorage.isTokenExpired()
        let authenticated = !isExpired
        print("🔐 isAuthenticated: token exists, expired=\(isExpired), authenticated=\(authenticated)")
        return authenticated
    }
    
    func getAccessToken() async -> String? {
        return tokenStorage.getAccessToken()
    }
    
    func clearAuth() async {
        tokenStorage.clear()
    }
}
