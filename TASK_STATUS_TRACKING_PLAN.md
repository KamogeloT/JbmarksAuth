# Task Status Tracking & Stage Management Implementation Plan

## 📊 Current Status

### ✅ What's Already Done

#### 1. Status System (Complete)
- ✅ **TaskStatus Enum** - All statuses defined:
  - `NEW` ("2") - New tasks
  - `IN_PROGRESS` ("3") - Tasks in progress
  - `SUPPOSEDLY_COMPLETED` ("4") - Awaiting approval
  - `COMPLETED` ("5") - Completed tasks
  - `DEFERRED` ("6") - Deferred tasks

#### 2. Status Display (Complete)
- ✅ **Status Badges** - Color-coded status chips in task list
- ✅ **Status Filter** - Filter tasks by status
- ✅ **Status in Detail View** - Status shown in TaskDetailScreen

#### 3. Status Actions (Complete)
- ✅ **Status Change Buttons** - In TaskDetailScreen:
  - Start Task (NEW → IN_PROGRESS)
  - Complete Task (IN_PROGRESS → COMPLETED)
  - Defer Task (IN_PROGRESS → DEFERRED)
  - Reopen Task (COMPLETED → NEW)

---

## ❌ What Needs Enhancement

### Issue 1: Status Not Clearly Visible in List
**Current:** Status shown as small badge
**Needed:** More prominent status display, maybe grouped by status

### Issue 2: Can't Change Status from List View
**Current:** Must open task detail to change status
**Needed:** Quick status change from task list (swipe actions or dropdown)

### Issue 3: No Visual Status Workflow
**Current:** Linear list view
**Needed:** Option to view tasks grouped by status (like Kanban board)

### Issue 4: Status Transitions Not Intuitive
**Current:** Only specific buttons for each status
**Needed:** Dropdown menu to select any valid status transition

---

## 🎯 Implementation Plan

### Phase 1: Enhanced Status Display in Task List

#### 1.1 Make Status More Prominent
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TasksScreen.kt`

**Changes:**
- Make status badge larger and more visible
- Add status icon next to task title
- Show status as first element in task card
- Add status color bar on left edge of card

**Status:** ❌ Not Enhanced

---

#### 1.2 Add Quick Status Change to Task Items
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TasksScreen.kt`

**Changes:**
- Add dropdown menu to each task item
- Show available status transitions
- Allow quick status change without opening detail screen
- Add swipe actions for common transitions (swipe right to complete, etc.)

**Status:** ❌ Not Implemented

---

### Phase 2: Status Dropdown Menu

#### 2.1 Create Status Change Dialog
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/StatusChangeDialog.kt` (NEW)

**What to create:**
```kotlin
@Composable
fun StatusChangeDialog(
    currentStatus: TaskStatus,
    onStatusSelected: (TaskStatus) -> Unit,
    onDismiss: () -> Unit
)
```

**Features:**
- Show current status
- List all available status transitions
- Show status descriptions
- Allow selecting new status
- Confirm before changing

**Status:** ❌ Not Created

---

#### 2.2 Add Status Change to ViewModel
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TasksViewModel.kt`

**What to add:**
```kotlin
fun changeTaskStatus(taskId: String, newStatus: TaskStatus) {
    viewModelScope.launch {
        when (newStatus) {
            TaskStatus.IN_PROGRESS -> repository.startTask(taskId)
            TaskStatus.COMPLETED -> repository.completeTask(taskId)
            TaskStatus.DEFERRED -> repository.deferTask(taskId)
            TaskStatus.NEW -> repository.renewTask(taskId)
            else -> { /* Handle other statuses */ }
        }
        .onSuccess {
            loadTasks() // Refresh list
        }
    }
}
```

**Status:** ❌ Not Implemented

---

### Phase 3: Grouped View by Status (Optional Kanban)

#### 3.1 Add View Toggle
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TasksScreen.kt`

**Changes:**
- Add toggle button (List View / Status View)
- When Status View selected, group tasks by status
- Show status columns/sections

**Status:** ❌ Not Implemented

---

#### 3.2 Create Status Grouped View
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TasksByStatusView.kt` (NEW)

**What to create:**
```kotlin
@Composable
fun TasksByStatusView(
    tasks: List<Task>,
    onTaskClick: (String) -> Unit,
    onStatusChange: (String, TaskStatus) -> Unit
)
```

**Features:**
- Group tasks by status
- Show each status as a section/column
- Display task count per status
- Allow drag-and-drop between statuses (future)
- Show empty state for each status

**Status:** ❌ Not Created

---

### Phase 4: Enhanced Task Item with Status Actions

#### 4.1 Update TaskItem Component
**File:** `app/src/main/java/com/example/jbmarks/tasks/ui/TasksScreen.kt`

**Changes:**
- Add three-dot menu button to each task
- Show status change options in menu
- Add visual status indicator (colored bar or icon)
- Make status clickable to open status change dialog

**Status:** ❌ Not Enhanced

---

## 📋 Implementation Checklist

### Phase 1: Enhanced Display
- [ ] Make status badge more prominent in TaskItem
- [ ] Add status icon next to task title
- [ ] Add colored status bar on card edge
- [ ] Improve status color coding

### Phase 2: Quick Status Change
- [ ] Create StatusChangeDialog component
- [ ] Add status change method to TasksViewModel
- [ ] Add menu button to TaskItem
- [ ] Connect menu to status change dialog
- [ ] Add swipe actions for status change (optional)

### Phase 3: Grouped View (Optional)
- [ ] Add view toggle (List/Status)
- [ ] Create TasksByStatusView component
- [ ] Group tasks by status
- [ ] Display status sections/columns
- [ ] Add task count per status

### Phase 4: Polish
- [ ] Add status change animations
- [ ] Show loading state during status change
- [ ] Add success/error feedback
- [ ] Update task list after status change
- [ ] Handle edge cases (permissions, etc.)

---

## 🎨 UI/UX Improvements

### Task List Item Enhancement
```
┌─────────────────────────────────────┐
│ [🟦] Task Title              [⋮]   │  ← Status color bar + menu
│      Description text...            │
│      👤 Assigned to: John           │
│      📅 Due: Jan 15, 2024          │
│      [New] [High Priority]         │  ← Status badge
└─────────────────────────────────────┘
```

### Status Change Menu
```
┌─────────────────────────────┐
│ Change Status               │
├─────────────────────────────┤
│ Current: In Progress        │
├─────────────────────────────┤
│ → Complete                  │
│ → Defer                     │
│ → Reopen (New)              │
└─────────────────────────────┘
```

### Grouped View (Optional)
```
┌──────────┬──────────┬──────────┬──────────┐
│   New    │ In Prog  │Completed │ Deferred │
│   (3)    │   (5)    │   (2)    │   (1)    │
├──────────┼──────────┼──────────┼──────────┤
│ Task 1   │ Task 4   │ Task 7   │ Task 9   │
│ Task 2   │ Task 5   │ Task 8   │          │
│ Task 3   │ Task 6   │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 🔧 Technical Details

### Status Transitions (Valid Changes)
- **NEW** → IN_PROGRESS (Start)
- **IN_PROGRESS** → COMPLETED (Complete)
- **IN_PROGRESS** → DEFERRED (Defer)
- **COMPLETED** → NEW (Reopen)
- **DEFERRED** → IN_PROGRESS (Resume)

### Repository Methods Available
- ✅ `repository.startTask(taskId)` - NEW → IN_PROGRESS
- ✅ `repository.completeTask(taskId)` - IN_PROGRESS → COMPLETED
- ✅ `repository.deferTask(taskId)` - IN_PROGRESS → DEFERRED
- ✅ `repository.renewTask(taskId)` - COMPLETED → NEW

### ViewModel Updates Needed
- Add `changeTaskStatus(taskId, newStatus)` method
- Handle status change callbacks
- Refresh task list after status change
- Update UI state optimistically

---

## 📝 Files to Create/Modify

### New Files:
1. `app/src/main/java/com/example/jbmarks/tasks/ui/StatusChangeDialog.kt`
2. `app/src/main/java/com/example/jbmarks/tasks/ui/TasksByStatusView.kt` (Optional)

### Files to Modify:
1. `app/src/main/java/com/example/jbmarks/tasks/ui/TasksScreen.kt`
   - Enhance TaskItem with status display
   - Add menu button and status change
   - Add view toggle (if implementing grouped view)

2. `app/src/main/java/com/example/jbmarks/tasks/ui/TasksViewModel.kt`
   - Add `changeTaskStatus()` method
   - Handle status change logic

3. `app/src/main/java/com/example/jbmarks/tasks/ui/TaskItem.kt` (if separate file)
   - Add status menu
   - Enhance status display

---

## ✅ Summary

**What's Done:**
- ✅ Status enum and system
- ✅ Status display in list
- ✅ Status change in detail view
- ✅ Status filtering

**What Needs Enhancement:**
- ❌ More prominent status display
- ❌ Quick status change from list
- ❌ Status change dialog
- ❌ Grouped view by status (optional)

**Priority:**
1. **High:** Enhanced status display + Quick status change
2. **Medium:** Status change dialog
3. **Low:** Grouped view (Kanban-style)

---

## 🚀 Quick Start

**Minimum Viable Enhancement:**
1. Make status more visible in task list
2. Add menu button to each task item
3. Create status change dialog
4. Add status change method to ViewModel
5. Connect everything together

This will give users the ability to:
- ✅ See task status clearly
- ✅ Change status from list view
- ✅ Understand status workflow

Ready to implement? Start with Phase 1 (Enhanced Display) and Phase 2 (Quick Status Change).
