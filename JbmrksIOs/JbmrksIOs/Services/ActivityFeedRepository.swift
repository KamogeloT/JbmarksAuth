//
//  ActivityFeedRepository.swift
//  JbmrksIOs
//
//  Repository for activity feed
//

import Foundation

protocol ActivityFeedRepository {
    func getFeed(start: Int?, limit: Int?) async throws -> [BlogPost]
    func getPost(postId: String) async throws -> BlogPost
    func getPostComments(postId: String) async throws -> [BlogComment]
    func addPost(text: String, title: String?) async throws -> String
    func addComment(postId: String, text: String) async throws -> String
}

nonisolated class ActivityFeedRepositoryImpl: ActivityFeedRepository {
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
    
    func getFeed(start: Int? = nil, limit: Int? = nil) async throws -> [BlogPost] {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getBlogFeed(start: start, limit: limit)
        }
    }
    
    func getPost(postId: String) async throws -> BlogPost {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getBlogPost(postId: postId)
        }
    }
    
    func getPostComments(postId: String) async throws -> [BlogComment] {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getBlogPostComments(postId: postId)
        }
    }
    
    func addPost(text: String, title: String?) async throws -> String {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.addBlogPost(message: text, title: title)
        }
    }
    
    func addComment(postId: String, text: String) async throws -> String {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.addBlogPostComment(postId: postId, text: text)
        }
    }
}
