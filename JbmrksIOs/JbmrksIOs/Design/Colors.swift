//
//  Colors.swift
//  JbmrksIOs
//
//  App color scheme matching Android design
//

import SwiftUI

extension Color {
    // Primary colors
    static let primaryBackground = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    
    // Status colors
    static let statusNew = Color.blue
    static let statusInProgress = Color.orange
    static let statusCompleted = Color.green
    static let statusDeferred = Color.gray
    
    // Priority colors
    static let priorityHigh = Color.red
    static let priorityNormal = Color.blue
    static let priorityLow = Color.gray
    
    // Card colors
    static let cardBackground = Color(.systemBackground)
    static let cardShadow = Color.black.opacity(0.1)
}
