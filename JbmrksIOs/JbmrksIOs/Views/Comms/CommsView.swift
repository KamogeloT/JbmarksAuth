//
//  CommsView.swift
//  JbmrksIOs
//
//  Workgroup Communications — Teams-style chat for Management Board users.
//  Shows per-workgroup group chat + direct messages to members.
//

import SwiftUI

struct CommsView: View {
    @StateObject private var viewModel = CommsViewModel()
    
    var body: some View {
        Group {
            switch viewModel.activeView {
            case .chatList:
                CommsChatListView(viewModel: viewModel)
            case .groupChat:
                CommsConversationView(
                    title: viewModel.selectedWorkgroup?.name ?? "Group",
                    subtitle: "\(viewModel.members.count) members",
                    isGroup: true,
                    viewModel: viewModel
                )
            case .directMessage:
                let member = viewModel.members.first(where: { $0.userId == viewModel.currentDialogId })
                CommsConversationView(
                    title: member?.fullName ?? "Chat",
                    subtitle: member?.roleDisplayName ?? "",
                    isGroup: false,
                    viewModel: viewModel
                )
            }
        }
    }
}

// MARK: - Chat List View

struct CommsChatListView: View {
    @ObservedObject var viewModel: CommsViewModel
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Comms")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: [Color(hex: "1B5E20"), Color(hex: "2E7D32")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            
            // Workgroup selector
            if viewModel.workgroups.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(viewModel.workgroups, id: \.id) { workgroup in
                            let isSelected = workgroup.id == viewModel.selectedWorkgroup?.id
                            Button(action: { viewModel.selectWorkgroup(workgroup) }) {
                                Text(workgroup.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(isSelected ? Color(hex: "1B5E20") : Color(.systemGray6))
                                    .foregroundColor(isSelected ? .white : .primary)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                }
            }
            
            // Content
            if viewModel.isLoadingWorkgroups || viewModel.isLoadingMembers {
                Spacer()
                ProgressView()
                Spacer()
            } else if viewModel.selectedWorkgroup == nil {
                Spacer()
                Text("Select a workgroup")
                    .foregroundColor(.secondary)
                Spacer()
            } else {
                List {
                    // Group Chat Section
                    Section {
                        Button(action: { viewModel.openGroupChat() }) {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color(hex: "1B5E20"), Color(hex: "2E7D32")],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 52, height: 52)
                                    Text("👥")
                                        .font(.title2)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(viewModel.selectedWorkgroup?.name ?? "")
                                        .font(.body)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    Text("\(viewModel.members.count) members • Tap to open")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                                
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary.opacity(0.5))
                            }
                            .padding(.vertical, 4)
                        }
                    } header: {
                        Text("GROUP CHAT")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .tracking(1)
                    }
                    
                    // Direct Messages Section
                    let otherMembers = viewModel.members.filter { $0.userId != viewModel.currentUserId }
                    if !otherMembers.isEmpty {
                        Section {
                            ForEach(otherMembers, id: \.userId) { member in
                                Button(action: { viewModel.openDirectMessage(member) }) {
                                    HStack(spacing: 14) {
                                        ZStack {
                                            Circle()
                                                .fill(Color(hex: "C8E6C9"))
                                                .frame(width: 52, height: 52)
                                            Text(member.initials)
                                                .font(.headline)
                                                .fontWeight(.bold)
                                                .foregroundColor(Color(hex: "1B5E20"))
                                        }
                                        
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(member.fullName)
                                                .font(.body)
                                                .fontWeight(.medium)
                                                .foregroundColor(.primary)
                                            Text(member.roleDisplayName)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Image(systemName: "chevron.right")
                                            .font(.caption)
                                            .foregroundColor(.secondary.opacity(0.5))
                                    }
                                    .padding(.vertical, 4)
                                }
                            }
                        } header: {
                            Text("DIRECT MESSAGES")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .tracking(1)
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }
}

// MARK: - Conversation View

struct CommsConversationView: View {
    let title: String
    let subtitle: String
    let isGroup: Bool
    @ObservedObject var viewModel: CommsViewModel
    @State private var messageText = ""
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            // Nav bar
            HStack(spacing: 10) {
                Button(action: { viewModel.backToChatList() }) {
                    Image(systemName: "chevron.left")
                        .font(.title3)
                        .foregroundColor(Color(hex: "1B5E20"))
                }
                
                // Avatar
                ZStack {
                    Circle()
                        .fill(
                            isGroup
                            ? LinearGradient(colors: [Color(hex: "1B5E20"), Color(hex: "2E7D32")], startPoint: .topLeading, endPoint: .bottomTrailing)
                            : LinearGradient(colors: [Color(hex: "C8E6C9"), Color(hex: "C8E6C9")], startPoint: .top, endPoint: .bottom)
                        )
                        .frame(width: 38, height: 38)
                    
                    if isGroup {
                        Text("👥")
                            .font(.callout)
                    } else {
                        Text(String(title.prefix(2)).uppercased())
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Color(hex: "1B5E20"))
                    }
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.headline)
                        .lineLimit(1)
                    if !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(.systemBackground))
            .shadow(color: .black.opacity(0.05), radius: 1, y: 1)
            
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    if viewModel.isLoadingMessages {
                        ProgressView()
                            .padding(.top, 40)
                    } else if viewModel.messages.isEmpty {
                        VStack(spacing: 12) {
                            Text("💬")
                                .font(.system(size: 48))
                            Text("No messages yet")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("Start the conversation")
                                .font(.subheadline)
                                .foregroundColor(.secondary.opacity(0.7))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 80)
                    } else {
                        LazyVStack(spacing: 4) {
                            ForEach(viewModel.messages, id: \.id) { message in
                                CommsMessageBubble(
                                    message: message,
                                    isCurrentUser: message.senderId == viewModel.currentUserId,
                                    showSenderName: isGroup
                                )
                                .id(message.id)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                }
                .background(Color(.systemGroupedBackground).opacity(0.5))
                .onChange(of: viewModel.messages.count) { _, _ in
                    if let lastId = viewModel.messages.last?.id {
                        withAnimation {
                            proxy.scrollTo(lastId, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Input bar
            HStack(spacing: 8) {
                TextField("Message", text: $messageText, axis: .vertical)
                    .lineLimit(1...5)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                    .focused($isInputFocused)
                    .onSubmit {
                        sendMessage()
                    }
                
                if !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Button(action: sendMessage) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundColor(Color(hex: "1B5E20"))
                    }
                    .disabled(viewModel.isSending)
                    .transition(.scale.combined(with: .opacity))
                    .animation(.easeInOut(duration: 0.15), value: messageText)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(.systemBackground))
            .shadow(color: .black.opacity(0.05), radius: 2, y: -1)
        }
    }
    
    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        viewModel.sendMessage(text)
        messageText = ""
    }
}

// MARK: - Message Bubble

struct CommsMessageBubble: View {
    let message: CommsMessage
    let isCurrentUser: Bool
    let showSenderName: Bool
    
    var body: some View {
        VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 1) {
            if !isCurrentUser && showSenderName && !message.senderName.isEmpty {
                Text(message.senderName)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(Color(hex: "1B5E20"))
                    .padding(.leading, 14)
            }
            
            HStack {
                if isCurrentUser { Spacer(minLength: 60) }
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(message.text)
                        .font(.body)
                        .foregroundColor(isCurrentUser ? .white : .primary)
                    
                    Text(message.formattedTime)
                        .font(.system(size: 10))
                        .foregroundColor(isCurrentUser ? .white.opacity(0.6) : .secondary.opacity(0.6))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    isCurrentUser
                    ? Color(hex: "1B5E20")
                    : Color(.systemBackground)
                )
                .clipShape(
                    RoundedRectangle(cornerRadius: 20)
                )
                .shadow(color: .black.opacity(isCurrentUser ? 0 : 0.04), radius: 1, y: 1)
                
                if !isCurrentUser { Spacer(minLength: 60) }
            }
        }
        .padding(.vertical, 1)
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
