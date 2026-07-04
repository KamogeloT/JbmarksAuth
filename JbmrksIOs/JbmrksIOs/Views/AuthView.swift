//
//  AuthView.swift
//  JbmrksIOs
//
//  Created by Kamogelo Tshukudu on 2025-01-27.
//

import SwiftUI
import UIKit
import AuthenticationServices

// Helper to disambiguate Swift concurrency Task from our Task model
private func runAsync(_ operation: @escaping () async -> Void) {
    // Use fully qualified concurrency Task to avoid conflict with our Task model
    _Concurrency.Task { @MainActor in
        await operation()
    }
}

struct AuthView: View {
    @ObservedObject var viewModel: AuthViewModel
    @State private var showError = false
    
    init(viewModel: AuthViewModel? = nil) {
        // Use provided viewModel or create a new one (for previews)
        if let viewModel = viewModel {
            self._viewModel = ObservedObject(wrappedValue: viewModel)
        } else {
            self._viewModel = ObservedObject(wrappedValue: AuthViewModel())
        }
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Checking authentication…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.isAuthenticated {
                EmptyView() // Caller should show main content
            } else {
                loginPrompt
            }
        }
        // Remove the checkAuth task - ContentView already handles initial auth check
        // This prevents duplicate auth checks and state conflicts
        .alert("Error", isPresented: $showError) {
            Button("OK") {
                viewModel.errorMessage = nil
                showError = false
            }
        } message: {
            if let msg = viewModel.errorMessage {
                Text(msg)
            }
        }
        .onChange(of: viewModel.errorMessage) { _, newValue in
            showError = newValue != nil
        }
        // Note: OAuth callback is handled by ASWebAuthenticationSession completion handler
        // No need for .onOpenURL here as it would cause duplicate token exchange
    }
    
    private var loginPrompt: some View {
        VStack(spacing: 24) {
            // Logo
            if let logoImage = UIImage(named: "JBmarksLogo") {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 120)
                    .padding(.top, 40)
            } else {
                // Fallback if logo not found
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.questionmark")
                        .font(.system(size: 60))
                        .foregroundStyle(.secondary)
                    Text("JBmarks")
                        .font(.title)
                        .fontWeight(.semibold)
                }
            }
            
            Text("Sign in with your Bitrix24 account to continue.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            SignInButton(viewModel: viewModel)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct SignInButton: View {
    @ObservedObject var viewModel: AuthViewModel
    private let oauthService = OAuthService(tokenStorage: StorageFactory.shared.tokenStorage)
    
    var body: some View {
        Button {
            startOAuthFlow()
        } label: {
            Label("Sign in", systemImage: "arrow.right.circle.fill")
                .frame(maxWidth: .infinity)
                .padding()
        }
        .buttonStyle(.borderedProminent)
        .padding(.horizontal, 32)
    }
    
    private func startOAuthFlow() {
        let portalUrl = StorageFactory.shared.tokenStorage.getPortalUrl() ?? OAuthConfig.defaultPortalUrl
        let authURLString = oauthService.buildAuthorizationUrl(portalUrl: portalUrl)
        
        guard let authURL = URL(string: authURLString) else {
            return
        }
        
        // Use ASWebAuthenticationSession for OAuth flow
        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: "jbmarks"
        ) { callbackURL, error in
            if let error = error {
                // Handle error
                if let authError = error as? ASWebAuthenticationSessionError,
                   authError.code == .canceledLogin {
                    // User canceled - ignore
                    return
                }
                _Concurrency.Task { @MainActor in
                    viewModel.errorMessage = "Authentication failed: \(error.localizedDescription)"
                }
                return
            }
            
            guard let callbackURL = callbackURL else {
                _Concurrency.Task { @MainActor in
                    viewModel.errorMessage = "Invalid callback URL"
                }
                return
            }
            
            // Handle the OAuth callback
            runAsync {
                await viewModel.handleOAuthCallback(url: callbackURL)
            }
        }
        
        session.presentationContextProvider = OAuthPresentationContextProvider.shared
        session.prefersEphemeralWebBrowserSession = false
        
        session.start()
    }
}

// Helper class to provide presentation context for ASWebAuthenticationSession
class OAuthPresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = OAuthPresentationContextProvider()
    
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            fatalError("No window available")
        }
        return window
    }
}

#Preview {
    AuthView()
}
