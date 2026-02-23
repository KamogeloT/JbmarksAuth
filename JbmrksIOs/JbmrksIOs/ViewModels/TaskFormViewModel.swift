//
//  TaskFormViewModel.swift
//  JbmrksIOs
//
//  ViewModel for Task Form screen
//

import Foundation
import Combine

@MainActor
final class TaskFormViewModel: ObservableObject {
    @Published var title: String = ""
    @Published var description: String = ""
    @Published var deadline: String? = nil
    @Published var priority: TaskPriority = .normal
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var errorMessage: String?
    
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
            let task = try await repo.getTask(id: taskId)
            title = task.title
            description = task.description
            deadline = task.deadline
            priority = task.priority
        } catch {
            errorMessage = "Failed to load task: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    func updateTask() async throws {
        guard let repo = tasksRepository else {
            throw NSError(domain: "TaskFormViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }
        
        guard !title.isEmpty else {
            errorMessage = "Title is required"
            throw NSError(domain: "TaskFormViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Title is required"])
        }
        
        isSaving = true
        errorMessage = nil
        
        do {
            _ = try await repo.updateTask(
                id: taskId,
                title: title,
                description: description.isEmpty ? nil : description,
                deadline: deadline,
                priority: priority
            )
        } catch {
            errorMessage = "Failed to update task: \(error.localizedDescription)"
            isSaving = false
            throw error
        }
        
        isSaving = false
    }
}
