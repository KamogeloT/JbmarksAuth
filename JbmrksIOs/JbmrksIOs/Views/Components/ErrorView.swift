//
//  ErrorView.swift
//  JbmrksIOs
//
//  Reusable error view component
//

import SwiftUI

struct ErrorStateView: View {
    let errorMessage: String
    let onRetry: (() -> Void)?
    
    init(errorMessage: String, onRetry: (() -> Void)? = nil) {
        self.errorMessage = errorMessage
        self.onRetry = onRetry
    }
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.orange)
            
            Text("Error")
                .font(.title2)
                .fontWeight(.bold)
            
            Text(errorMessage)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            if let onRetry = onRetry {
                Button("Retry", action: onRetry)
                    .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}
