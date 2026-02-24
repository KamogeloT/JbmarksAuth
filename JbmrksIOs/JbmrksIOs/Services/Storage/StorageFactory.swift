//
//  StorageFactory.swift
//  JbmrksIOs
//
//  Factory for creating TokenStorage instance
//

import Foundation

/// Factory class for creating platform-specific storage implementations
nonisolated class StorageFactory {
    nonisolated static let shared = StorageFactory()
    
    private var _tokenStorage: TokenStorage?
    
    /// Get or create TokenStorage instance
    var tokenStorage: TokenStorage {
        if let storage = _tokenStorage {
            return storage
        }
        let storage = IOSTokenStorage()
        _tokenStorage = storage
        return storage
    }
    
    private init() {}
}
