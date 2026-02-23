//
//  TaskDetailViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Task Detail screen
//

import Foundation
import Combine

@MainActor
final class TaskDetailViewModel: ObservableObject {
    @Published var task: Task?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var comments: [Comment] = []
    @Published var isLoadingComments = false
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
        } catch {
            print("Failed to load files: \(error)")
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
        
        do {
            _ = try await repo.addTaskComment(taskId: taskId, message: text, fileIds: fileIds)
            await loadComments()
        } catch {
            errorMessage = "Failed to add comment: \(error.localizedDescription)"
        }
    }
    
    func uploadAndAttachFile(filePath: String, fileName: String) async {
        isUploadingFile = true
        guard let repo = tasksRepository else {
            isUploadingFile = false
            return
        }
        
        do {
            let fileData = try Data(contentsOf: URL(fileURLWithPath: filePath))
            _ = try await repo.uploadTaskFile(taskId: taskId, fileData: fileData, fileName: fileName)
            await loadFiles()
        } catch {
            errorMessage = "Failed to upload file: \(error.localizedDescription)"
        }
        isUploadingFile = false
    }
    
    func uploadPhotoAndAddComment(filePath: String, fileName: String) async {
        guard let repo = tasksRepository else { return }
        
        do {
            // First upload the file
            let fileData = try Data(contentsOf: URL(fileURLWithPath: filePath))
            let file = try await repo.uploadTaskFile(taskId: taskId, fileData: fileData, fileName: fileName)
            // Then add comment with the file ID
            _ = try await repo.addTaskComment(taskId: taskId, message: "📷 \(fileName)", fileIds: [file.id])
            await loadComments()
            await loadFiles()
        } catch {
            errorMessage = "Failed to upload photo and add comment: \(error.localizedDescription)"
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
