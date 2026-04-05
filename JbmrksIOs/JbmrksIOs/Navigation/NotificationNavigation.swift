//
//  NotificationNavigation.swift
//  JbmrksIOs
//
//  Navigation handling for push notifications
//

import SwiftUI
import Combine

/// Helper class to handle navigation from push notifications
@MainActor
class NotificationNavigationHandler: ObservableObject {
    @Published var navigationRoute: NavigationRoute?
    @Published var selectedTab: TabItem = .dashboard
    @Published var pendingTaskId: String?
    @Published var pendingChatDialogId: String?
    @Published var pendingChatName: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        setupNotificationObservers()
    }
    
    private func setupNotificationObservers() {
        // Observe task navigation
        NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToTask"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                if let taskId = notification.userInfo?["taskId"] as? String {
                    self?.pendingTaskId = taskId
                    self?.selectedTab = .tasks
                    // Small delay to ensure tab switch completes
                    _Concurrency.Task { @MainActor in
                        try? await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
                        self?.navigationRoute = .taskDetail(taskId)
                    }
                }
            }
            .store(in: &cancellables)
        
        // Observe chat navigation
        NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToChat"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                if let dialogId = notification.userInfo?["dialogId"] as? String,
                   let chatName = notification.userInfo?["chatName"] as? String {
                    self?.pendingChatDialogId = dialogId
                    self?.pendingChatName = chatName
                    self?.selectedTab = .chat
                    // Small delay to ensure tab switch completes
                    _Concurrency.Task { @MainActor in
                        try? await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
                        self?.navigationRoute = .chatMessage(dialogId, chatName)
                    }
                }
            }
            .store(in: &cancellables)
        
        // Observe feed navigation
        NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToFeed"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.selectedTab = .feed
            }
            .store(in: &cancellables)
        
        // Observe dashboard navigation
        NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToDashboard"))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.selectedTab = .dashboard
            }
            .store(in: &cancellables)
    }
    
    /// Navigate to a specific route
    func navigate(to route: NavigationRoute) {
        navigationRoute = route
    }
    
    /// Clear navigation route
    func clearNavigation() {
        navigationRoute = nil
        pendingTaskId = nil
        pendingChatDialogId = nil
        pendingChatName = nil
    }
}
