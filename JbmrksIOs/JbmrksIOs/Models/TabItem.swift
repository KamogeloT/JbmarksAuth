//
//  TabItem.swift
//  JbmrksIOs
//
//  Tab navigation item enum
//

import Foundation

enum TabItem: String, CaseIterable {
    case dashboard = "Dashboard"
    case tasks = "Tasks"
    case chat = "Chat"
    case calendar = "Calendar"
    case feed = "Feed"
    
    var icon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .tasks: return "list.bullet"
        case .chat: return "message.fill"
        case .calendar: return "calendar"
        case .feed: return "bell.fill"
        }
    }
}
