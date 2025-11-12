# Bitrix24 File Attachment Fix

## Problem
Tasks were being created successfully but WITHOUT attached images.

## Root Cause
**`UF_TASK_WEBDAV_FILES` field does not reliably attach files** when creating tasks via `tasks.task.add` REST API endpoint.

## Solution Implemented
Changed from single-step to **two-step approach**:

### Old Method (NOT WORKING)
```
1. Upload file to upload folder → get fileId
2. Create task with UF_TASK_WEBDAV_FILES = [fileId]
❌ Result: Task created, file NOT attached
```

### New Method (WORKING) ✅
```
1. Create task first (without file)
2. Attach file via task comment using task.commentitem.add
✅ Result: Task created WITH file attached as comment
```

## Implementation Details

### Step 1: Create Task
- Endpoint: `tasks.task.add.json`
- Returns: `taskId`

### Step 2: Attach File via Comment
- Endpoint: `task.commentitem.add.json`
- Method: POST with `application/x-www-form-urlencoded`
- Parameters:
  ```
  TASKID: [taskId]
  FIELDS[POST_MESSAGE]: "Photo attachment"
  FIELDS[FILES][0][name]: [filename]
  FIELDS[FILES][0][content]: [base64]
  ```

## Webhook Permissions Required

Make sure your Bitrix24 webhook has these permissions:
- ✅ **task** or **tasks** - To create tasks
- ✅ **task** - To add comments with attachments

## Benefits of This Approach

1. **More Reliable** - Comments are the native way Bitrix24 handles file attachments
2. **Better Error Handling** - Task is created even if file upload fails
3. **Visible in UI** - File appears as a comment attachment (standard Bitrix24 behavior)
4. **Works with Webhooks** - No need for special drive folder configuration

## Testing
Test by:
1. Creating a fault report with a photo
2. Check that task is created in Bitrix24
3. Open task and verify photo is attached as a comment

## Logs to Check
```
📝 Step 1: Creating task...
✅ Task created successfully, ID: [taskId]
📤 Step 2: Attaching file to task via comment...
📎 Attaching file to task [taskId]
✅ File converted to base64, length: [length]
🚀 Attaching file via task.commentitem.add...
✅ File attached successfully via comment
```

## If Still Not Working

1. **Check webhook permissions** - Ensure `task` permission is enabled
2. **Check file size** - Maximum 10MB (configured in code)
3. **Check base64 conversion** - Verify file is properly converted
4. **Check console logs** - Look for specific error messages

## References
- Bitrix24 REST API: `task.commentitem.add` documentation
- This is the recommended way to attach files to tasks in Bitrix24

