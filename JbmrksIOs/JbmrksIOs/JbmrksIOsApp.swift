//
//  JbmrksIOsApp.swift
//  JbmrksIOs
//

import SwiftUI
import UserNotifications

@main
struct JbmrksIOsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    // Handle OAuth callback deep link
                    // This will be handled by AuthView's onOpenURL as well,
                    // but we keep this as a fallback
                    if url.scheme == "jbmarks" && url.host == "oauth_redirect" {
                        // The AuthView will handle this via its own onOpenURL
                        print("Received OAuth callback: \(url)")
                    }
                }
        }
    }
}

/// AppDelegate for handling APNs and notifications
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = self
        
        // Request notification permissions on app launch
        _Concurrency.Task { @MainActor in
            await PushNotificationService.shared.requestAuthorization()
        }
        
        return true
    }
    
    /// Handle device token registration from APNs
    func application(_ application: UIApplication, 
                    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        _Concurrency.Task { @MainActor in
            PushNotificationService.shared.registerDeviceToken(deviceToken)
        }
    }
    
    /// Handle device token registration failure
    func application(_ application: UIApplication, 
                    didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    /// Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                               willPresent notification: UNNotification,
                               withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    /// Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                               didReceive response: UNNotificationResponse,
                               withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        
        // Handle deep linking based on notification type
        handleNotificationTap(userInfo)
        
        completionHandler()
    }
    
    /// Handle notification tap and navigate to appropriate screen
    private func handleNotificationTap(_ userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else {
            print("⚠️ Notification missing type")
            return
        }
        
        print("📱 Handling notification tap - type: \(type)")
        
        // Post notification for navigation handling
        switch type {
        case "TASK":
            if let taskId = userInfo["task_id"] as? String {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToTask"),
                    object: nil,
                    userInfo: ["taskId": taskId]
                )
            }
        case "CHAT":
            if let dialogId = userInfo["dialog_id"] as? String,
               let chatName = userInfo["chat_name"] as? String {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToChat"),
                    object: nil,
                    userInfo: ["dialogId": dialogId, "chatName": chatName]
                )
            }
        case "FEED":
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToFeed"),
                object: nil
            )
        default:
            // Navigate to dashboard for general notifications
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToDashboard"),
                object: nil
            )
        }
    }
}
