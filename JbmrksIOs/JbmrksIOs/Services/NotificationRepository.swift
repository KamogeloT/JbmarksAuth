//
//  NotificationRepository.swift
//  JbmrksIOs
//
//  Repository for notifications (local storage)
//

import Foundation

protocol NotificationRepository {
    func getNotifications() async throws -> [Notification]
    func markAsRead(id: String) async throws
    func markAllAsRead() async throws
    func deleteNotification(id: String) async throws
    func clearAll() async throws
    func addNotification(_ notification: Notification) async throws
}

nonisolated class NotificationRepositoryImpl: NotificationRepository {
    private let userDefaults = UserDefaults.standard
    private let notificationsKey = "notifications"
    
    func getNotifications() async throws -> [Notification] {
        guard let data = userDefaults.data(forKey: notificationsKey) else {
            return []
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode([Notification].self, from: data).sorted { $0.timestamp > $1.timestamp }
    }
    
    func markAsRead(id: String) async throws {
        var notifications = try await getNotifications()
        if let index = notifications.firstIndex(where: { $0.id == id }) {
            var notification = notifications[index]
            notification = Notification(
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                timestamp: notification.timestamp,
                isRead: true,
                priority: notification.priority,
                relatedId: notification.relatedId,
                actionUrl: notification.actionUrl
            )
            notifications[index] = notification
            try await saveNotifications(notifications)
        }
    }
    
    func markAllAsRead() async throws {
        let notifications = try await getNotifications()
        let updated = notifications.map { notification in
            Notification(
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                timestamp: notification.timestamp,
                isRead: true,
                priority: notification.priority,
                relatedId: notification.relatedId,
                actionUrl: notification.actionUrl
            )
        }
        try await saveNotifications(updated)
    }
    
    func deleteNotification(id: String) async throws {
        var notifications = try await getNotifications()
        notifications.removeAll { $0.id == id }
        try await saveNotifications(notifications)
    }
    
    func clearAll() async throws {
        userDefaults.removeObject(forKey: notificationsKey)
    }
    
    func addNotification(_ notification: Notification) async throws {
        var notifications = try await getNotifications()
        notifications.insert(notification, at: 0) // Add to beginning
        try await saveNotifications(notifications)
    }
    
    private func saveNotifications(_ notifications: [Notification]) async throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(notifications)
        userDefaults.set(data, forKey: notificationsKey)
    }
}
