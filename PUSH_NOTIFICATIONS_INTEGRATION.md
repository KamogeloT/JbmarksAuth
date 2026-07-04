# Push Notifications Integration Guide

## Quick Start - Add to Existing Railway Server

This guide shows you how to add push notification endpoints to your existing `server-simple.js` file.

## Step 1: Update package.json

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "apn": "^2.2.0"
  }
}
```

Then run:
```bash
npm install
```

## Step 2: Add Push Notification Routes to server-simple.js

Add these routes to your existing `server-simple.js` file (after the token exchange endpoint):

```javascript
// ============================================
// PUSH NOTIFICATION ENDPOINTS
// ============================================

const { Pool } = require('pg');
const apn = require('apn');
const fs = require('fs');

// Database connection (PostgreSQL)
let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Create table if it doesn't exist
    pool.query(`
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
        CREATE INDEX IF NOT EXISTS idx_user_id ON push_tokens(user_id);
    `).catch(err => console.error('Database setup error:', err));
}

// Initialize APNs provider
let apnProvider;
function initAPNs() {
    try {
        const teamId = process.env.APNS_TEAM_ID;
        const keyId = process.env.APNS_KEY_ID || 'KGVWC4F2KA';
        
        if (!teamId) {
            console.warn('⚠️ APNS_TEAM_ID not set - push notifications will not work');
            return;
        }
        
        // Option 1: Read from file (if uploaded to Railway)
        let key;
        if (process.env.APNS_KEY_PATH) {
            key = fs.readFileSync(process.env.APNS_KEY_PATH);
        } 
        // Option 2: From base64 environment variable (more secure)
        else if (process.env.APNS_KEY_CONTENT) {
            key = Buffer.from(process.env.APNS_KEY_CONTENT, 'base64');
        } else {
            console.warn('⚠️ APNs key not found - push notifications will not work');
            return;
        }
        
        apnProvider = new apn.Provider({
            token: {
                key: key,
                keyId: keyId,
                teamId: teamId
            },
            production: process.env.NODE_ENV === 'production'
        });
        
        console.log('✅ APNs provider initialized');
    } catch (error) {
        console.error('❌ Failed to initialize APNs:', error.message);
    }
}

// Initialize APNs on startup
initAPNs();

/**
 * POST /api/push/register-token
 * Register APNs token from iOS device
 */
app.post('/api/push/register-token', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not configured' });
        }
        
        const { apns_token, platform, portal_url, user_id } = req.body;
        
        if (!apns_token || !user_id) {
            return res.status(400).json({ 
                error: 'Missing required fields: apns_token and user_id' 
            });
        }
        
        console.log(`📱 Registering push token for user: ${user_id}`);
        
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
 * Send push notification to user
 */
app.post('/api/push/send', async (req, res) => {
    try {
        if (!pool || !apnProvider) {
            return res.status(503).json({ error: 'Push notifications not configured' });
        }
        
        const { user_id, title, body, data, badge } = req.body;
        
        if (!user_id || !title || !body) {
            return res.status(400).json({ 
                error: 'Missing required fields: user_id, title, body' 
            });
        }
        
        console.log(`📤 Sending push notification to user: ${user_id}`);
        
        // Get user's APNs token(s)
        const query = 'SELECT apns_token FROM push_tokens WHERE user_id = $1';
        const result = await pool.query(query, [user_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'No push token found for user' 
            });
        }
        
        // Create notification
        const notification = new apn.Notification();
        notification.alert = { title, body };
        notification.sound = 'default';
        notification.badge = badge || 1;
        notification.topic = process.env.APNS_BUNDLE_ID || 'com.example.jbmarks';
        notification.payload = data || {};
        notification.expiry = Math.floor(Date.now() / 1000) + 3600;
        
        // Send to all tokens for this user
        const tokens = result.rows.map(row => row.apns_token);
        const response = await apnProvider.send(notification, tokens);
        
        // Log results
        response.sent.forEach(token => {
            console.log(`✅ Notification sent to: ${token.substring(0, 20)}...`);
        });
        
        response.failed.forEach(failure => {
            console.error(`❌ Failed to send: ${failure.error}`);
            // Remove invalid tokens
            if (failure.error === 'BadDeviceToken' || failure.error === 'Unregistered') {
                pool.query('DELETE FROM push_tokens WHERE apns_token = $1', [failure.device])
                    .catch(err => console.error('Error deleting token:', err));
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
 * DELETE /api/push/token/:user_id
 * Remove push token for user
 */
app.delete('/api/push/token/:user_id', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not configured' });
        }
        
        const { user_id } = req.params;
        const { apns_token } = req.query;
        
        let query, params;
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
```

## Step 3: Update Root Endpoint

Update your root endpoint to include push notification endpoints:

```javascript
app.get('/', (req, res) => {
    res.json({
        service: 'JBmarks API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            tokenExchange: 'POST /api/exchangetoken',
            pushRegister: 'POST /api/push/register-token',
            pushSend: 'POST /api/push/send',
            pushDelete: 'DELETE /api/push/token/:user_id'
        }
    });
});
```

## Step 4: Set Up Railway PostgreSQL Database

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a `DATABASE_URL` environment variable
4. The table will be created automatically when the server starts

## Step 5: Set Environment Variables in Railway

Add these to your Railway project:

```
# APNs Configuration
APNS_KEY_ID=KGVWC4F2KA
APNS_TEAM_ID=YOUR_TEAM_ID_HERE  # Get from Apple Developer account
APNS_BUNDLE_ID=com.example.jbmarks  # Your iOS app bundle ID

# APNs Key (choose one method)
# Method 1: Base64 encoded (recommended - more secure)
APNS_KEY_CONTENT=<base64-encoded-key-content>

# OR Method 2: File path (if you upload the file)
# APNS_KEY_PATH=./AuthKey_KGVWC4F2KA.p8

# Database (automatically set by Railway when you add PostgreSQL)
# DATABASE_URL=postgresql://... (Railway sets this automatically)
```

### How to Get Base64 Encoded Key:

```bash
# On your Mac
base64 -i ~/Downloads/AuthKey_KGVWC4F2KA.p8 > key_base64.txt
cat key_base64.txt
# Copy the output and paste into APNS_KEY_CONTENT
```

## Step 6: Deploy

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

## Step 7: Test Token Registration

Test from your iOS app or using curl:

```bash
curl -X POST https://jbmarksauth-production.up.railway.app/api/push/register-token \
  -H "Content-Type: application/json" \
  -d '{
    "apns_token": "test_token_1234567890abcdef",
    "platform": "ios",
    "portal_url": "https://jbmarks.sdinmotion.co.za/",
    "user_id": "test_user_123"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Token registered successfully",
  "id": 1
}
```

## Step 8: Test Sending Notification

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

### Database Connection Issues
- Check Railway PostgreSQL is running
- Verify `DATABASE_URL` is set in Railway environment variables
- Check server logs in Railway dashboard

### APNs Not Working
- Verify `APNS_TEAM_ID` is correct (from Apple Developer account)
- Check `APNS_KEY_CONTENT` is valid base64
- Ensure `APNS_BUNDLE_ID` matches your iOS app bundle ID
- Check server logs for APNs initialization errors

### Token Registration Fails
- Verify database table was created (check logs)
- Check user_id and apns_token are provided
- Verify database connection is working

## Next Steps

1. ✅ Deploy updated server
2. ✅ Test token registration from iOS app
3. ✅ Set up Bitrix24 webhooks (optional - see full guide)
4. ✅ Test sending notifications
5. ✅ Monitor logs

## Quick Reference

**New Endpoints:**
- `POST /api/push/register-token` - Register device token
- `POST /api/push/send` - Send notification to user
- `DELETE /api/push/token/:user_id` - Remove token

**Required Environment Variables:**
- `APNS_TEAM_ID` - Your Apple Team ID
- `APNS_KEY_CONTENT` - Base64 encoded APNs key
- `APNS_BUNDLE_ID` - Your iOS app bundle ID
- `DATABASE_URL` - Set automatically by Railway

---

*For full details, see `PUSH_NOTIFICATIONS_BACKEND_GUIDE.md`*
