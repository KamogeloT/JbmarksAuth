//
//  Notification.swift
//  JbmrksIOs
//
//  Notification model
//

import Foundation

enum NotificationType: String, Codable {
    case taskAssigned = "TASK_ASSIGNED"
    case taskUpdated = "TASK_UPDATED"
    case taskComment = "TASK_COMMENT"
    case taskDeadline = "TASK_DEADLINE"
    case taskStatusChanged = "TASK_STATUS_CHANGED"
    case fileAttached = "FILE_ATTACHED"
    case feedPost = "FEED_POST"
    case chatMessage = "CHAT_MESSAGE"
    case general = "GENERAL"
}

enum NotificationPriority: String, Codable {
    case low = "LOW"
    case normal = "NORMAL"
    case high = "HIGH"
    case urgent = "URGENT"
}

struct Notification: Identifiable, Codable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let timestamp: Int64
    let isRead: Bool
    let priority: NotificationPriority
    let relatedId: String?
    let actionUrl: String?
    
    func getFormattedTime() -> String {
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let diff = now - timestamp
        
        if diff < 60000 {
            return "Just now"
        } else if diff < 3600000 {
            return "\(diff / 60000) minutes ago"
        } else if diff < 86400000 {
            return "\(diff / 3600000) hours ago"
        } else if diff < 604800000 {
            return "\(diff / 86400000) days ago"
        } else {
            let date = Date(timeIntervalSince1970: Double(timestamp) / 1000)
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM dd, yyyy"
            return formatter.string(from: date)
        }
    }
    
    func getIcon() -> String {
        switch type {
        case .taskAssigned: return "📋"
        case .taskUpdated: return "✏️"
        case .taskComment: return "💬"
        case .taskDeadline: return "⏰"
        case .taskStatusChanged: return "🔄"
        case .fileAttached: return "📎"
        case .feedPost: return "📰"
        case .chatMessage: return "💬"
        case .general: return "🔔"
        }
    }
}
