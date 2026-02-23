//
//  TokenStorage.swift
//  JbmrksIOs
//
//  Native Swift TokenStorage protocol (temporary)
//

import Foundation

protocol TokenStorage {
    nonisolated func saveAccessToken(token: String)
    nonisolated func getAccessToken() -> String?
    
    nonisolated func saveRefreshToken(token: String)
    nonisolated func getRefreshToken() -> String?
    
    nonisolated func savePortalUrl(url: String)
    nonisolated func getPortalUrl() -> String?
    
    nonisolated func saveTokenExpiry(expiresIn: Int)
    nonisolated func getTokenExpiry() -> Int64?
    
    nonisolated func isTokenExpired() -> Bool
    
    nonisolated func clear()
}
