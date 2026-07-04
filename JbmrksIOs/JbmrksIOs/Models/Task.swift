//
//  Task.swift
//  JbmrksIOs
//
//  Native Swift Task model (temporary - will migrate to KMM later)
//

import Foundation

struct Task: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let status: TaskStatus
    let priority: TaskPriority
    let deadline: String?
    let createdDate: String?
    let closedDate: String?
    
    // People
    let createdBy: String?
    let createdByName: String?
    let responsibleId: String?
    let responsibleName: String?
    
    // Group/Project
    let groupId: String?
    let groupName: String?
    
    // Metadata
    let commentsCount: Int
    let newCommentsCount: Int
    let tags: [String]
    
    func getFormattedDeadline() -> String? {
        guard let deadline = deadline else { return nil }
        
        // Parse ISO8601 date format
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: deadline) else {
            // Fallback: try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: deadline) else {
                return deadline // Return original if parsing fails
            }
            
            let outputFormatter = DateFormatter()
            outputFormatter.dateFormat = "MMM dd, yyyy HH:mm"
            return outputFormatter.string(from: date)
        }
        
        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "MMM dd, yyyy HH:mm"
        return outputFormatter.string(from: date)
    }
    
    /// Used when API returns `groupId` but no nested `group.name` (enrich from `sonet_group.user.groups`).
    func withGroupName(_ name: String?) -> Task {
        Task(
            id: id,
            title: title,
            description: description,
            status: status,
            priority: priority,
            deadline: deadline,
            createdDate: createdDate,
            closedDate: closedDate,
            createdBy: createdBy,
            createdByName: createdByName,
            responsibleId: responsibleId,
            responsibleName: responsibleName,
            groupId: groupId,
            groupName: name ?? groupName,
            commentsCount: commentsCount,
            newCommentsCount: newCommentsCount,
            tags: tags
        )
    }
    
    func isOverdue() -> Bool {
        guard let deadline = deadline, status != .completed else { return false }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let deadlineDate = formatter.date(from: deadline) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let deadlineDate = formatter.date(from: deadline) else {
                return false
            }
            return deadlineDate < Date()
        }
        
        return deadlineDate < Date()
    }
}

enum TaskStatus: String, Codable {
    case new = "2"
    case inProgress = "3"
    case supposedlyCompleted = "4"
    case completed = "5"
    case deferred = "6"
    
    var displayName: String {
        switch self {
        case .new: return "New"
        case .inProgress: return "In Progress"
        case .supposedlyCompleted: return "Awaiting Approval"
        case .completed: return "Completed"
        case .deferred: return "Deferred"
        }
    }
}

enum TaskPriority: String, Codable {
    case low = "1"
    case normal = "2"
    case high = "3"
    
    var displayName: String {
        switch self {
        case .low: return "Low"
        case .normal: return "Normal"
        case .high: return "High"
        }
    }
}
