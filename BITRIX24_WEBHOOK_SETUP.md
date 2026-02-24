# Bitrix24 Webhook Setup for Push Notifications

## ✅ Webhook Handler Added!

I've added a webhook endpoint that automatically sends push notifications when Bitrix24 events occur (like task comments).

## 🔧 Setup Instructions

### Step 1: Configure Webhook in Bitrix24

1. **Go to your Bitrix24 portal**
   - Navigate to: **Settings** → **Webhooks** (or **REST API** → **Webhooks**)

2. **Create a new webhook**
   - Click **"Add Webhook"** or **"Create"**
   - **Webhook URL:** `https://jbmarksauth-production.up.railway.app/api/bitrix/webhook`
   - **Method:** POST
   - **Events to subscribe to:**
     - ✅ `OnTaskCommentAdd` - When a task comment is added
     - ✅ `OnTaskAdd` - When a task is created/assigned
     - ✅ `OnTaskUpdate` - When a task is updated
     - ✅ `OnImCommonAdd` - When a chat message is sent (optional)

3. **Save the webhook**

### Step 2: Verify Webhook is Working

After setting up the webhook:

1. **Test by adding a task comment**
   - Go to any task in Bitrix24
   - Add a comment
   - Check Railway logs for: `📥 Bitrix24 webhook received`
   - Check Railway logs for: `📤 Sending push notification`

2. **Check Railway Logs**
   - Railway Dashboard → Your Project → Deployments → Latest → Logs
   - Look for webhook activity

## 📋 Supported Events

The webhook handler supports these Bitrix24 events:

### Task Comment Added
- **Event:** `OnTaskCommentAdd` or `ONTASKCOMMENTADD`
- **Sends notification to:** Task responsible (not the comment author)
- **Notification:** "New Comment on Task"

### Task Created/Assigned
- **Event:** `OnTaskAdd` or `ONTASKADD`
- **Sends notification to:** Task responsible
- **Notification:** "New Task Assigned"

### Task Updated
- **Event:** `OnTaskUpdate` or `ONTASKUPDATE`
- **Sends notification to:** Task responsible
- **Notification:** "Task Updated"

### Chat Message
- **Event:** `OnImCommonAdd` or `ONIMCOMMONADD`
- **Sends notification to:** Message recipient
- **Notification:** "New Message"

## 🧪 Testing

### Test Webhook Manually

You can test the webhook endpoint directly:

```bash
curl -X POST https://jbmarksauth-production.up.railway.app/api/bitrix/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "OnTaskCommentAdd",
    "data": {
      "FIELDS_AFTER": {
        "TASK_ID": "123",
        "POST_MESSAGE": "This is a test comment",
        "AUTHOR_ID": "1",
        "RESPONSIBLE_ID": "2",
        "TITLE": "Test Task"
      }
    }
  }'
```

### Test Push Notification Directly

```bash
curl -X POST https://jbmarksauth-production.up.railway.app/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {
      "type": "TASK",
      "task_id": "123"
    }
  }'
```

## 🔍 Troubleshooting

### Webhook Not Receiving Events

1. **Check Bitrix24 webhook configuration**
   - Verify the URL is correct
   - Check that events are subscribed
   - Ensure webhook is active/enabled

2. **Check Railway logs**
   - Look for `📥 Bitrix24 webhook received` messages
   - If you don't see this, Bitrix24 isn't calling the webhook

3. **Test webhook URL**
   - Use the manual test above
   - Check Railway logs for the request

### Push Notifications Not Sending

1. **Check database**
   - Verify user has registered push token: `SELECT * FROM push_tokens WHERE user_id = 'YOUR_USER_ID';`
   - If no token, user needs to log in to the iOS app first

2. **Check APNs configuration**
   - Verify environment variables are set in Railway
   - Check Railway logs for: `✅ APNs provider initialized`

3. **Check Railway logs**
   - Look for: `📤 Sending push notification`
   - Look for: `✅ Push notification sent: X successful`
   - Check for any error messages

### User ID Mismatch

**Important:** The `user_id` in the webhook must match the `user_id` stored when the iOS app registered the token.

- Check what user_id was stored: `SELECT user_id FROM push_tokens;`
- The Bitrix24 user ID in the webhook must match exactly
- User IDs are usually numeric strings (e.g., "123", "456")

## 📝 Next Steps

1. ✅ Webhook handler is deployed (Railway will auto-deploy)
2. ⏳ **You need to:** Set up the webhook in Bitrix24 (see Step 1 above)
3. ⏳ **You need to:** Ensure database is configured (for token storage)
4. ⏳ **You need to:** Ensure APNs environment variables are set

Once all three are done, push notifications will work automatically! 🎉

---

**After setting up the webhook in Bitrix24, test by adding a task comment and you should receive a push notification!**
