//
//  ChatListViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Chat List screen
//

import Foundation
import Combine

@MainActor
final class ChatListViewModel: ObservableObject {
    @Published var chats: [Chat] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchQuery: String = ""
    @Published var showCreateChatDialog = false
    
    private var chatRepository: ChatRepository?
    
    var filteredChats: [Chat] {
        if searchQuery.isEmpty {
            return chats
        }
        let query = searchQuery.lowercased()
        return chats.filter { chat in
            chat.name.lowercased().contains(query) ||
            chat.lastMessage?.text.lowercased().contains(query) ?? false
        }
    }
    
    init() {}
    
    func loadChats() async {
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
        
        guard let repo = chatRepository else {
            errorMessage = "Failed to create repository"
            isLoading = false
            return
        }
        
        do {
            chats = try await repo.getRecentChats()
            print("✅ ChatListViewModel: Loaded \(chats.count) chats")
        } catch {
            let errorDesc = error.localizedDescription
            print("❌ ChatListViewModel: Error loading chats: \(errorDesc)")
            errorMessage = errorDesc
            chats = []
        }
        
        isLoading = false
    }
    
    func setSearchQuery(_ query: String) {
        searchQuery = query
    }
}
