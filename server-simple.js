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
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// DATABASE SETUP (PostgreSQL)
// ============================================
let pool;

async function setupDatabase() {
    if (!process.env.DATABASE_URL) {
        console.log('ℹ️ DATABASE_URL not set - database features disabled');
        return;
    }
    
    try {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection established');
        
        // Create table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS push_tokens (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                apns_token TEXT,
                fcm_token TEXT,
                platform VARCHAR(10) DEFAULT 'ios',
                portal_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, apns_token),
                UNIQUE(user_id, fcm_token)
            );
        `);
        console.log('✅ push_tokens table created/verified');
        
        // Add fcm_token column if it doesn't exist (migration for existing deployments)
        await pool.query(`
            ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS fcm_token TEXT;
        `).catch(() => { /* column may already exist */ });
        
        // Add unique constraint for fcm_token if not exists
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_user_fcm_token ON push_tokens(user_id, fcm_token) WHERE fcm_token IS NOT NULL;
        `).catch(() => { /* index may already exist */ });
        
        // Create index if it doesn't exist
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_id ON push_tokens(user_id);
        `);
        console.log('✅ Database indexes created/verified');
        
    } catch (err) {
        console.error('❌ Database setup error:', err);
        console.error('   Error details:', err.message);
        pool = null; // Disable database features if setup fails
    }
}

// Initialize database on server start
setupDatabase();

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

// ============================================
// FIREBASE ADMIN (FCM) SETUP
// ============================================
let firebaseInitialized = false;

function initFirebase() {
    try {
        const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (!credentialsJson) {
            console.warn('⚠️ GOOGLE_APPLICATION_CREDENTIALS_JSON not set - FCM push notifications disabled');
            return;
        }
        
        const serviceAccount = JSON.parse(credentialsJson);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        
        firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized (FCM ready)');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error.message);
    }
}

initFirebase();

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
    const dbStatus = pool ? 'connected' : 'not configured';
    const apnsStatus = apnProvider ? 'ready' : 'not configured';
    const fcmStatus = firebaseInitialized ? 'ready' : 'not configured';
    const emailStatus = process.env.AZURE_COMMS_CONNECTION_STRING ? 'ready' : 'not configured';
    res.json({ 
        status: 'healthy', 
        service: 'jbmarks-token-exchange',
        version: '1.2.0',
        database: dbStatus,
        apns: apnsStatus,
        fcm: fcmStatus,
        email: emailStatus,
        timestamp: new Date().toISOString() 
    });
});

// Database setup endpoint (for manual table creation)
app.post('/api/db/setup', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ 
                error: 'Database not configured',
                message: 'DATABASE_URL environment variable not set'
            });
        }
        
        // Create table
        await pool.query(`
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
        `);
        
        // Create index
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_id ON push_tokens(user_id);
        `);
        
        // Verify table exists
        const result = await pool.query(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_name = 'push_tokens';
        `);
        
        res.json({ 
            success: true,
            message: 'Database tables created successfully',
            tableExists: result.rows[0].count > 0
        });
    } catch (error) {
        console.error('❌ Database setup error:', error);
        res.status(500).json({ 
            error: 'Failed to setup database',
            message: error.message 
        });
    }
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
 * Register push token from iOS (APNs) or Android (FCM) device
 * Accepts: { apns_token, fcm_token, platform, portal_url, user_id }
 */
app.post('/api/push/register-token', async (req, res) => {
    try {
        if (!pool) {
            console.warn('⚠️ Push token registration attempted but database not configured');
            return res.json({ 
                success: true, 
                message: 'Token registration skipped (database not configured)',
                warning: 'Database not configured - token will be registered when available'
            });
        }
        
        const { apns_token, fcm_token, platform, portal_url, user_id } = req.body;
        const token = apns_token || fcm_token;
        
        if (!token || !user_id) {
            return res.status(400).json({ 
                error: 'Missing required fields: (apns_token or fcm_token) and user_id' 
            });
        }
        
        const detectedPlatform = platform || (fcm_token ? 'android' : 'ios');
        console.log(`📱 Registering ${detectedPlatform} push token for user: ${user_id}`);
        
        let query, params;
        if (detectedPlatform === 'android') {
            query = `
                INSERT INTO push_tokens (user_id, fcm_token, platform, portal_url, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, fcm_token) 
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP, portal_url = $4
                RETURNING id;
            `;
            params = [user_id, fcm_token || token, detectedPlatform, portal_url || null];
        } else {
            query = `
                INSERT INTO push_tokens (user_id, apns_token, platform, portal_url, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, apns_token) 
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP, portal_url = $4
                RETURNING id;
            `;
            params = [user_id, apns_token || token, detectedPlatform, portal_url || null];
        }
        
        const result = await pool.query(query, params);
        
        console.log(`✅ ${detectedPlatform} token registered successfully for user: ${user_id}`);
        
        res.json({ 
            success: true, 
            message: 'Token registered successfully',
            platform: detectedPlatform,
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
            
            if (!pool) {
                console.warn('⚠️ Database not configured - skipping push');
                return res.json({ 
                    success: true, 
                    message: 'Webhook received but database not configured' 
                });
            }
            
            // Get ALL tokens for this user (both APNs and FCM)
            const query = 'SELECT apns_token, fcm_token, platform FROM push_tokens WHERE user_id = $1';
            const result = await pool.query(query, [notificationData.user_id]);
            
            if (result.rows.length === 0) {
                console.log(`⚠️ No push token found for user: ${notificationData.user_id}`);
                return res.json({ success: true, message: 'No tokens for user' });
            }
            
            let apnsSent = 0, apnsFailed = 0, fcmSent = 0, fcmFailed = 0;
            
            // ── Send via APNs (iOS) ──────────────────────────────────
            const apnsTokens = result.rows
                .filter(r => r.apns_token && r.platform !== 'android')
                .map(r => r.apns_token);
            
            if (apnsTokens.length > 0 && apnProvider) {
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
                
                const apnsResponse = await apnProvider.send(notification, apnsTokens);
                apnsSent = apnsResponse.sent.length;
                apnsFailed = apnsResponse.failed.length;
                
                // Clean up invalid tokens
                apnsResponse.failed.forEach(failure => {
                    if (failure.error === 'BadDeviceToken' || failure.error === 'Unregistered') {
                        pool.query('DELETE FROM push_tokens WHERE apns_token = $1', [failure.device])
                            .catch(err => console.error('Error deleting APNs token:', err));
                    }
                });
            }
            
            // ── Send via FCM (Android) ───────────────────────────────
            const fcmTokens = result.rows
                .filter(r => r.fcm_token && (r.platform === 'android' || !r.apns_token))
                .map(r => r.fcm_token);
            
            if (fcmTokens.length > 0 && firebaseInitialized) {
                for (const fcmToken of fcmTokens) {
                    try {
                        const message = {
                            token: fcmToken,
                            notification: {
                                title: notificationData.title,
                                body: notificationData.body
                            },
                            data: {
                                ...(notificationData.data || {}),
                                // Ensure all values are strings (FCM requirement)
                                type: String(notificationData.data?.notification_type || notificationData.data?.type || 'GENERAL'),
                                related_id: String(notificationData.data?.task_id || notificationData.data?.dialog_id || ''),
                                title: notificationData.title,
                                message: notificationData.body
                            },
                            android: {
                                priority: 'high',
                                notification: {
                                    sound: 'default',
                                    channelId: 'tasks'
                                }
                            }
                        };
                        
                        await admin.messaging().send(message);
                        fcmSent++;
                        console.log(`✅ FCM sent to: ${fcmToken.substring(0, 20)}...`);
                    } catch (fcmError) {
                        fcmFailed++;
                        console.error(`❌ FCM failed: ${fcmError.message}`);
                        // Remove invalid tokens
                        if (fcmError.code === 'messaging/registration-token-not-registered' ||
                            fcmError.code === 'messaging/invalid-registration-token') {
                            pool.query('DELETE FROM push_tokens WHERE fcm_token = $1', [fcmToken])
                                .catch(err => console.error('Error deleting FCM token:', err));
                        }
                    }
                }
            }
            
            console.log(`📊 Push results: APNs ${apnsSent}/${apnsSent+apnsFailed}, FCM ${fcmSent}/${fcmSent+fcmFailed}`);
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

// ============================================
// WATER LEVELS ENDPOINTS (Cosmos DB)
// ============================================

const crypto = require('crypto');

/**
 * Generate Cosmos DB authorization token
 */
function cosmosAuthToken(verb, resourceType, resourceLink, date, masterKey) {
    const key = Buffer.from(masterKey, 'base64');
    const text = (verb || '').toLowerCase() + '\n' +
                 (resourceType || '').toLowerCase() + '\n' +
                 (resourceLink || '') + '\n' +
                 date.toLowerCase() + '\n\n';
    const signature = crypto.createHmac('sha256', key).update(text, 'utf8').digest('base64');
    return encodeURIComponent(`type=master&ver=1.0&sig=${signature}`);
}

/**
 * Make a request to Cosmos DB REST API
 */
function cosmosRequest(method, path, resourceType, resourceLink, body) {
    return new Promise((resolve, reject) => {
        const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
        const cosmosKey = process.env.COSMOS_KEY;

        if (!cosmosEndpoint || !cosmosKey) {
            return reject(new Error('COSMOS_ENDPOINT or COSMOS_KEY not configured'));
        }

        const hostname = cosmosEndpoint.replace('https://', '').replace(':443/', '').replace('/', '');
        const date = new Date().toUTCString();
        const token = cosmosAuthToken(method, resourceType, resourceLink, date, cosmosKey);

        const headers = {
            'Authorization': token,
            'x-ms-version': '2018-12-31',
            'x-ms-date': date,
            'Content-Type': 'application/json'
        };

        if (body && body.date) {
            headers['x-ms-documentdb-partitionkey'] = JSON.stringify([body.date]);
        }

        const bodyStr = body ? JSON.stringify(body) : null;
        if (bodyStr) {
            headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const options = { hostname, port: 443, path, method, headers };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
                } else {
                    reject(new Error(`Cosmos ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

/**
 * Query Cosmos DB
 */
function cosmosQuery(querySpec) {
    return new Promise((resolve, reject) => {
        const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
        const cosmosKey = process.env.COSMOS_KEY;
        const databaseId = process.env.COSMOS_DATABASE || 'waterlevels';
        const containerId = process.env.COSMOS_CONTAINER || 'readings';

        if (!cosmosEndpoint || !cosmosKey) {
            return reject(new Error('COSMOS_ENDPOINT or COSMOS_KEY not configured'));
        }

        const hostname = cosmosEndpoint.replace('https://', '').replace(':443/', '').replace('/', '');
        const date = new Date().toUTCString();
        const resourceLink = `dbs/${databaseId}/colls/${containerId}`;
        const token = cosmosAuthToken('POST', 'docs', resourceLink, date, cosmosKey);

        const bodyStr = JSON.stringify(querySpec);

        const options = {
            hostname,
            port: 443,
            path: `/dbs/${databaseId}/colls/${containerId}/docs`,
            method: 'POST',
            headers: {
                'Authorization': token,
                'x-ms-version': '2018-12-31',
                'x-ms-date': date,
                'Content-Type': 'application/query+json',
                'x-ms-documentdb-isquery': 'true',
                'x-ms-documentdb-query-enablecrosspartition': 'true',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const parsed = data ? JSON.parse(data) : { Documents: [] };
                    resolve(parsed.Documents || []);
                } else {
                    reject(new Error(`Cosmos query ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

/**
 * POST /api/water-levels
 * Submit water level readings
 */
app.post('/api/water-levels', async (req, res) => {
    try {
        const body = req.body;

        if (!body || !body.readings || !Array.isArray(body.readings)) {
            return res.status(400).json({ error: "Missing or invalid 'readings' array" });
        }

        for (const reading of body.readings) {
            if (!reading.reservoirId || reading.levelPercent === undefined || !reading.status) {
                return res.status(400).json({ error: 'Each reading must have reservoirId, levelPercent, and status' });
            }
        }

        const databaseId = process.env.COSMOS_DATABASE || 'waterlevels';
        const containerId = process.env.COSMOS_CONTAINER || 'readings';

        const doc = {
            id: body.id || `${body.date || new Date().toISOString().split('T')[0]}_${Date.now()}`,
            date: body.date || new Date().toISOString().split('T')[0],
            submittedBy: body.submittedBy || 'unknown',
            submittedByName: body.submittedByName || '',
            submittedAt: body.submittedAt || new Date().toISOString(),
            readings: body.readings
        };

        console.log(`💧 Submitting water levels: ${doc.id}`);

        const path = `/dbs/${databaseId}/colls/${containerId}/docs`;
        const resourceLink = `dbs/${databaseId}/colls/${containerId}`;
        const result = await cosmosRequest('POST', path, 'docs', resourceLink, doc);

        console.log(`✅ Water levels saved: ${result.body.id}`);
        res.status(201).json(result.body);

    } catch (error) {
        console.error('❌ Water levels submit error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/water-levels
 * Get past water level submissions
 */
app.get('/api/water-levels', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const date = req.query.date;

        let querySpec;
        if (date) {
            querySpec = {
                query: 'SELECT TOP @limit * FROM c WHERE c.date = @date',
                parameters: [
                    { name: '@limit', value: limit },
                    { name: '@date', value: date }
                ]
            };
        } else {
            querySpec = {
                query: 'SELECT TOP @limit * FROM c',
                parameters: [{ name: '@limit', value: limit }]
            };
        }

        console.log(`💧 Fetching water levels (limit: ${limit}, date: ${date || 'all'})`);
        const results = await cosmosQuery(querySpec);

        // Sort client-side (descending by submittedAt)
        results.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));

        console.log(`✅ Returned ${results.length} water level records`);

        res.json(results);

    } catch (error) {
        console.error('❌ Water levels fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ACS CALLING — Token & Identity Management
// ============================================

/**
 * POST /api/comms/token
 * Issues an Azure Communication Services access token for calling.
 * The app calls this with the user's Bitrix ID, and gets back an ACS token
 * that allows them to make/receive VoIP calls.
 *
 * Body: { user_id: string }
 * Returns: { token, expiresOn, acsUserId }
 */
app.post('/api/comms/token', async (req, res) => {
    try {
        const connectionString = process.env.ACS_CONNECTION_STRING;
        if (!connectionString) {
            return res.status(503).json({
                error: 'Calling service not configured',
                message: 'ACS_CONNECTION_STRING not set'
            });
        }

        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        console.log(`📞 Issuing ACS calling token for user: ${user_id}`);

        const { endpoint, accessKey } = parseConnectionString(connectionString);

        // Check if user already has an ACS identity stored in DB
        let acsUserId = null;
        if (pool) {
            const existing = await pool.query(
                'SELECT acs_user_id FROM acs_identities WHERE bitrix_user_id = $1',
                [user_id]
            ).catch(() => ({ rows: [] }));

            if (existing.rows.length > 0) {
                acsUserId = existing.rows[0].acs_user_id;
            }
        }

        if (!acsUserId) {
            // Create new ACS identity
            const identity = await createAcsIdentity(endpoint, accessKey);
            acsUserId = identity.id;

            // Store mapping in DB
            if (pool) {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS acs_identities (
                        bitrix_user_id VARCHAR(50) PRIMARY KEY,
                        acs_user_id VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `).catch(() => {});

                await pool.query(
                    `INSERT INTO acs_identities (bitrix_user_id, acs_user_id) 
                     VALUES ($1, $2) 
                     ON CONFLICT (bitrix_user_id) DO UPDATE SET acs_user_id = $2`,
                    [user_id, acsUserId]
                ).catch(e => console.warn('DB store failed:', e.message));
            }
        }

        // Issue access token with VOIP scope
        const tokenResult = await issueAcsToken(endpoint, accessKey, acsUserId);

        console.log(`✅ ACS token issued for user ${user_id} (ACS: ${acsUserId.substring(0, 20)}...)`);

        res.json({
            token: tokenResult.token,
            expiresOn: tokenResult.expiresOn,
            acsUserId: acsUserId,
            userId: user_id
        });

    } catch (error) {
        console.error('❌ ACS token error:', error.message);
        res.status(500).json({ error: 'Failed to issue calling token', message: error.message });
    }
});

/**
 * POST /api/comms/lookup
 * Look up the ACS identity for a Bitrix user (needed to call them).
 * If the user doesn't have an identity yet, create one automatically.
 * Body: { user_id: string }
 * Returns: { acsUserId }
 */
app.post('/api/comms/lookup', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        if (!pool) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        const connectionString = process.env.ACS_CONNECTION_STRING;
        if (!connectionString) {
            return res.status(503).json({ error: 'ACS not configured' });
        }

        // Check if user already has an ACS identity
        const result = await pool.query(
            'SELECT acs_user_id FROM acs_identities WHERE bitrix_user_id = $1',
            [user_id]
        );

        if (result.rows.length > 0) {
            return res.json({ acsUserId: result.rows[0].acs_user_id, userId: user_id });
        }

        // User doesn't have an identity yet — create one
        console.log(`📞 Creating ACS identity for user ${user_id} (first call to them)`);
        const { endpoint, accessKey } = parseConnectionString(connectionString);
        const identity = await createAcsIdentity(endpoint, accessKey);

        // Store mapping
        await pool.query(`
            CREATE TABLE IF NOT EXISTS acs_identities (
                bitrix_user_id VARCHAR(50) PRIMARY KEY,
                acs_user_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(() => {});

        await pool.query(
            `INSERT INTO acs_identities (bitrix_user_id, acs_user_id) 
             VALUES ($1, $2) 
             ON CONFLICT (bitrix_user_id) DO UPDATE SET acs_user_id = $2`,
            [user_id, identity.id]
        );

        console.log(`✅ ACS identity created for user ${user_id}`);
        res.json({ acsUserId: identity.id, userId: user_id });
    } catch (error) {
        console.error('❌ ACS lookup error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/comms/call-notify
 * When user A calls user B, send a push notification to user B's device
 * to wake the app and show incoming call screen.
 * Body: { caller_user_id, caller_name, target_user_id }
 */
app.post('/api/comms/call-notify', async (req, res) => {
    try {
        const { caller_user_id, caller_name, target_user_id, room_id } = req.body;
        if (!caller_user_id || !target_user_id) {
            return res.status(400).json({ error: 'caller_user_id and target_user_id required' });
        }

        if (!pool) {
            return res.status(503).json({ error: 'Database not configured' });
        }

        console.log(`📞 Call notification: ${caller_name} (${caller_user_id}) → User ${target_user_id} | Room: ${room_id}`);

        // Get target user's FCM token
        const tokenResult = await pool.query(
            'SELECT fcm_token FROM push_tokens WHERE user_id = $1 AND fcm_token IS NOT NULL',
            [target_user_id]
        );

        if (tokenResult.rows.length === 0) {
            console.log(`⚠️ No FCM token found for user ${target_user_id}`);
            return res.json({ success: false, message: 'No FCM token for target user' });
        }

        if (!firebaseInitialized) {
            return res.status(503).json({ error: 'FCM not configured' });
        }

        // Send high-priority FCM push with call data
        let sent = 0;
        for (const row of tokenResult.rows) {
            try {
                const message = {
                    token: row.fcm_token,
                    data: {
                        type: 'INCOMING_CALL',
                        caller_user_id: String(caller_user_id),
                        caller_name: caller_name || 'Unknown',
                        target_user_id: String(target_user_id),
                        room_id: room_id || '',
                        timestamp: Date.now().toString()
                    },
                    android: {
                        priority: 'high',
                        ttl: 45000 // 45 seconds
                    }
                };

                await admin.messaging().send(message);
                sent++;
                console.log(`✅ Call push sent to user ${target_user_id}`);
            } catch (fcmError) {
                console.error(`❌ FCM call push failed: ${fcmError.message}`);
                if (fcmError.code === 'messaging/registration-token-not-registered') {
                    pool.query('DELETE FROM push_tokens WHERE fcm_token = $1', [row.fcm_token]).catch(() => {});
                }
            }
        }

        res.json({ success: sent > 0, sent });
    } catch (error) {
        console.error('❌ Call notify error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── ACS Identity & Token Helpers ─────────────────────────────────────

async function createAcsIdentity(endpoint, accessKey) {
    const apiVersion = '2023-10-01';
    const path = `/identities?api-version=${apiVersion}`;
    const body = JSON.stringify({ createTokenWithScopes: ["voip"] });
    const dateHeader = new Date().toUTCString();
    const contentHash = crypto.createHash('sha256').update(body).digest('base64');

    const parsedUrl = new URL(endpoint);
    const host = parsedUrl.host;
    
    // ACS HMAC signing: "VERB\nurl_path_and_query\ndate;host;content-sha256"
    const stringToSign = `POST\n${path}\n${dateHeader};${host};${contentHash}`;
    const signature = crypto.createHmac('sha256', Buffer.from(accessKey, 'base64'))
        .update(stringToSign, 'utf8').digest('base64');
    const authHeader = `HMAC-SHA256 SignedHeaders=date;host;x-ms-content-sha256&Signature=${signature}`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Date': dateHeader,
                'x-ms-content-sha256': contentHash,
                'Authorization': authHeader
            }
        };
        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    const parsed = JSON.parse(data);
                    resolve({ id: parsed.identity.id, token: parsed.accessToken?.token, expiresOn: parsed.accessToken?.expiresOn });
                } else {
                    reject(new Error(`ACS identity creation failed ${response.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function issueAcsToken(endpoint, accessKey, acsUserId) {
    const apiVersion = '2023-10-01';
    const path = `/identities/${encodeURIComponent(acsUserId)}/:issueAccessToken?api-version=${apiVersion}`;
    const body = JSON.stringify({ scopes: ["voip"] });
    const dateHeader = new Date().toUTCString();
    const contentHash = crypto.createHash('sha256').update(body).digest('base64');

    const parsedUrl = new URL(endpoint);
    const host = parsedUrl.host;

    const stringToSign = `POST\n${path}\n${dateHeader};${host};${contentHash}`;
    const signature = crypto.createHmac('sha256', Buffer.from(accessKey, 'base64'))
        .update(stringToSign, 'utf8').digest('base64');
    const authHeader = `HMAC-SHA256 SignedHeaders=date;host;x-ms-content-sha256&Signature=${signature}`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'Date': dateHeader,
                'x-ms-content-sha256': contentHash,
                'Authorization': authHeader
            }
        };
        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    const parsed = JSON.parse(data);
                    resolve({ token: parsed.token, expiresOn: parsed.expiresOn });
                } else {
                    reject(new Error(`ACS token issue failed ${response.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ============================================
// EMAIL NOTIFICATION ENDPOINTS (Azure Communication Services)
// ============================================

/**
 * POST /api/email/send
 * Send email notification via Azure Communication Services
 * 
 * Body: {
 *   to: string | string[],        // Recipient email(s)
 *   subject: string,              // Email subject
 *   html: string,                 // HTML body
 *   text?: string,                // Plain text fallback
 *   from?: string                 // Sender (default: noreply@sdinmotion.co.za)
 * }
 */
app.post('/api/email/send', async (req, res) => {
    try {
        const connectionString = process.env.AZURE_COMMS_CONNECTION_STRING;
        if (!connectionString) {
            return res.status(503).json({ 
                error: 'Email service not configured',
                message: 'AZURE_COMMS_CONNECTION_STRING not set' 
            });
        }

        const { to, subject, html, text, from } = req.body;

        if (!to || !subject || !html) {
            return res.status(400).json({ 
                error: 'Missing required fields: to, subject, html' 
            });
        }

        const senderAddress = from || process.env.EMAIL_SENDER || 'DoNotReply@sdinmotion.co.za';
        const recipients = Array.isArray(to) ? to : [to];

        console.log(`📧 Sending email to: ${recipients.join(', ')} | Subject: ${subject}`);

        // Use Azure Communication Services REST API directly (no SDK needed)
        const { endpoint, accessKey } = parseConnectionString(connectionString);
        
        const emailPayload = {
            senderAddress,
            recipients: {
                to: recipients.map(email => ({ address: email }))
            },
            content: {
                subject,
                html,
                plainText: text || subject
            }
        };

        const emailResponse = await sendAzureEmail(endpoint, accessKey, emailPayload);

        console.log(`✅ Email sent successfully. Operation ID: ${emailResponse.id}`);
        res.json({ 
            success: true, 
            operationId: emailResponse.id,
            message: `Email sent to ${recipients.length} recipient(s)` 
        });

    } catch (error) {
        console.error('❌ Email send error:', error.message);
        res.status(500).json({ 
            error: 'Failed to send email',
            message: error.message 
        });
    }
});

/**
 * POST /api/email/ticket-notification
 * Send a formatted ticket notification email
 * 
 * Body: {
 *   type: 'created' | 'assigned' | 'status_changed' | 'comment_added' | 'resolved' | 'reopened',
 *   ticketId: string,
 *   ticketTitle: string,
 *   recipientEmail: string,
 *   recipientName?: string,
 *   technicianName?: string,
 *   callerName?: string,
 *   callerEmail?: string,
 *   status?: string,
 *   comment?: string,
 *   priority?: string,
 *   category?: string,
 *   department?: string
 * }
 */
app.post('/api/email/ticket-notification', async (req, res) => {
    try {
        const connectionString = process.env.AZURE_COMMS_CONNECTION_STRING;
        if (!connectionString) {
            return res.status(503).json({ 
                error: 'Email service not configured',
                message: 'AZURE_COMMS_CONNECTION_STRING not set' 
            });
        }

        const { 
            type, ticketId, ticketTitle, recipientEmail, recipientName,
            technicianName, callerName, callerEmail, status, comment,
            priority, category, department
        } = req.body;

        if (!type || !ticketId || !ticketTitle || !recipientEmail) {
            return res.status(400).json({ 
                error: 'Missing required fields: type, ticketId, ticketTitle, recipientEmail' 
            });
        }

        const senderAddress = process.env.EMAIL_SENDER || 'DoNotReply@sdinmotion.co.za';
        const { subject, html } = buildTicketEmailContent({
            type, ticketId, ticketTitle, recipientName,
            technicianName, callerName, status, comment,
            priority, category, department
        });

        console.log(`📧 Sending ticket ${type} notification to: ${recipientEmail}`);

        const { endpoint, accessKey } = parseConnectionString(connectionString);

        const emailPayload = {
            senderAddress,
            recipients: {
                to: [{ address: recipientEmail, displayName: recipientName || recipientEmail }]
            },
            content: { subject, html, plainText: subject }
        };

        // Also CC the caller on technician notifications (and vice versa)
        if (type === 'comment_added' && callerEmail && callerEmail !== recipientEmail) {
            emailPayload.recipients.to.push({ address: callerEmail, displayName: callerName || callerEmail });
        }

        const emailResponse = await sendAzureEmail(endpoint, accessKey, emailPayload);

        console.log(`✅ Ticket notification sent. Operation ID: ${emailResponse.id}`);
        res.json({ 
            success: true, 
            operationId: emailResponse.id,
            type 
        });

    } catch (error) {
        console.error('❌ Ticket notification error:', error.message);
        res.status(500).json({ 
            error: 'Failed to send ticket notification',
            message: error.message 
        });
    }
});

// ── Email Helper Functions ────────────────────────────────────────────

function parseConnectionString(connStr) {
    const parts = {};
    connStr.split(';').forEach(part => {
        const [key, ...valueParts] = part.split('=');
        parts[key.trim()] = valueParts.join('=').trim();
    });
    return { endpoint: parts['endpoint'], accessKey: parts['accesskey'] };
}

async function sendAzureEmail(endpoint, accessKey, emailPayload) {
    const apiVersion = '2023-03-31';
    const path = `/emails:send?api-version=${apiVersion}`;
    const dateHeader = new Date().toUTCString();

    const bodyStr = JSON.stringify(emailPayload);
    const contentHash = crypto.createHash('sha256').update(bodyStr).digest('base64');

    const parsedUrl = new URL(endpoint);
    const host = parsedUrl.host;

    // ACS HMAC signing: "VERB\nurl_path_and_query\ndate;host;content-sha256"
    const stringToSign = `POST\n${path}\n${dateHeader};${host};${contentHash}`;
    const signature = crypto.createHmac('sha256', Buffer.from(accessKey, 'base64'))
        .update(stringToSign, 'utf8')
        .digest('base64');

    const authHeader = `HMAC-SHA256 SignedHeaders=date;host;x-ms-content-sha256&Signature=${signature}`;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                'Date': dateHeader,
                'x-ms-content-sha256': contentHash,
                'Authorization': authHeader
            }
        };

        const req = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ id: parsed.id || response.headers['x-ms-request-id'] || 'sent', status: response.statusCode });
                } else {
                    reject(new Error(`Azure Email API ${response.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

function buildTicketEmailContent({ type, ticketId, ticketTitle, recipientName, technicianName, callerName, status, comment, priority, category, department }) {
    let subject = '';
    let heading = '';
    let body = '';
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';

    switch (type) {
        case 'created':
            subject = `[Ticket #${ticketId}] New IT Support Request: ${ticketTitle}`;
            heading = '🎫 New Ticket Logged';
            body = `
                <p>${greeting}</p>
                <p>A new IT support ticket has been logged:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px;font-weight:600;border-bottom:1px solid #e5e7eb;width:140px;">Ticket #</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketId}</td></tr>
                    <tr><td style="padding:8px;font-weight:600;border-bottom:1px solid #e5e7eb;">Subject</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ticketTitle}</td></tr>
                    ${category ? `<tr><td style="padding:8px;font-weight:600;border-bottom:1px solid #e5e7eb;">Category</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${category}</td></tr>` : ''}
                    ${priority ? `<tr><td style="padding:8px;font-weight:600;border-bottom:1px solid #e5e7eb;">Priority</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${priority}</td></tr>` : ''}
                    ${department ? `<tr><td style="padding:8px;font-weight:600;border-bottom:1px solid #e5e7eb;">Department</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${department}</td></tr>` : ''}
                    ${callerName ? `<tr><td style="padding:8px;font-weight:600;border-bottom:1px solid #e5e7eb;">Reported By</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${callerName}</td></tr>` : ''}
                </table>
                <p>Our IT team will review and assign this ticket shortly.</p>`;
            break;

        case 'assigned':
            subject = `[Ticket #${ticketId}] Assigned to ${technicianName}: ${ticketTitle}`;
            heading = '🔧 Ticket Assigned';
            body = `
                <p>${greeting}</p>
                <p>Ticket <strong>#${ticketId}</strong> has been assigned to <strong>${technicianName}</strong>.</p>
                <p><strong>Subject:</strong> ${ticketTitle}</p>
                <p>${technicianName} will be in touch to assist you.</p>`;
            break;

        case 'status_changed':
            subject = `[Ticket #${ticketId}] Status: ${status} — ${ticketTitle}`;
            heading = '📋 Status Updated';
            body = `
                <p>${greeting}</p>
                <p>The status of ticket <strong>#${ticketId}</strong> has been updated:</p>
                <p style="font-size:18px;font-weight:600;color:#1976d2;margin:16px 0;">Status: ${status}</p>
                <p><strong>Subject:</strong> ${ticketTitle}</p>`;
            break;

        case 'comment_added':
            subject = `[Ticket #${ticketId}] New Comment: ${ticketTitle}`;
            heading = '💬 New Comment';
            body = `
                <p>${greeting}</p>
                <p>A new comment has been added to ticket <strong>#${ticketId}</strong>:</p>
                <div style="background:#f9fafb;border-left:4px solid #1976d2;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
                    <p style="margin:0;white-space:pre-wrap;">${comment || 'No content'}</p>
                </div>
                <p><strong>Subject:</strong> ${ticketTitle}</p>`;
            break;

        case 'resolved':
            subject = `[Ticket #${ticketId}] Resolved ✅: ${ticketTitle}`;
            heading = '✅ Ticket Resolved';
            body = `
                <p>${greeting}</p>
                <p>Ticket <strong>#${ticketId}</strong> has been <strong>resolved</strong>.</p>
                <p><strong>Subject:</strong> ${ticketTitle}</p>
                <p>If you still experience issues, please reply to this email or log a new ticket.</p>`;
            break;

        case 'reopened':
            subject = `[Ticket #${ticketId}] Reopened: ${ticketTitle}`;
            heading = '🔄 Ticket Reopened';
            body = `
                <p>${greeting}</p>
                <p>Ticket <strong>#${ticketId}</strong> has been <strong>reopened</strong> for further investigation.</p>
                <p><strong>Subject:</strong> ${ticketTitle}</p>`;
            break;

        default:
            subject = `[Ticket #${ticketId}] Update: ${ticketTitle}`;
            heading = '📨 Ticket Update';
            body = `<p>${greeting}</p><p>There's an update on ticket <strong>#${ticketId}</strong>: ${ticketTitle}</p>`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1B5E20,#2E7D32);padding:24px 32px;">
            <h1 style="color:#fff;margin:0;font-size:20px;">${heading}</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">JB Marks ICT Service Desk</p>
        </div>
        <div style="padding:28px 32px;">
            ${body}
        </div>
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">This is an automated notification from the JB Marks ICT Service Desk. Please do not reply directly to this email.</p>
            <p style="margin:6px 0 0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} JB Marks Local Municipality — IT Department</p>
        </div>
    </div>
</body>
</html>`;

    return { subject, html };
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('='.repeat(60));
    console.log('✅ JBmarks Token Exchange Server');
    console.log('='.repeat(60));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 Token exchange: http://localhost:${PORT}/api/exchangetoken`);
    console.log(`🗄️  Database setup: POST http://localhost:${PORT}/api/db/setup`);
    console.log('='.repeat(60));
    
    // Wait a moment for database setup to complete, then verify
    setTimeout(async () => {
        if (pool) {
            try {
                const result = await pool.query(`
                    SELECT COUNT(*) as count FROM information_schema.tables 
                    WHERE table_name = 'push_tokens';
                `);
                if (result.rows[0].count > 0) {
                    console.log('✅ Database table verified: push_tokens exists');
                } else {
                    console.log('⚠️  Database table not found. Call POST /api/db/setup to create it.');
                }
            } catch (err) {
                console.error('❌ Error checking database:', err.message);
            }
        }
    }, 2000);
});

module.exports = app;
