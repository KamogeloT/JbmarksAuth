# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for push notifications in the JBmarks Android app.

## Prerequisites

1. A Firebase project (create at https://console.firebase.google.com/)
2. Android Studio with Firebase plugin installed
3. Google account

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "JBmarks")
   - Enable/disable Google Analytics (optional)
   - Select or create Analytics account

## Step 2: Add Android App to Firebase

1. In Firebase Console, click "Add app" → Android
2. Enter your app details:
   - **Android package name**: `com.example.jbmarks`
   - **App nickname**: JBmarks (optional)
   - **Debug signing certificate SHA-1**: (optional, for testing)
3. Click "Register app"

## Step 3: Download google-services.json

1. Download the `google-services.json` file
2. Place it in `app/` directory (same level as `build.gradle.kts`)
3. **Important**: Do NOT commit this file to public repositories if it contains sensitive data

## Step 4: Enable Cloud Messaging API

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Ensure **Cloud Messaging API (Legacy)** is enabled
3. Note your **Server Key** (you'll need this for backend integration)

## Step 5: Configure App for FCM

The app has been configured with:
- ✅ Firebase dependencies added to `build.gradle.kts`
- ✅ Google Services plugin configured
- ✅ Firebase Messaging Service implemented
- ✅ FCM Token Manager created
- ✅ AndroidManifest updated with FCM service

## Step 6: Build and Test

1. Sync Gradle files in Android Studio
2. Build the app
3. Run the app on a device or emulator
4. Check Logcat for FCM token:
   ```
   FCMTokenManager: Registering FCM token: ...
   ```

## Step 7: Test Push Notifications

### Option A: Using Firebase Console

1. Go to Firebase Console → **Cloud Messaging**
2. Click "Send your first message"
3. Enter notification title and text
4. Select your Android app
5. Click "Send test message"
6. Enter your FCM token (from Logcat)
7. Send the message

### Option B: Using cURL

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test message"
    },
    "data": {
      "type": "GENERAL",
      "id": "test123",
      "related_id": null,
      "action_url": null,
      "priority": "NORMAL"
    }
  }'
```

## Step 8: Backend Integration (Optional)

To receive push notifications from Bitrix24 or your backend:

### Option 1: Custom Backend Endpoint

1. Create a backend endpoint to receive FCM tokens
2. Update `FCMTokenManager.kt` → `registerWithCustomBackend()` method
3. Uncomment and implement the backend registration code

### Option 2: Bitrix24 Webhooks

1. Set up Bitrix24 webhooks to send notifications to your backend
2. Your backend forwards notifications to FCM
3. Use FCM Admin SDK or REST API to send messages

### Example Backend Endpoint (Node.js)

```javascript
// Express endpoint to register FCM token
app.post('/api/fcm/register', async (req, res) => {
  const { fcm_token, user_id, access_token } = req.body;
  
  // Store token in database
  await db.fcmTokens.upsert({
    userId: user_id,
    token: fcm_token,
    platform: 'android',
    updatedAt: new Date()
  });
  
  res.json({ success: true });
});

// Endpoint to send notification via FCM
app.post('/api/fcm/send', async (req, res) => {
  const { user_id, title, body, data } = req.body;
  
  // Get FCM token from database
  const token = await db.fcmTokens.findOne({ userId: user_id });
  
  // Send via FCM Admin SDK
  const message = {
    token: token.token,
    notification: { title, body },
    data: data || {}
  };
  
  await admin.messaging().send(message);
  res.json({ success: true });
});
```

## Notification Payload Format

The app expects notifications in this format:

```json
{
  "notification": {
    "title": "Notification Title",
    "body": "Notification message"
  },
  "data": {
    "type": "TASK_ASSIGNED|TASK_COMMENT|TASK_UPDATED|TASK_DEADLINE|CHAT_MESSAGE|FEED_POST|GENERAL",
    "id": "unique_notification_id",
    "title": "Title (if no notification.title)",
    "message": "Message (if no notification.body)",
    "related_id": "task_id_or_chat_id",
    "action_url": "deep_link_url",
    "priority": "LOW|NORMAL|HIGH|URGENT"
  }
}
```

## Notification Types Supported

- `TASK_ASSIGNED` - New task assigned
- `TASK_UPDATED` - Task updated
- `TASK_COMMENT` - New comment on task
- `TASK_DEADLINE` - Deadline approaching
- `TASK_STATUS_CHANGED` - Task status changed
- `FILE_ATTACHED` - File attached to task
- `FEED_POST` - New feed post
- `CHAT_MESSAGE` - New chat message
- `GENERAL` - General notification

## Troubleshooting

### Token Not Generated

- Check that `google-services.json` is in the correct location
- Verify package name matches Firebase project
- Check Logcat for Firebase initialization errors

### Notifications Not Received

- Verify FCM token is registered (check Logcat)
- Check notification permissions (Android 13+)
- Ensure app is not in battery optimization mode
- Check Firebase Console → Cloud Messaging for delivery status

### Notifications Received But Not Displayed

- Check notification channels are created (Android 8+)
- Verify `NotificationService` is working
- Check Logcat for notification display errors

## Security Considerations

1. **Server Key**: Keep your FCM Server Key secure
2. **Token Storage**: FCM tokens are stored locally in SharedPreferences
3. **Token Registration**: Tokens are registered after user authentication
4. **Token Refresh**: Tokens automatically refresh and re-register

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Add `google-services.json` to app
3. ✅ Test push notifications
4. ⏳ Implement backend integration (if needed)
5. ⏳ Set up Bitrix24 webhooks (if applicable)
6. ⏳ Configure notification preferences UI

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM Android Setup Guide](https://firebase.google.com/docs/cloud-messaging/android/client)
- [FCM Admin SDK](https://firebase.google.com/docs/cloud-messaging/admin/send-messages)
