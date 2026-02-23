//
//  ActivityFeedView.swift
//  JbmrksIOs
//
//  Activity Feed screen
//

import SwiftUI

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
                            BlogPostItemView(post: post)
                        }
                    }
                    .padding()
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
    }
}

// MARK: - Blog Post Item View
struct BlogPostItemView: View {
    let post: BlogPost
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title = post.title {
                Text(title)
                    .font(.headline)
            }
            
            if let text = post.text {
                Text(text)
                    .font(.body)
                    .foregroundColor(.primary)
            }
            
            HStack {
                if let date = post.date {
                    Label(date, systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let authorId = post.authorId {
                    Label("User \(authorId)", systemImage: "person")
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
