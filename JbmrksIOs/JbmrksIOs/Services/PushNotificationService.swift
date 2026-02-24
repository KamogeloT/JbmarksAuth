//
//  PushNotificationService.swift
//  JbmrksIOs
//
//  Push notification service for APNs token registration and management
//

import Foundation
import UserNotifications
import UIKit

@MainActor
class PushNotificationService: NSObject {
    static let shared = PushNotificationService()
    
    private var deviceToken: String?
    private let tokenStorage = StorageFactory.shared.tokenStorage
    private let userDefaults = UserDefaults.standard
    
    private let tokenKey = "apns_device_token"
    private let tokenRegisteredKey = "apns_token_registered"
    
    override init() {
        super.init()
    }
    
    /// Request notification permissions from user
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
            
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
                print("✅ Push notification authorization granted")
            } else {
                print("⚠️ Push notification authorization denied")
            }
            
            return granted
        } catch {
            print("❌ Push notification authorization error: \(error)")
            return false
        }
    }
    
    /// Register device token received from APNs
    func registerDeviceToken(_ token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString
        
        print("📱 APNs Device Token received: \(tokenString.prefix(20))...")
        
        // Store token locally
        userDefaults.set(tokenString, forKey: tokenKey)
        
        // Register with backend if authenticated
        _Concurrency.Task {
            await registerTokenWithBackend(tokenString)
        }
    }
    
    /// Register token with backend server
    private func registerTokenWithBackend(_ token: String) async {
        guard let accessToken = tokenStorage.getAccessToken(),
              !accessToken.isEmpty else {
            print("⚠️ Not authenticated, will register token after login")
            return
        }
        
        // Check if token is already registered
        let storedToken = userDefaults.string(forKey: tokenKey)
        let isRegistered = userDefaults.bool(forKey: tokenRegisteredKey)
        
        if storedToken == token && isRegistered {
            print("✅ Token already registered with backend")
            return
        }
        
        let portalUrl = tokenStorage.getPortalUrl() ?? OAuthConfig.defaultPortalUrl
        
        print("📱 Registering APNs token with backend:")
        print("   Portal: \(portalUrl)")
        print("   Token: \(token.prefix(20))...")
        
        // Get current user ID for registration
        var userId: String? = nil
        do {
            let baseUrl = portalUrl.hasSuffix("/") ? portalUrl : "\(portalUrl)/"
            let apiClient = BitrixApiClient(baseUrl: baseUrl, accessToken: accessToken)
            let user = try await apiClient.getCurrentUser()
            userId = user.id
        } catch {
            print("⚠️ Failed to get current user: \(error)")
        }
        
        // Register with backend
        do {
            let backendUrl = PushNotificationConfig.getBackendRegisterTokenUrl()
            let components = URLComponents(string: backendUrl)!
            
            guard let url = components.url else {
                throw APIError.invalidURL
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            
            let body: [String: Any] = [
                "apns_token": token,
                "platform": "ios",
                "portal_url": portalUrl,
                "user_id": userId ?? ""
            ]
            
            request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("⚠️ Backend registration failed: Invalid response")
                return
            }
            
            // Handle different status codes gracefully
            if (200...299).contains(httpResponse.statusCode) {
                // Success - mark as registered
                userDefaults.set(true, forKey: tokenRegisteredKey)
                print("✅ APNs token registered successfully with backend")
            } else if httpResponse.statusCode == 503 {
                // Service unavailable (database not configured) - log but don't fail
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("⚠️ Backend registration skipped (database not configured): \(errorBody)")
                print("   This is non-blocking - app will continue to work normally")
                // Don't mark as registered so we can retry later when DB is available
            } else {
                // Other errors - log but don't block
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("⚠️ Backend registration failed: HTTP \(httpResponse.statusCode). Response: \(errorBody)")
                print("   This is non-blocking - app will continue to work normally")
                // Don't mark as registered so we can retry
            }
            
        } catch {
            // Log error but don't throw - this is non-blocking
            print("⚠️ Failed to register APNs token with backend (non-blocking): \(error.localizedDescription)")
            print("   App will continue to work normally - token registration will retry later")
            // Don't mark as registered so we can retry
        }
    }
    
    /// Check and register token (called after login)
    /// This is non-blocking - failures won't affect authentication
    func checkAndRegisterToken() async {
        do {
            // Request authorization if not already granted
            let authorized = await requestAuthorization()
            
            if authorized {
                // If we have a stored token, try to register it
                if let storedToken = userDefaults.string(forKey: tokenKey) {
                    await registerTokenWithBackend(storedToken)
                } else {
                    // Token will be registered when device token is received
                    print("📱 Waiting for device token from APNs...")
                }
            }
        } catch {
            // Log error but don't throw - this is non-blocking
            print("⚠️ Push notification check failed (non-blocking): \(error.localizedDescription)")
        }
    }
    
    /// Get stored device token (for debugging)
    func getStoredToken() -> String? {
        return userDefaults.string(forKey: tokenKey)
    }
    
    /// Check if token is registered
    func isTokenRegistered() -> Bool {
        return userDefaults.bool(forKey: tokenRegisteredKey)
    }
}
