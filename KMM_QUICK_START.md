# KMM Quick Start Guide

## Building the Shared Module

```bash
# Build shared module for all targets
./gradlew :shared:build

# Build for Android only
./gradlew :shared:assembleDebug

# Build for iOS (requires Xcode)
./gradlew :shared:linkDebugFrameworkIosArm64
```

## Using Shared Code in Android

### 1. Add Dependency (Already Done)
```kotlin
// app/build.gradle.kts
dependencies {
    implementation(project(":shared"))
}
```

### 2. Use Domain Models
```kotlin
import com.example.jbmarks.shared.domain.tasks.Task
import com.example.jbmarks.shared.domain.tasks.TaskStatus
import com.example.jbmarks.shared.domain.tasks.TaskPriority

// Use directly in your code
val task = Task(
    id = "123",
    title = "Example Task",
    // ...
)
```

### 3. Use Shared Repositories
```kotlin
import com.example.jbmarks.shared.repository.TasksRepository
import com.example.jbmarks.shared.repository.TasksRepositoryImpl
import com.example.jbmarks.shared.network.BitrixApi
import com.example.jbmarks.shared.network.createBitrixApiClient
import com.example.jbmarks.storage.AndroidTokenStorage

// In your ViewModel or Repository
class TasksViewModel(context: Context) : ViewModel() {
    private val tokenStorage = AndroidTokenStorage(context)
    private val httpClient = createBitrixApiClient()
    
    private val repository: TasksRepository = run {
        val portalUrl = tokenStorage.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
        val accessToken = tokenStorage.getAccessToken() ?: return@run null
        val api = BitrixApi(httpClient, portalUrl, accessToken)
        TasksRepositoryImpl(api, tokenStorage)
    } ?: throw IllegalStateException("Not authenticated")
    
    fun loadTasks() {
        viewModelScope.launch {
            repository.getTasks().onSuccess { tasks ->
                _tasks.value = tasks
            }.onFailure { error ->
                _error.value = error.message
            }
        }
    }
}
```

### 4. Use OAuth Service
```kotlin
import com.example.jbmarks.shared.auth.OAuthService
import com.example.jbmarks.shared.network.createBitrixApiClient
import com.example.jbmarks.storage.AndroidTokenStorage

val httpClient = createBitrixApiClient()
val tokenStorage = AndroidTokenStorage(context)
val oAuthService = OAuthService(httpClient, tokenStorage)

// Build authorization URL
val authUrl = oAuthService.buildAuthorizationUrl(
    portalUrl = "https://your-portal.bitrix24.com",
    clientId = Config.BITRIX_CLIENT_ID,
    redirectUri = Config.BITRIX_REDIRECT_URI_HTTPS,
    scopes = Config.OAUTH_SCOPES
)

// Exchange code for tokens
val result = oAuthService.exchangeCodeForTokens(
    portalUrl = portalUrl,
    clientId = clientId,
    clientSecret = clientSecret,
    code = authorizationCode,
    redirectUri = redirectUri
)
```

## Using Shared Code in iOS (Swift)

### 1. Import Framework
```swift
import shared
```

### 2. Use Domain Models
```swift
// Domain models are automatically available
let task = Task(
    id: "123",
    title: "Example Task",
    // ...
)
```

### 3. Create Storage Implementation
```swift
import Foundation
import Security

class IOSTokenStorage: TokenStorage {
    private let keychain = KeychainHelper()
    
    func saveAccessToken(token: String) async throws {
        try await keychain.save(key: "ACCESS_TOKEN", value: token)
    }
    
    func getAccessToken() async throws -> String? {
        return try await keychain.get(key: "ACCESS_TOKEN")
    }
    
    // Implement other methods...
}
```

### 4. Use Shared Repositories
```swift
class TasksViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var isLoading = false
    
    private let repository: TasksRepository
    
    init() {
        let tokenStorage = IOSTokenStorage()
        let httpClient = BitrixApiClientKt.createBitrixApiClient()
        let portalUrl = tokenStorage.getPortalUrl() ?? "https://your-portal.bitrix24.com"
        let accessToken = tokenStorage.getAccessToken() ?? ""
        
        let api = BitrixApi(
            httpClient: httpClient,
            baseUrl: portalUrl,
            accessToken: accessToken
        )
        
        self.repository = TasksRepositoryImpl(
            api: api,
            tokenStorage: tokenStorage
        )
    }
    
    func loadTasks() {
        isLoading = true
        Task {
            do {
                let result = try await repository.getTasks()
                await MainActor.run {
                    self.tasks = result
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    // Handle error
                }
            }
        }
    }
}
```

## Common Patterns

### Error Handling
```kotlin
// Kotlin (Android)
repository.getTasks()
    .onSuccess { tasks -> /* handle success */ }
    .onFailure { error -> /* handle error */ }

// Swift (iOS)
do {
    let tasks = try await repository.getTasks()
    // handle success
} catch {
    // handle error
}
```

### Coroutines/Async
```kotlin
// Kotlin - Use coroutines
viewModelScope.launch {
    val result = repository.getTasks()
    // Update UI
}

// Swift - Use async/await
Task {
    let result = try await repository.getTasks()
    await MainActor.run {
        // Update UI
    }
}
```

## Troubleshooting

### Build Issues
- Ensure Kotlin version matches in all build files
- Clean and rebuild: `./gradlew clean build`
- Invalidate caches in Android Studio

### Import Issues
- Verify `:shared` module is included in `settings.gradle.kts`
- Sync Gradle files
- Rebuild project

### Runtime Issues
- Check that storage implementations are properly initialized
- Verify tokens are being saved/retrieved correctly
- Check network permissions

## Resources

- Shared module code: `shared/src/commonMain/kotlin/`
- Android storage: `app/src/main/kotlin/storage/AndroidTokenStorage.kt`
- iOS storage: To be created in `iosApp/`
