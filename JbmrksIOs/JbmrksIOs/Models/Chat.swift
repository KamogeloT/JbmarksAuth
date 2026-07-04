//
//  Chat.swift
//  JbmrksIOs
//
//  Chat model
//

import Foundation

enum ChatType: String, Codable {
    case privateChat = "PRIVATE"
    case group = "GROUP"
    case open = "OPEN"
}

struct Chat: Identifiable, Codable {
    let id: String
    let dialogId: String
    let type: ChatType
    let name: String
    let avatar: String?
    let lastMessage: Message?
    let unreadCount: Int
    let isPinned: Bool
    let lastMessageDate: Int64
}

struct Message: Identifiable, Codable {
    let id: String
    let chatId: String
    let dialogId: String
    let senderId: String
    let senderName: String
    let text: String
    let timestamp: Int64
    let isRead: Bool
    let isDelivered: Bool
    let files: [MessageFile]
    let replyTo: MessageReply?
    
    func getFormattedTime() -> String {
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let diff = now - timestamp
        
        if diff < 60000 {
            return "Just now"
        } else if diff < 3600000 {
            return "\(diff / 60000)m ago"
        } else if diff < 86400000 {
            return "\(diff / 3600000)h ago"
        } else {
            let date = Date(timeIntervalSince1970: Double(timestamp) / 1000)
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM dd, HH:mm"
            return formatter.string(from: date)
        }
    }
}

struct MessageFile: Codable {
    let id: String
    let name: String
    let size: Int64
    let type: String
    let downloadUrl: String?
    let previewUrl: String?
}

struct MessageReply: Codable {
    let messageId: String
    let senderName: String
    let text: String
}
