//
//  ActivityFeedRepository.swift
//  JbmrksIOs
//
//  Repository for activity feed
//

import Foundation

protocol ActivityFeedRepository {
    func getFeed() async throws -> [BlogPost]
    func addPost(text: String, title: String?) async throws -> String
}

nonisolated class ActivityFeedRepositoryImpl: ActivityFeedRepository {
    private let apiClient: BitrixApiClient
    
    init(apiClient: BitrixApiClient) {
        self.apiClient = apiClient
    }
    
    func getFeed() async throws -> [BlogPost] {
        return try await apiClient.getBlogFeed()
    }
    
    func addPost(text: String, title: String?) async throws -> String {
        return try await apiClient.addBlogPost(message: text, title: title)
    }
}
