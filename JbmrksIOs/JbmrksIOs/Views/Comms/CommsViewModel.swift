//
//  CommsViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Workgroup Communications feature.
//

import Foundation
import SwiftUI

// MARK: - Models

struct CommsWorkgroup: Identifiable {
    let id: String
    let name: String
    let role: String?
}

struct CommsMember: Identifiable {
    var id: String { userId }
    let userId: String
    let fullName: String
    let role: String?
    
    var initials: String {
        fullName.split(separator: " ")
            .prefix(2)
            .compactMap { $0.first?.uppercased() }
            .joined()
    }
    
    var roleDisplayName: String {
        switch role {
        case "A": return "Owner"
        case "E": return "Moderator"
        case "K": return "Member"
        default: return "Member"
        }
    }
}

struct CommsMessage: Identifiable {
    let id: String
    let senderId: String
    let senderName: String
    let text: String
    let timestamp: Date
    
    var formattedTime: String {
        let diff = Date().timeIntervalSince(timestamp)
        if diff < 60 { return "Just now" }
        if diff < 3600 { return "\(Int(diff / 60))m ago" }
        if diff < 86400 { return "\(Int(diff / 3600))h ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM dd, HH:mm"
        return formatter.string(from: timestamp)
    }
}

enum CommsActiveView {
    case chatList
    case groupChat
    case directMessage
}

// MARK: - ViewModel

@MainActor
class CommsViewModel: ObservableObject {
    
    static let managementGroupId = "16"
    
    private let webhookUrl = "https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss"
    
    @Published var workgroups: [CommsWorkgroup] = []
    @Published var selectedWorkgroup: CommsWorkgroup?
    @Published var members: [CommsMember] = []
    @Published var messages: [CommsMessage] = []
    @Published var currentDialogId: String?
    @Published var groupDialogId: String?
    @Published var currentUserId: String = ""
    @Published var activeView: CommsActiveView = .chatList
    @Published var isLoadingWorkgroups = true
    @Published var isLoadingMembers = false
    @Published var isLoadingMessages = false
    @Published var isSending = false
    
    private var pollingTask: Task<Void, Never>?
    
    init() {
        _Concurrency.Task {
            await loadCurrentUser()
            await loadWorkgroups()
        }
    }
    
    // MARK: - Public Methods
    
    func selectWorkgroup(_ workgroup: CommsWorkgroup) {
        guard selectedWorkgroup?.id != workgroup.id else { return }
        pollingTask?.cancel()
        
        selectedWorkgroup = workgroup
        messages = []
        members = []
        currentDialogId = nil
        groupDialogId = nil
        activeView = .chatList
        isLoadingMembers = true
        
        _Concurrency.Task {
            await loadMembers(groupId: workgroup.id)
            await findGroupChat(workgroup: workgroup)
        }
    }
    
    func openGroupChat() {
        guard let dialogId = groupDialogId else { return }
        pollingTask?.cancel()
        
        currentDialogId = dialogId
        messages = []
        isLoadingMessages = true
        activeView = .groupChat
        
        _Concurrency.Task {
            await loadMessages(dialogId: dialogId)
            startPolling(dialogId: dialogId)
        }
    }
    
    func openDirectMessage(_ member: CommsMember) {
        pollingTask?.cancel()
        
        currentDialogId = member.userId
        messages = []
        isLoadingMessages = true
        activeView = .directMessage
        
        _Concurrency.Task {
            await loadMessages(dialogId: member.userId)
            startPolling(dialogId: member.userId)
        }
    }
    
    func backToChatList() {
        pollingTask?.cancel()
        currentDialogId = nil
        messages = []
        activeView = .chatList
    }
    
    func sendMessage(_ text: String) {
        guard let dialogId = currentDialogId, !text.isEmpty else { return }
        isSending = true
        
        _Concurrency.Task {
            await sendMessageToDialog(dialogId: dialogId, text: text)
            await loadMessages(dialogId: dialogId)
            isSending = false
        }
    }
    
    /// Check if the current user has access to Comms (is in MANAGEMENT group)
    static func checkAccess(webhookUrl: String = "https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss") async -> Bool {
        guard let url = URL(string: "\(webhookUrl)/sonet_group.user.groups.json") else { return false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [[String: Any]] {
                return result.contains(where: { ($0["GROUP_ID"] as? String) == managementGroupId })
            }
        } catch {}
        return false
    }
    
    // MARK: - Private Methods
    
    private func loadCurrentUser() async {
        guard let url = URL(string: "\(webhookUrl)/user.current.json") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [String: Any],
               let id = result["ID"] as? String ?? (result["ID"] as? Int).map(String.init) {
                currentUserId = id
            }
        } catch {}
    }
    
    private func loadWorkgroups() async {
        isLoadingWorkgroups = true
        guard let url = URL(string: "\(webhookUrl)/sonet_group.user.groups.json") else {
            isLoadingWorkgroups = false
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [[String: Any]] {
                workgroups = result.compactMap { item in
                    guard let id = item["GROUP_ID"] as? String,
                          let name = item["GROUP_NAME"] as? String else { return nil }
                    return CommsWorkgroup(id: id, name: name, role: item["ROLE"] as? String)
                }
                if let first = workgroups.first {
                    selectWorkgroup(first)
                }
            }
        } catch {}
        isLoadingWorkgroups = false
    }
    
    private func loadMembers(groupId: String) async {
        guard let url = URL(string: "\(webhookUrl)/sonet_group.user.get.json") else {
            isLoadingMembers = false
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["ID": groupId])
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [[String: Any]] {
                
                var loadedMembers: [CommsMember] = []
                for item in result {
                    guard let userId = item["USER_ID"] as? String else { continue }
                    let role = item["ROLE"] as? String
                    // Fetch user name
                    let name = await fetchUserName(userId: userId)
                    loadedMembers.append(CommsMember(userId: userId, fullName: name, role: role))
                }
                members = loadedMembers
            }
        } catch {}
        isLoadingMembers = false
    }
    
    private func fetchUserName(userId: String) async -> String {
        guard let url = URL(string: "\(webhookUrl)/user.get.json?ID=\(userId)") else { return "User \(userId)" }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [[String: Any]],
               let user = result.first {
                let name = user["NAME"] as? String ?? ""
                let lastName = user["LAST_NAME"] as? String ?? ""
                return "\(name) \(lastName)".trimmingCharacters(in: .whitespaces)
            }
        } catch {}
        return "User \(userId)"
    }
    
    private func findGroupChat(workgroup: CommsWorkgroup) async {
        guard let url = URL(string: "\(webhookUrl)/im.recent.list.json") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [[String: Any]] {
                // Find chat matching workgroup name
                if let chat = result.first(where: { item in
                    let title = (item["title"] as? String) ?? ""
                    return title.localizedCaseInsensitiveContains(workgroup.name)
                }) {
                    groupDialogId = chat["id"] as? String
                }
            }
        } catch {}
    }
    
    private func loadMessages(dialogId: String) async {
        guard let url = URL(string: "\(webhookUrl)/im.dialog.messages.get.json") else {
            isLoadingMessages = false
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["DIALOG_ID": dialogId, "LIMIT": 50])
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let result = json["result"] as? [String: Any],
               let msgList = result["messages"] as? [[String: Any]] {
                
                messages = msgList.compactMap { msg in
                    guard let id = (msg["id"] as? Int).map(String.init) ?? msg["id"] as? String,
                          let text = msg["text"] as? String else { return nil }
                    let senderId = (msg["author_id"] as? Int).map(String.init) ?? msg["author_id"] as? String ?? ""
                    let date = parseDate(msg["date"] as? String)
                    return CommsMessage(id: id, senderId: senderId, senderName: "", text: text, timestamp: date)
                }.sorted(by: { $0.timestamp < $1.timestamp })
            }
        } catch {}
        isLoadingMessages = false
    }
    
    private func sendMessageToDialog(dialogId: String, text: String) async {
        guard let url = URL(string: "\(webhookUrl)/im.message.add.json") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["DIALOG_ID": dialogId, "MESSAGE": text])
        
        _ = try? await URLSession.shared.data(for: request)
    }
    
    private func startPolling(dialogId: String) {
        pollingTask = _Concurrency.Task {
            while !_Concurrency.Task.isCancelled {
                try? await _Concurrency.Task.sleep(nanoseconds: 10_000_000_000) // 10s
                guard !_Concurrency.Task.isCancelled, self.currentDialogId == dialogId else { break }
                await loadMessages(dialogId: dialogId)
            }
        }
    }
    
    private func parseDate(_ dateStr: String?) -> Date {
        guard let dateStr else { return Date() }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: dateStr) ?? Date()
    }
}
