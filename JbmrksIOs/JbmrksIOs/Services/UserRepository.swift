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
}

nonisolated class UserRepositoryImpl: UserRepository {
    private let apiClient: BitrixApiClient
    
    init(apiClient: BitrixApiClient) {
        self.apiClient = apiClient
    }
    
    func getCurrentUser() async throws -> User {
        return try await apiClient.getCurrentUser()
    }
    
    func getUser(id: String) async throws -> User {
        return try await apiClient.getUser(id: id)
    }
}
