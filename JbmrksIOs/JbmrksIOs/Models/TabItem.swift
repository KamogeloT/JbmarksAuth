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
    case comms = "Comms"
    case calendar = "Calendar"
    
    var icon: String {
        switch self {
        case .dashboard: return "house.fill"
        case .tasks: return "list.bullet"
        case .chat: return "message.fill"
        case .comms: return "bubble.left.and.bubble.right.fill"
        case .calendar: return "calendar"
        }
    }
}
