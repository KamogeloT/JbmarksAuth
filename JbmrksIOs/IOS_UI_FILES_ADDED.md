# iOS UI Structure – Files to Add in Xcode

Add these new Swift files to the **JbmrksIOs** target in Xcode (right‑click **JbmrksIOs** → **Add Files to "JbmrksIOs"…**).

## New files

### Services
- **`JbmrksIOs/Services/RepositoryFactory.swift`** – Builds `TasksRepository` and `AuthRepository` with the current token.

### ViewModels
- **`JbmrksIOs/ViewModels/AuthViewModel.swift`** – Auth state and logout.
- **`JbmrksIOs/ViewModels/TasksViewModel.swift`** – Loads tasks from the shared repository.

### Views
- **`JbmrksIOs/Views/AuthView.swift`** – Sign‑in prompt when not authenticated.
- **`JbmrksIOs/Views/TasksView.swift`** – Task list and `TaskRowView`.

## Modified files (already in the project)

- **`ContentView.swift`** – Uses `AuthViewModel`, shows `AuthView` or main content (tasks + logout).
- **`JbmrksIOsApp.swift`** – SwiftData removed; app now launches `ContentView()` only.

## Flow

1. **ContentView** checks auth via **AuthViewModel**.
2. If not authenticated → **AuthView** (sign‑in prompt).
3. If authenticated → **TasksView** with a “Log out” toolbar button.
4. **TasksView** uses **TasksViewModel**, which uses **RepositoryFactory** to get **TasksRepository** and load tasks from the shared module.

## Build notes

- **RepositoryFactory** calls `BitrixApiClientKt.createBitrixApiClient()`. If the shared framework exposes that under a different name (e.g. another `*Kt` class), update the call.
- **Kotlin `Result`** in **TasksViewModel** uses `getOrNull()` and `exceptionOrNull()`. If the framework exports `Result` differently, adjust unwrapping there.
- **TaskStatus** in **TaskRowView** uses `.new`, `.inProgress`, `.supposedlyCompleted`, `.completed`, `.deferred`. If the generated Swift enum uses different case names (e.g. `.NEW`), update the switch.

## Summary

| Path | Purpose |
|------|--------|
| `Services/RepositoryFactory.swift` | Create KMM repositories with current token |
| `ViewModels/AuthViewModel.swift` | Auth state, check auth, logout |
| `ViewModels/TasksViewModel.swift` | Load tasks, hold list and error state |
| `Views/AuthView.swift` | Login UI when not authenticated |
| `Views/TasksView.swift` | Task list + task row UI |
