//
//  TasksView.swift
//  JbmrksIOs
//
//  Tasks screen matching Android design
//

import SwiftUI

// Helper to disambiguate Swift concurrency Task from our Task model
private func runAsync(_ operation: @escaping () async -> Void) {
    _Concurrency.Task { @MainActor in
        await operation()
    }
}

struct TasksView: View {
    @StateObject private var viewModel = TasksViewModel()
    @State private var showCreateTask = false
    
    var body: some View {
        ZStack {
            if viewModel.isLoading {
                ProgressView("Loading tasks…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    runAsync { await viewModel.loadTasks() }
                }
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        // Search and Filter Section
                        SearchAndFilterSection(
                            searchQuery: viewModel.searchQuery,
                            selectedStatus: viewModel.selectedStatus,
                            selectedPriority: viewModel.selectedPriority,
                            onSearchQueryChange: { viewModel.setSearchQuery($0) },
                            onStatusFilterChange: { viewModel.setStatusFilter($0) },
                            onPriorityFilterChange: { viewModel.setPriorityFilter($0) },
                            onClearFilters: { viewModel.clearFilters() }
                        )
                        
                        // Tasks List
                        if viewModel.tasks.isEmpty {
                            EmptyStateView(
                                icon: "📋",
                                title: "No Tasks Yet",
                                message: "When you have tasks assigned to you,\nthey will appear here."
                            )
                            .frame(maxWidth: .infinity, minHeight: 400)
                        } else {
                            LazyVStack(spacing: 12) {
                                ForEach(viewModel.tasks, id: \.id) { task in
                                    NavigationLink(value: NavigationRoute.taskDetail(task.id)) {
                                        TaskItemView(
                                            task: task,
                                            onStatusChange: { newStatus in
                                                _Concurrency.Task { @MainActor in
                                                    await viewModel.changeTaskStatus(taskId: task.id, newStatus: newStatus)
                                                }
                                            }
                                        )
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
        }
        .navigationTitle("Tasks")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showCreateTask = true
                }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showCreateTask) {
            NavigationStack {
                TaskFormView(taskId: nil) {
                    showCreateTask = false
                    // Refresh tasks after creating
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadTasks()
                    }
                }
            }
        }
        .navigationDestination(for: NavigationRoute.self) { route in
            switch route {
            case .taskDetail(let taskId):
                TaskDetailView(taskId: taskId) {
                    // Navigation handled by NavigationStack
                }
            case .taskEdit(let taskId):
                TaskFormView(taskId: taskId) {
                    // Navigation handled by NavigationStack
                }
            case .chatMessage(let dialogId, let chatName):
                MessageView(dialogId: dialogId, chatName: chatName) {
                    // Navigation handled by NavigationStack
                }
            }
        }
        .task {
            await viewModel.loadTasks()
        }
        .refreshable {
            await viewModel.loadTasks()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshTasks"))) { _ in
            _Concurrency.Task { @MainActor in
                await viewModel.loadTasks()
            }
        }
    }
}

// MARK: - Task Item View
struct TaskItemView: View {
    let task: Task
    let onStatusChange: ((TaskStatus) -> Void)?
    
    var body: some View {
        HStack(spacing: 0) {
            // Status Color Bar
            statusColorBar
                .frame(width: 6)
            
            // Task Card
            TaskCardView(task: task, onStatusChange: onStatusChange)
                .padding(.horizontal, 4)
                .padding(.vertical, 6)
        }
    }
    
    private var statusColorBar: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(statusColor)
            .frame(minHeight: 100)
    }
    
    private var statusColor: Color {
        switch task.status {
        case .completed: return Color(red: 0.8, green: 0.9, blue: 1.0) // tertiaryContainer equivalent
        case .inProgress: return Color(red: 0.9, green: 0.85, blue: 1.0) // primaryContainer equivalent
        case .deferred: return Color(red: 0.9, green: 0.9, blue: 0.95) // secondaryContainer equivalent
        default: return Color(red: 0.95, green: 0.95, blue: 0.95) // surfaceVariant equivalent
        }
    }
}

// MARK: - Task Card View
struct TaskCardView: View {
    let task: Task
    let onStatusChange: ((TaskStatus) -> Void)?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Top Row: Status Badge and Menu
            HStack {
                StatusBadge(status: task.status)
                Spacer()
                
                // Status Change Menu
                if let onStatusChange = onStatusChange {
                    Menu {
                        Button(action: { onStatusChange(.new) }) {
                            Label("New", systemImage: "star.fill")
                        }
                        Button(action: { onStatusChange(.inProgress) }) {
                            Label("In Progress", systemImage: "play.fill")
                        }
                        Button(action: { onStatusChange(.completed) }) {
                            Label("Completed", systemImage: "checkmark.circle.fill")
                        }
                        Button(action: { onStatusChange(.deferred) }) {
                            Label("Deferred", systemImage: "pause.circle.fill")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Main Content Row: Status Icon + Title/Description
            HStack(alignment: .top, spacing: 16) {
                // Status Indicator Circle
                StatusIndicatorCircle(status: task.status)
                
                // Title and Description Column
                VStack(alignment: .leading, spacing: 6) {
                    // Title
                    Text(task.title.isEmpty ? "No Title" : task.title)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                    
                    // Description
                    Text(task.description.isEmpty ? "No description" : task.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                    
                    Spacer()
                        .frame(height: 8)
                    
                    // Assigned To
                    if let responsibleName = task.responsibleName ?? task.responsibleId {
                        HStack(spacing: 4) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                            Text("Assigned to: \(responsibleName)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    
                    // Created By
                    if let createdByName = task.createdByName ?? task.createdBy {
                        HStack(spacing: 4) {
                            Image(systemName: "info.circle.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                            Text("Created by: \(createdByName)")
                    .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
            }
            
            // Priority, Deadline Row
            HStack {
                PriorityBadge(priority: task.priority)
                Spacer()
                
                // Deadline
                if let deadline = task.getFormattedDeadline() {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    Text(deadline)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Comments count
            if task.commentsCount > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    Text("\(task.commentsCount) comment\(task.commentsCount != 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if task.newCommentsCount > 0 {
                        Spacer()
                            .frame(width: 8)
                        Text("\(task.newCommentsCount) new")
                        .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.red)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Status Indicator Circle
struct StatusIndicatorCircle: View {
    let status: TaskStatus
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(statusColor)
                .frame(width: 48, height: 48)
            
            Image(systemName: statusIcon)
                .font(.system(size: 24))
                .foregroundColor(.secondary)
        }
    }
    
    private var statusColor: Color {
        switch status {
        case .completed: return Color(red: 0.8, green: 0.9, blue: 1.0)
        case .inProgress: return Color(red: 0.9, green: 0.85, blue: 1.0)
        case .deferred: return Color(red: 0.9, green: 0.9, blue: 0.95)
        default: return Color(red: 0.95, green: 0.95, blue: 0.95)
        }
    }
    
    private var statusIcon: String {
        switch status {
        case .completed, .supposedlyCompleted: return "checkmark.circle.fill"
        case .inProgress: return "play.fill"
        case .deferred: return "calendar"
        case .new: return "star.fill"
        }
    }
}

// MARK: - Status Badge
struct StatusBadge: View {
    let status: TaskStatus
    
    var body: some View {
        Text(status.displayName)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(.primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(statusColor)
            .cornerRadius(8)
    }
    
    private var statusColor: Color {
        switch status {
        case .completed: return Color(red: 0.8, green: 0.9, blue: 1.0)
        case .inProgress: return Color(red: 0.9, green: 0.85, blue: 1.0)
        case .deferred: return Color(red: 0.9, green: 0.9, blue: 0.95)
        default: return Color(red: 0.95, green: 0.95, blue: 0.95)
        }
    }
}

// MARK: - Priority Badge
struct PriorityBadge: View {
    let priority: TaskPriority
    
    var body: some View {
        Text(priority.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundColor(.primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(priorityColor)
            .cornerRadius(8)
    }
    
    private var priorityColor: Color {
        switch priority {
        case .high: return Color(red: 1.0, green: 0.9, blue: 0.9) // errorContainer equivalent
        case .normal: return Color(red: 0.9, green: 0.85, blue: 1.0) // primaryContainer equivalent
        case .low: return Color(red: 0.95, green: 0.95, blue: 0.95) // surfaceVariant equivalent
        }
    }
}

// MARK: - Search and Filter Section
struct SearchAndFilterSection: View {
    let searchQuery: String
    let selectedStatus: TaskStatus?
    let selectedPriority: TaskPriority?
    let onSearchQueryChange: (String) -> Void
    let onStatusFilterChange: (TaskStatus?) -> Void
    let onPriorityFilterChange: (TaskPriority?) -> Void
    let onClearFilters: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search tasks...", text: Binding(
                    get: { searchQuery },
                    set: onSearchQueryChange
                ))
                .textFieldStyle(.plain)
                
                if !searchQuery.isEmpty {
                    Button(action: { onSearchQueryChange("") }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(12)
            
            // Filter Chips
            VStack(spacing: 8) {
                // Status Filters
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(
                            title: "All",
                            isSelected: selectedStatus == nil,
                            action: { onStatusFilterChange(nil) }
                        )
                        
                        ForEach([TaskStatus.new, .inProgress, .completed, .supposedlyCompleted, .deferred], id: \.self) { status in
                            FilterChip(
                                title: status.displayName,
                                isSelected: selectedStatus == status,
                                action: { onStatusFilterChange(status) }
                            )
                        }
                    }
                    .padding(.horizontal, 4)
                }
                
                // Priority Filters
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(
                            title: "All",
                            isSelected: selectedPriority == nil,
                            action: { onPriorityFilterChange(nil) }
                        )
                        
                        ForEach([TaskPriority.high, .normal, .low], id: \.self) { priority in
                            FilterChip(
                                title: priority.displayName,
                                isSelected: selectedPriority == priority,
                                action: { onPriorityFilterChange(priority) }
                            )
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }
            
            // Clear Filters Button
            if selectedStatus != nil || selectedPriority != nil || !searchQuery.isEmpty {
                Button(action: onClearFilters) {
                    Text("Clear Filters")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
        }
        .padding(16)
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color(.systemGray5))
                .cornerRadius(16)
        }
    }
}

// MARK: - Empty State View (using reusable component)
// EmptyStateView is now in Views/Components/EmptyStateView.swift

// MARK: - Error State View (using reusable component)
// ErrorStateView is now in Views/Components/ErrorView.swift

#Preview {
    NavigationStack {
        TasksView()
    }
}
