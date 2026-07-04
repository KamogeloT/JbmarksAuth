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
    /// Collapsible workgroup sections (aligned with Android `TasksScreen` / `groupBy(groupName)`).
    @State private var expandedGroups: [String: Bool] = [:]
    
    private func workgroupLabel(for task: Task) -> String {
        let trimmed = task.groupName?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let t = trimmed, !t.isEmpty { return t }
        return "No Workgroup"
    }
    
    private var groupedTasks: [String: [Task]] {
        Dictionary(grouping: viewModel.tasks, by: workgroupLabel(for:))
    }
    
    private var orderedGroupNames: [String] {
        var keys: [String] = []
        var seen = Set<String>()
        for task in viewModel.tasks {
            let name = workgroupLabel(for: task)
            if seen.insert(name).inserted {
                keys.append(name)
            }
        }
        return keys
    }
    
    private var taskGroupLayoutSignature: String {
        viewModel.tasks.map { "\($0.id):\(workgroupLabel(for: $0))" }.joined(separator: "|")
    }
    
    /// Collapsed by default for groups the user belongs to; **forced expanded** when they are not a member (cannot collapse).
    private func syncExpandedGroups() {
        let names = Set(orderedGroupNames)
        var next = expandedGroups
        for name in orderedGroupNames {
            let tasksInGroup = groupedTasks[name] ?? []
            let member = viewModel.isUserMemberOfWorkgroupSection(groupTitle: name, tasksInGroup: tasksInGroup)
            if !member {
                next[name] = true
            } else if next[name] == nil {
                next[name] = false
            }
        }
        next = next.filter { names.contains($0.key) }
        expandedGroups = next
    }
    
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
                        SearchAndFilterSection(
                            searchQuery: viewModel.searchQuery,
                            selectedStatus: viewModel.selectedStatus,
                            selectedPriority: viewModel.selectedPriority,
                            onSearchQueryChange: { viewModel.setSearchQuery($0) },
                            onStatusFilterChange: { viewModel.setStatusFilter($0) },
                            onPriorityFilterChange: { viewModel.setPriorityFilter($0) },
                            onClearFilters: { viewModel.clearFilters() }
                        )
                        
                        if viewModel.tasks.isEmpty {
                            EmptyStateView(
                                icon: "📋",
                                title: "No Tasks Yet",
                                message: "When you have tasks assigned to you,\nthey will appear here."
                            )
                            .frame(maxWidth: .infinity, minHeight: 400)
                        } else {
                            LazyVStack(spacing: 0) {
                                ForEach(orderedGroupNames, id: \.self) { groupName in
                                    let tasksInGroup = groupedTasks[groupName] ?? []
                                    let canToggle = viewModel.isUserMemberOfWorkgroupSection(groupTitle: groupName, tasksInGroup: tasksInGroup)
                                    WorkgroupHeader(
                                        title: groupName,
                                        taskCount: tasksInGroup.count,
                                        isExpanded: expandedGroups[groupName] == true,
                                        canToggle: canToggle,
                                        restrictionMessage: canToggle ? nil : "You are not a member of this workgroup. You can view tasks shared with you, but you cannot collapse this section.",
                                        onToggle: {
                                            guard canToggle else { return }
                                            expandedGroups[groupName] = !(expandedGroups[groupName] ?? false)
                                        }
                                    )
                                    if expandedGroups[groupName] == true {
                                        ForEach(tasksInGroup, id: \.id) { task in
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
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 24)
                            .onAppear { syncExpandedGroups() }
                            .onChange(of: taskGroupLayoutSignature) { _, _ in
                                syncExpandedGroups()
                            }
                            .onChange(of: viewModel.workgroupMembershipSignature) { _, _ in
                                syncExpandedGroups()
                            }
                        }
                    }
                }
                .background(Color(.systemGroupedBackground))
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

// MARK: - Workgroup header
private struct WorkgroupHeader: View {
    let title: String
    let taskCount: Int
    let isExpanded: Bool
    var canToggle: Bool = true
    var restrictionMessage: String? = nil
    let onToggle: () -> Void
    
    private var isUnassigned: Bool { title == "No Workgroup" }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: onToggle) {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(iconBubbleFill)
                            .frame(width: 44, height: 44)
                        Image(systemName: iconName)
                            .font(.system(size: 19, weight: .semibold))
                            .foregroundStyle(iconBubbleForeground)
                    }
                    
                    VStack(alignment: .leading, spacing: 3) {
                        Text(title)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text(isUnassigned ? "Unassigned" : "Workgroup")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .tracking(0.6)
                    }
                    
                    Spacer(minLength: 8)
                    
                    Text("\(taskCount)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 11)
                        .padding(.vertical, 6)
                        .background(
                            Capsule()
                                .fill(isUnassigned ? AnyShapeStyle(Color.secondary) : AnyShapeStyle(Color.accentColor))
                        )
                    
                    Image(systemName: canToggle ? "chevron.right" : "lock.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(canToggle ? AnyShapeStyle(Color.secondary) : AnyShapeStyle(Color.orange))
                        .rotationEffect(.degrees(canToggle && isExpanded ? 90 : 0))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(headerBackgroundFill)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(headerStroke, lineWidth: 1)
                }
                .shadow(color: Color.black.opacity(0.07), radius: 10, x: 0, y: 4)
                .opacity(canToggle ? 1 : 0.88)
            }
            .buttonStyle(.plain)
            .disabled(!canToggle)
            
            if let msg = restrictionMessage, !canToggle {
                Text(msg)
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 8)
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 18)
        .padding(.bottom, 10)
        .animation(.spring(response: 0.38, dampingFraction: 0.78), value: isExpanded)
    }
    
    private var iconName: String {
        if !canToggle { return "exclamationmark.triangle.fill" }
        return isUnassigned ? "tray" : "person.3.fill"
    }
    
    private var headerBackgroundFill: AnyShapeStyle {
        if !canToggle {
            return AnyShapeStyle(Color.orange.opacity(0.12))
        }
        if isUnassigned {
            return AnyShapeStyle(Color(.secondarySystemGroupedBackground))
        }
        return AnyShapeStyle(
            LinearGradient(
                colors: [
                    Color.accentColor.opacity(0.16),
                    Color.accentColor.opacity(0.05)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
    
    private var headerStroke: Color {
        if !canToggle { return Color.orange.opacity(0.35) }
        return isUnassigned
            ? Color(.separator).opacity(0.45)
            : Color.accentColor.opacity(0.28)
    }
    
    private var iconBubbleFill: Color {
        if !canToggle { return Color.orange.opacity(0.22) }
        return isUnassigned
            ? Color(.systemGray4).opacity(0.45)
            : Color.accentColor.opacity(0.22)
    }
    
    private var iconBubbleForeground: Color {
        if !canToggle { return Color.orange }
        return isUnassigned ? Color(.secondaryLabel) : Color.accentColor
    }
}

// MARK: - Task Item View
struct TaskItemView: View {
    let task: Task
    let onStatusChange: ((TaskStatus) -> Void)?
    
    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            statusAccentBar
                .frame(width: 5)
            
            TaskCardView(task: task, onStatusChange: onStatusChange)
                .padding(.leading, 2)
                .padding(.vertical, 4)
        }
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color(.separator).opacity(0.35), lineWidth: 0.5)
        }
        .shadow(color: Color.black.opacity(0.09), radius: 12, x: 0, y: 6)
        .padding(.vertical, 6)
    }
    
    private var statusAccentBar: some View {
        LinearGradient(
            colors: [statusColor, statusColor.opacity(0.55)],
            startPoint: .top,
            endPoint: .bottom
        )
        .frame(minHeight: 96)
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: 16,
                bottomLeadingRadius: 16,
                bottomTrailingRadius: 0,
                topTrailingRadius: 0,
                style: .continuous
            )
        )
    }
    
    private var statusColor: Color {
        switch task.status {
        case .completed: return Color(red: 0.35, green: 0.65, blue: 0.95)
        case .inProgress, .supposedlyCompleted: return Color(red: 0.55, green: 0.4, blue: 0.95)
        case .deferred: return Color(red: 0.55, green: 0.58, blue: 0.62)
        default: return Color(red: 0.45, green: 0.55, blue: 0.95)
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
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
        .background(Color(.systemBackground))
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
        case .completed: return Color(red: 0.35, green: 0.65, blue: 0.95).opacity(0.28)
        case .inProgress, .supposedlyCompleted: return Color(red: 0.55, green: 0.4, blue: 0.95).opacity(0.28)
        case .deferred: return Color(red: 0.55, green: 0.58, blue: 0.62).opacity(0.35)
        default: return Color(red: 0.45, green: 0.55, blue: 0.95).opacity(0.28)
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
        case .completed: return Color(red: 0.35, green: 0.65, blue: 0.95).opacity(0.28)
        case .inProgress, .supposedlyCompleted: return Color(red: 0.55, green: 0.4, blue: 0.95).opacity(0.28)
        case .deferred: return Color(red: 0.55, green: 0.58, blue: 0.62).opacity(0.35)
        default: return Color(red: 0.45, green: 0.55, blue: 0.95).opacity(0.28)
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
        case .high: return Color(red: 0.95, green: 0.45, blue: 0.45).opacity(0.18)
        case .normal: return Color.accentColor.opacity(0.14)
        case .low: return Color(.tertiarySystemGroupedBackground)
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
        VStack(spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(.secondary)
                TextField("Search tasks...", text: Binding(
                    get: { searchQuery },
                    set: onSearchQueryChange
                ))
                .textFieldStyle(.plain)
                
                if !searchQuery.isEmpty {
                    Button(action: { onSearchQueryChange("") }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color(.secondarySystemGroupedBackground))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color(.separator).opacity(0.45), lineWidth: 0.5)
            }
            
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
            
            if selectedStatus != nil || selectedPriority != nil || !searchQuery.isEmpty {
                Button(action: onClearFilters) {
                    Label("Clear filters", systemImage: "line.3.horizontal.decrease.circle")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.accentColor)
                }
            }
        }
        .padding(16)
        .background {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground).opacity(0.65))
        }
        .padding(.horizontal, 12)
        .padding(.top, 4)
        .padding(.bottom, 8)
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
                .fontWeight(isSelected ? .semibold : .medium)
                .foregroundStyle(isSelected ? Color.white : Color.primary)
                .padding(.horizontal, 13)
                .padding(.vertical, 8)
                .background {
                    if isSelected {
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [Color.accentColor, Color.accentColor.opacity(0.82)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    } else {
                        Capsule()
                            .fill(Color(.tertiarySystemGroupedBackground))
                    }
                }
                .overlay {
                    Capsule()
                        .strokeBorder(Color(.separator).opacity(isSelected ? 0 : 0.35), lineWidth: 0.5)
                }
                .shadow(color: isSelected ? Color.accentColor.opacity(0.35) : .clear, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
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
