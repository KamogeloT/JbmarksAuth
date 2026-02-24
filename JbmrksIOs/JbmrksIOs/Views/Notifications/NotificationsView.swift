//
//  NotificationsView.swift
//  JbmrksIOs
//
//  Notifications screen
//

import SwiftUI

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationsViewModel()
    
    var body: some View {
        ZStack {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadNotifications()
                    }
                }
            } else if viewModel.notifications.isEmpty {
                EmptyNotificationsState()
            } else {
                List {
                    ForEach(viewModel.notifications) { notification in
                        NotificationItemView(notification: notification) {
                            _Concurrency.Task { @MainActor in
                                await viewModel.markAsRead(id: notification.id)
                            }
                        }
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            _Concurrency.Task { @MainActor in
                                await viewModel.deleteNotification(id: viewModel.notifications[index].id)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Notifications")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button("Mark All as Read") {
                        _Concurrency.Task { @MainActor in
                            await viewModel.markAllAsRead()
                        }
                    }
                    Button(role: .destructive, action: {
                        _Concurrency.Task { @MainActor in
                            await viewModel.clearAll()
                        }
                    }) {
                        Label("Clear All", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task {
            await viewModel.loadNotifications()
        }
        .refreshable {
            await viewModel.loadNotifications()
        }
    }
}

// MARK: - Notification Item View
struct NotificationItemView: View {
    let notification: Notification
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Text(notification.getIcon())
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(notification.title)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        if !notification.isRead {
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 8, height: 8)
                        }
                    }
                    
                    Text(notification.message)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    Text(notification.getFormattedTime())
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Empty Notifications State
struct EmptyNotificationsState: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("🔔")
                .font(.system(size: 64))
            
            Text("No Notifications")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("When you receive notifications,\nthey will appear here.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
