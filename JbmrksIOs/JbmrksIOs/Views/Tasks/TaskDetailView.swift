//
//  TaskDetailView.swift
//  JbmrksIOs
//
//  Task detail view matching Android implementation
//

import SwiftUI
import PhotosUI
import UniformTypeIdentifiers
import UIKit

struct TaskDetailView: View {
    let taskId: String
    let onNavigateBack: () -> Void
    
    @StateObject private var viewModel: TaskDetailViewModel
    @State private var showDeleteConfirmation = false
    @State private var showImageDialog: String? = nil
    @State private var showFilePicker = false
    @State private var showCamera = false
    @State private var showCommentCamera = false
    @State private var selectedPhoto: PhotosPickerItem? = nil
    
    init(taskId: String, onNavigateBack: @escaping () -> Void) {
        self.taskId = taskId
        self.onNavigateBack = onNavigateBack
        _viewModel = StateObject(wrappedValue: TaskDetailViewModel(taskId: taskId))
    }
    
    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 400)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadTask()
                    }
                }
            } else if let task = viewModel.task {
                VStack(alignment: .leading, spacing: 16) {
                    // Header Card
                    HeaderCard(task: task)
                    
                    // Description Card
                    if !task.description.isEmpty {
                        InfoCard(icon: "info.circle", title: "Description", content: task.description)
                    }
                    
                    // Deadline Card
                    if let deadline = task.deadline {
                        DeadlineCard(task: task, deadline: deadline)
                    }
                    
                    // People Card
                    PeopleCard(task: task)
                    
                    // Group Card
                    if let groupName = task.groupName {
                        InfoCard(icon: "person.2", title: "Group/Project", content: groupName)
                    }
                    
                    // Metadata Card
                    MetadataCard(task: task)
                    
                    // Action Buttons
                    ActionButtonsView(
                        task: task,
                        onComplete: { _Concurrency.Task { @MainActor in await viewModel.completeTask(); await viewModel.loadTask() } },
                        onStart: { _Concurrency.Task { @MainActor in await viewModel.startTask(); await viewModel.loadTask() } },
                        onDefer: { _Concurrency.Task { @MainActor in await viewModel.deferTask(); await viewModel.loadTask() } },
                        onRenew: { _Concurrency.Task { @MainActor in await viewModel.renewTask(); await viewModel.loadTask() } },
                        onDelete: { showDeleteConfirmation = true }
                    )
                    
                    Divider()
                    
                    // File Attachments Section
                    FileAttachmentSectionView(
                        files: viewModel.files,
                        isUploading: viewModel.isUploadingFile,
                        onUploadFile: { showFilePicker = true },
                        onTakePhoto: { showCamera = true },
                        onFileClick: { file in
                            if isImageFile(file.type ?? "", fileName: file.name), let url = file.downloadUrl {
                                showImageDialog = url
                            } else if let url = file.downloadUrl {
                                if let urlObj = URL(string: url) {
                                    UIApplication.shared.open(urlObj)
                                }
                            }
                        }
                    )
                    
                    Divider()
                    
                    // Comments Section
                    CommentSectionView(
                        comments: viewModel.comments,
                        isLoading: viewModel.isLoadingComments,
                        onAddComment: { text in
                            _Concurrency.Task { @MainActor in
                                await viewModel.addComment(text)
                            }
                        },
                        onTakePhoto: { showCommentCamera = true }
                    )
                }
                .padding()
            }
        }
        .navigationTitle("Task Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    NavigationLink(value: NavigationRoute.taskEdit(taskId)) {
                        Label("Edit", systemImage: "pencil")
                    }
                    
                    Button(role: .destructive, action: {
                        showDeleteConfirmation = true
                    }) {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .alert("Delete Task", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                _Concurrency.Task { @MainActor in
                    do {
                        try await viewModel.deleteTask()
                        onNavigateBack()
                    } catch {
                        viewModel.errorMessage = "Failed to delete task: \(error.localizedDescription)"
                    }
                }
            }
        } message: {
            if let task = viewModel.task {
                Text("Are you sure you want to delete \"\(task.title)\"? This action cannot be undone.")
            }
        }
        .sheet(isPresented: $showFilePicker) {
            DocumentPicker { url in
                _Concurrency.Task { @MainActor in
                    await viewModel.uploadAndAttachFile(filePath: url.path, fileName: url.lastPathComponent)
                }
            }
        }
        .sheet(isPresented: $showCamera) {
            CameraView { imageData, fileName in
                _Concurrency.Task { @MainActor in
                    // Save to temp file
                    let tempDir = FileManager.default.temporaryDirectory
                    let tempFile = tempDir.appendingPathComponent(fileName)
                    try? imageData.write(to: tempFile)
                    await viewModel.uploadAndAttachFile(filePath: tempFile.path, fileName: fileName)
                }
            }
        }
        .sheet(isPresented: $showCommentCamera) {
            CameraView { imageData, fileName in
                _Concurrency.Task { @MainActor in
                    // Save to temp file
                    let tempDir = FileManager.default.temporaryDirectory
                    let tempFile = tempDir.appendingPathComponent(fileName)
                    try? imageData.write(to: tempFile)
                    await viewModel.uploadPhotoAndAddComment(filePath: tempFile.path, fileName: fileName)
                }
            }
        }
        .fullScreenCover(item: Binding(
            get: { showImageDialog.map { ImageViewerModel(url: $0) } },
            set: { showImageDialog = $0?.url }
        )) { model in
            ImageViewerDialog(imageUrl: model.url) {
                showImageDialog = nil
            }
        }
        .task {
            await viewModel.loadTask()
        }
    }
    
    private func isImageFile(_ mimeType: String, fileName: String) -> Bool {
        return mimeType.hasPrefix("image/") ||
               fileName.lowercased().hasSuffix(".jpg") ||
               fileName.lowercased().hasSuffix(".jpeg") ||
               fileName.lowercased().hasSuffix(".png") ||
               fileName.lowercased().hasSuffix(".gif") ||
               fileName.lowercased().hasSuffix(".webp") ||
               fileName.lowercased().hasSuffix(".bmp")
    }
}

// MARK: - Header Card
struct HeaderCard: View {
    let task: Task
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                StatusChip(status: task.status)
                PriorityChip(priority: task.priority)
            }
            
            Text(task.title)
                .font(.title2)
                .fontWeight(.bold)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(16)
    }
}

// MARK: - Status Chip
struct StatusChip: View {
    let status: TaskStatus
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: statusIcon)
                .font(.system(size: 14))
            Text(status.displayName)
                .font(.caption)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(statusColor.opacity(0.2))
        .foregroundColor(statusColor)
        .cornerRadius(8)
    }
    
    private var statusColor: Color {
        switch status {
        case .completed: return .green
        case .inProgress: return .blue
        case .deferred: return .orange
        case .supposedlyCompleted: return .blue
        case .new: return .gray
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

// MARK: - Priority Chip
struct PriorityChip: View {
    let priority: TaskPriority
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "star.fill")
                .font(.system(size: 14))
            Text("\(priority.displayName) Priority")
                .font(.caption)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(priorityColor.opacity(0.2))
        .foregroundColor(priorityColor)
        .cornerRadius(8)
    }
    
    private var priorityColor: Color {
        switch priority {
        case .high: return .red
        case .normal: return .blue
        case .low: return .gray
        }
    }
}

// MARK: - Info Card
struct InfoCard: View {
    let icon: String
    let title: String
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.blue)
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
            }
            Text(content)
                .font(.body)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Deadline Card
struct DeadlineCard: View {
    let task: Task
    let deadline: String
    
    var body: some View {
        let isOverdue = task.isOverdue()
        let formattedDeadline = task.getFormattedDeadline() ?? deadline
        
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: isOverdue ? "exclamationmark.triangle.fill" : "calendar")
                    .foregroundColor(isOverdue ? .red : .blue)
                Text(isOverdue ? "Overdue!" : "Deadline")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(isOverdue ? .red : .secondary)
            }
            Text(formattedDeadline)
                .font(.body)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(isOverdue ? Color.red.opacity(0.1) : Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - People Card
struct PeopleCard: View {
    let task: Task
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.fill")
                    .foregroundColor(.blue)
                Text("People")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
            }
            
            if let createdByName = task.createdByName {
                PersonRow(label: "Created by", name: createdByName)
            }
            
            if let responsibleName = task.responsibleName {
                PersonRow(label: "Assigned to", name: responsibleName)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct PersonRow: View {
    let label: String
    let name: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.body)
                .foregroundColor(.secondary)
            Spacer()
            Text(name)
                .font(.body)
                .fontWeight(.semibold)
        }
    }
}

// MARK: - Metadata Card
struct MetadataCard: View {
    let task: Task
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "info.circle")
                    .foregroundColor(.blue)
                Text("Additional Info")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
            }
            
            if let createdDate = task.createdDate {
                MetadataRow(label: "Created", value: formatDate(createdDate))
            }
            
            if let closedDate = task.closedDate {
                MetadataRow(label: "Closed", value: formatDate(closedDate))
            }
            
            MetadataRow(label: "Comments", value: "\(task.commentsCount)")
            
            if task.newCommentsCount > 0 {
                MetadataRow(label: "New Comments", value: "\(task.newCommentsCount)")
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct MetadataRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.body)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.body)
                .fontWeight(.medium)
        }
    }
}

func formatDate(_ dateString: String) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    
    guard let date = formatter.date(from: dateString) else {
        formatter.formatOptions = [.withInternetDateTime]
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "MMM dd, yyyy HH:mm"
        return outputFormatter.string(from: date)
    }
    
    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "MMM dd, yyyy HH:mm"
    return outputFormatter.string(from: date)
}

// MARK: - Action Buttons View
struct ActionButtonsView: View {
    let task: Task
    let onComplete: () -> Void
    let onStart: () -> Void
    let onDefer: () -> Void
    let onRenew: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Actions")
                .font(.headline)
                .fontWeight(.bold)
            
            switch task.status {
            case .new:
                Button(action: onStart) {
                    Label("Start Task", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                
            case .inProgress:
                Button(action: onComplete) {
                    Label("Complete Task", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                
                Button(action: onDefer) {
                    Label("Defer Task", systemImage: "pause.circle.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                
            case .completed, .supposedlyCompleted:
                Button(action: onRenew) {
                    Label("Reopen Task", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                
            case .deferred:
                Button(action: onStart) {
                    Label("Resume Task", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
            }
            
            Divider()
            
            Button(role: .destructive, action: onDelete) {
                Label("Delete Task", systemImage: "trash")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .foregroundColor(.red)
                    .cornerRadius(8)
            }
        }
    }
}

// MARK: - File Attachment Section View
struct FileAttachmentSectionView: View {
    let files: [TaskFile]
    let isUploading: Bool
    let onUploadFile: () -> Void
    let onTakePhoto: () -> Void
    let onFileClick: (TaskFile) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Attachments (\(files.count))")
                    .font(.headline)
                    .fontWeight(.bold)
                
                Spacer()
                
                Button(action: onTakePhoto) {
                    Image(systemName: "camera.fill")
                        .foregroundColor(.blue)
                }
                
                Button(action: onUploadFile) {
                    Image(systemName: "plus")
                        .foregroundColor(.blue)
                }
            }
            
            if files.isEmpty {
                Text("No attachments. Tap + to add files.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(files) { file in
                            FileAttachmentCard(file: file, onClick: { onFileClick(file) })
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }
            
            if isUploading {
                ProgressView("Uploading file...")
                    .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - File Attachment Card
struct FileAttachmentCard: View {
    let file: TaskFile
    let onClick: () -> Void
    
    var body: some View {
        let isImage = isImageFile(file.type ?? "", fileName: file.name)
        
        Button(action: onClick) {
            if isImage, let url = file.downloadUrl {
                AsyncImage(url: URL(string: url)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    ProgressView()
                }
                .frame(width: 200, height: 150)
                .cornerRadius(12)
                .overlay(
                    VStack {
                        Spacer()
                        Text(file.name)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(8)
                            .frame(maxWidth: .infinity)
                            .background(Color.black.opacity(0.6))
                    }
                )
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "doc.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.blue)
                    Text(file.name)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(2)
                    if let size = file.size {
                        Text(formatFileSize(size))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(width: 200, height: 100)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
    }
    
    private func isImageFile(_ mimeType: String, fileName: String) -> Bool {
        return mimeType.hasPrefix("image/") ||
               fileName.lowercased().hasSuffix(".jpg") ||
               fileName.lowercased().hasSuffix(".jpeg") ||
               fileName.lowercased().hasSuffix(".png") ||
               fileName.lowercased().hasSuffix(".gif") ||
               fileName.lowercased().hasSuffix(".webp") ||
               fileName.lowercased().hasSuffix(".bmp")
    }
    
    private func formatFileSize(_ bytes: Int64) -> String {
        if bytes < 1024 {
            return "\(bytes) B"
        } else if bytes < 1024 * 1024 {
            return "\(bytes / 1024) KB"
        } else if bytes < 1024 * 1024 * 1024 {
            return "\(bytes / (1024 * 1024)) MB"
        } else {
            return "\(bytes / (1024 * 1024 * 1024)) GB"
        }
    }
}

// MARK: - Comment Section View
struct CommentSectionView: View {
    let comments: [Comment]
    let isLoading: Bool
    let onAddComment: (String) -> Void
    let onTakePhoto: () -> Void
    
    @State private var commentText = ""
    @State private var isSubmitting = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Comments (\(comments.count))")
                .font(.headline)
                .fontWeight(.bold)
            
            if comments.isEmpty && !isLoading {
                Text("No comments yet. Be the first to comment!")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(comments) { comment in
                            CommentItemView(comment: comment)
                        }
                    }
                }
                .frame(maxHeight: 400)
            }
            
            // Add Comment Input
            VStack(spacing: 8) {
                TextField("Add a comment...", text: $commentText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)
                
                HStack {
                    Button(action: onTakePhoto) {
                        Image(systemName: "camera.fill")
                            .foregroundColor(.blue)
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        if !commentText.isEmpty {
                            isSubmitting = true
                            onAddComment(commentText.trimmingCharacters(in: .whitespaces))
                            commentText = ""
                            isSubmitting = false
                        }
                    }) {
                        if isSubmitting {
                            ProgressView()
                        } else {
                            Label("Post", systemImage: "paperplane.fill")
                        }
                    }
                    .disabled(commentText.isEmpty || isSubmitting)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

// MARK: - Comment Item View
struct CommentItemView: View {
    let comment: Comment
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.2))
                        .frame(width: 32, height: 32)
                    Text(comment.authorName?.prefix(1).uppercased() ?? "?")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(comment.authorName ?? "Unknown User")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    if let date = comment.createdDate {
                        Text(formatCommentDate(date))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            
            Text(cleanCommentText(comment.text))
                .font(.body)
            
            // Files
            if !comment.files.isEmpty {
                HStack(spacing: 8) {
                    Text("Attachments:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    ForEach(comment.files) { file in
                        Text(file.name)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func cleanCommentText(_ text: String) -> String {
        // Remove [USER=ID]Name[/USER] tags and keep only the name
        let pattern = #"\[USER=\d+(?:\s+REPLACE)?]([^\[]+)\[/USER]"#
        if let regex = try? NSRegularExpression(pattern: pattern, options: []) {
            let range = NSRange(text.startIndex..<text.endIndex, in: text)
            return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: "$1")
        }
        return text
    }
    
    private func formatCommentDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: dateString) else {
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: dateString) else {
                return dateString
            }
            let outputFormatter = DateFormatter()
            outputFormatter.dateFormat = "MMM dd, yyyy HH:mm"
            return outputFormatter.string(from: date)
        }
        
        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "MMM dd, yyyy HH:mm"
        return outputFormatter.string(from: date)
    }
}

// MARK: - Image Viewer Dialog
struct ImageViewerModel: Identifiable {
    let id = UUID()
    let url: String
}

struct ImageViewerDialog: View {
    let imageUrl: String
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack {
                HStack {
                    Spacer()
                    Button(action: onDismiss) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    }
                    .padding()
                }
                
                Spacer()
                
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                } placeholder: {
                    ProgressView()
                        .tint(.white)
                }
                .padding()
                
                Spacer()
            }
        }
    }
}

// MARK: - Camera View
struct CameraView: UIViewControllerRepresentable {
    let onPhotoTaken: (Data, String) -> Void
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        var parent: CameraView
        
        init(_ parent: CameraView) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                // Resize image to max 1920x1920 to reduce file size
                let resizedImage = image.resized(toMaxDimension: 1920)
                // Use higher compression for smaller file size
                if let imageData = resizedImage.jpegData(compressionQuality: 0.7) {
                    let fileName = "photo_\(Int(Date().timeIntervalSince1970)).jpg"
                    parent.onPhotoTaken(imageData, fileName)
                }
            }
            picker.dismiss(animated: true)
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
        }
    }
}

// MARK: - UIImage Extension for Resizing
extension UIImage {
    func resized(toMaxDimension maxDimension: CGFloat) -> UIImage {
        let size = self.size
        
        // If image is already smaller, return original
        if size.width <= maxDimension && size.height <= maxDimension {
            return self
        }
        
        // Calculate new size maintaining aspect ratio
        let ratio = size.width / size.height
        var newSize: CGSize
        
        if size.width > size.height {
            newSize = CGSize(width: maxDimension, height: maxDimension / ratio)
        } else {
            newSize = CGSize(width: maxDimension * ratio, height: maxDimension)
        }
        
        // Resize image
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        defer { UIGraphicsEndImageContext() }
        
        self.draw(in: CGRect(origin: .zero, size: newSize))
        return UIGraphicsGetImageFromCurrentImageContext() ?? self
    }
}
