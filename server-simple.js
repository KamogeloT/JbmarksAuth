/**
 * Simple Express server for Bitrix24 OAuth token exchange
 * Works on Railway, Render, Vercel, or any Node.js host
 */

const express = require('express');
const https = require('https');
const { URL } = require('url');
const { Pool } = require('pg');
const apn = require('apn');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// DATABASE SETUP (PostgreSQL)
// ============================================
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

// ============================================
// APNs SETUP
// ============================================
let apnProvider;
function initAPNs() {
    try {
        const teamId = process.env.APNS_TEAM_ID;
        const keyId = process.env.APNS_KEY_ID || 'KGVWC4F2KA';
        
        if (!teamId) {
            console.warn('⚠️ APNS_TEAM_ID not set - push notifications will not work');
            return;
        }
        
        // Read APNs key from base64 environment variable (more secure)
        let key;
        if (process.env.APNS_KEY_CONTENT) {
            key = Buffer.from(process.env.APNS_KEY_CONTENT, 'base64');
        } else if (process.env.APNS_KEY_PATH) {
            // Fallback: read from file (if uploaded to Railway)
            key = fs.readFileSync(process.env.APNS_KEY_PATH);
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for Android app
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'jbmarks-token-exchange',
        version: '1.0.0',
        timestamp: new Date().toISOString() 
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'JBmarks API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            tokenExchange: 'POST /api/exchangetoken',
            pushRegister: 'POST /api/push/register-token',
            pushSend: 'POST /api/push/send',
            pushDelete: 'DELETE /api/push/token/:user_id',
            bitrixWebhook: 'POST /api/bitrix/webhook'
        }
    });
});

// Token exchange endpoint
app.post('/api/exchangetoken', async (req, res) => {
    try {
        console.log('📥 Token exchange request received');
        
        const { oauth_code, domain } = req.body;
        
        if (!oauth_code) {
            return res.status(400).json({
                error: 'missing_oauth_code',
                message: 'oauth_code parameter is required'
            });
        }
        
        if (!domain) {
            return res.status(400).json({
                error: 'missing_domain',
                message: 'domain parameter is required'
            });
        }
        
        const clientId = process.env.BITRIX_CLIENT_ID;
        const clientSecret = process.env.BITRIX_CLIENT_SECRET;
        const redirectUri = process.env.BITRIX_REDIRECT_URI;
        
        if (!clientId || !clientSecret || !redirectUri) {
            console.error('❌ Missing environment variables');
            return res.status(500).json({
                error: 'missing_env',
                message: 'Server configuration error',
                details: {
                    has_client_id: !!clientId,
                    has_client_secret: !!clientSecret,
                    has_redirect_uri: !!redirectUri
                }
            });
        }
        
        // For local.* client IDs (Bitrix24 Box/on-prem), use oauth.bitrix.info
        // For cloud apps, use the domain's OAuth endpoint
        const useOAuthServer = clientId.startsWith('local.');
        const tokenUrl = useOAuthServer 
            ? 'https://oauth.bitrix.info/oauth/token/'
            : `https://${domain}/oauth/token/`;
        
        const postData = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: oauth_code,
            redirect_uri: redirectUri
        }).toString();
        
        console.log('🔄 Calling Bitrix:', tokenUrl);
        console.log('📋 Request params:', {
            grant_type: 'authorization_code',
            client_id: clientId.substring(0, 20) + '...',
            code: oauth_code.substring(0, 20) + '...',
            redirect_uri: redirectUri
        });
        
        const parsedUrl = new URL(tokenUrl);
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Accept': 'application/json',
                'User-Agent': 'JBmarks-TokenExchange/1.0'
            }
        };
        
        const responseData = await new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                    const contentType = (response.headers['content-type'] || '').toLowerCase();
                    console.log('📨 Bitrix response:', {
                        status: response.statusCode,
                        contentType,
                        isJson: contentType.includes('application/json')
                    });
                    resolve({
                        statusCode: response.statusCode,
                        body: data,
                        contentType
                    });
                });
            });
            req.on('error', (error) => {
                console.error('❌ Request error:', error.message);
                reject(error);
            });
            req.write(postData);
            req.end();
        });
        
        if (responseData.contentType.includes('application/json')) {
            const jsonResponse = JSON.parse(responseData.body);
            console.log('✅ Success! Returning tokens');
            return res.status(responseData.statusCode).json(jsonResponse);
        } else {
            const bodyPreview = responseData.body.substring(0, 200);
            console.error('❌ Bitrix returned HTML instead of JSON:', bodyPreview);
            return res.status(502).json({
                error: 'bitrix_returned_html',
                message: 'Bitrix returned HTML instead of JSON',
                status: responseData.statusCode,
                contentType: responseData.contentType,
                bodyPreview
            });
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
        console.error(error.stack);
        res.status(500).json({
            error: 'exception',
            message: error.message
        });
    }
});

// ============================================
// PUSH NOTIFICATION ENDPOINTS
// ============================================

/**
 * POST /api/push/register-token
 * Register APNs token from iOS device
 */
app.post('/api/push/register-token', async (req, res) => {
    try {
        // Database is optional - if not configured, log warning but return success
        // This allows the app to continue working even if push notifications aren't fully set up
        if (!pool) {
            console.warn('⚠️ Push token registration attempted but database not configured');
            console.warn('   Token registration skipped - app will continue to work');
            // Return success so the app doesn't retry unnecessarily
            // The token will be registered when database is available
            return res.json({ 
                success: true, 
                message: 'Token registration skipped (database not configured)',
                warning: 'Database not configured - token will be registered when available'
            });
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
 * POST /api/bitrix/webhook
 * Handle Bitrix24 webhook events and send push notifications
 */
app.post('/api/bitrix/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('📥 Bitrix24 webhook received:', JSON.stringify(event, null, 2));
        
        // Handle different event types
        let notificationData = null;
        
        // Task comment added
        if (event.event === 'ONTASKCOMMENTADD' || event.event === 'OnTaskCommentAdd') {
            const taskId = event.data?.FIELDS_AFTER?.TASK_ID || event.data?.TASK_ID;
            const commentText = event.data?.FIELDS_AFTER?.POST_MESSAGE || event.data?.POST_MESSAGE || 'New comment';
            const authorId = event.data?.FIELDS_AFTER?.AUTHOR_ID || event.data?.AUTHOR_ID;
            const responsibleId = event.data?.FIELDS_AFTER?.RESPONSIBLE_ID || event.data?.RESPONSIBLE_ID;
            const taskTitle = event.data?.FIELDS_AFTER?.TITLE || event.data?.TITLE || 'Task';
            
            // Send notification to task responsible (not the comment author)
            if (responsibleId && responsibleId !== authorId) {
                notificationData = {
                    user_id: String(responsibleId),
                    title: 'New Comment on Task',
                    body: `${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
                    data: {
                        type: 'TASK',
                        task_id: String(taskId),
                        notification_type: 'TASK_COMMENT'
                    },
                    badge: 1
                };
            }
        }
        // Task created/assigned
        else if (event.event === 'ONTASKADD' || event.event === 'OnTaskAdd') {
            const taskId = event.data?.FIELDS_AFTER?.ID || event.data?.ID;
            const taskTitle = event.data?.FIELDS_AFTER?.TITLE || event.data?.TITLE || 'New Task';
            const responsibleId = event.data?.FIELDS_AFTER?.RESPONSIBLE_ID || event.data?.RESPONSIBLE_ID;
            
            if (responsibleId) {
                notificationData = {
                    user_id: String(responsibleId),
                    title: 'New Task Assigned',
                    body: taskTitle,
                    data: {
                        type: 'TASK',
                        task_id: String(taskId),
                        notification_type: 'TASK_ASSIGNED'
                    },
                    badge: 1
                };
            }
        }
        // Task updated
        else if (event.event === 'ONTASKUPDATE' || event.event === 'OnTaskUpdate') {
            const taskId = event.data?.FIELDS_AFTER?.ID || event.data?.ID;
            const taskTitle = event.data?.FIELDS_AFTER?.TITLE || event.data?.TITLE || 'Task';
            const responsibleId = event.data?.FIELDS_AFTER?.RESPONSIBLE_ID || event.data?.RESPONSIBLE_ID;
            
            if (responsibleId) {
                notificationData = {
                    user_id: String(responsibleId),
                    title: 'Task Updated',
                    body: taskTitle,
                    data: {
                        type: 'TASK',
                        task_id: String(taskId),
                        notification_type: 'TASK_UPDATED'
                    },
                    badge: 1
                };
            }
        }
        // Chat message
        else if (event.event === 'ONIMCOMMONADD' || event.event === 'OnImCommonAdd') {
            const dialogId = event.data?.FIELDS_AFTER?.CHAT_ID || event.data?.CHAT_ID;
            const messageText = event.data?.FIELDS_AFTER?.MESSAGE || event.data?.MESSAGE || 'New message';
            const authorId = event.data?.FIELDS_AFTER?.AUTHOR_ID || event.data?.AUTHOR_ID;
            const recipientId = event.data?.FIELDS_AFTER?.RECIPIENT_ID || event.data?.RECIPIENT_ID;
            
            // Send to recipient (not the sender)
            if (recipientId && recipientId !== authorId) {
                notificationData = {
                    user_id: String(recipientId),
                    title: 'New Message',
                    body: messageText.substring(0, 100),
                    data: {
                        type: 'CHAT',
                        dialog_id: String(dialogId),
                        notification_type: 'CHAT_MESSAGE'
                    },
                    badge: 1
                };
            }
        }
        
        // Send push notification if we have data
        if (notificationData) {
            console.log('📤 Sending push notification:', notificationData);
            
            // Call internal push send function
            if (!pool || !apnProvider) {
                console.warn('⚠️ Push notifications not configured - skipping');
                return res.json({ 
                    success: true, 
                    message: 'Webhook received but push notifications not configured' 
                });
            }
            
            // Get user's APNs token(s)
            const query = 'SELECT apns_token FROM push_tokens WHERE user_id = $1';
            const result = await pool.query(query, [notificationData.user_id]);
            
            if (result.rows.length > 0) {
                // Create notification
                const notification = new apn.Notification();
                notification.alert = { 
                    title: notificationData.title, 
                    body: notificationData.body 
                };
                notification.sound = 'default';
                notification.badge = notificationData.badge || 1;
                notification.topic = process.env.APNS_BUNDLE_ID || 'jbmarks.JbmrksIOs';
                notification.payload = notificationData.data || {};
                notification.expiry = Math.floor(Date.now() / 1000) + 3600;
                
                // Send to all tokens for this user
                const tokens = result.rows.map(row => row.apns_token);
                const response = await apnProvider.send(notification, tokens);
                
                console.log(`✅ Push notification sent: ${response.sent.length} successful, ${response.failed.length} failed`);
                
                // Clean up invalid tokens
                response.failed.forEach(failure => {
                    if (failure.error === 'BadDeviceToken' || failure.error === 'Unregistered') {
                        pool.query('DELETE FROM push_tokens WHERE apns_token = $1', [failure.device])
                            .catch(err => console.error('Error deleting token:', err));
                    }
                });
            } else {
                console.log(`⚠️ No push token found for user: ${notificationData.user_id}`);
            }
        } else {
            console.log('ℹ️ No notification data generated for this event type');
        }
        
        // Always return success to Bitrix24
        res.json({ success: true, message: 'Webhook processed' });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        // Still return success to Bitrix24 to prevent retries
        res.status(200).json({ 
            success: false, 
            error: error.message 
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('✅ JBmarks Token Exchange Server');
    console.log('='.repeat(60));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 Token exchange: http://localhost:${PORT}/api/exchangetoken`);
    console.log('='.repeat(60));
});

module.exports = app;
