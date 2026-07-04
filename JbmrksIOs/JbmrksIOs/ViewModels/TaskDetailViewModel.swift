//
//  TaskDetailViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Task Detail screen
//

import Foundation
import Combine
import UIKit

@MainActor
final class TaskDetailViewModel: ObservableObject {
    @Published var task: Task?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var comments: [Comment] = []
    @Published var isLoadingComments = false
    @Published var isPostingComment = false
    /// Shown near the comment box; does not replace the whole screen (unlike `errorMessage` from task load).
    @Published var commentSubmissionError: String?
    @Published var files: [TaskFile] = []
    @Published var isUploadingFile = false
    
    private var tasksRepository: TasksRepository?
    private let taskId: String
    
    init(taskId: String) {
        self.taskId = taskId
    }
    
    func loadTask() async {
        isLoading = true
        errorMessage = nil
        tasksRepository = RepositoryFactory.shared.tasksRepository()
        
        guard let repo = tasksRepository else {
            errorMessage = "Not authenticated"
            isLoading = false
            return
        }
        
        do {
            task = try await repo.getTask(id: taskId)
            await loadComments()
            await loadFiles()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func loadComments() async {
        isLoadingComments = true
        guard let repo = tasksRepository else {
            isLoadingComments = false
            return
        }
        
        do {
            comments = try await repo.getTaskComments(taskId: taskId)
        } catch {
            print("Failed to load comments: \(error)")
        }
        isLoadingComments = false
    }
    
    func loadFiles() async {
        guard let repo = tasksRepository else {
            return
        }
        
        do {
            files = try await repo.getTaskFiles(taskId: taskId)
            print("✅ Loaded \(files.count) files for task \(taskId)")
        } catch {
            print("⚠️ Failed to load files: \(error.localizedDescription)")
            // Set empty array on error - better than showing stale data
            files = []
        }
    }
    
    func completeTask() async {
        guard let repo = tasksRepository else { return }
        do {
            task = try await repo.completeTask(id: taskId)
        } catch {
            errorMessage = "Failed to complete task: \(error.localizedDescription)"
        }
    }
    
    func startTask() async {
        guard let repo = tasksRepository else { return }
        do {
            task = try await repo.startTask(id: taskId)
        } catch {
            errorMessage = "Failed to start task: \(error.localizedDescription)"
        }
    }
    
    func deferTask() async {
        guard let repo = tasksRepository else { return }
        do {
            task = try await repo.deferTask(id: taskId)
        } catch {
            errorMessage = "Failed to defer task: \(error.localizedDescription)"
        }
    }
    
    func renewTask() async {
        guard let repo = tasksRepository else { return }
        do {
            task = try await repo.renewTask(id: taskId)
        } catch {
            errorMessage = "Failed to renew task: \(error.localizedDescription)"
        }
    }
    
    func deleteTask() async throws {
        guard let repo = tasksRepository else { return }
        try await repo.deleteTask(id: taskId)
    }
    
    func addComment(_ text: String, fileIds: [String]? = nil) async {
        guard let repo = tasksRepository else { return }
        
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else {
            commentSubmissionError = "Comment cannot be empty"
            return
        }
        
        commentSubmissionError = nil
        isPostingComment = true
        defer { isPostingComment = false }
        
        do {
            _ = try await repo.addTaskComment(taskId: taskId, message: trimmedText, fileIds: fileIds)
            await loadComments()
        } catch {
            commentSubmissionError = error.localizedDescription
        }
    }
    
    func uploadAndAttachFile(filePath: String, fileName: String) async {
        isUploadingFile = true
        guard let repo = tasksRepository else {
            isUploadingFile = false
            return
        }
        
        do {
            var fileData = try Data(contentsOf: URL(fileURLWithPath: filePath))
            let fileSizeMB = Double(fileData.count) / (1024 * 1024)
            
            // Check file size (Bitrix24 typically has 10-20MB limit)
            if fileSizeMB > 15 {
                errorMessage = "File is too large (\(String(format: "%.1f", fileSizeMB))MB). Maximum size is 15MB. Please compress or resize the file."
                isUploadingFile = false
                return
            }
            
            // If it's an image, try to compress/resize it
            if fileName.lowercased().hasSuffix(".jpg") || fileName.lowercased().hasSuffix(".jpeg") || 
               fileName.lowercased().hasSuffix(".png") {
                if let image = UIImage(data: fileData) {
                    let resizedImage = image.resized(toMaxDimension: 1920)
                    if let compressedData = resizedImage.jpegData(compressionQuality: 0.7) {
                        let newSizeMB = Double(compressedData.count) / (1024 * 1024)
                        print("📸 Image compressed: \(String(format: "%.1f", fileSizeMB))MB → \(String(format: "%.1f", newSizeMB))MB")
                        fileData = compressedData
                    }
                }
            }
            
            _ = try await repo.uploadTaskFile(taskId: taskId, fileData: fileData, fileName: fileName)
            await loadFiles()
        } catch let error as APIError {
            if case .httpError(let code, _) = error, code == 413 {
                errorMessage = "File is too large. Please compress or resize the file before uploading."
            } else {
                errorMessage = "Failed to upload file: \(error.localizedDescription)"
            }
        } catch {
            errorMessage = "Failed to upload file: \(error.localizedDescription)"
        }
        isUploadingFile = false
    }
    
    func uploadPhotoAndAddComment(filePath: String, fileName: String) async {
        guard let repo = tasksRepository else { return }
        
        do {
            var fileData = try Data(contentsOf: URL(fileURLWithPath: filePath))
            let fileSizeMB = Double(fileData.count) / (1024 * 1024)
            
            // Check file size
            if fileSizeMB > 15 {
                commentSubmissionError = "Photo is too large (\(String(format: "%.1f", fileSizeMB))MB). Maximum size is 15MB."
                return
            }
            
            // Compress image if needed
            if let image = UIImage(data: fileData) {
                let resizedImage = image.resized(toMaxDimension: 1920)
                if let compressedData = resizedImage.jpegData(compressionQuality: 0.7) {
                    let newSizeMB = Double(compressedData.count) / (1024 * 1024)
                    print("📸 Photo compressed: \(String(format: "%.1f", fileSizeMB))MB → \(String(format: "%.1f", newSizeMB))MB")
                    fileData = compressedData
                }
            }
            
            // First upload the file
            let file = try await repo.uploadTaskFile(taskId: taskId, fileData: fileData, fileName: fileName)
            // Then add comment with the file ID
            _ = try await repo.addTaskComment(taskId: taskId, message: "📷 \(fileName)", fileIds: [file.id])
            await loadComments()
            await loadFiles()
        } catch let error as APIError {
            if case .httpError(let code, _) = error, code == 413 {
                commentSubmissionError = "Photo is too large. Please try taking a photo with lower resolution."
            } else {
                commentSubmissionError = "Failed to upload photo and add comment: \(error.localizedDescription)"
            }
        } catch {
            commentSubmissionError = "Failed to upload photo and add comment: \(error.localizedDescription)"
        }
    }
}

// Comment model matching Android
struct Comment: Identifiable {
    let id: String
    let text: String
    let authorName: String?
    let createdDate: String?
    let files: [CommentFile]
    
    init(id: String, text: String, authorName: String?, createdDate: String?, files: [CommentFile] = []) {
        self.id = id
        self.text = text
        self.authorName = authorName
        self.createdDate = createdDate
        self.files = files
    }
}

struct CommentFile: Identifiable {
    let id: String
    let name: String
    let size: Int64
    let type: String
    let downloadUrl: String?
}

struct TaskFile: Identifiable {
    let id: String
    let name: String
    let size: Int64?
    let downloadUrl: String?
    let type: String?
}
