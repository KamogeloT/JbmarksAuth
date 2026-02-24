//
//  AuthRepository.swift
//  JbmrksIOs
//
//  Native Swift protocol for authentication operations
//

import Foundation

protocol AuthRepository {
    func isAuthenticated() async -> Bool
    func getAccessToken() async -> String?
    func clearAuth() async
}
