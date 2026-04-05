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
    @Published var isLoadingMore = false
    @Published var isPosting = false
    @Published var errorMessage: String?
    @Published var hasMore = true
    
    private var activityFeedRepository: ActivityFeedRepository?
    private var currentStart = 0
    private let pageSize = 20
    
    init() {}
    
    func loadFeed() async {
        isLoading = true
        errorMessage = nil
        currentStart = 0
        hasMore = true
        
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
            // Match Android: fetch all posts without pagination initially
            let newPosts = try await repo.getFeed(start: nil, limit: nil)
            posts = newPosts
            print("✅ Loaded \(newPosts.count) feed posts (all posts)")
            // If we got posts, enable pagination for future loads
            hasMore = newPosts.count > 0
            currentStart = newPosts.count
        } catch {
            errorMessage = error.localizedDescription
            posts = []
            print("❌ Failed to load feed: \(error.localizedDescription)")
        }
        
        isLoading = false
    }
    
    func loadMore() async {
        guard !isLoadingMore && hasMore else { return }
        
        isLoadingMore = true
        
        guard let repo = activityFeedRepository else {
            isLoadingMore = false
            return
        }
        
        do {
            let newPosts = try await repo.getFeed(start: currentStart, limit: pageSize)
            if newPosts.isEmpty {
                hasMore = false
            } else {
                posts.append(contentsOf: newPosts)
                currentStart += newPosts.count
                hasMore = newPosts.count >= pageSize
            }
        } catch {
            print("⚠️ Failed to load more posts: \(error.localizedDescription)")
            // Don't show error for load more, just stop loading
            hasMore = false
        }
        
        isLoadingMore = false
    }
    
    func addPost(text: String, title: String? = nil) async {
        guard let repo = activityFeedRepository else { return }
        
        // Validate post text (trim whitespace and check if empty)
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else {
            errorMessage = "Post text cannot be empty"
            return
        }
        
        isPosting = true
        errorMessage = nil
        
        do {
            _ = try await repo.addPost(text: trimmedText, title: title?.trimmingCharacters(in: .whitespacesAndNewlines))
            await loadFeed() // Refresh feed after posting
        } catch {
            errorMessage = "Failed to add post: \(error.localizedDescription)"
        }
        
        isPosting = false
    }
}
