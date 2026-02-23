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
    
    init(apiClient: BitrixApiClient) {
        self.apiClient = apiClient
    }
    
    func getRecentChats() async throws -> [Chat] {
        return try await apiClient.getRecentChats()
    }
    
    func getChatMessages(dialogId: String, limit: Int = 50) async throws -> [Message] {
        return try await apiClient.getChatMessages(dialogId: dialogId, limit: limit)
    }
    
    func sendMessage(dialogId: String, text: String) async throws -> String {
        return try await apiClient.sendMessage(dialogId: dialogId, text: text)
    }
    
    func sendMessageWithFile(dialogId: String, text: String, fileData: Data, fileName: String) async throws -> String {
        // First upload file, then send message with file ID
        let fileId = try await apiClient.uploadFile(fileData: fileData, fileName: fileName)
        return try await apiClient.sendMessage(dialogId: dialogId, text: text, fileIds: [fileId])
    }
    
    func createChat(userIds: [String], title: String?) async throws -> Chat {
        return try await apiClient.createChat(userIds: userIds, title: title)
    }
}
