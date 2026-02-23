//
//  RepositoryFactory.swift
//  JbmrksIOs
//
//  Creates repository instances with current token
//

import Foundation

/// Builds repository instances using current token from storage
nonisolated final class RepositoryFactory {
    nonisolated static let shared = RepositoryFactory()
    
    private let tokenStorage: TokenStorage
    private let defaultBaseUrl = "https://jbmarks.sdinmotion.co.za/"
    
    private init() {
        self.tokenStorage = StorageFactory.shared.tokenStorage
    }
    
    /// Get API client with current token. Returns nil if not authenticated.
    private func getApiClient() -> BitrixApiClient? {
        guard let accessToken = tokenStorage.getAccessToken(),
              !accessToken.isEmpty else {
            return nil
        }
        let baseUrl = tokenStorage.getPortalUrl() ?? defaultBaseUrl
        return BitrixApiClient(baseUrl: baseUrl, accessToken: accessToken)
    }
    
    /// Create AuthRepository instance
    var authRepository: AuthRepository {
        return AuthRepositoryImpl(tokenStorage: tokenStorage)
    }
    
    /// Create TasksRepository with current token. Returns nil if not authenticated.
    func tasksRepository() -> TasksRepository? {
        guard let apiClient = getApiClient() else {
            return nil
        }
        return TasksRepositoryImpl(apiClient: apiClient, tokenStorage: tokenStorage)
    }
    
    /// Create ChatRepository with current token. Returns nil if not authenticated.
    func chatRepository() -> ChatRepository? {
        guard let apiClient = getApiClient() else {
            return nil
        }
        return ChatRepositoryImpl(apiClient: apiClient)
    }
    
    /// Create CalendarRepository with current token. Returns nil if not authenticated.
    func calendarRepository() -> CalendarRepository? {
        guard let apiClient = getApiClient() else {
            return nil
        }
        return CalendarRepositoryImpl(apiClient: apiClient)
    }
    
    /// Create ActivityFeedRepository with current token. Returns nil if not authenticated.
    func activityFeedRepository() -> ActivityFeedRepository? {
        guard let apiClient = getApiClient() else {
            return nil
        }
        return ActivityFeedRepositoryImpl(apiClient: apiClient)
    }
    
    /// Create UserRepository with current token. Returns nil if not authenticated.
    func userRepository() -> UserRepository? {
        guard let apiClient = getApiClient() else {
            return nil
        }
        return UserRepositoryImpl(apiClient: apiClient)
    }
    
    /// Create DashboardRepository with current token. Returns nil if not authenticated.
    func dashboardRepository() -> DashboardRepository? {
        guard getApiClient() != nil else {
            return nil
        }
        return DashboardRepositoryImpl(
            tasksRepository: tasksRepository(),
            chatRepository: chatRepository(),
            calendarRepository: calendarRepository(),
            activityFeedRepository: activityFeedRepository(),
            userRepository: userRepository()
        )
    }
    
    /// Create NotificationRepository (doesn't require authentication)
    var notificationRepository: NotificationRepository {
        return NotificationRepositoryImpl()
    }
}
