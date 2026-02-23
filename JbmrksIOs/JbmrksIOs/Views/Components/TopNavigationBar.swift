//
//  TopNavigationBar.swift
//  JbmrksIOs
//
//  Top navigation bar with logo and user profile (matching Android)
//

import SwiftUI
import UIKit

struct TopNavigationBar: View {
    @State private var user: User?
    @State private var isLoadingUser = true
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                // Logo on the left
                if let logoImage = UIImage(named: "JBmarksLogo") {
                    Image(uiImage: logoImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 48)
                } else {
                    // Fallback to text if image not found
                    Text("JBmarks")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                // User info on the right
                if isLoadingUser {
                    ProgressView()
                        .frame(width: 20, height: 20)
                } else if let user = user {
                    HStack(spacing: 12) {
                        // User avatar
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 40, height: 40)
                            
                            Image(systemName: "person.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.blue)
                        }
                        
                        // User details
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(user.fullName)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .lineLimit(1)
                            
                            if let position = user.position, !position.isEmpty {
                                Text(position)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            
                            if let email = user.email, !email.isEmpty {
                                Text(email)
                                    .font(.caption2)
                                    .foregroundColor(.secondary.opacity(0.7))
                                    .lineLimit(1)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemBackground))
            
            // Gradient border separator (matching Android)
            LinearGradient(
                colors: [
                    Color.secondary.opacity(0.5),
                    Color.secondary.opacity(0.3),
                    Color.secondary.opacity(0.15),
                    Color.secondary.opacity(0.05),
                    Color.clear
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 8)
        }
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .task {
            await loadUser()
        }
    }
    
    private func loadUser() async {
        isLoadingUser = true
        guard let tokenStorage = StorageFactory.shared.tokenStorage.getAccessToken(),
              !tokenStorage.isEmpty else {
            isLoadingUser = false
            return
        }
        
        let baseUrl = StorageFactory.shared.tokenStorage.getPortalUrl() ?? "https://jbmarks.sdinmotion.co.za/"
        let apiClient = BitrixApiClient(baseUrl: baseUrl, accessToken: tokenStorage)
        let userRepository = UserRepositoryImpl(apiClient: apiClient)
        
        do {
            user = try await userRepository.getCurrentUser()
        } catch {
            print("Failed to load user: \(error)")
        }
        isLoadingUser = false
    }
}

