//
//  MessageViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Message screen
//

import Foundation
import Combine

@MainActor
final class MessageViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var isSending = false
    @Published var errorMessage: String?
    @Published var currentUserId: String?
    
    private var chatRepository: ChatRepository?
    private let dialogId: String
    
    init(dialogId: String) {
        self.dialogId = dialogId
    }
    
    func loadMessages() async {
        isLoading = true
        errorMessage = nil
        
        guard let tokenStorage = StorageFactory.shared.tokenStorage.getAccessToken(),
              !tokenStorage.isEmpty else {
            errorMessage = "Not authenticated"
            isLoading = false
            return
        }
        
        let baseUrl = StorageFactory.shared.tokenStorage.getPortalUrl() ?? "https://jbmarks.sdinmotion.co.za/"
        let apiClient = BitrixApiClient(baseUrl: baseUrl, accessToken: tokenStorage)
        chatRepository = ChatRepositoryImpl(apiClient: apiClient)
        
        // Get current user ID
        let userRepository = UserRepositoryImpl(apiClient: apiClient)
        do {
            let user = try await userRepository.getCurrentUser()
            currentUserId = user.id
        } catch {
            print("Failed to get current user: \(error)")
        }
        
        guard let repo = chatRepository else {
            errorMessage = "Failed to create repository"
            isLoading = false
            return
        }
        
        do {
            print("📱 MessageViewModel: Loading messages for dialogId: \(dialogId)")
            messages = try await repo.getChatMessages(dialogId: dialogId, limit: 50)
            print("✅ MessageViewModel: Loaded \(messages.count) messages")
        } catch {
            let errorDesc = error.localizedDescription
            print("❌ MessageViewModel: Error loading messages: \(errorDesc)")
            errorMessage = errorDesc
            messages = []
        }
        
        isLoading = false
    }
    
    func sendMessage(text: String) async {
        guard let repo = chatRepository, !text.isEmpty else { return }
        
        isSending = true
        errorMessage = nil
        
        do {
            _ = try await repo.sendMessage(dialogId: dialogId, text: text)
            await loadMessages() // Reload messages after sending
        } catch {
            errorMessage = "Failed to send message: \(error.localizedDescription)"
        }
        
        isSending = false
    }
    
    func sendMessageWithFile(filePath: String, fileName: String) async {
        guard let repo = chatRepository else { return }
        
        isSending = true
        errorMessage = nil
        
        do {
            let fileData = try Data(contentsOf: URL(fileURLWithPath: filePath))
            _ = try await repo.sendMessageWithFile(dialogId: dialogId, text: "", fileData: fileData, fileName: fileName)
            await loadMessages() // Reload messages after sending
        } catch {
            errorMessage = "Failed to send file: \(error.localizedDescription)"
        }
        
        isSending = false
    }
}
