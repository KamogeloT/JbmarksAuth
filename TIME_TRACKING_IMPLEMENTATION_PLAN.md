# Time Tracking Implementation Plan

## 📊 Current Status

### ✅ What's Already Done

#### 1. API Layer (Complete)
- ✅ **BitrixApi.kt** - All API endpoints defined:
  - `addElapsedTime()` - Add time entry
  - `getElapsedTimeEntries()` - Get all time entries for a task
  - `updateElapsedTime()` - Update existing time entry

#### 2. Data Models (Complete)
- ✅ **ElapsedTimeItem.kt** - Data Transfer Object (DTO):
  - `ElapsedTimeItem` - Time entry data model
  - `AddElapsedTimeRequest` - Request for adding time
  - `UpdateElapsedTimeRequest` - Request for updating time
  - `ElapsedTimeResponse` - API response wrapper
  - `ElapsedTimeResult` - Response result

---

## ❌ What Needs to Be Done

### Phase 1: Domain Layer (Foundation)

#### 1.1 Create Domain Model
**File:** `app/src/main/java/com/example/jbmarks/tasks/domain/ElapsedTimeItem.kt`

**What to create:**
```kotlin
data class ElapsedTimeItem(
    val id: String,
    val taskId: String,
    val userId: String,
    val userName: String?, // Will be fetched from user API
    val seconds: Long, // Total time in seconds
    val comment: String?,
    val createdDate: String
) {
    // Helper methods:
    fun getFormattedTime(): String // "2h 30m" or "45m" format
    fun getHours(): Double
    fun getMinutes(): Int
}
```

**Status:** ❌ Not Created

---

### Phase 2: Repository Layer (Data Access)

#### 2.1 Add Repository Methods
**File:** `app/src/main/java/com/example/jbmarks/tasks/data/TasksRepository.kt`

**Methods to add:**

1. **Get Time Entries**
```kotlin
suspend fun getElapsedTimeEntries(taskId: String): Result<List<DomainElapsedTimeItem>>
```
- Call `api.getElapsedTimeEntries()`
- Parse response (may be Map<String, List<ElapsedTimeItem>>)
- Map to domain models
- Fetch user names for each entry
- Return sorted list

2. **Add Time Entry**
```kotlin
suspend fun addElapsedTime(
    taskId: String,
    seconds: Long,
    comment: String? = null
): Result<DomainElapsedTimeItem>
```
- Create `AddElapsedTimeRequest`
- Call `api.addElapsedTime()`
- Fetch newly created entry
- Map to domain model
- Return result

3. **Update Time Entry**
```kotlin
suspend fun updateElapsedTime(
    itemId: String,
    seconds: Long? = null,
    comment: String? = null
): Result<DomainElapsedTimeItem>
```
- Create `UpdateElapsedTimeRequest`
- Call `api.updateElapsedTime()`
- Fetch updated entry
- Map to domain model
- Return result

4. **Helper: Map Data to Domain**
```kotlin
private fun mapElapsedTimeToDomain(
    item: ElapsedTimeItem,
    userName: String? = null
): DomainElapsedTimeItem
```
- Convert data model to domain model
- Handle time conversion (seconds/minutes)
- Include user name if provided

**Status:** ❌ Not Implemented

---

### Phase 3: ViewModel Layer (Business Logic)

#### 3.1 Update TaskDetailViewModel
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TaskDetailViewModel.kt`

**What to add:**

1. **State Management**
```kotlin
private val _elapsedTimeEntries = MutableStateFlow<List<ElapsedTimeItem>>(emptyList())
val elapsedTimeEntries: StateFlow<List<ElapsedTimeItem>> = _elapsedTimeEntries.asStateFlow()

private val _isLoadingTimeEntries = MutableStateFlow(false)
val isLoadingTimeEntries: StateFlow<Boolean> = _isLoadingTimeEntries.asStateFlow()

private val _totalTimeSpent = MutableStateFlow(0L) // Total seconds
val totalTimeSpent: StateFlow<Long> = _totalTimeSpent.asStateFlow()
```

2. **Load Time Entries**
```kotlin
fun loadElapsedTimeEntries() {
    viewModelScope.launch {
        _isLoadingTimeEntries.value = true
        repository.getElapsedTimeEntries(taskId)
            .onSuccess { entries ->
                _elapsedTimeEntries.value = entries
                _totalTimeSpent.value = entries.sumOf { it.seconds }
            }
            .onFailure { error ->
                Log.e(TAG, "Failed to load time entries", error)
            }
        _isLoadingTimeEntries.value = false
    }
}
```

3. **Add Time Entry**
```kotlin
fun addElapsedTime(seconds: Long, comment: String? = null) {
    viewModelScope.launch {
        repository.addElapsedTime(taskId, seconds, comment)
            .onSuccess {
                loadElapsedTimeEntries() // Refresh list
            }
            .onFailure { error ->
                Log.e(TAG, "Failed to add time entry", error)
            }
    }
}
```

4. **Update Time Entry**
```kotlin
fun updateElapsedTime(itemId: String, seconds: Long?, comment: String?) {
    viewModelScope.launch {
        repository.updateElapsedTime(itemId, seconds, comment)
            .onSuccess {
                loadElapsedTimeEntries() // Refresh list
            }
            .onFailure { error ->
                Log.e(TAG, "Failed to update time entry", error)
            }
    }
}
```

**Status:** ❌ Not Implemented

---

### Phase 4: UI Layer (User Interface)

#### 4.1 Create Time Tracking Section Component
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TimeTrackingSection.kt`

**What to create:**

1. **TimeTrackingSection Composable**
```kotlin
@Composable
fun TimeTrackingSection(
    timeEntries: List<ElapsedTimeItem>,
    totalTimeSpent: Long,
    isLoading: Boolean,
    onAddTime: (Long, String?) -> Unit,
    onEditTime: (String, Long?, String?) -> Unit
)
```

**Features:**
- Display total time spent (formatted: "5h 30m")
- List of all time entries
- Add new time entry button/dialog
- Edit existing time entries
- Show user name, date, time, and comment for each entry

2. **TimeEntryItem Composable**
```kotlin
@Composable
fun TimeEntryItem(
    entry: ElapsedTimeItem,
    onEdit: () -> Unit
)
```

3. **AddTimeEntryDialog Composable**
```kotlin
@Composable
fun AddTimeEntryDialog(
    onDismiss: () -> Unit,
    onAdd: (Long, String?) -> Unit
)
```
- Hours input field
- Minutes input field
- Comment text field
- Add button

**Status:** ❌ Not Created

---

#### 4.2 Integrate into TaskDetailScreen
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TaskDetailScreen.kt`

**What to add:**

1. **Add to TaskDetailContent parameters:**
```kotlin
fun TaskDetailContent(
    // ... existing parameters ...
    elapsedTimeEntries: List<ElapsedTimeItem>,
    isLoadingTimeEntries: Boolean,
    totalTimeSpent: Long,
    onAddElapsedTime: (Long, String?) -> Unit,
    onEditElapsedTime: (String, Long?, String?) -> Unit
)
```

2. **Add Time Tracking Section:**
```kotlin
// After File Attachments Section, before Comments Section
Spacer(modifier = Modifier.height(16.dp))
HorizontalDivider()
Spacer(modifier = Modifier.height(16.dp))

TimeTrackingSection(
    timeEntries = elapsedTimeEntries,
    totalTimeSpent = totalTimeSpent,
    isLoading = isLoadingTimeEntries,
    onAddTime = onAddElapsedTime,
    onEditTime = onEditElapsedTime
)
```

3. **Update ViewModel calls:**
```kotlin
// In TaskDetailScreen composable
val elapsedTimeEntries by viewModel.elapsedTimeEntries.collectAsState()
val isLoadingTimeEntries by viewModel.isLoadingTimeEntries.collectAsState()
val totalTimeSpent by viewModel.totalTimeSpent.collectAsState()

// Load time entries when task loads
LaunchedEffect(taskId) {
    viewModel.loadTask()
    viewModel.loadElapsedTimeEntries() // Add this
}
```

**Status:** ❌ Not Integrated

---

## 📋 Implementation Checklist

### Domain Layer
- [ ] Create `ElapsedTimeItem.kt` domain model
- [ ] Add helper methods for time formatting
- [ ] Add time conversion utilities

### Repository Layer
- [ ] Implement `getElapsedTimeEntries()` method
- [ ] Implement `addElapsedTime()` method
- [ ] Implement `updateElapsedTime()` method
- [ ] Add `mapElapsedTimeToDomain()` helper
- [ ] Handle user name fetching for entries
- [ ] Handle API response parsing (Map format)

### ViewModel Layer
- [ ] Add state flows for time entries
- [ ] Add `loadElapsedTimeEntries()` method
- [ ] Add `addElapsedTime()` method
- [ ] Add `updateElapsedTime()` method
- [ ] Calculate total time spent
- [ ] Handle loading states

### UI Layer
- [ ] Create `TimeTrackingSection.kt` component
- [ ] Create `TimeEntryItem.kt` component
- [ ] Create `AddTimeEntryDialog.kt` component
- [ ] Create `EditTimeEntryDialog.kt` component
- [ ] Add time formatting utilities
- [ ] Integrate into `TaskDetailScreen.kt`
- [ ] Add proper styling and Material Design 3 components

### Testing & Polish
- [ ] Test time entry creation
- [ ] Test time entry updates
- [ ] Test time entry display
- [ ] Test time formatting (hours/minutes)
- [ ] Test user name display
- [ ] Test error handling
- [ ] Add loading indicators
- [ ] Add empty state UI

---

## 🎯 Implementation Order

1. **Step 1:** Create domain model (`ElapsedTimeItem.kt`)
2. **Step 2:** Add repository methods (`TasksRepository.kt`)
3. **Step 3:** Update ViewModel (`TaskDetailViewModel.kt`)
4. **Step 4:** Create UI components (`TimeTrackingSection.kt`)
5. **Step 5:** Integrate into TaskDetailScreen
6. **Step 6:** Test and polish

---

## 📝 Notes

### API Response Format
The Bitrix24 API may return time entries in a Map format:
```json
{
  "result": {
    "123": [{...}, {...}],
    "456": [{...}]
  }
}
```
Repository needs to handle this and flatten to a list.

### Time Format
- Store time in seconds (standard)
- Display as "Xh Ym" format (e.g., "2h 30m", "45m")
- Support hours and minutes input

### User Names
- Fetch user information for each time entry's `userId`
- Cache user names to avoid multiple API calls
- Display "User {id}" as fallback if name not available

### Error Handling
- Handle network errors gracefully
- Show error messages to user
- Retry failed operations
- Validate time input (positive numbers)

---

## 🔗 Related Files

### Files to Create:
1. `app/src/main/java/com/example/jbmarks/tasks/domain/ElapsedTimeItem.kt`
2. `app/src/main/java/com/example/jbmarks/tasks/ui/TimeTrackingSection.kt`
3. `app/src/main/java/com/example/jbmarks/tasks/ui/TimeEntryItem.kt`
4. `app/src/main/java/com/example/jbmarks/tasks/ui/AddTimeEntryDialog.kt`

### Files to Modify:
1. `app/src/main/java/com/example/jbmarks/tasks/data/TasksRepository.kt`
2. `app/src/main/java/com/example/jbmarks/tasks/ui/TaskDetailViewModel.kt`
3. `app/src/main/java/com/example/jbmarks/tasks/ui/TaskDetailScreen.kt`

### Files Already Done:
1. ✅ `app/src/main/java/com/example/jbmarks/network/BitrixApi.kt`
2. ✅ `app/src/main/java/com/example/jbmarks/tasks/data/ElapsedTimeItem.kt`

---

## ✅ Summary

**What's Done:**
- ✅ API endpoints defined
- ✅ Data models (DTOs) created

**What Needs to Be Done:**
- ❌ Domain models (1 file)
- ❌ Repository methods (1 file to modify)
- ❌ ViewModel updates (1 file to modify)
- ❌ UI components (3-4 new files)
- ❌ Integration (1 file to modify)

**Estimated Files:**
- **New Files:** 4-5 files
- **Modified Files:** 3 files
- **Total Work:** ~7-8 files

---

Ready to implement? Start with Step 1 (Domain Model) and work through each phase sequentially.
