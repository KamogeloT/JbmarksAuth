//
//  TaskFormView.swift
//  JbmrksIOs
//
//  Task form view for editing tasks
//

import SwiftUI

struct TaskFormView: View {
    let taskId: String?
    let onNavigateBack: () -> Void
    
    @StateObject private var viewModel: TaskFormViewModel
    @State private var showPriorityMenu = false
    
    init(taskId: String? = nil, onNavigateBack: @escaping () -> Void) {
        self.taskId = taskId
        self.onNavigateBack = onNavigateBack
        _viewModel = StateObject(wrappedValue: TaskFormViewModel(taskId: taskId))
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Error message
                if let error = viewModel.errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        Text(error)
                            .font(.body)
                            .foregroundColor(.red)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                }
                
                // Title Field
                VStack(alignment: .leading, spacing: 4) {
                    Text("Title *")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("Enter task title", text: $viewModel.title)
                        .textFieldStyle(.roundedBorder)
                        .disabled(viewModel.isSaving)
                }
                
                // Description Field
                VStack(alignment: .leading, spacing: 4) {
                    Text("Description")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextEditor(text: $viewModel.description)
                        .frame(height: 150)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(.systemGray4), lineWidth: 1)
                        )
                        .disabled(viewModel.isSaving)
                }
                
                // Priority Selector
                VStack(alignment: .leading, spacing: 4) {
                    Text("Priority")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Button(action: { showPriorityMenu = true }) {
                        HStack {
                            Image(systemName: "star.fill")
                                .foregroundColor(priorityColor(viewModel.priority))
                            Text("\(viewModel.priority.displayName) Priority")
                                .foregroundColor(.primary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                    .disabled(viewModel.isSaving)
                }
                .confirmationDialog("Select Priority", isPresented: $showPriorityMenu) {
                    ForEach([TaskPriority.high, .normal, .low], id: \.self) { priority in
                        Button(priority.displayName) {
                            viewModel.priority = priority
                        }
                    }
                    Button("Cancel", role: .cancel) { }
                }
                
                // Deadline Field with Date Picker
                VStack(alignment: .leading, spacing: 4) {
                    Text("Deadline (Optional)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    DatePicker(
                        "Deadline",
                        selection: Binding(
                            get: {
                                if let deadline = viewModel.deadline {
                                    let formatter = ISO8601DateFormatter()
                                    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                                    return formatter.date(from: deadline) ?? Date()
                                }
                                return Date()
                            },
                            set: { date in
                                let formatter = ISO8601DateFormatter()
                                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                                viewModel.deadline = formatter.string(from: date)
                            }
                        ),
                        displayedComponents: [.date, .hourAndMinute]
                    )
                    .disabled(viewModel.isSaving)
                }
                
                // Helper text
                Text("* Required fields")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                // Save Button
                Button(action: {
                    _Concurrency.Task { @MainActor in
                        do {
                            try await viewModel.saveTask()
                            onNavigateBack()
                        } catch {
                            // Error already set in viewModel
                        }
                    }
                }) {
                    if viewModel.isSaving {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    } else {
                        Text(viewModel.isCreating ? "Create" : "Save")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
                .disabled(viewModel.isSaving || viewModel.title.isEmpty)
            }
            .padding()
        }
        .navigationTitle(viewModel.isCreating ? "New Task" : "Edit Task")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadTask()
        }
    }
    
    private func priorityColor(_ priority: TaskPriority) -> Color {
        switch priority {
        case .high: return .red
        case .normal: return .blue
        case .low: return .gray
        }
    }
}
