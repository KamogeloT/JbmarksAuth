//
//  NotificationsViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Notifications screen
//

import Foundation
import Combine

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [Notification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let notificationRepository: NotificationRepository
    
    var unreadCount: Int {
        notifications.filter { !$0.isRead }.count
    }
    
    init() {
        notificationRepository = NotificationRepositoryImpl()
    }
    
    func loadNotifications() async {
        isLoading = true
        errorMessage = nil
        
        do {
            notifications = try await notificationRepository.getNotifications()
        } catch {
            errorMessage = error.localizedDescription
            notifications = []
        }
        
        isLoading = false
    }
    
    func markAsRead(id: String) async {
        do {
            try await notificationRepository.markAsRead(id: id)
            await loadNotifications()
        } catch {
            errorMessage = "Failed to mark as read: \(error.localizedDescription)"
        }
    }
    
    func markAllAsRead() async {
        do {
            try await notificationRepository.markAllAsRead()
            await loadNotifications()
        } catch {
            errorMessage = "Failed to mark all as read: \(error.localizedDescription)"
        }
    }
    
    func deleteNotification(id: String) async {
        do {
            try await notificationRepository.deleteNotification(id: id)
            await loadNotifications()
        } catch {
            errorMessage = "Failed to delete notification: \(error.localizedDescription)"
        }
    }
    
    func clearAll() async {
        do {
            try await notificationRepository.clearAll()
            await loadNotifications()
        } catch {
            errorMessage = "Failed to clear notifications: \(error.localizedDescription)"
        }
    }
}
