# Bitrix24 Activity Feed Research & Implementation Options

## Current Implementation Status

### ✅ What's Currently Implemented (iOS & Android)

1. **Basic Feed Posts** (`log.blogpost.get`)
   - Get all blog posts from activity stream
   - Fields: ID, TITLE, DETAIL_TEXT, AUTHOR_ID, POST_DATE
   - Simple GET request with auth token

2. **Create Feed Post** (`log.blogpost.add`)
   - Post new messages to activity stream
   - Supports: title, message, destinations (users/groups), files

3. **Feed Comments** (`log.blogcomment.add`)
   - Add comments to feed posts
   - Supports file attachments

### ❌ What's NOT Currently Implemented

## Bitrix24 Activity Feed Capabilities (Based on API & Codebase Analysis)

### 1. **Filtering & Pagination** ⚠️ NOT IMPLEMENTED
   - **Filter by date range**: `filter[>LOG_DATE]`, `filter[<LOG_DATE]`
   - **Filter by author**: `filter[AUTHOR_ID]`
   - **Pagination**: `start` parameter for offset
   - **Order**: `order[LOG_DATE]` (ASC/DESC)
   - **Limit results**: `limit` parameter

### 2. **User-Specific Feeds** ⚠️ PARTIALLY IMPLEMENTED (Android only)
   - **Get posts for specific users**: `log.blogpost.getusers`
   - **Get posts for workgroups**: Filter by group IDs
   - **Current status**: Android has this, iOS doesn't

### 3. **Feed Event Types** ⚠️ NOT IMPLEMENTED
   - **Get event types**: `log/events` API
   - **Shows what activities trigger feed updates**:
     - Task creation/updates
     - File uploads
     - Comments
     - Calendar events
     - User mentions
     - etc.
   - **Use case**: Filter feed by activity type

### 4. **Feed Post Details** ⚠️ NOT IMPLEMENTED
   - **Get single post**: `log.blogpost.get` with `POST_ID` parameter
   - **Get post comments**: `log.blogcomment.get`
   - **Get post likes/reactions**: Not in current implementation
   - **Get post attachments**: Files attached to posts

### 5. **Advanced Feed Features** ⚠️ NOT IMPLEMENTED
   - **Update posts**: `log.blogpost.update`
   - **Delete posts**: `log.blogpost.delete`
   - **Like/Unlike posts**: Not available in REST API (UI only)
   - **Share posts**: Not available in REST API
   - **Mentions**: `@username` mentions in posts
   - **Hashtags**: `#hashtag` support

### 6. **Feed Notifications** ⚠️ NOT IMPLEMENTED
   - **Get unread feed count**: Separate notification system
   - **Mark feed as read**: Not in REST API
   - **Feed subscriptions**: Follow specific users/groups

## What the Feed DOES Pull (Based on Bitrix24 API)

### ✅ Included in Feed:
1. **User posts** - Text posts created by users
2. **Task activities** - Task creation, updates, completions (if enabled)
3. **File uploads** - Files shared in activity stream
4. **Comments** - Comments on posts
5. **Calendar events** - Event creation/updates (if enabled)
6. **User mentions** - Posts mentioning users
7. **Group activities** - Posts in workgroups

### ❌ NOT Included in Feed (by default):
1. **Private messages** - Only public activity stream
2. **Deleted posts** - Removed from feed
3. **Archived content** - Not shown in active feed
4. **System notifications** - Separate from activity feed
5. **Email notifications** - Not part of feed
6. **CRM activities** - Separate CRM feed (if enabled)

## Implementation Recommendations

### Priority 1: Essential Features
1. **Pagination** - Load more posts (infinite scroll)
2. **Date filtering** - Show recent posts, filter by date range
3. **Post details** - View single post with all comments
4. **Comments display** - Show comments on posts

### Priority 2: Enhanced Features
5. **User-specific feeds** - Show posts from specific users/groups
6. **Feed event types** - Filter by activity type (tasks, files, etc.)
7. **Post attachments** - Display files/images in posts
8. **Update/Delete posts** - Edit or remove own posts

### Priority 3: Advanced Features
9. **Feed search** - Search posts by text
10. **Mentions** - Highlight @mentions in posts
11. **Hashtags** - Support #hashtag filtering
12. **Feed refresh** - Pull-to-refresh (already implemented)

## Current Limitations

1. **No pagination** - Only gets first page of results
2. **No filtering** - Gets all posts, can't filter by date/user/type
3. **No post details** - Can't view individual post with comments
4. **No comments display** - Comments exist but not shown in feed
5. **No attachments** - Files in posts not displayed
6. **No update/delete** - Can only create posts, not edit/delete

## API Endpoints Available (Not All Implemented)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `log.blogpost.get` | Get feed posts | ✅ Implemented |
| `log.blogpost.add` | Create post | ✅ Implemented |
| `log.blogpost.update` | Update post | ❌ Not implemented |
| `log.blogpost.delete` | Delete post | ❌ Not implemented |
| `log.blogpost.getusers` | Get user-specific feed | ⚠️ Android only |
| `log.blogcomment.get` | Get post comments | ❌ Not implemented |
| `log.blogcomment.add` | Add comment | ✅ Implemented |
| `log/events` | Get event types | ❌ Not implemented |

## Decision Points

1. **Do you want pagination?** (Load more posts as user scrolls)
2. **Do you want filtering?** (By date, user, activity type)
3. **Do you want post details view?** (Single post with all comments)
4. **Do you want to show attachments?** (Files/images in posts)
5. **Do you want edit/delete?** (Update or remove posts)
6. **Do you want user-specific feeds?** (Posts from specific users/groups)
