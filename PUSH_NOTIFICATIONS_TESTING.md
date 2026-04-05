# 🧪 Push Notifications Testing Guide

## ✅ Setup Complete!

- ✅ Server deployed on Railway
- ✅ PostgreSQL database created
- ✅ Environment variables added
- ✅ iOS app code implemented
- ✅ Backend endpoints ready

## 🔍 Verify Server Setup

### 1. Check Server Health
```bash
curl https://jbmarksauth-production.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "jbmarks-token-exchange",
  "version": "1.0.0"
}
```

### 2. Check Railway Logs

Go to Railway Dashboard → Your Project → **Deployments** → Latest → **Logs**

Look for:
- `✅ APNs provider initialized` - APNs is working
- `✅ Database connected` - PostgreSQL is working
- Any error messages

## 📱 Test iOS App Integration

### Step 1: Build and Run iOS App

1. Open Xcode project: `JbmrksIOs/JbmrksIOs.xcodeproj`
2. Select a **physical iOS device** (push notifications don't work on simulator)
3. Build and run the app

### Step 2: Grant Notification Permissions

When the app launches:
1. You'll see a notification permission prompt
2. Click **"Allow"**
3. Check Xcode console for: `✅ Push notification authorization granted`

### Step 3: Verify Token Registration

After logging in, check Xcode console for:
- `📱 APNs Device Token received: ...`
- `📱 Registering APNs token with backend:`
- `✅ APNs token registered successfully with backend`

### Step 4: Check Database

The token should be stored in PostgreSQL. You can verify in Railway:
1. Railway Dashboard → Your Project → PostgreSQL Database
2. Click **"Query"** tab
3. Run: `SELECT * FROM push_tokens;`
4. You should see your device token

## 🧪 Test Push Notification Sending

### Option 1: Test via API (Manual)

```bash
# Replace with actual values from your app
curl -X POST https://jbmarksauth-production.up.railway.app/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "title": "Test Notification",
    "message": "This is a test push notification",
    "type": "GENERAL",
    "priority": "NORMAL"
  }'
```

### Option 2: Test from Bitrix24 Webhook

When Bitrix24 sends a webhook, it will automatically trigger push notifications.

## 🔧 Troubleshooting

### Issue: "APNs provider not initialized"

**Check:**
- Railway environment variables are set correctly
- `APNS_TEAM_ID` matches your Apple Team ID
- `APNS_KEY_CONTENT` is the full base64 string
- `APNS_BUNDLE_ID` matches your app bundle ID

**Fix:**
- Verify variables in Railway → Variables tab
- Check Railway logs for specific error messages

### Issue: "Token registration failed"

**Check:**
- User is authenticated (has access token)
- Backend URL is correct: `https://jbmarksauth-production.up.railway.app/api/push/register-token`
- Network connectivity

**Fix:**
- Check Xcode console for error messages
- Verify access token is valid
- Check Railway logs for backend errors

### Issue: "No notifications received"

**Check:**
- App is running on a **physical device** (not simulator)
- Notification permissions are granted
- Device token is registered in database
- APNs environment matches (development vs production)

**Fix:**
- Use a real iOS device
- Check notification settings in iOS Settings
- Verify token in database

## 📊 Expected Flow

1. **App Launch** → Requests notification permissions
2. **User Allows** → App registers with APNs
3. **APNs Returns Token** → App receives device token
4. **User Logs In** → App sends token to backend
5. **Backend Stores Token** → Saved in PostgreSQL
6. **Notification Sent** → Backend sends via APNs
7. **Device Receives** → iOS shows notification
8. **User Taps** → App navigates to relevant screen

## ✅ Success Indicators

- ✅ Server health check returns 200 OK
- ✅ Railway logs show "APNs provider initialized"
- ✅ iOS app console shows token registration success
- ✅ Database contains device token
- ✅ Test notification is received on device

## 🎉 Next Steps

Once everything is working:

1. **Set up Bitrix24 Webhooks** (if not already done)
   - Configure webhooks to call your Railway server
   - Test webhook delivery

2. **Test Real Scenarios**
   - Create a task → Should send notification
   - Receive chat message → Should send notification
   - Activity feed update → Should send notification

3. **Monitor in Production**
   - Check Railway logs regularly
   - Monitor database for token registrations
   - Track notification delivery rates

---

**Everything is set up!** Test the iOS app on a physical device to complete the integration.
