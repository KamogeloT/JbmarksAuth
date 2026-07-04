//
//  ChatRepository.swift
//  JbmrksIOs
//
//  Repository for chat operations
//

import Foundation

protocol ChatRepository {
    func getRecentChats() async throws -> [Chat]
    func getChatMessages(dialogId: String, limit: Int) async throws -> [Message]
    func sendMessage(dialogId: String, text: String) async throws -> String
    func sendMessageWithFile(dialogId: String, text: String, fileData: Data, fileName: String) async throws -> String
    func createChat(userIds: [String], title: String?) async throws -> Chat
}

nonisolated class ChatRepositoryImpl: ChatRepository {
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
    
    func getRecentChats() async throws -> [Chat] {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getRecentChats()
        }
    }
    
    func getChatMessages(dialogId: String, limit: Int = 50) async throws -> [Message] {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.getChatMessages(dialogId: dialogId, limit: limit)
        }
    }
    
    func sendMessage(dialogId: String, text: String) async throws -> String {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.sendMessage(dialogId: dialogId, text: text)
        }
    }
    
    func sendMessageWithFile(dialogId: String, text: String, fileData: Data, fileName: String) async throws -> String {
        // First upload file, then send message with file ID
        let fileId = try await requestHelper.executeWithTokenRefresh { client in
            try await client.uploadFile(fileData: fileData, fileName: fileName)
        }
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.sendMessage(dialogId: dialogId, text: text, fileIds: [fileId])
        }
    }
    
    func createChat(userIds: [String], title: String?) async throws -> Chat {
        return try await requestHelper.executeWithTokenRefresh { client in
            try await client.createChat(userIds: userIds, title: title)
        }
    }
}
