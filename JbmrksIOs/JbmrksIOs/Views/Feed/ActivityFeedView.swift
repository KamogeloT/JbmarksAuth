//
//  ActivityFeedView.swift
//  JbmrksIOs
//
//  Activity Feed screen
//

import SwiftUI
import Combine

struct ActivityFeedView: View {
    @StateObject private var viewModel = ActivityFeedViewModel()
    @State private var showCreatePostDialog = false
    @State private var postText = ""
    @State private var postTitle = ""
    
    var body: some View {
        ZStack {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                ErrorStateView(errorMessage: error) {
                    _Concurrency.Task { @MainActor in
                        await viewModel.loadFeed()
                    }
                }
            } else if viewModel.posts.isEmpty {
                EmptyFeedState()
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(viewModel.posts) { post in
                            NavigationLink(value: post.id) {
                                BlogPostItemView(post: post)
                            }
                        }
                        
                        // Load more indicator
                        if viewModel.hasMore {
                            Button(action: {
                                _Concurrency.Task { @MainActor in
                                    await viewModel.loadMore()
                                }
                            }) {
                                if viewModel.isLoadingMore {
                                    ProgressView()
                                        .padding()
                                } else {
                                    Text("Load More")
                                        .foregroundColor(.blue)
                                        .padding()
                                }
                            }
                        }
                    }
                    .padding()
                }
                .navigationDestination(for: String.self) { postId in
                    PostDetailView(postId: postId)
                }
            }
        }
        .navigationTitle("Activity Feed")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showCreatePostDialog = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showCreatePostDialog) {
            CreatePostDialog(
                postText: $postText,
                postTitle: $postTitle,
                isPosting: viewModel.isPosting,
                onPost: {
                    _Concurrency.Task { @MainActor in
                        await viewModel.addPost(text: postText, title: postTitle.isEmpty ? nil : postTitle)
                        postText = ""
                        postTitle = ""
                        showCreatePostDialog = false
                    }
                },
                onCancel: {
                    postText = ""
                    postTitle = ""
                    showCreatePostDialog = false
                }
            )
        }
        .task {
            await viewModel.loadFeed()
        }
        .refreshable {
            await viewModel.loadFeed()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshFeed"))) { _ in
            _Concurrency.Task { @MainActor in
                await viewModel.loadFeed()
            }
        }
    }
}

// MARK: - Blog Post Item View
struct BlogPostItemView: View {
    let post: BlogPost
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Author and date
            HStack {
                if let authorName = post.authorName {
                    Label(authorName, systemImage: "person.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else if let authorId = post.authorId {
                    Label("User \(authorId)", systemImage: "person.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if let date = post.date {
                    Label(date, systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Title
            if let title = post.title, !title.isEmpty {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
            }
            
            // Text content
            if let text = post.text, !text.isEmpty {
                Text(text)
                    .font(.body)
                    .foregroundColor(.primary)
                    .lineLimit(3)
            }
            
            // Files/Attachments
            if let files = post.files, !files.isEmpty {
                HStack {
                    Image(systemName: "paperclip")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(files.count) attachment\(files.count != 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Comment count
            if let commentCount = post.commentCount, commentCount > 0 {
                HStack {
                    Image(systemName: "bubble.left")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(commentCount) comment\(commentCount != 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Post Detail View
struct PostDetailView: View {
    let postId: String
    @StateObject private var viewModel = PostDetailViewModel()
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                } else if let post = viewModel.post {
                    // Post content
                    VStack(alignment: .leading, spacing: 12) {
                        // Author and date
                        HStack {
                            if let authorName = post.authorName {
                                Label(authorName, systemImage: "person.fill")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            if let date = post.date {
                                Label(date, systemImage: "clock")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        // Title
                        if let title = post.title, !title.isEmpty {
                            Text(title)
                                .font(.title2)
                                .fontWeight(.bold)
                        }
                        
                        // Text content
                        if let text = post.text, !text.isEmpty {
                            Text(text)
                                .font(.body)
                                .foregroundColor(.primary)
                        }
                        
                        // Files/Attachments
                        if let files = post.files, !files.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Attachments")
                                    .font(.headline)
                                
                                ForEach(files, id: \.id) { file in
                                    if let urlString = file.url, let url = URL(string: urlString) {
                                        Link(destination: url) {
                                            HStack {
                                                Image(systemName: "doc.fill")
                                                    .foregroundColor(.blue)
                                                Text(file.name ?? "File")
                                                    .foregroundColor(.blue)
                                                Spacer()
                                            }
                                            .padding(8)
                                            .background(Color.blue.opacity(0.1))
                                            .cornerRadius(8)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    
                    // Comments section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Comments")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        if viewModel.isLoadingComments {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else if viewModel.comments.isEmpty {
                            Text("No comments yet")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .padding()
                        } else {
                            ForEach(viewModel.comments) { comment in
                                BlogCommentItemView(comment: comment)
                            }
                        }
                        
                        // Add comment section
                        VStack(alignment: .leading, spacing: 8) {
                            TextField("Add a comment...", text: $viewModel.newCommentText, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(3...6)
                            
                            Button(action: {
                                _Concurrency.Task { @MainActor in
                                    await viewModel.addComment()
                                }
                            }) {
                                Text("Post Comment")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(viewModel.newCommentText.isEmpty || viewModel.isPostingComment)
                        }
                        .padding()
                    }
                } else if let error = viewModel.errorMessage {
                    Text("Error: \(error)")
                        .foregroundColor(.red)
                        .padding()
                }
            }
            .padding()
        }
        .navigationTitle("Post Details")
        .task {
            await viewModel.loadPost(postId: postId)
            await viewModel.loadComments(postId: postId)
        }
    }
}

// MARK: - Blog Comment Item View
struct BlogCommentItemView: View {
    let comment: BlogComment
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                if let authorName = comment.authorName {
                    Text(authorName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                } else if let authorId = comment.authorId {
                    Text("User \(authorId)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                
                Spacer()
                
                if let date = comment.date {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            if let text = comment.text {
                Text(text)
                    .font(.body)
                    .foregroundColor(.primary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

// MARK: - Post Detail ViewModel
@MainActor
final class PostDetailViewModel: ObservableObject {
    @Published var post: BlogPost?
    @Published var comments: [BlogComment] = []
    @Published var isLoading = false
    @Published var isLoadingComments = false
    @Published var isPostingComment = false
    @Published var errorMessage: String?
    @Published var newCommentText = ""
    
    private var activityFeedRepository: ActivityFeedRepository?
    
    init() {
        let tokenStorage = StorageFactory.shared.tokenStorage.getAccessToken() ?? ""
        let baseUrl = StorageFactory.shared.tokenStorage.getPortalUrl() ?? "https://jbmarks.sdinmotion.co.za/"
        let apiClient = BitrixApiClient(baseUrl: baseUrl, accessToken: tokenStorage)
        activityFeedRepository = ActivityFeedRepositoryImpl(apiClient: apiClient)
    }
    
    func loadPost(postId: String) async {
        isLoading = true
        errorMessage = nil
        
        guard let repo = activityFeedRepository else {
            errorMessage = "Repository not initialized"
            isLoading = false
            return
        }
        
        do {
            post = try await repo.getPost(postId: postId)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func loadComments(postId: String) async {
        isLoadingComments = true
        
        guard let repo = activityFeedRepository else {
            isLoadingComments = false
            return
        }
        
        do {
            comments = try await repo.getPostComments(postId: postId)
        } catch {
            print("⚠️ Failed to load comments: \(error.localizedDescription)")
        }
        
        isLoadingComments = false
    }
    
    func addComment() async {
        guard let post = post else { return }
        
        // Validate comment text (trim whitespace and check if empty)
        let trimmedText = newCommentText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else {
            errorMessage = "Comment cannot be empty"
            return
        }
        
        isPostingComment = true
        errorMessage = nil
        
        guard let repo = activityFeedRepository else {
            isPostingComment = false
            return
        }
        
        do {
            _ = try await repo.addComment(postId: post.id, text: trimmedText)
            newCommentText = ""
            await loadComments(postId: post.id)
        } catch {
            errorMessage = "Failed to add comment: \(error.localizedDescription)"
        }
        
        isPostingComment = false
    }
}

// MARK: - Empty Feed State
struct EmptyFeedState: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("📰")
                .font(.system(size: 64))
            
            Text("No Posts Yet")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("When there are posts in the activity feed,\nthey will appear here.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// MARK: - Create Post Dialog
struct CreatePostDialog: View {
    @Binding var postText: String
    @Binding var postTitle: String
    let isPosting: Bool
    let onPost: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Title (Optional)") {
                    TextField("Enter post title", text: $postTitle)
                }
                
                Section("Message") {
                    TextEditor(text: $postText)
                        .frame(height: 200)
                }
            }
            .navigationTitle("New Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel", action: onCancel)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Post") {
                        onPost()
                    }
                    .disabled(postText.isEmpty || isPosting)
                }
            }
        }
    }
}
