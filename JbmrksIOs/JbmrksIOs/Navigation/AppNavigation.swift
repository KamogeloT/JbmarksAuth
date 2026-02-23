//
//  AppNavigation.swift
//  JbmrksIOs
//
//  Main navigation coordinator with deep linking support
//

import SwiftUI

enum NavigationRoute: Hashable {
    case taskDetail(String) // taskId
    case taskEdit(String) // taskId
    case chatMessage(String, String) // dialogId, chatName
}

struct AppNavigation: View {
    @State private var navigationPath = NavigationPath()
    @Binding var selectedTab: TabItem
    
    var body: some View {
        NavigationStack(path: $navigationPath) {
            // This will be replaced by the actual tab content
            EmptyView()
        }
        .navigationDestination(for: NavigationRoute.self) { route in
            switch route {
            case .taskDetail(let taskId):
                TaskDetailView(taskId: taskId) {
                    navigationPath.removeLast()
                }
            case .taskEdit(let taskId):
                TaskFormView(taskId: taskId) {
                    navigationPath.removeLast()
                }
            case .chatMessage(let dialogId, let chatName):
                MessageView(dialogId: dialogId, chatName: chatName) {
                    navigationPath.removeLast()
                }
            }
        }
    }
    
    func navigate(to route: NavigationRoute) {
        navigationPath.append(route)
    }
}
