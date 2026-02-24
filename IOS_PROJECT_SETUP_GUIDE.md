# iOS Project Setup Guide for KMM

## Overview

You should **NOT clone** the project. Instead, create the iOS app **within the same repository** so both Android and iOS apps can use the shared KMM module.

## Project Structure

```
JBMARKS/                          # Same repository
├── shared/                       # ✅ Already created - KMM shared module
├── app/                          # ✅ Android app
└── iosApp/                       # ⏳ Create iOS app here
    └── iosApp.xcodeproj          # Xcode project
    └── iosApp/                   # iOS app source code
```

## Step-by-Step Setup

### Step 1: Create iOS App in Xcode

1. **Open Xcode** (must be installed on macOS)

2. **Create New Project:**
   - File → New → Project
   - Select **iOS** → **App**
   - Click **Next**

3. **Configure Project:**
   - **Product Name:** `iosApp`
   - **Team:** Select your development team (or Personal Team)
   - **Organization Identifier:** `com.example` (or your organization)
   - **Bundle Identifier:** `com.example.jbmarks` (should match Android app)
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Storage:** None (we'll use shared module)
   - **Include Tests:** Yes (optional but recommended)

4. **Choose Location:**
   - Navigate to: `/Users/kamogelotshukudu/projects/JBMARKS/`
   - **IMPORTANT:** Check "Create Git repository" is **UNCHECKED** (repo already exists)
   - Click **Create**

5. **Verify Structure:**
   ```
   JBMARKS/
   ├── shared/          # ✅ KMM module
   ├── app/             # ✅ Android app
   └── iosApp/          # ✅ New iOS app
       ├── iosApp.xcodeproj
       └── iosApp/
           ├── iosAppApp.swift
           └── ContentView.swift
   ```

### Step 2: Build KMM Framework

Before integrating, build the shared module framework:

```bash
cd /Users/kamogelotshukudu/projects/JBMARKS

# Build framework for iOS (choose based on your Mac architecture)
# For Apple Silicon Macs:
./gradlew :shared:linkDebugFrameworkIosArm64

# For Intel Macs:
./gradlew :shared:linkDebugFrameworkIosX64

# For iOS Simulator:
./gradlew :shared:linkDebugFrameworkIosSimulatorArm64
```

This will create the framework at:
```
shared/build/bin/iosArm64/debugFramework/shared.framework
```

### Step 3: Add KMM Framework to Xcode Project

**Option A: Using CocoaPods (Recommended)**

1. **Install CocoaPods** (if not installed):
   ```bash
   sudo gem install cocoapods
   ```

2. **Navigate to iosApp directory:**
   ```bash
   cd /Users/kamogelotshukudu/projects/JBMARKS/iosApp
   ```

3. **Create Podfile:**
   ```bash
   pod init
   ```

4. **Edit Podfile** (`iosApp/Podfile`):
   ```ruby
   platform :ios, '15.0'
   use_frameworks!

   target 'iosApp' do
     # Add local path to shared module
     pod 'shared', :path => '../shared'
   end
   ```

5. **Install pods:**
   ```bash
   pod install
   ```

6. **Open workspace** (not .xcodeproj):
   ```bash
   open iosApp.xcworkspace
   ```

**Option B: Manual Framework Integration**

1. **In Xcode:**
   - Select your project in Navigator
   - Select `iosApp` target
   - Go to **General** tab
   - Scroll to **Frameworks, Libraries, and Embedded Content**
   - Click **+**
   - Click **Add Other...** → **Add Files...**
   - Navigate to: `shared/build/bin/iosArm64/debugFramework/shared.framework`
   - Select the framework
   - Set **Embed** to **Embed & Sign**

2. **Add Framework Search Path:**
   - Go to **Build Settings** tab
   - Search for **Framework Search Paths**
   - Add: `$(SRCROOT)/../shared/build/bin/iosArm64/debugFramework`

### Step 4: Configure Build Settings

1. **Set Minimum iOS Version:**
   - Target → General → Deployment Info
   - Set **iOS Deployment Target** to **15.0** (or higher)

2. **Add Build Script** (to auto-build KMM framework):
   - Target → **Build Phases**
   - Click **+** → **New Run Script Phase**
   - Name: "Build KMM Framework"
   - Script:
   ```bash
   cd "${SRCROOT}/../shared"
   ./gradlew :shared:linkDebugFrameworkIosArm64
   ```
   - Move this phase **before** "Compile Sources"

### Step 5: Create iOS Storage Implementation

Create the iOS storage implementation:

1. **Create directory structure:**
   ```
   iosApp/iosApp/
   ├── Services/
   │   └── Storage/
   │       └── IOSTokenStorage.swift
   ```

2. **Create IOSTokenStorage.swift:**
   ```swift
   import Foundation
   import Security
   import shared

   class IOSTokenStorage: TokenStorage {
       private let service = "com.example.jbmarks"
       
       func saveAccessToken(token: String) async throws {
           try await saveToKeychain(key: "ACCESS_TOKEN", value: token)
       }
       
       func getAccessToken() async throws -> String? {
           return try await getFromKeychain(key: "ACCESS_TOKEN")
       }
       
       func saveRefreshToken(token: String) async throws {
           try await saveToKeychain(key: "REFRESH_TOKEN", value: token)
       }
       
       func getRefreshToken() async throws -> String? {
           return try await getFromKeychain(key: "REFRESH_TOKEN")
       }
       
       func savePortalUrl(url: String) async throws {
           try await saveToKeychain(key: "PORTAL_URL", value: url)
       }
       
       func getPortalUrl() async throws -> String? {
           return try await getFromKeychain(key: "PORTAL_URL")
       }
       
       func saveTokenExpiry(expiresIn: Int32) async throws {
           let expiryTime = Int64(Date().timeIntervalSince1970) + Int64(expiresIn)
           try await saveToKeychain(key: "TOKEN_EXPIRY_TIME", value: String(expiryTime))
       }
       
       func getTokenExpiry() async throws -> Int64? {
           guard let expiryString = try await getFromKeychain(key: "TOKEN_EXPIRY_TIME"),
                 let expiryTime = Int64(expiryString) else {
               return nil
           }
           return expiryTime
       }
       
       func isTokenExpired() async throws -> Bool {
           guard let expiryTime = try await getTokenExpiry() else {
               return true
           }
           let now = Int64(Date().timeIntervalSince1970)
           // Consider expired if expires in less than 5 minutes
           return now >= (expiryTime - (5 * 60))
       }
       
       func clear() async throws {
           try await deleteFromKeychain(key: "ACCESS_TOKEN")
           try await deleteFromKeychain(key: "REFRESH_TOKEN")
           try await deleteFromKeychain(key: "PORTAL_URL")
           try await deleteFromKeychain(key: "TOKEN_EXPIRY_TIME")
       }
       
       // Keychain helper methods
       private func saveToKeychain(key: String, value: String) async throws {
           let data = value.data(using: .utf8)!
           let query: [String: Any] = [
               kSecClass as String: kSecClassGenericPassword,
               kSecAttrService as String: service,
               kSecAttrAccount as String: key,
               kSecValueData as String: data
           ]
           
           // Delete existing item first
           SecItemDelete(query as CFDictionary)
           
           // Add new item
           let status = SecItemAdd(query as CFDictionary, nil)
           guard status == errSecSuccess else {
               throw NSError(domain: "KeychainError", code: Int(status))
           }
       }
       
       private func getFromKeychain(key: String) async throws -> String? {
           let query: [String: Any] = [
               kSecClass as String: kSecClassGenericPassword,
               kSecAttrService as String: service,
               kSecAttrAccount as String: key,
               kSecReturnData as String: true
           ]
           
           var result: AnyObject?
           let status = SecItemCopyMatching(query as CFDictionary, &result)
           
           guard status == errSecSuccess,
                 let data = result as? Data,
                 let value = String(data: data, encoding: .utf8) else {
               return nil
           }
           
           return value
       }
       
       private func deleteFromKeychain(key: String) async throws {
           let query: [String: Any] = [
               kSecClass as String: kSecClassGenericPassword,
               kSecAttrService as String: service,
               kSecAttrAccount as String: key
           ]
           
           SecItemDelete(query as CFDictionary)
       }
   }
   ```

### Step 6: Test Integration

1. **Update iosAppApp.swift:**
   ```swift
   import SwiftUI
   import shared

   @main
   struct iosAppApp: App {
       var body: some Scene {
           WindowGroup {
               ContentView()
           }
       }
   }
   ```

2. **Update ContentView.swift** (temporary test):
   ```swift
   import SwiftUI
   import shared

   struct ContentView: View {
       var body: some View {
           VStack {
               Text("JBmarks iOS App")
                   .font(.title)
               
               Text("KMM Integration Test")
                   .font(.subheadline)
                   .foregroundColor(.gray)
               
               // Test shared domain model
               let taskStatus = TaskStatus.new
               Text("Task Status: \(taskStatus.displayName)")
           }
           .padding()
       }
   }
   ```

3. **Build and Run:**
   - Select a simulator or device
   - Press Cmd+R to build and run
   - Verify the app launches and displays the test content

## Alternative: Using Gradle to Generate Xcode Project

If you prefer, you can use Gradle to help set up the iOS project:

1. **Add KMM plugin configuration** (if not already done)
2. **Generate Xcode project:**
   ```bash
   ./gradlew :shared:generateDummyFramework
   ```

However, **manual Xcode project creation is recommended** for better control and understanding.

## Troubleshooting

### Framework Not Found
- Ensure framework is built: `./gradlew :shared:linkDebugFrameworkIosArm64`
- Check framework search paths in Build Settings
- Verify framework is added to "Frameworks, Libraries, and Embedded Content"

### Import Errors
- Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
- Rebuild framework
- Verify CocoaPods installation if using pods

### Build Errors
- Check iOS deployment target matches (15.0+)
- Verify Kotlin version compatibility
- Check Xcode version (should be recent)

## Next Steps After Setup

1. ✅ iOS project created
2. ✅ KMM framework integrated
3. ⏳ Create iOS storage implementation (see Step 5)
4. ⏳ Create ViewModels
5. ⏳ Build SwiftUI screens
6. ⏳ Implement navigation

## Important Notes

- **Same Repository**: iOS app is in the same repo as Android app
- **Shared Module**: Both apps use the same `shared/` module
- **Independent Builds**: Each platform builds independently but shares code
- **Version Control**: Commit iOS project files to the same repository

## File Locations

- **iOS Project:** `/Users/kamogelotshukudu/projects/JBMARKS/iosApp/`
- **Shared Module:** `/Users/kamogelotshukudu/projects/JBMARKS/shared/`
- **Android App:** `/Users/kamogelotshukudu/projects/JBMARKS/app/`

---

**Summary**: Create the iOS app **in the same repository** using Xcode. The shared KMM module is already built and ready to be integrated. No cloning needed!
