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
    @StateObject private var notificationHandler = NotificationNavigationHandler()
    @State private var selectedTab: TabItem = .dashboard
    @State private var hasCommsAccess = false
    
    var body: some View {
        Group {
            if authViewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if authViewModel.isAuthenticated {
                mainContent
            } else {
                AuthView(viewModel: authViewModel)
            }
        }
        .task {
            await authViewModel.checkAuth()
            // Check if user has Comms access (is in MANAGEMENT workgroup 16)
            hasCommsAccess = await CommsViewModel.checkAccess()
        }
        .onChange(of: notificationHandler.selectedTab) { oldValue, newValue in
            selectedTab = newValue
        }
        .onChange(of: selectedTab) { oldValue, newValue in
            // Refresh data when tab changes
            switch newValue {
            case .dashboard:
                NotificationCenter.default.post(name: NSNotification.Name("RefreshDashboard"), object: nil)
            case .tasks:
                NotificationCenter.default.post(name: NSNotification.Name("RefreshTasks"), object: nil)
            case .chat:
                NotificationCenter.default.post(name: NSNotification.Name("RefreshChats"), object: nil)
            case .comms:
                NotificationCenter.default.post(name: NSNotification.Name("RefreshChats"), object: nil)
            case .calendar:
                NotificationCenter.default.post(name: NSNotification.Name("RefreshCalendar"), object: nil)
            }
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
            .onAppear {
                // Refresh when tab appears
                if selectedTab == .dashboard {
                    _Concurrency.Task { @MainActor in
                        // Trigger refresh via notification or direct call
                    }
                }
            }
            
            // Tasks Tab
            NavigationStack {
                VStack(spacing: 0) {
                    TopNavigationBar()
                    TasksView()
                }
                .navigationDestination(for: NavigationRoute.self) { route in
                    switch route {
                    case .taskDetail(let taskId):
                        TaskDetailView(taskId: taskId) {
                            // Navigation handled by NavigationStack
                        }
                    case .taskEdit(let taskId):
                        TaskFormView(taskId: taskId) {
                            // Navigation handled by NavigationStack
                        }
                    case .chatMessage:
                        // Not used in tasks tab
                        EmptyView()
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToTask"))) { notification in
                    if notification.userInfo?["taskId"] as? String != nil {
                        // Navigation will be handled by NavigationStack when route is set
                        // This is a workaround - in a real app you'd use a NavigationPath
                        selectedTab = .tasks
                    }
                }
            }
            .tabItem {
                Label("Tasks", systemImage: "list.bullet")
            }
            .tag(TabItem.tasks)
            
            // Chat Tab (shown when user does NOT have Comms access)
            if !hasCommsAccess {
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
                    .onChange(of: notificationHandler.navigationRoute) { oldValue, newValue in
                        if case .chatMessage = newValue {
                            // Navigation handled by NavigationStack
                        }
                    }
                }
                .tabItem {
                    Label("Chat", systemImage: "message.fill")
                }
                .tag(TabItem.chat)
            }
            
            // Comms Tab (shown when user HAS Comms access — replaces Chat)
            if hasCommsAccess {
                NavigationStack {
                    VStack(spacing: 0) {
                        CommsView()
                    }
                }
                .tabItem {
                    Label("Comms", systemImage: "bubble.left.and.bubble.right.fill")
                }
                .tag(TabItem.comms)
            }
            
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
        }
    }
}

#Preview {
    ContentView()
}
