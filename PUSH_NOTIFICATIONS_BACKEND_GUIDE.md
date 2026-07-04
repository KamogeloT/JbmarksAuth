# Push Notifications Backend Server Guide

## Overview

This guide shows you how to add push notification endpoints to your existing Railway server (`https://jbmarksauth-production.up.railway.app`). The backend will:
1. Receive and store APNs tokens from iOS devices
2. Send push notifications via APNs when Bitrix24 events occur
3. Handle token management (updates, deletions)

## Architecture

```
iOS App → Railway Server → Database (tokens)
         ↓
Bitrix24 Webhooks → Railway Server → APNs → iOS Device
```

## Prerequisites

1. **Existing Railway Server** - You already have this at `jbmarksauth-production.up.railway.app`
2. **APNs Key File** - Already downloaded: `AuthKey_KGVWC4F2KA.p8`
3. **Team ID** - From your Apple Developer account
4. **Database** - We'll use Railway's built-in PostgreSQL (or you can use MongoDB/any database)

## Step 1: Get Your Team ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Click on your name/team in the top right
3. Copy your **Team ID** (looks like: `ABC123DEF4`)
4. Save it - you'll need it for the backend

## Step 2: Set Up Database

### Option A: Use Railway PostgreSQL (Recommended)

Railway provides PostgreSQL databases. Add one to your project:

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will create a database and provide connection string
4. Copy the connection string (looks like: `postgresql://user:password@host:port/dbname`)

### Option B: Use MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string

### Option C: Use SQLite (Simple, for testing)

For development/testing, you can use SQLite (file-based database).

## Step 3: Update Your Railway Server

### 3.1 Install Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "apn": "^2.2.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  }
}
```

**Or if using MongoDB:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.2.0",
    "apn": "^2.2.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  }
}
```

### 3.2 Create Database Schema

**For PostgreSQL:**

Create a migration file or run this SQL:

```sql
-- Create tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    apns_token TEXT NOT NULL,
    platform VARCHAR(10) DEFAULT 'ios',
    portal_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, apns_token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_url ON push_tokens(portal_url);
```

**For MongoDB:**

No schema needed - MongoDB is schema-less. The structure will be:
```json
{
  "userId": "string",
  "apnsToken": "string",
  "platform": "ios",
  "portalUrl": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### 3.3 Update Server Code

Add push notification endpoints to your existing Railway server. Here's the complete code:

**File: `server-push.js`** (add to your existing server or create new file)

```javascript
const express = require('express');
const { Pool } = require('pg'); // For PostgreSQL
// OR const { MongoClient } = require('mongodb'); // For MongoDB
const apn = require('apn');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(require('cors')());

// Database connection (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// OR MongoDB connection
// const mongoClient = new MongoClient(process.env.MONGODB_URI);
// let db;

// Initialize APNs provider
let apnProvider;
function initAPNs() {
  try {
    // Read APNs key file
    // Option 1: Upload key file to Railway and reference it
    const keyPath = process.env.APNS_KEY_PATH || './AuthKey_KGVWC4F2KA.p8';
    const key = fs.readFileSync(keyPath);
    
    // Option 2: Store key content in environment variable (more secure)
    // const key = Buffer.from(process.env.APNS_KEY_CONTENT, 'base64');
    
    apnProvider = new apn.Provider({
      token: {
        key: key,
        keyId: process.env.APNS_KEY_ID || 'KGVWC4F2KA',
        teamId: process.env.APNS_TEAM_ID // Your Team ID from Apple Developer
      },
      production: process.env.NODE_ENV === 'production' // Use production APNs in production
    });
    
    console.log('✅ APNs provider initialized');
  } catch (error) {
    console.error('❌ Failed to initialize APNs:', error);
  }
}

// Initialize on startup
initAPNs();

// ============================================
// PUSH NOTIFICATION ENDPOINTS
// ============================================

/**
 * POST /api/push/register-token
 * Register APNs token from iOS device
 */
app.post('/api/push/register-token', async (req, res) => {
  try {
    const { apns_token, platform, portal_url, user_id } = req.body;
    
    // Validate input
    if (!apns_token || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: apns_token and user_id' 
      });
    }
    
    console.log(`📱 Registering push token for user: ${user_id}`);
    
    // Store token in database (PostgreSQL)
    const query = `
      INSERT INTO push_tokens (user_id, apns_token, platform, portal_url, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, apns_token) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP, portal_url = $4
      RETURNING id;
    `;
    
    const result = await pool.query(query, [
      user_id,
      apns_token,
      platform || 'ios',
      portal_url || null
    ]);
    
    // OR MongoDB
    // await db.collection('push_tokens').updateOne(
    //   { userId: user_id, apnsToken: apns_token },
    //   {
    //     $set: {
    //       userId: user_id,
    //       apnsToken: apns_token,
    //       platform: platform || 'ios',
    //       portalUrl: portal_url || null,
    //       updatedAt: new Date()
    //     },
    //     $setOnInsert: {
    //       createdAt: new Date()
    //     }
    //   },
    //   { upsert: true }
    // );
    
    console.log(`✅ Token registered successfully for user: ${user_id}`);
    
    res.json({ 
      success: true, 
      message: 'Token registered successfully',
      id: result.rows[0].id
    });
    
  } catch (error) {
    console.error('❌ Error registering token:', error);
    res.status(500).json({ 
      error: 'Failed to register token',
      message: error.message 
    });
  }
});

/**
 * POST /api/push/send
 * Send push notification to user(s)
 * This is called by Bitrix24 webhooks or your internal services
 */
app.post('/api/push/send', async (req, res) => {
  try {
    const { user_id, title, body, data, badge } = req.body;
    
    // Validate input
    if (!user_id || !title || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, title, body' 
      });
    }
    
    console.log(`📤 Sending push notification to user: ${user_id}`);
    
    // Get user's APNs token(s) from database
    const query = 'SELECT apns_token FROM push_tokens WHERE user_id = $1';
    const result = await pool.query(query, [user_id]);
    
    // OR MongoDB
    // const tokens = await db.collection('push_tokens')
    //   .find({ userId: user_id })
    //   .toArray();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No push token found for user' 
      });
    }
    
    // Create notification
    const notification = new apn.Notification();
    notification.alert = {
      title: title,
      body: body
    };
    notification.sound = 'default';
    notification.badge = badge || 1;
    notification.topic = process.env.APNS_BUNDLE_ID || 'com.example.jbmarks'; // Your app bundle ID
    notification.payload = data || {};
    notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // Send to all tokens for this user
    const tokens = result.rows.map(row => row.apns_token);
    const response = await apnProvider.send(notification, tokens);
    
    // Log results
    response.sent.forEach(token => {
      console.log(`✅ Notification sent to: ${token}`);
    });
    
    response.failed.forEach(failure => {
      console.error(`❌ Failed to send: ${failure.device} - ${failure.error}`);
      
      // Remove invalid tokens
      if (failure.error === 'BadDeviceToken' || failure.error === 'Unregistered') {
        pool.query('DELETE FROM push_tokens WHERE apns_token = $1', [failure.device]);
      }
    });
    
    res.json({ 
      success: true,
      sent: response.sent.length,
      failed: response.failed.length
    });
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      message: error.message 
    });
  }
});

/**
 * POST /api/push/send-batch
 * Send push notification to multiple users
 */
app.post('/api/push/send-batch', async (req, res) => {
  try {
    const { user_ids, title, body, data } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    }
    
    // Get tokens for all users
    const query = 'SELECT user_id, apns_token FROM push_tokens WHERE user_id = ANY($1)';
    const result = await pool.query(query, [user_ids]);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, sent: 0, message: 'No tokens found' });
    }
    
    // Create notification
    const notification = new apn.Notification();
    notification.alert = { title, body };
    notification.sound = 'default';
    notification.topic = process.env.APNS_BUNDLE_ID || 'com.example.jbmarks';
    notification.payload = data || {};
    
    // Send to all tokens
    const tokens = result.rows.map(row => row.apns_token);
    const response = await apnProvider.send(notification, tokens);
    
    res.json({
      success: true,
      sent: response.sent.length,
      failed: response.failed.length
    });
    
  } catch (error) {
    console.error('❌ Error sending batch notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/push/token/:user_id
 * Remove push token for user (e.g., on logout)
 */
app.delete('/api/push/token/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { apns_token } = req.query; // Optional: specific token
    
    let query;
    let params;
    
    if (apns_token) {
      query = 'DELETE FROM push_tokens WHERE user_id = $1 AND apns_token = $2';
      params = [user_id, apns_token];
    } else {
      query = 'DELETE FROM push_tokens WHERE user_id = $1';
      params = [user_id];
    }
    
    const result = await pool.query(query, params);
    
    res.json({ 
      success: true,
      deleted: result.rowCount 
    });
    
  } catch (error) {
    console.error('❌ Error deleting token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/push/tokens/:user_id
 * Get all tokens for a user (for debugging)
 */
app.get('/api/push/tokens/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const query = 'SELECT id, platform, portal_url, created_at, updated_at FROM push_tokens WHERE user_id = $1';
    const result = await pool.query(query, [user_id]);
    
    res.json({ 
      success: true,
      tokens: result.rows 
    });
    
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'push-notifications' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Push notification server running on port ${PORT}`);
});

module.exports = app;
```

## Step 4: Set Environment Variables in Railway

Add these environment variables in your Railway project dashboard:

```
# APNs Configuration
APNS_KEY_ID=KGVWC4F2KA
APNS_TEAM_ID=YOUR_TEAM_ID_HERE
APNS_BUNDLE_ID=com.example.jbmarks  # Your iOS app bundle ID
APNS_KEY_PATH=./AuthKey_KGVWC4F2KA.p8  # If storing file in repo
# OR
# APNS_KEY_CONTENT=<base64-encoded-key-content>  # More secure

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname  # From Railway PostgreSQL

# Environment
NODE_ENV=production
```

## Step 5: Upload APNs Key to Railway

### Option A: Store in Repository (Less Secure)

1. Add `AuthKey_KGVWC4F2KA.p8` to your Railway server repository
2. Reference it in `APNS_KEY_PATH` environment variable

### Option B: Store as Environment Variable (More Secure - Recommended)

1. Convert key file to base64:
   ```bash
   base64 -i AuthKey_KGVWC4F2KA.p8 > key_base64.txt
   ```
2. Copy the base64 content
3. Set `APNS_KEY_CONTENT` environment variable in Railway
4. Update server code to decode:
   ```javascript
   const key = Buffer.from(process.env.APNS_KEY_CONTENT, 'base64');
   ```

## Step 6: Update Your Main Server File

If you have an existing `server.js`, merge the push notification routes:

```javascript
// Your existing server code...
const express = require('express');
const app = express();

// ... existing routes ...

// Add push notification routes
require('./server-push')(app); // If modular
// OR copy the routes directly into your existing server.js
```

## Step 7: Deploy to Railway

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add push notification endpoints"
   git push
   ```

2. Railway will automatically deploy

3. Test the health endpoint:
   ```bash
   curl https://jbmarksauth-production.up.railway.app/health
   ```

## Step 8: Test Token Registration

Test from your iOS app or using curl:

```bash
curl -X POST https://jbmarksauth-production.up.railway.app/api/push/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "apns_token": "test_token_123",
    "platform": "ios",
    "portal_url": "https://jbmarks.sdinmotion.co.za/",
    "user_id": "test_user_123"
  }'
```

## Step 9: Set Up Bitrix24 Webhooks (Optional)

To automatically send push notifications when Bitrix24 events occur:

1. Go to your Bitrix24 portal
2. Navigate to **Settings** → **Webhooks**
3. Create a new webhook
4. Set webhook URL to: `https://jbmarksauth-production.up.railway.app/api/bitrix/webhook`
5. Select events: Task created, Message sent, etc.

Add webhook handler to your server:

```javascript
app.post('/api/bitrix/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    // Handle different event types
    if (event.event === 'ONTASKADD') {
      // Task created
      const taskId = event.data.FIELDS_AFTER.ID;
      const responsibleId = event.data.FIELDS_AFTER.RESPONSIBLE_ID;
      
      // Send push notification
      await sendPushNotification({
        user_id: responsibleId,
        title: 'New Task Assigned',
        body: `You have been assigned a new task: ${event.data.FIELDS_AFTER.TITLE}`,
        data: {
          type: 'TASK',
          task_id: taskId
        }
      });
    }
    
    // ... handle other events
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Step 10: Test Sending Notifications

Test sending a notification:

```bash
curl -X POST https://jbmarksauth-production.up.railway.app/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "title": "Test Notification",
    "body": "This is a test push notification",
    "data": {
      "type": "GENERAL"
    }
  }'
```

## Troubleshooting

### APNs Connection Issues
- Verify Team ID is correct
- Check key file is valid
- Ensure bundle ID matches your app
- Use sandbox APNs for development (automatic when `NODE_ENV !== 'production'`)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Railway PostgreSQL is running
- Test connection locally first

### Token Registration Fails
- Check iOS app is sending correct format
- Verify user is authenticated (access token valid)
- Check server logs in Railway dashboard

## Next Steps

1. ✅ Deploy push notification server
2. ✅ Test token registration from iOS app
3. ✅ Set up Bitrix24 webhooks (optional)
4. ✅ Test sending notifications
5. ✅ Monitor logs and errors

## Security Best Practices

1. **Never commit APNs key to repository** - Use environment variables
2. **Use HTTPS only** - Railway provides this automatically
3. **Validate user authentication** - Check access tokens
4. **Rate limit endpoints** - Prevent abuse
5. **Log all operations** - For debugging and security

## Cost Estimate

- **Railway**: Free tier (500 hours/month) or $5/month for unlimited
- **PostgreSQL**: Included with Railway or free tier on MongoDB Atlas
- **APNs**: Free (included with Apple Developer account)

**Total: FREE or ~$5/month**

---

## Quick Reference

**Endpoints:**
- `POST /api/push/register-token` - Register device token
- `POST /api/push/send` - Send notification to user
- `POST /api/push/send-batch` - Send to multiple users
- `DELETE /api/push/token/:user_id` - Remove token
- `GET /api/push/tokens/:user_id` - List user tokens

**Environment Variables:**
- `APNS_KEY_ID` - Your APNs key ID
- `APNS_TEAM_ID` - Your Apple Team ID
- `APNS_BUNDLE_ID` - Your app bundle ID
- `DATABASE_URL` - PostgreSQL connection string

---

*Need help? Check Railway logs or test endpoints with curl first!*
