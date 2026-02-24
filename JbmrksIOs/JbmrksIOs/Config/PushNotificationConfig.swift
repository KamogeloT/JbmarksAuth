//
//  PushNotificationConfig.swift
//  JbmrksIOs
//
//  Configuration for push notifications
//

import Foundation

struct PushNotificationConfig {
    // Backend endpoint URLs for push notification token registration
    // Use Railway or Azure backend - update when backend is ready
    static let backendRegisterTokenUrl = "https://jbmarksauth-production.up.railway.app/api/push/register-token"
    
    // Alternative backend URL (Azure BFF API)
    static let bffApiRegisterTokenUrl = "https://jbmarks-bff-api.azurewebsites.net/api/push/register-token"
    
    // APNs Key Information
    static let apnsKeyId = "KGVWC4F2KA"
    static let apnsKeyPath = "JbmrksIOs/certs/AuthKey_KGVWC4F2KA.p8"
    // Team ID - needs to be provided from Apple Developer account
    // static let teamId = "YOUR_TEAM_ID"
    
    // Notification types mapping
    enum NotificationType: String {
        case task = "TASK"
        case chat = "CHAT"
        case feed = "FEED"
        case general = "GENERAL"
    }
    
    // Priority levels
    enum Priority: String {
        case high = "HIGH"
        case normal = "NORMAL"
        case low = "LOW"
    }
    
    /**
     * Get backend URL for token registration
     * Uses Railway as primary, falls back to Azure BFF API
     */
    static func getBackendRegisterTokenUrl() -> String {
        return backendRegisterTokenUrl
    }
}
