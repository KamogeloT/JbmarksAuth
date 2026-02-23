//
//  ActivityFeedViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Activity Feed screen
//

import Foundation
import Combine

@MainActor
final class ActivityFeedViewModel: ObservableObject {
    @Published var posts: [BlogPost] = []
    @Published var isLoading = false
    @Published var isPosting = false
    @Published var errorMessage: String?
    
    private var activityFeedRepository: ActivityFeedRepository?
    
    init() {}
    
    func loadFeed() async {
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
        activityFeedRepository = ActivityFeedRepositoryImpl(apiClient: apiClient)
        
        guard let repo = activityFeedRepository else {
            errorMessage = "Failed to create repository"
            isLoading = false
            return
        }
        
        do {
            posts = try await repo.getFeed()
        } catch {
            errorMessage = error.localizedDescription
            posts = []
        }
        
        isLoading = false
    }
    
    func addPost(text: String, title: String? = nil) async {
        guard let repo = activityFeedRepository else { return }
        
        isPosting = true
        errorMessage = nil
        
        do {
            _ = try await repo.addPost(text: text, title: title)
            await loadFeed() // Refresh feed after posting
        } catch {
            errorMessage = "Failed to add post: \(error.localizedDescription)"
        }
        
        isPosting = false
    }
}
