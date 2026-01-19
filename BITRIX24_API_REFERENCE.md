# Bitrix24 REST API Reference Guide for JBmarks App

This document provides a comprehensive reference to Bitrix24 REST API endpoints relevant to the JBmarks Android app implementation, based on the official [Bitrix24 API Documentation](https://apidocs.bitrix24.com/).

## Base API Structure

All Bitrix24 REST API calls follow this format:
```
https://<your-portal>.bitrix24.com/rest/<method>.<format>?auth=<access_token>&<parameters>
```

- `<method>`: The API method name (e.g., `tasks.task.list`, `im.message.add`)
- `<format>`: Response format (usually `.json`)
- `auth=<access_token>`: OAuth access token (can also use `Authorization: Bearer <token>` header)
- `<parameters>`: Method-specific query parameters or POST body

## Authentication & OAuth

### OAuth 2.0 Authorization Flow

**1. Authorization Request**
```
GET https://<portal>.bitrix24.com/oauth/authorize/?
  client_id=<CLIENT_ID>&
  response_type=code&
  redirect_uri=<REDIRECT_URI>
```

**2. Token Exchange**
```
POST https://<portal>.bitrix24.com/oauth/token/
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id=<CLIENT_ID>
&client_secret=<CLIENT_SECRET>
&code=<AUTHORIZATION_CODE>
&redirect_uri=<REDIRECT_URI>
```

**3. Token Refresh**
```
POST https://<portal>.bitrix24.com/oauth/token/
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id=<CLIENT_ID>
&client_secret=<CLIENT_SECRET>
&refresh_token=<REFRESH_TOKEN>
```

**Response Format:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "user,task,im,calendar,log",
  "user_id": 123
}
```

**Official Documentation**: [OAuth Settings](https://apidocs.bitrix24.com/settings/oauth/)

## Tasks API

### List Tasks
```
GET /rest/tasks.task.list.json?auth=<token>
POST /rest/tasks.task.list.json?auth=<token>
```

**Parameters:**
- `filter`: Object with filters (e.g., `RESPONSIBLE_ID`, `STATUS`, `CREATED_BY`)
- `order`: Sort order
- `start`: Pagination offset
- `select`: Fields to return

**Example:**
```json
POST /rest/tasks.task.list.json
{
  "filter": {
    "RESPONSIBLE_ID": 123,
    "STATUS": [2, 3, 4, 5]
  },
  "order": {"DEADLINE": "ASC"},
  "select": ["ID", "TITLE", "STATUS", "DEADLINE", "RESPONSIBLE_ID"]
}
```

### Get Task
```
GET /rest/tasks.task.get.json?auth=<token>&taskId=<id>
```

### Create Task
```
POST /rest/tasks.task.add.json?auth=<token>
```

**Body:**
```json
{
  "fields": {
    "TITLE": "Task title",
    "DESCRIPTION": "Task description",
    "RESPONSIBLE_ID": 123,
    "CREATED_BY": 456,
    "DEADLINE": "2026-12-31T23:59:59",
    "PRIORITY": 2,
    "STATUS": 2
  }
}
```

### Update Task
```
POST /rest/tasks.task.update.json?auth=<token>
```

**Body:**
```json
{
  "taskId": 789,
  "fields": {
    "STATUS": 5,
    "TITLE": "Updated title"
  }
}
```

### Delete Task
```
POST /rest/tasks.task.delete.json?auth=<token>
```

**Body:**
```json
{
  "taskId": 789
}
```

**Official Documentation**: [Tasks API Reference](https://apidocs.bitrix24.com/api-reference/tasks/)

## Chat / Instant Messaging API

### Get Recent Chats
```
GET /rest/im.recent.get.json?auth=<token>
POST /rest/im.recent.get.json?auth=<token>
```

**Parameters:**
- `LAST_MESSAGE_ID`: Pagination (get chats after this message ID)

### Send Message
```
POST /rest/im.message.add.json?auth=<token>
```

**Body:**
```json
{
  "DIALOG_ID": "chat123",
  "MESSAGE": "Hello, this is a message",
  "SYSTEM": "N"
}
```

**Note**: `DIALOG_ID` can be a chat ID or user ID for direct messages.

### Create Chat
```
POST /rest/im.chat.add.json?auth=<token>
```

**Body:**
```json
{
  "TITLE": "Group Chat Title",
  "TYPE": "OPEN",
  "USERS": [123, 456, 789]
}
```

### Get Chat Messages
```
GET /rest/im.dialog.messages.get.json?auth=<token>&DIALOG_ID=<id>
```

### Get Chat Info
```
GET /rest/im.chat.get.json?auth=<token>&CHAT_ID=<id>
```

**Official Documentation**: 
- [Chats API Reference](https://apidocs.bitrix24.com/api-reference/chats/)
- [Messages API](https://apidocs.bitrix24.com/api-reference/chats/messages/)

## Calendar API

### Get Calendar Events
```
GET /rest/calendar.event.get.json?auth=<token>
POST /rest/calendar.event.get.json?auth=<token>
```

**Parameters:**
- `filter`: Date range filters (e.g., `>FROM`, `<FROM`, `>TO`, `<TO`)
- `ownerId`: User ID for calendar owner
- `type`: Calendar type (`user`, `company_calendar`, etc.)

**Example:**
```json
POST /rest/calendar.event.get.json
{
  "filter": {
    ">FROM": "2026-01-01T00:00:00",
    "<FROM": "2026-02-01T00:00:00"
  },
  "ownerId": 123
}
```

### Create Event
```
POST /rest/calendar.event.add.json?auth=<token>
```

**Body:**
```json
{
  "type": "user",
  "ownerId": 123,
  "name": "Meeting Title",
  "description": "Meeting description",
  "from": "2026-01-15T10:00:00",
  "to": "2026-01-15T11:00:00",
  "timezone_from": "UTC",
  "timezone_to": "UTC",
  "attendees": [456, 789],
  "location": "Conference Room A"
}
```

### Update Event
```
POST /rest/calendar.event.update.json?auth=<token>
```

**Body:**
```json
{
  "id": 123,
  "fields": {
    "name": "Updated Meeting Title",
    "from": "2026-01-15T11:00:00",
    "to": "2026-01-15T12:00:00"
  }
}
```

### Delete Event
```
POST /rest/calendar.event.delete.json?auth=<token>
```

**Body:**
```json
{
  "id": 123
}
```

**Official Documentation**: [Calendar API Reference](https://apidocs.bitrix24.com/api-reference/calendar/)

## Activity Feed / Log API

### Get Feed Posts
```
GET /rest/log.blogpost.get.json?auth=<token>
POST /rest/log.blogpost.get.json?auth=<token>
```

**Parameters:**
- `filter`: Filters (e.g., `>ID`, `<ID` for pagination)
- `order`: Sort order
- `start`: Pagination offset

### Create Feed Post
```
POST /rest/log.blogpost.add.json?auth=<token>
```

**Body:**
```json
{
  "POST_TITLE": "Post Title",
  "POST_MESSAGE": "Post content",
  "DEST": ["U123", "SG456"],
  "FILES": []
}
```

**Note**: `DEST` can contain user IDs (`U123`) or group IDs (`SG456`).

### Add Comment
```
POST /rest/log.blogcomment.add.json?auth=<token>
```

**Body:**
```json
{
  "POST_ID": 123,
  "POST_TEXT": "Comment text",
  "UF_BLOG_COMMENT_FILES": []
}
```

### Update Post
```
POST /rest/log.blogpost.update.json?auth=<token>
```

### Delete Post
```
POST /rest/log.blogpost.delete.json?auth=<token>
```

### Share Post
```
POST /rest/log.blogpost.share.json?auth=<token>
```

**Body:**
```json
{
  "POST_ID": 123,
  "DEST": ["U456", "SG789"]
}
```

**Official Documentation**: [Log API Reference](https://apidocs.bitrix24.com/api-reference/log/)

## Users / Employee Directory API

### Get Current User
```
GET /rest/user.current.json?auth=<token>
```

### Get User
```
GET /rest/user.get.json?auth=<token>&ID=<user_id>
```

### Search Users
```
GET /rest/user.search.json?auth=<token>
POST /rest/user.search.json?auth=<token>
```

**Parameters:**
- `filter`: Search filters (e.g., `NAME`, `LAST_NAME`, `EMAIL`)
- `start`: Pagination offset

**Example:**
```json
POST /rest/user.search.json
{
  "filter": {
    "NAME": "John",
    "ACTIVE": true
  }
}
```

### Get User List
```
GET /rest/user.get.json?auth=<token>
POST /rest/user.get.json?auth=<token>
```

**Official Documentation**: [Users API Reference](https://apidocs.bitrix24.com/api-reference/users/)

## Notifications API

### Get Notifications
```
GET /rest/im.notify.get.json?auth=<token>
POST /rest/im.notify.get.json?auth=<token>
```

### Mark Notification as Read
```
POST /rest/im.notify.read.json?auth=<token>
```

**Body:**
```json
{
  "ID": 123,
  "ONLY_CURRENT": "Y"
}
```

**Note**: If `ONLY_CURRENT` is "Y", marks all current notifications as read.

### Get User Counters
```
GET /rest/user.counter.current.json?auth=<token>
```

Returns unread counts for messages, notifications, tasks, etc.

**Official Documentation**: 
- [Notifications API Reference](https://apidocs.bitrix24.com/api-reference/chats/notifications/)

## Batch Requests

Bitrix24 supports batch requests to execute multiple methods in one call:

```
POST /rest/batch.json?auth=<token>
```

**Body:**
```json
{
  "cmd": {
    "tasks": "tasks.task.list",
    "chats": "im.recent.get",
    "calendar": "calendar.event.get"
  }
}
```

**Official Documentation**: [Batch Requests](https://apidocs.bitrix24.com/rest/)

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Invalid or expired access token (trigger refresh)
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Bitrix24 server error

### Error Response Format
```json
{
  "error": "ERROR_CODE",
  "error_description": "Human-readable error message"
}
```

### Token Expiry Handling

When receiving a `401 Unauthorized` response:
1. Use refresh token to get new access token
2. Retry the original request with new token
3. If refresh fails, redirect to login

## Rate Limits

Bitrix24 API has rate limits:
- Check rate limit headers in responses
- Implement exponential backoff for retries
- Consider caching frequently accessed data

**Official Documentation**: [Rate Limits](https://apidocs.bitrix24.com/rest/)

## Best Practices

1. **Token Management**
   - Store tokens securely (use `EncryptedSharedPreferences`)
   - Refresh tokens proactively before expiry
   - Handle token refresh automatically via interceptor

2. **Pagination**
   - Always implement pagination for list endpoints
   - Use `start` parameter and `next` from response
   - Load more data on scroll (infinite scroll)

3. **Error Handling**
   - Handle network errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging

4. **Offline Support**
   - Cache data locally (Room/SQLite)
   - Queue write operations when offline
   - Sync when connection restored

5. **Performance**
   - Use batch requests when possible
   - Implement proper caching
   - Avoid unnecessary API calls

## Additional Resources

- **Official API Documentation**: [https://apidocs.bitrix24.com/](https://apidocs.bitrix24.com/)
- **Developer Helpdesk**: [https://helpdesk.bitrix24.com/](https://helpdesk.bitrix24.com/)
- **REST API Overview**: [https://helpdesk.bitrix24.com/courses/index.php?COURSE_ID=268&LESSON_ID=25796](https://helpdesk.bitrix24.com/courses/index.php?COURSE_ID=268&LESSON_ID=25796)
- **Setting Up REST API**: [https://apidocs.bitrix24.com/settings/](https://apidocs.bitrix24.com/settings/)

## Implementation Checklist

Use this checklist when implementing each module:

### Tasks Module
- [ ] `tasks.task.list` - List tasks with filters
- [ ] `tasks.task.get` - Get task details
- [ ] `tasks.task.add` - Create new task
- [ ] `tasks.task.update` - Update task status/fields
- [ ] `tasks.task.delete` - Delete task

### Chat Module
- [ ] `im.recent.get` - Get recent conversations
- [ ] `im.message.add` - Send message
- [ ] `im.dialog.messages.get` - Get message history
- [ ] `im.chat.add` - Create group chat
- [ ] `im.chat.get` - Get chat info

### Calendar Module
- [ ] `calendar.event.get` - List events with date filters
- [ ] `calendar.event.add` - Create event
- [ ] `calendar.event.update` - Update event
- [ ] `calendar.event.delete` - Delete event

### Activity Feed Module
- [ ] `log.blogpost.get` - Get feed posts
- [ ] `log.blogpost.add` - Create post
- [ ] `log.blogcomment.add` - Add comment
- [ ] `log.blogpost.share` - Share post

### User Directory Module
- [ ] `user.get` - Get user list
- [ ] `user.search` - Search users
- [ ] `user.current` - Get current user info

### Notifications Module
- [ ] `im.notify.get` - Get notifications
- [ ] `im.notify.read` - Mark as read
- [ ] `user.counter.current` - Get unread counts
