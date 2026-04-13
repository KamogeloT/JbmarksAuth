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
    /// Used to disable expand/collapse for groups the user is not a member of.
    @Published private(set) var userWorkgroupIds: Set<String> = []
    @Published private(set) var userWorkgroupNamesLowercased: Set<String> = []
    @Published private(set) var workgroupsMembershipKnown: Bool = false
    
    /// Changes when membership data loads (drive `syncExpandedGroups` in the view).
    var workgroupMembershipSignature: String {
        "\(workgroupsMembershipKnown)|\(userWorkgroupIds.sorted().joined(separator: ","))"
    }
    
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
            await loadUserWorkgroupsForMembership()
        } catch {
            errorMessage = error.localizedDescription
            allTasks = []
        }
        isLoading = false
    }
    
    private func loadUserWorkgroupsForMembership() async {
        guard let userRepo = RepositoryFactory.shared.userRepository() else {
            workgroupsMembershipKnown = false
            userWorkgroupIds = []
            userWorkgroupNamesLowercased = []
            return
        }
        do {
            let groups = try await userRepo.getUserWorkgroups()
            userWorkgroupIds = Set(groups.map(\.id))
            userWorkgroupNamesLowercased = Set(
                groups.map { $0.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }.filter { !$0.isEmpty }
            )
            workgroupsMembershipKnown = true
        } catch {
            workgroupsMembershipKnown = false
            userWorkgroupIds = []
            userWorkgroupNamesLowercased = []
        }
    }
    
    /// If membership could not be loaded, allow toggling (avoid locking the UI). "No Workgroup" is always allowed.
    func isUserMemberOfWorkgroupSection(groupTitle: String, tasksInGroup: [Task]) -> Bool {
        guard workgroupsMembershipKnown else { return true }
        if groupTitle == "No Workgroup" { return true }
        guard let first = tasksInGroup.first else { return true }
        let label = workgroupLabel(for: first)
        if label == "No Workgroup" { return true }
        
        let idsInTasks = Set(tasksInGroup.compactMap { $0.groupId })
        for id in idsInTasks where userWorkgroupIds.contains(id) {
            return true
        }
        for t in tasksInGroup {
            if let n = t.groupName?.trimmingCharacters(in: .whitespacesAndNewlines), !n.isEmpty,
               userWorkgroupNamesLowercased.contains(n.lowercased()) {
                return true
            }
        }
        if userWorkgroupNamesLowercased.contains(groupTitle.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()) {
            return true
        }
        return false
    }
    
    private func workgroupLabel(for task: Task) -> String {
        let trimmed = task.groupName?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let t = trimmed, !t.isEmpty { return t }
        return "No Workgroup"
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
