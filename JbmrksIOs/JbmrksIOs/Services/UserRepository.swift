//
//  UserRepository.swift
//  JbmrksIOs
//
//  Repository for user profile data
//

import Foundation

protocol UserRepository {
    func getCurrentUser() async throws -> User
    func getUser(id: String) async throws -> User
    func getUserWorkgroups() async throws -> [Workgroup]
}

nonisolated class UserRepositoryImpl: UserRepository {
    private let apiClient: BitrixApiClient
    private let tokenStorage: TokenStorage
    private let baseUrl: String
    
    init(apiClient: BitrixApiClient, tokenStorage: TokenStorage? = nil) {
        self.apiClient = apiClient
        self.tokenStorage = tokenStorage ?? StorageFactory.shared.tokenStorage
        self.baseUrl = apiClient.baseUrl
    }
    
    private var requestHelper: APIRequestHelper {
        APIRequestHelper(baseApiClient: apiClient, tokenStorage: tokenStorage, baseUrl: baseUrl)
    }
    
    func getCurrentUser() async throws -> User {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getCurrentUser()
        }
    }
    
    func getUser(id: String) async throws -> User {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getUser(id: id)
        }
    }
    
    func getUserWorkgroups() async throws -> [Workgroup] {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getUserWorkgroups()
        }
    }
}
