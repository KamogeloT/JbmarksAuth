//
//  ChatListView.swift
//  JbmrksIOs
//
//  Chat list screen
//

import SwiftUI

struct ChatListView: View {
    @StateObject private var viewModel = ChatListViewModel()
    
    var body: some View {
        ZStack {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadChats()
                    }
                }
            } else if viewModel.filteredChats.isEmpty {
                EmptyChatState()
            } else {
                List {
                    ForEach(viewModel.filteredChats) { chat in
                        NavigationLink(value: NavigationRoute.chatMessage(chat.dialogId, chat.name)) {
                            ChatItemView(chat: chat)
                        }
                    }
                }
            }
        }
        .navigationTitle("Chats")
        .searchable(text: $viewModel.searchQuery, prompt: "Search chats...")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { viewModel.showCreateChatDialog = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .task {
            await viewModel.loadChats()
        }
        .refreshable {
            await viewModel.loadChats()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshChats"))) { _ in
            _Concurrency.Task { @MainActor in
                await viewModel.loadChats()
            }
        }
    }
}

// MARK: - Chat Item View
struct ChatItemView: View {
    let chat: Chat
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 50, height: 50)
                
                Image(systemName: chat.type == .group ? "person.2.fill" : "person.fill")
                    .font(.system(size: 24))
                    .foregroundColor(.blue)
            }
            
            // Chat info
            VStack(alignment: .leading, spacing: 4) {
                Text(chat.name)
                    .font(.headline)
                    .lineLimit(1)
                
                if let lastMessage = chat.lastMessage {
                    Text(lastMessage.text)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Unread badge
            if chat.unreadCount > 0 {
                Text("\(chat.unreadCount)")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Empty Chat State
struct EmptyChatState: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("💬")
                .font(.system(size: 64))
            
            Text("No Chats Yet")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("When you have conversations,\nthey will appear here.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
