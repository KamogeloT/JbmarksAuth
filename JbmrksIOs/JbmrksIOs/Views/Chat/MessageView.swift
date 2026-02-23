//
//  MessageView.swift
//  JbmrksIOs
//
//  Message view for chat conversations
//

import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct MessageView: View {
    let dialogId: String
    let chatName: String
    let onNavigateBack: () -> Void
    
    @StateObject private var viewModel: MessageViewModel
    @State private var messageText = ""
    @State private var showFilePicker = false
    
    init(dialogId: String, chatName: String, onNavigateBack: @escaping () -> Void) {
        self.dialogId = dialogId
        self.chatName = chatName
        self.onNavigateBack = onNavigateBack
        print("📱 MessageView: Initializing with dialogId=\(dialogId), chatName=\(chatName)")
        _viewModel = StateObject(wrappedValue: MessageViewModel(dialogId: dialogId))
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages List
            if viewModel.isLoading {
                ProgressView("Loading messages...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)
                    Text("Error")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text(error)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    Button("Retry") {
                        _Concurrency.Task { @MainActor in
                            await viewModel.loadMessages()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            if viewModel.messages.isEmpty {
                                VStack(spacing: 16) {
                                    Text("💬")
                                        .font(.system(size: 64))
                                    Text("No messages yet")
                                        .font(.title3)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.top, 100)
                            } else {
                                ForEach(viewModel.messages) { message in
                                    MessageBubbleView(
                                        message: message,
                                        isCurrentUser: message.senderId == viewModel.currentUserId
                                    )
                                }
                            }
                        }
                        .padding()
                    }
                    .onChange(of: viewModel.messages.count) {
                        if let lastMessage = viewModel.messages.last {
                            withAnimation {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }
            }
            
            // Message Input
            HStack(spacing: 12) {
                Button(action: { showFilePicker = true }) {
                    Image(systemName: "paperclip")
                        .foregroundColor(.blue)
                }
                
                TextField("Type a message...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)
                
                Button(action: {
                    _Concurrency.Task { @MainActor in
                        await viewModel.sendMessage(text: messageText)
                        messageText = ""
                    }
                }) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(messageText.isEmpty ? .gray : .blue)
                }
                .disabled(messageText.isEmpty || viewModel.isSending)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .background(Color(red: 0.93, green: 0.92, blue: 0.87)) // WhatsApp-like background
        .navigationTitle(chatName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            print("📱 MessageView: Task started, loading messages...")
            await viewModel.loadMessages()
        }
        .onAppear {
            print("📱 MessageView: View appeared for dialogId=\(dialogId)")
        }
        .sheet(isPresented: $showFilePicker) {
            DocumentPicker { url in
                _Concurrency.Task { @MainActor in
                    await viewModel.sendMessageWithFile(filePath: url.path, fileName: url.lastPathComponent)
                }
            }
        }
    }
}

// MARK: - Message Bubble View
struct MessageBubbleView: View {
    let message: Message
    let isCurrentUser: Bool
    
    var body: some View {
        HStack {
            if isCurrentUser {
                Spacer()
            }
            
            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
                if !isCurrentUser {
                    Text(message.senderName)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Text(message.text)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isCurrentUser ? Color.blue : Color(.systemGray5))
                    .foregroundColor(isCurrentUser ? .white : .primary)
                    .cornerRadius(16)
                
                HStack(spacing: 4) {
                    Text(message.getFormattedTime())
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    if isCurrentUser {
                        if message.isRead {
                            Image(systemName: "checkmark")
                                .font(.caption2)
                                .foregroundColor(.blue)
                        } else if message.isDelivered {
                            Image(systemName: "checkmark")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                    }
                }
            }
            
            if !isCurrentUser {
                Spacer()
            }
        }
    }
}

// MARK: - Document Picker
struct DocumentPicker: UIViewControllerRepresentable {
    let onDocumentPicked: (URL) -> Void
    
    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.item])
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onDocumentPicked: onDocumentPicked)
    }
    
    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onDocumentPicked: (URL) -> Void
        
        init(onDocumentPicked: @escaping (URL) -> Void) {
            self.onDocumentPicked = onDocumentPicked
        }
        
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            if let url = urls.first {
                onDocumentPicked(url)
            }
        }
    }
}

