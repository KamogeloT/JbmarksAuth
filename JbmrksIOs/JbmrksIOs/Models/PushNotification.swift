//
//  PushNotification.swift
//  JbmrksIOs
//
//  Push notification model matching Android structure
//

import Foundation

/// Push notification model matching Android's notification structure
struct PushNotification: Codable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let timestamp: Int64
    let isRead: Bool
    let priority: NotificationPriority
    let relatedId: String?
    let actionUrl: String?
    
    /// Notification type enum matching Android
    enum NotificationType: String, Codable {
        case task = "TASK"
        case chat = "CHAT"
        case feed = "FEED"
        case general = "GENERAL"
    }
    
    /// Notification priority enum matching Android
    enum NotificationPriority: String, Codable {
        case high = "HIGH"
        case normal = "NORMAL"
        case low = "LOW"
    }
}

/// Extension to convert from existing Notification model
extension PushNotification {
    // Type aliases to disambiguate from nested enums
    private typealias GlobalNotificationType = JbmrksIOs.NotificationType
    private typealias GlobalNotificationPriority = JbmrksIOs.NotificationPriority
    
    init(from notification: Notification) {
        self.id = notification.id
        self.type = Self.mapNotificationType(notification.type)
        self.title = notification.title
        self.message = notification.message
        self.timestamp = notification.timestamp
        self.isRead = notification.isRead
        self.priority = Self.mapNotificationPriority(notification.priority)
        self.relatedId = notification.relatedId
        self.actionUrl = notification.actionUrl
    }
    
    private static func mapNotificationType(_ type: GlobalNotificationType) -> NotificationType {
        switch type {
        case .taskAssigned, .taskUpdated, .taskComment, .taskDeadline, .taskStatusChanged, .fileAttached:
            return .task
        case .chatMessage:
            return .chat
        case .feedPost:
            return .feed
        case .general:
            return .general
        }
    }
    
    private static func mapNotificationPriority(_ priority: GlobalNotificationPriority) -> NotificationPriority {
        switch priority {
        case .urgent, .high:
            return .high
        case .normal:
            return .normal
        case .low:
            return .low
        }
    }
}
