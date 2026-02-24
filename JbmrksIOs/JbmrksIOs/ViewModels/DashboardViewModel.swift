//
//  DashboardViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Dashboard screen
//

import Foundation
import Combine

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats = DashboardStats()
    @Published var recentActivity: [BlogPost] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var dashboardRepository: DashboardRepository?
    private var activityFeedRepository: ActivityFeedRepository?
    
    init() {}
    
    func loadDashboard() async {
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
        
        let tasksRepo = RepositoryFactory.shared.tasksRepository()
        let chatRepo = ChatRepositoryImpl(apiClient: apiClient)
        let calendarRepo = CalendarRepositoryImpl(apiClient: apiClient)
        let feedRepo = ActivityFeedRepositoryImpl(apiClient: apiClient)
        let userRepo = UserRepositoryImpl(apiClient: apiClient)
        
        dashboardRepository = DashboardRepositoryImpl(
            tasksRepository: tasksRepo,
            chatRepository: chatRepo,
            calendarRepository: calendarRepo,
            activityFeedRepository: feedRepo,
            userRepository: userRepo
        )
        
        activityFeedRepository = feedRepo
        
        guard let dashboardRepo = dashboardRepository else {
            errorMessage = "Failed to create repository"
            isLoading = false
            return
        }
        
        do {
            stats = try await dashboardRepo.getDashboardStats()
            
            // Load recent activity
            if let feedRepo = activityFeedRepository {
                let posts = (try? await feedRepo.getFeed()) ?? []
                recentActivity = Array(posts.prefix(5))
            }
        } catch {
            errorMessage = error.localizedDescription
            stats = DashboardStats()
        }
        
        isLoading = false
    }
}
