//
//  TasksViewModel.swift
//  JbmrksIOs
//

import Foundation
import Combine

@MainActor
final class TasksViewModel: ObservableObject {
    @Published var allTasks: [Task] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchQuery: String = ""
    @Published var selectedStatus: TaskStatus? = nil
    @Published var selectedPriority: TaskPriority? = nil
    
    private var tasksRepository: TasksRepository?
    
    // Computed property for filtered tasks
    var tasks: [Task] {
        var filtered = allTasks
        
        // Filter by search query
        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            filtered = filtered.filter { task in
                task.title.lowercased().contains(query) ||
                task.description.lowercased().contains(query)
            }
        }
        
        // Filter by status
        if let status = selectedStatus {
            filtered = filtered.filter { $0.status == status }
        }
        
        // Filter by priority
        if let priority = selectedPriority {
            filtered = filtered.filter { $0.priority == priority }
        }
        
        return filtered
    }
    
    init() {}
    
    func loadTasks() async {
        isLoading = true
        errorMessage = nil
        tasksRepository = RepositoryFactory.shared.tasksRepository()
        
        guard let repo = tasksRepository else {
            errorMessage = "Not authenticated"
            isLoading = false
            return
        }
        
        do {
            allTasks = try await repo.getTasks(responsibleId: nil, createdBy: nil, status: nil, groupId: nil)
        } catch {
            errorMessage = error.localizedDescription
            allTasks = []
        }
        isLoading = false
    }
    
    func setSearchQuery(_ query: String) {
        searchQuery = query
    }
    
    func setStatusFilter(_ status: TaskStatus?) {
        selectedStatus = status
    }
    
    func setPriorityFilter(_ priority: TaskPriority?) {
        selectedPriority = priority
    }
    
    func clearFilters() {
        searchQuery = ""
        selectedStatus = nil
        selectedPriority = nil
    }
    
    func changeTaskStatus(taskId: String, newStatus: TaskStatus) async {
        guard let repo = tasksRepository else { return }
        
        do {
            let updatedTask: Task
            switch newStatus {
            case .new:
                updatedTask = try await repo.renewTask(id: taskId)
            case .inProgress:
                updatedTask = try await repo.startTask(id: taskId)
            case .completed:
                updatedTask = try await repo.completeTask(id: taskId)
            case .deferred:
                updatedTask = try await repo.deferTask(id: taskId)
            case .supposedlyCompleted:
                updatedTask = try await repo.completeTask(id: taskId)
            }
            
            // Update the task in the list
            if let index = allTasks.firstIndex(where: { $0.id == taskId }) {
                allTasks[index] = updatedTask
            }
        } catch {
            errorMessage = "Failed to change task status: \(error.localizedDescription)"
        }
    }
}
