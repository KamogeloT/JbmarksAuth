//
//  ContentView.swift
//  JbmrksIOs
//

import SwiftUI

// Helper to disambiguate Swift concurrency Task from our Task model
private func runAsync(_ operation: @escaping () async -> Void) {
    // Use fully qualified concurrency Task to avoid conflict with our Task model
    _Concurrency.Task { @MainActor in
        await operation()
    }
}

struct ContentView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @State private var selectedTab: TabItem = .dashboard
    
    var body: some View {
        Group {
            if authViewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if authViewModel.isAuthenticated {
                mainContent
            } else {
                AuthView()
            }
        }
        .task {
            await authViewModel.checkAuth()
        }
    }
    
    private var mainContent: some View {
        TabView(selection: $selectedTab) {
            // Dashboard Tab
            NavigationStack {
                VStack(spacing: 0) {
                    TopNavigationBar()
                    DashboardView(selectedTab: $selectedTab)
                }
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(TabItem.dashboard)
            
            // Tasks Tab
            NavigationStack {
                VStack(spacing: 0) {
                    TopNavigationBar()
                    TasksView()
                }
            }
            .tabItem {
                Label("Tasks", systemImage: "list.bullet")
            }
            .tag(TabItem.tasks)
            
            // Chat Tab
            NavigationStack {
                VStack(spacing: 0) {
                    TopNavigationBar()
                    ChatListView()
                }
                .navigationDestination(for: NavigationRoute.self) { route in
                    switch route {
                    case .chatMessage(let dialogId, let chatName):
                        MessageView(dialogId: dialogId, chatName: chatName) {
                            // Navigation will be handled by NavigationStack
                        }
                    case .taskDetail, .taskEdit:
                        // Not used in chat tab
                        EmptyView()
                    }
                }
            }
            .tabItem {
                Label("Chat", systemImage: "message.fill")
            }
            .tag(TabItem.chat)
            
            // Calendar Tab
            NavigationStack {
                VStack(spacing: 0) {
                    TopNavigationBar()
                    CalendarView()
                }
            }
            .tabItem {
                Label("Calendar", systemImage: "calendar")
            }
            .tag(TabItem.calendar)
            
            // Feed Tab
            NavigationStack {
                VStack(spacing: 0) {
                    TopNavigationBar()
                    ActivityFeedView()
                }
            }
            .tabItem {
                Label("Feed", systemImage: "bell.fill")
            }
            .tag(TabItem.feed)
        }
    }
}

#Preview {
    ContentView()
}
