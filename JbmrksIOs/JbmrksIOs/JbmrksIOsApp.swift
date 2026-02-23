//
//  JbmrksIOsApp.swift
//  JbmrksIOs
//

import SwiftUI

@main
struct JbmrksIOsApp: App {
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
