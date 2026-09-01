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

        // Network Monitor: shared node configuration (globally accessible across devices)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS network_nodes (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                url VARCHAR(1000) NOT NULL,
                location VARCHAR(500),
                type VARCHAR(32) DEFAULT 'other',
                expected_status INTEGER,
                timeout INTEGER,
                sort_order INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ network_nodes table created/verified');

        // Network Monitor: latest status per node, pushed by the on-network probe agent
        await pool.query(`
            CREATE TABLE IF NOT EXISTS network_status (
                node_id VARCHAR(64) PRIMARY KEY,
                status VARCHAR(16) NOT NULL,
                response_time INTEGER,
                status_code INTEGER,
                error TEXT,
                method VARCHAR(16),
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                agent_id VARCHAR(128)
            );
        `);
        console.log('✅ network_status table created/verified');

        // Service Desk: escalation tracking (dedupe so a ticket isn't re-escalated each cycle)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_escalations (
                ticket_id VARCHAR(64) NOT NULL,
                level INTEGER NOT NULL,
                reason VARCHAR(64) NOT NULL,
                escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (ticket_id, level)
            );
        `);
        console.log('✅ ticket_escalations table created/verified');

        // Service Desk: single-row JSON configuration register (categories,
        // priorities, statuses, assignment, escalation, notifications, reporting)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS service_desk_config (
                id INTEGER PRIMARY KEY DEFAULT 1,
                config JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by VARCHAR(255),
                CONSTRAINT single_row CHECK (id = 1)
            );
        `);
        console.log('✅ service_desk_config table created/verified');
        
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

// CORS (Bearer-token auth, so wildcard origin is safe — no cookies used)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-agent-token');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ============================================
// AUTHENTICATION & RBAC (server-side, JWT via crypto — no extra deps)
// ============================================
const authCrypto = require('crypto');
const SDESK_WEBHOOK = process.env.BITRIX_WEBHOOK_URL || 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss';
const SDESK_IT_GROUP = process.env.IT_GROUP_ID || '14';        // IT Support agents
const SDESK_MGR_GROUP = process.env.SDESK_MANAGER_GROUP || '17'; // Service Desk Managers (read-only)
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_dev_only_secret';
const JWT_TTL_SECONDS = parseInt(process.env.JWT_TTL_SECONDS || '43200', 10); // 12h

const ROLES = { ADMIN: 'admin', AGENT: 'agent', MANAGER: 'manager', REQUESTER: 'requester' };

function b64url(buf) {
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }

function signJwt(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + JWT_TTL_SECONDS };
    const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
    const sig = b64url(authCrypto.createHmac('sha256', JWT_SECRET).update(data).digest());
    return `${data}.${sig}`;
}

function verifyJwt(token) {
    try {
        const [h, p, s] = token.split('.');
        if (!h || !p || !s) return null;
        const expected = b64url(authCrypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest());
        // constant-time compare
        if (s.length !== expected.length || !authCrypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
        const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
        return payload;
    } catch { return null; }
}

// Server-side Bitrix call (keeps the webhook token off the client)
function sdeskBitrix(method, params) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SDESK_WEBHOOK.replace(/\/$/, '')}/${method}.json`);
        const body = JSON.stringify(params || {});
        const options = {
            hostname: url.hostname, port: 443, path: url.pathname + url.search, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        };
        const rq = https.request(options, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) return reject(new Error(parsed.error_description || parsed.error));
                    resolve(parsed);
                } catch (e) { reject(new Error(`Bitrix parse error: ${data.slice(0, 200)}`)); }
            });
        });
        rq.on('error', reject);
        rq.write(body); rq.end();
    });
}

// Determine a user's Service Desk role from Bitrix group membership.
// Manager group (read-only) takes precedence for reporting; group-14 role
// (A/E owner-moderator = admin, else agent); otherwise requester.
async function resolveRole(userId) {
    let itRole = null, isManager = false;
    try {
        const it = await sdeskBitrix('sonet_group.user.get', { ID: SDESK_IT_GROUP });
        const me = (it.result || []).find(m => String(m.USER_ID) === String(userId));
        if (me) itRole = me.ROLE; // 'A' owner, 'E' moderator, 'K' member
    } catch { /* ignore */ }
    try {
        const mg = await sdeskBitrix('sonet_group.user.get', { ID: SDESK_MGR_GROUP });
        isManager = (mg.result || []).some(m => String(m.USER_ID) === String(userId));
    } catch { /* ignore */ }

    if (itRole === 'A' || itRole === 'E') return ROLES.ADMIN;
    if (itRole === 'K') return ROLES.AGENT;
    if (isManager) return ROLES.MANAGER;
    return ROLES.REQUESTER;
}

// Middleware: require a valid JWT; attaches req.auth = { sub, role, name, email }
function requireAuth(req, res, next) {
    const hdr = req.headers['authorization'] || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    const payload = token ? verifyJwt(token) : null;
    if (!payload) return res.status(401).json({ error: 'unauthorized', message: 'Valid session token required' });
    req.auth = payload;
    next();
}

// Middleware: require one of the given roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth) return res.status(401).json({ error: 'unauthorized' });
        if (!roles.includes(req.auth.role)) {
            return res.status(403).json({ error: 'forbidden', message: `Requires role: ${roles.join(' or ')}` });
        }
        next();
    };
}

// Machine-endpoint guard (agent/cron). Uses NETWORK_AGENT_TOKEN or JWT admin.
function requireAgentOrAdmin(req, res, next) {
    const expected = process.env.NETWORK_AGENT_TOKEN;
    const provided = req.headers['x-agent-token'];
    if (expected && provided === expected) return next();
    const hdr = req.headers['authorization'] || '';
    const payload = hdr.startsWith('Bearer ') ? verifyJwt(hdr.slice(7)) : null;
    if (payload && (payload.role === ROLES.ADMIN)) return next();
    return res.status(401).json({ error: 'unauthorized', message: 'Agent token or admin session required' });
}

// NOTE: Password-based login was replaced by the Bitrix OAuth flow
// (GET /api/auth/authorize-url + POST /api/auth/oauth). Users authenticate on
// Bitrix's own login page — the apps never handle passwords.

/** GET /api/auth/me — returns current session identity + role */
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ id: req.auth.sub, role: req.auth.role, name: req.auth.name, email: req.auth.email });
});

/**
 * POST /api/auth/helpdesk-login
 * Helpdesk (end-user portal) ONLY: username/email lookup, no password.
 * Issues a JWT capped at the "requester" role — regardless of the user's real
 * Bitrix role — so this easy-login path can NEVER grant agent/admin/manager
 * access. Requester scope (own-tickets-only) is still enforced server-side.
 * The Support Dashboard does NOT use this endpoint; it stays on OAuth.
 */
app.post('/api/auth/helpdesk-login', async (req, res) => {
    try {
        const { username } = req.body || {};
        if (!username) return res.status(400).json({ error: 'bad_request', message: 'username required' });

        const u = await sdeskBitrix('user.get', { FILTER: { ACTIVE: true } });
        const list = u.result || [];
        const q = String(username).trim().toLowerCase();
        const found = list.find(x =>
            (x.EMAIL && x.EMAIL.toLowerCase() === q) ||
            (x.LOGIN && x.LOGIN.toLowerCase() === q) ||
            (`${x.NAME || ''} ${x.LAST_NAME || ''}`.trim().toLowerCase() === q) ||
            (x.NAME && x.NAME.toLowerCase() === q) ||
            (x.LAST_NAME && x.LAST_NAME.toLowerCase() === q)
        );
        if (!found) return res.status(404).json({ error: 'user_not_found', message: 'User not found. Check your name or email.' });

        // Force requester role — this endpoint can never mint staff access.
        const token = signJwt({
            sub: String(found.ID),
            role: ROLES.REQUESTER,
            name: `${found.NAME || ''} ${found.LAST_NAME || ''}`.trim(),
            email: found.EMAIL || '',
        });

        console.log(`🔓 Helpdesk login: user ${found.ID} (${found.EMAIL}) role=requester`);
        res.json({
            token,
            user: {
                id: String(found.ID), name: found.NAME || '', lastName: found.LAST_NAME || '',
                email: found.EMAIL || '', position: found.WORK_POSITION || '', photo: found.PERSONAL_PHOTO || null,
                role: ROLES.REQUESTER,
            },
        });
    } catch (error) {
        console.error('❌ Helpdesk login error:', error.message);
        res.status(500).json({ error: 'login_failed', message: error.message });
    }
});

/**
 * Pick the Bitrix OAuth client based on which web app is logging in.
 * Each app has its own registered handler path in Bitrix, so we match on the
 * redirect_uri's host. Dashboard → SDESK_BITRIX_*, Portal → SDESK_PORTAL_*.
 */
function pickOAuthClient(redirectUri) {
    const portalHostMatch = process.env.SDESK_PORTAL_HOST || 'zealous-sand-0050fce00';
    let host = '';
    try { host = new URL(redirectUri).host; } catch { /* ignore */ }

    // Portal: use its dedicated app only if explicitly enabled (once its
    // oauth.bitrix.info sync is confirmed). Otherwise both web apps use the
    // dashboard app, which must have BOTH handler paths registered in Bitrix.
    if (host.includes(portalHostMatch) && process.env.SDESK_PORTAL_ENABLED === 'true' && process.env.SDESK_PORTAL_CLIENT_ID) {
        return {
            clientId: process.env.SDESK_PORTAL_CLIENT_ID,
            clientSecret: process.env.SDESK_PORTAL_CLIENT_SECRET,
        };
    }
    // Default: dashboard app (confirmed working / synced). Falls back to shared app if unset.
    return {
        clientId: process.env.SDESK_BITRIX_CLIENT_ID || process.env.BITRIX_CLIENT_ID,
        clientSecret: process.env.SDESK_BITRIX_CLIENT_SECRET || process.env.BITRIX_CLIENT_SECRET,
    };
}

/**
 * GET /api/auth/authorize-url?redirect_uri=...
 * Returns the Bitrix OAuth authorize URL for the service desk web apps to
 * redirect the browser to. The user authenticates on Bitrix's own page.
 */
app.get('/api/auth/authorize-url', (req, res) => {
    const portal = process.env.BITRIX_PORTAL_URL || 'https://jbmarks.sdinmotion.co.za';
    const redirectUri = req.query.redirect_uri;
    if (!redirectUri) return res.status(400).json({ error: 'bad_request', message: 'redirect_uri required' });
    const { clientId } = pickOAuthClient(redirectUri);
    if (!clientId) return res.status(500).json({ error: 'oauth_not_configured', message: 'OAuth client not configured' });
    // Minimal scopes needed for the service desk
    const scope = 'user,task,tasks_extended,sonet_group,im';
    const url = `${portal}/oauth/authorize/?client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ url });
});

/**
 * POST /api/auth/oauth
 * Body: { code, redirect_uri }
 * Exchanges a Bitrix OAuth authorization code for an access token, identifies
 * the real logged-in user, resolves their Service Desk role, and issues our JWT.
 * The user's password is only ever entered on Bitrix's own login page.
 */
app.post('/api/auth/oauth', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body || {};
        if (!code || !redirect_uri) {
            return res.status(400).json({ error: 'bad_request', message: 'code and redirect_uri required' });
        }

        // Choose the OAuth app matching the web app that started login.
        const { clientId, clientSecret } = pickOAuthClient(redirect_uri);
        if (!clientId || !clientSecret) {
            return res.status(500).json({ error: 'oauth_not_configured', message: 'Bitrix OAuth client not configured' });
        }

        // Exchange the code for a Bitrix access token.
        const bx = await exchangeBitrixCode(code, redirect_uri, clientId, clientSecret);
        if (!bx || !bx.access_token) {
            const detail = bx && (bx.error_description || bx.error) ? `${bx.error || ''}: ${bx.error_description || ''}` : 'unknown';
            console.error('❌ Token exchange returned no access_token:', JSON.stringify(bx));
            return res.status(401).json({ error: 'oauth_failed', message: `Could not exchange authorization code (${detail})` });
        }

        // Identify the authenticated user with their own access token.
        const me = await bitrixUserCurrent(bx.access_token, bx.client_endpoint || bx.server_endpoint);
        if (!me || !me.ID) {
            return res.status(401).json({ error: 'oauth_failed', message: 'Could not resolve authenticated user' });
        }

        const role = await resolveRole(me.ID);
        const token = signJwt({
            sub: String(me.ID),
            role,
            name: `${me.NAME || ''} ${me.LAST_NAME || ''}`.trim(),
            email: me.EMAIL || '',
        });

        console.log(`🔐 OAuth login: user ${me.ID} (${me.EMAIL}) role=${role}`);
        res.json({
            token,
            user: {
                id: String(me.ID), name: me.NAME || '', lastName: me.LAST_NAME || '',
                email: me.EMAIL || '', position: me.WORK_POSITION || '', photo: me.PERSONAL_PHOTO || null, role,
            },
        });
    } catch (error) {
        console.error('❌ OAuth login error:', error.message);
        res.status(500).json({ error: 'oauth_failed', message: error.message });
    }
});

// Low-level token POST to a given host/path with given params.
function bitrixTokenPost(hostname, path, params) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams(params).toString();
        const rq = https.request({
            hostname, port: 443, path, method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData), 'Accept': 'application/json' },
        }, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve({ error: 'non_json', error_description: data.slice(0, 200) }); }
            });
        });
        rq.on('error', reject);
        rq.write(postData); rq.end();
    });
}

// Exchange a Bitrix authorization code for tokens.
// local.* apps use oauth.bitrix.info. We try with redirect_uri first, then
// without (some Box configs reject a redirect_uri on the server-side exchange).
async function exchangeBitrixCode(code, redirectUri, clientId, clientSecret) {
    const useOAuthServer = clientId.startsWith('local.');
    const base = { grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code };

    if (useOAuthServer) {
        // Attempt 1: with redirect_uri
        let r = await bitrixTokenPost('oauth.bitrix.info', '/oauth/token/', { ...base, redirect_uri: redirectUri });
        if (r && r.access_token) return r;
        console.warn('⚠️ oauth.bitrix.info (with redirect_uri) failed:', JSON.stringify(r));
        // Attempt 2: without redirect_uri
        let r2 = await bitrixTokenPost('oauth.bitrix.info', '/oauth/token/', base);
        if (r2 && r2.access_token) return r2;
        console.warn('⚠️ oauth.bitrix.info (no redirect_uri) failed:', JSON.stringify(r2));
        return r2 || r;
    }

    // Cloud/portal-hosted OAuth
    const portalHost = new URL(process.env.BITRIX_PORTAL_URL || 'https://jbmarks.sdinmotion.co.za').host;
    return bitrixTokenPost(portalHost, '/oauth/token/', { ...base, redirect_uri: redirectUri });
}

// Call user.current with the user's own access token to identify them.
function bitrixUserCurrent(accessToken, clientEndpoint) {
    return new Promise((resolve, reject) => {
        const base = (clientEndpoint || `${process.env.BITRIX_PORTAL_URL || 'https://jbmarks.sdinmotion.co.za'}/rest/`).replace(/\/$/, '');
        const url = new URL(`${base}/user.current.json?auth=${encodeURIComponent(accessToken)}`);
        https.get({ hostname: url.hostname, port: 443, path: url.pathname + url.search }, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.result || null);
                } catch { reject(new Error(`user.current non-JSON: ${data.slice(0, 150)}`)); }
            });
        }).on('error', reject);
    });
}

// ============================================
// SERVICE DESK TICKET PROXY (role-enforced; keeps Bitrix token server-side)
// ============================================

function extractDescField(description, label) {
    if (!description) return '';
    const re = new RegExp(`^${label}:\\s*(.+)`, 'im');
    for (const line of String(description).split('\n')) {
        const m = re.exec(line.trim());
        if (m && m[1] && m[1].trim() && m[1].trim() !== 'Not provided') return m[1].trim();
    }
    return '';
}

/**
 * GET /api/tickets
 * Agents/Admins/Managers: all IT tickets. Requesters: only their own
 * (tickets they created OR where description Email matches their session email).
 */
app.get('/api/tickets', requireAuth, async (req, res) => {
    try {
        const resp = await sdeskBitrix('tasks.task.list', {
            filter: { GROUP_ID: SDESK_IT_GROUP },
            select: ['ID', 'TITLE', 'DESCRIPTION', 'STATUS', 'PRIORITY', 'DEADLINE', 'CREATED_DATE', 'CLOSED_DATE', 'CREATED_BY', 'RESPONSIBLE_ID', 'GROUP_ID'],
        });
        let tasks = (resp.result && resp.result.tasks) || [];

        // Requesters only see their own tickets
        if (req.auth.role === ROLES.REQUESTER) {
            const myId = String(req.auth.sub);
            const myEmail = (req.auth.email || '').toLowerCase();
            tasks = tasks.filter(t => {
                const createdBy = String(t.createdBy || t.CREATED_BY || '');
                const email = extractDescField(t.description || t.DESCRIPTION, 'Email').toLowerCase();
                return createdBy === myId || (myEmail && email === myEmail);
            });
        }
        res.json({ tickets: tasks, role: req.auth.role });
    } catch (error) {
        console.error('❌ /api/tickets error:', error.message);
        res.status(500).json({ error: 'tickets_failed', message: error.message });
    }
});

/** GET /api/tickets/:id — same ownership rules as the list */
app.get('/api/tickets/:id', requireAuth, async (req, res) => {
    try {
        const resp = await sdeskBitrix('tasks.task.get', { taskId: req.params.id, select: ['*', 'UF_*'] });
        const task = resp.result && resp.result.task;
        if (!task) return res.status(404).json({ error: 'not_found' });

        if (req.auth.role === ROLES.REQUESTER) {
            const myId = String(req.auth.sub);
            const myEmail = (req.auth.email || '').toLowerCase();
            const createdBy = String(task.createdBy || '');
            const email = extractDescField(task.description, 'Email').toLowerCase();
            if (createdBy !== myId && !(myEmail && email === myEmail)) {
                return res.status(403).json({ error: 'forbidden', message: 'You can only view your own tickets' });
            }
        }

        // Attach comments so both apps can display the conversation.
        task.comments = await fetchTaskComments(req.params.id);
        res.json({ ticket: task });
    } catch (error) {
        console.error('❌ /api/tickets/:id error:', error.message);
        res.status(500).json({ error: 'ticket_failed', message: error.message });
    }
});

/** GET /api/tickets/:id/comments — comments only (used by polling). */
app.get('/api/tickets/:id/comments', requireAuth, async (req, res) => {
    try {
        const comments = await fetchTaskComments(req.params.id);
        res.json({ comments });
    } catch (error) {
        console.error('❌ comments fetch error:', error.message);
        res.status(500).json({ error: 'comments_failed', message: error.message });
    }
});

// Fetch task comments. On the new Bitrix task card (tasks module >= 25.700.0)
// comments are messages in the task's linked chat — task.commentitem.getlist
// no longer returns them. So: get the task's CHAT_ID, then read the chat via
// im.dialog.messages.get (DIALOG_ID = "chat{CHAT_ID}"). Falls back to the old
// forum getlist for legacy tasks that still have a forum topic.
async function fetchTaskComments(taskId) {
    // 1) New task card: read the linked chat.
    try {
        const tg = await sdeskBitrix('tasks.task.get', { taskId: String(taskId), select: ['ID', 'CHAT_ID'] });
        const chatId = tg.result && tg.result.task && tg.result.task.chatId;
        if (chatId) {
            const dm = await sdeskBitrix('im.dialog.messages.get', { DIALOG_ID: `chat${chatId}`, LIMIT: 100 });
            const result = dm.result || {};
            const messages = result.messages || [];
            const users = {};
            (result.users || []).forEach(u => { users[String(u.id)] = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim(); });
            const mapped = messages
                // Drop pure system lines (author_id 0 = system notifications)
                .filter(m => String(m.author_id) !== '0' && (m.text || '').trim())
                .map(m => ({
                    ID: String(m.id),
                    AUTHOR_ID: String(m.author_id),
                    AUTHOR_NAME: users[String(m.author_id)] || `User ${m.author_id}`,
                    POST_MESSAGE: cleanBitrixText(m.text || ''),
                    POST_DATE: m.date || '',
                }));
            // Chat returns newest-first; present oldest-first for a natural thread.
            return mapped.reverse();
        }
    } catch (e) {
        console.warn(`chat comments failed for #${taskId}: ${e.message}`);
    }

    // 2) Legacy fallback: old forum-based comments.
    try {
        const r = await sdeskBitrix('task.commentitem.getlist', [String(taskId), {}, {}]);
        const rows = Array.isArray(r.result) ? r.result : [];
        return rows.map(c => ({
            ID: c.ID || c.id || '',
            AUTHOR_ID: c.AUTHOR_ID || c.authorId || '',
            AUTHOR_NAME: c.AUTHOR_NAME || (c.author && c.author.name) || '',
            POST_MESSAGE: cleanBitrixText(c.POST_MESSAGE || c.postMessage || ''),
            POST_DATE: c.POST_DATE || c.postDate || c.createdDate || '',
        }));
    } catch { return []; }
}

// Strip Bitrix BBCode / emoji hex codes from message text for clean display.
function cleanBitrixText(text) {
    return String(text)
        .replace(/\[USER=\d+\]([^\[]*)\[\/USER\]/gi, '$1')
        .replace(/\[\/?[A-Z]+(=[^\]]*)?\]/gi, '')
        .replace(/:[0-9a-f]{8}:/gi, '')
        .trim();
}

/**
 * POST /api/tickets  — create a ticket (any authenticated user = requester+).
 * The server stamps CREATED_BY from the session so ownership is trustworthy.
 * Body: { title, description, priority (0-2), deadlineHours? }
 */
app.post('/api/tickets', requireAuth, async (req, res) => {
    try {
        const { title, description, priority, deadlineHours } = req.body || {};
        if (!title) return res.status(400).json({ error: 'bad_request', message: 'title required' });

        const fields = {
            TITLE: String(title),
            DESCRIPTION: String(description || ''),
            GROUP_ID: SDESK_IT_GROUP,
            RESPONSIBLE_ID: WEBHOOK_USER_ID,   // unassigned queue
            CREATED_BY: String(req.auth.sub),  // trustworthy owner from session
            PRIORITY: ['0', '1', '2'].includes(String(priority)) ? String(priority) : '1',
        };
        if (deadlineHours) {
            const dl = new Date(Date.now() + Number(deadlineHours) * 3600000);
            fields.DEADLINE = dl.toISOString();
        }
        const resp = await sdeskBitrix('tasks.task.add', { fields });
        const taskId = resp.result && resp.result.task && resp.result.task.id;
        res.json({ success: true, ticketId: taskId });
    } catch (error) {
        console.error('❌ ticket create error:', error.message);
        res.status(500).json({ error: 'create_failed', message: error.message });
    }
});

/** POST /api/tickets/:id/action  { action: start|complete|defer|reopen } — Agent/Admin only */
app.post('/api/tickets/:id/action', requireAuth, requireRole(ROLES.AGENT, ROLES.ADMIN), async (req, res) => {
    try {
        const { action } = req.body || {};
        const map = { start: 'tasks.task.start', complete: 'tasks.task.complete', defer: 'tasks.task.defer', reopen: 'tasks.task.renew' };
        if (!map[action]) return res.status(400).json({ error: 'bad_action' });
        await sdeskBitrix(map[action], { taskId: req.params.id });
        // Attributable audit comment
        await sdeskBitrix('task.commentitem.add', [req.params.id, { POST_MESSAGE: `📋 Status "${action}" by ${req.auth.name} (${req.auth.role})` }]).catch(() => {});
        res.json({ success: true });
    } catch (error) {
        console.error('❌ ticket action error:', error.message);
        res.status(500).json({ error: 'action_failed', message: error.message });
    }
});

/** POST /api/tickets/:id/assign { userId } — Agent/Admin only */
app.post('/api/tickets/:id/assign', requireAuth, requireRole(ROLES.AGENT, ROLES.ADMIN), async (req, res) => {
    try {
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'bad_request', message: 'userId required' });
        await sdeskBitrix('tasks.task.update', { taskId: req.params.id, fields: { RESPONSIBLE_ID: String(userId) } });
        await sdeskBitrix('task.commentitem.add', [req.params.id, { POST_MESSAGE: `🔧 Assigned to user ${userId} by ${req.auth.name}` }]).catch(() => {});
        res.json({ success: true });
    } catch (error) {
        console.error('❌ ticket assign error:', error.message);
        res.status(500).json({ error: 'assign_failed', message: error.message });
    }
});

/** POST /api/tickets/:id/comment { text } — Agent/Admin (requesters can comment on own) */
app.post('/api/tickets/:id/comment', requireAuth, async (req, res) => {
    try {
        const { text } = req.body || {};
        if (!text) return res.status(400).json({ error: 'bad_request', message: 'text required' });
        if (req.auth.role === ROLES.MANAGER) {
            return res.status(403).json({ error: 'forbidden', message: 'Reporting/Management is read-only' });
        }
        // Requesters may only comment on their own tickets
        if (req.auth.role === ROLES.REQUESTER) {
            const resp = await sdeskBitrix('tasks.task.get', { taskId: req.params.id, select: ['CREATED_BY', 'DESCRIPTION'] });
            const task = resp.result && resp.result.task;
            const createdBy = String(task?.createdBy || '');
            const email = extractDescField(task?.description, 'Email').toLowerCase();
            if (createdBy !== String(req.auth.sub) && email !== (req.auth.email || '').toLowerCase()) {
                return res.status(403).json({ error: 'forbidden' });
            }
        }
        await sdeskBitrix('task.commentitem.add', [req.params.id, { POST_MESSAGE: `${text}\n\n— ${req.auth.name}` }]);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ ticket comment error:', error.message);
        res.status(500).json({ error: 'comment_failed', message: error.message });
    }
});

// ============================================
// SERVICE DESK CONFIGURATION REGISTER
// ============================================

// Default config — used to seed the DB on first run and as a fallback.
const DEFAULT_SDESK_CONFIG = {
    categories: [
        { id: 'hardware', label: 'Hardware', icon: '💻', issues: ['Laptop/PC not working', 'Printer issue', 'Monitor problem', 'Keyboard/Mouse', 'Docking station', 'Other hardware'] },
        { id: 'software', label: 'Software', icon: '🖥️', issues: ['Application not opening', 'Software installation', 'Software update needed', 'License issue', 'Application error/crash', 'Other software'] },
        { id: 'network', label: 'Network', icon: '🌐', issues: ['No internet', 'Slow connection', 'WiFi not working', 'VPN issue', 'Network drive inaccessible', 'Other network'] },
        { id: 'access', label: 'Access & Permissions', icon: '🔐', issues: ['Password reset', 'Account locked', 'New account request', 'Permission change', 'Email access', 'Other access'] },
        { id: 'email', label: 'Email', icon: '📧', issues: ['Cannot send/receive', 'Outlook not working', 'Calendar issue', 'Email storage full', 'Shared mailbox', 'Other email'] },
        { id: 'other', label: 'Other', icon: '🔧', issues: ['General enquiry', 'New equipment request', 'Training request', 'Other'] },
    ],
    priorities: [
        { id: 'low', label: 'Low', value: '0', description: 'Minimal impact, can wait', color: '#6b7280', deadlineHours: 48 },
        { id: 'normal', label: 'Normal', value: '1', description: 'Standard request', color: '#2E7D32', deadlineHours: 24 },
        { id: 'high', label: 'High', value: '2', description: 'Affecting work significantly', color: '#F9A825', deadlineHours: 8 },
        { id: 'critical', label: 'Critical', value: '2', description: 'Work completely stopped', color: '#DC2626', deadlineHours: 4 },
    ],
    statuses: [
        { code: '2', label: 'New', color: '#3b82f6' },
        { code: '3', label: 'In Progress', color: '#F9A825' },
        { code: '4', label: 'Awaiting User', color: '#8b5cf6' },
        { code: '5', label: 'Resolved', color: '#1B5E20' },
        { code: '6', label: 'Deferred', color: '#6b7280' },
    ],
    assignment: {
        itGroupId: SDESK_IT_GROUP,
        unassignedUserId: WEBHOOK_USER_ID,
        autoAssign: false,          // future: round-robin
    },
    escalation: {
        enabled: true,
        intervalMinutes: 15,
        unassignedSlaMinutes: 60,
        notifyEmail: process.env.ESCALATION_EMAIL || 'admin@t3ssystems.co.za',
    },
    notifications: {
        onCreated: true,
        onAssigned: true,
        onStatusChanged: true,
        onCommentAdded: true,
        onResolved: true,
        onReopened: true,
        senderAddress: process.env.EMAIL_SENDER || 'DoNotReply@sdinmotion.co.za',
    },
    reporting: {
        enabled: true,
        defaultRangeDays: 30,
        slaTargetPercent: 80,
    },
};

let cachedConfig = null;

async function loadSdeskConfig() {
    if (!pool) return DEFAULT_SDESK_CONFIG;
    try {
        const r = await pool.query('SELECT config FROM service_desk_config WHERE id = 1');
        if (r.rows.length && r.rows[0].config) {
            cachedConfig = r.rows[0].config;
            return cachedConfig;
        }
        // Seed defaults on first run
        await pool.query(
            'INSERT INTO service_desk_config (id, config, updated_by) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING',
            [JSON.stringify(DEFAULT_SDESK_CONFIG), 'system']
        );
        cachedConfig = DEFAULT_SDESK_CONFIG;
        return cachedConfig;
    } catch (e) {
        console.warn('config load failed, using defaults:', e.message);
        return DEFAULT_SDESK_CONFIG;
    }
}

/** GET /api/config — readable by any authenticated user (apps read taxonomy). */
app.get('/api/config', requireAuth, async (req, res) => {
    const config = await loadSdeskConfig();
    res.json({ config });
});

/** PUT /api/config — Admin only. Replaces the config register. */
app.put('/api/config', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
    try {
        if (!pool) return res.status(503).json({ error: 'db_unavailable' });
        const { config } = req.body || {};
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ error: 'bad_request', message: 'config object required' });
        }
        await pool.query(
            `INSERT INTO service_desk_config (id, config, updated_at, updated_by)
             VALUES (1, $1, CURRENT_TIMESTAMP, $2)
             ON CONFLICT (id) DO UPDATE SET config = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2`,
            [JSON.stringify(config), req.auth.name || req.auth.sub]
        );
        cachedConfig = config;
        console.log(`⚙️ Service Desk config updated by ${req.auth.name} (${req.auth.sub})`);
        res.json({ success: true, config });
    } catch (error) {
        console.error('❌ config save error:', error.message);
        res.status(500).json({ error: 'config_save_failed', message: error.message });
    }
});

/** GET /api/team — IT team members with details (Agent/Admin/Manager) */
app.get('/api/team', requireAuth, requireRole(ROLES.AGENT, ROLES.ADMIN, ROLES.MANAGER), async (req, res) => {
    try {
        const resp = await sdeskBitrix('sonet_group.user.get', { ID: SDESK_IT_GROUP });
        const memberIds = (resp.result || []).map(m => m.USER_ID);
        const members = [];
        for (const uid of memberIds) {
            try {
                const u = await sdeskBitrix('user.get', { ID: uid });
                const found = (u.result || [])[0];
                if (found) members.push({
                    ID: found.ID, NAME: found.NAME, LAST_NAME: found.LAST_NAME,
                    EMAIL: found.EMAIL, WORK_POSITION: found.WORK_POSITION, PERSONAL_PHOTO: found.PERSONAL_PHOTO,
                });
            } catch { /* skip */ }
        }
        res.json({ members });
    } catch (error) {
        res.status(500).json({ error: 'team_failed', message: error.message });
    }
});

// Health check

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
// NETWORK MONITOR ENDPOINTS (shared node config, global across devices)
// ============================================

/**
 * GET /api/network-nodes
 * Returns the shared list of monitored network nodes.
 */
app.get('/api/network-nodes', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not configured', message: 'DATABASE_URL not set' });
        }

        const result = await pool.query(
            'SELECT id, name, url, location, type, expected_status, timeout FROM network_nodes ORDER BY sort_order ASC, name ASC'
        );

        const nodes = result.rows.map(r => ({
            id: r.id,
            name: r.name,
            url: r.url,
            location: r.location || '',
            type: r.type || 'other',
            ...(r.expected_status != null ? { expectedStatus: r.expected_status } : {}),
            ...(r.timeout != null ? { timeout: r.timeout } : {}),
        }));

        res.json({ nodes });
    } catch (error) {
        console.error('❌ network-nodes GET error:', error.message);
        res.status(500).json({ error: 'Failed to load network nodes', message: error.message });
    }
});

/**
 * POST /api/network-nodes
 * Replaces the full shared node list (whole-list save, matches the client model).
 *
 * Body: { nodes: [{ id, name, url, location, type, expectedStatus?, timeout? }, ...] }
 */
app.post('/api/network-nodes', requireAuth, requireRole(ROLES.AGENT, ROLES.ADMIN), async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not configured', message: 'DATABASE_URL not set' });
        }

        const { nodes } = req.body;
        if (!Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Body must include a "nodes" array' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM network_nodes');

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i] || {};
                if (!n.id || !n.name || !n.url) continue; // skip invalid rows
                await client.query(
                    `INSERT INTO network_nodes (id, name, url, location, type, expected_status, timeout, sort_order, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
                    [
                        String(n.id),
                        String(n.name),
                        String(n.url),
                        n.location != null ? String(n.location) : '',
                        n.type != null ? String(n.type) : 'other',
                        Number.isInteger(n.expectedStatus) ? n.expectedStatus : null,
                        Number.isInteger(n.timeout) ? n.timeout : null,
                        i,
                    ]
                );
            }

            await client.query('COMMIT');
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

        console.log(`✅ network_nodes saved (${nodes.length} nodes)`);
        res.json({ success: true, count: nodes.length });
    } catch (error) {
        console.error('❌ network-nodes POST error:', error.message);
        res.status(500).json({ error: 'Failed to save network nodes', message: error.message });
    }
});

/**
 * GET /api/network-status
 * Returns the latest status for every node, as reported by the on-network agent.
 * Shape matches what the dashboard expects: { statuses: { [nodeId]: {...} } }
 */
app.get('/api/network-status', async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not configured', message: 'DATABASE_URL not set' });
        }

        const result = await pool.query(
            'SELECT node_id, status, response_time, status_code, error, method, last_checked, agent_id FROM network_status'
        );

        const statuses = {};
        for (const r of result.rows) {
            statuses[r.node_id] = {
                status: r.status,
                responseTime: r.response_time != null ? r.response_time : 0,
                lastChecked: r.last_checked ? new Date(r.last_checked).toISOString() : new Date().toISOString(),
                ...(r.status_code != null ? { statusCode: r.status_code } : {}),
                ...(r.error ? { error: r.error } : {}),
                ...(r.method ? { method: r.method } : {}),
                ...(r.agent_id ? { agentId: r.agent_id } : {}),
            };
        }

        res.json({ statuses });
    } catch (error) {
        console.error('❌ network-status GET error:', error.message);
        res.status(500).json({ error: 'Failed to load network status', message: error.message });
    }
});

/**
 * POST /api/network-status
 * The on-network probe agent pushes a batch of results here.
 * Requires header  x-agent-token  matching NETWORK_AGENT_TOKEN.
 *
 * Body: {
 *   agentId?: string,
 *   results: [{ nodeId, status, responseTime, statusCode?, error?, method? }, ...]
 * }
 */
app.post('/api/network-status', requireAgentOrAdmin, async (req, res) => {
    try {
        if (!pool) {
            return res.status(503).json({ error: 'Database not configured', message: 'DATABASE_URL not set' });
        }

        const { agentId, results } = req.body;
        if (!Array.isArray(results)) {
            return res.status(400).json({ error: 'Body must include a "results" array' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const r of results) {
                if (!r || !r.nodeId || !r.status) continue;
                await client.query(
                    `INSERT INTO network_status (node_id, status, response_time, status_code, error, method, last_checked, agent_id)
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
                     ON CONFLICT (node_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        response_time = EXCLUDED.response_time,
                        status_code = EXCLUDED.status_code,
                        error = EXCLUDED.error,
                        method = EXCLUDED.method,
                        last_checked = CURRENT_TIMESTAMP,
                        agent_id = EXCLUDED.agent_id`,
                    [
                        String(r.nodeId),
                        String(r.status),
                        Number.isInteger(r.responseTime) ? r.responseTime : null,
                        Number.isInteger(r.statusCode) ? r.statusCode : null,
                        r.error != null ? String(r.error) : null,
                        r.method != null ? String(r.method) : null,
                        agentId != null ? String(agentId) : null,
                    ]
                );
            }
            await client.query('COMMIT');
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

        console.log(`✅ network_status updated by agent "${agentId || 'unknown'}" (${results.length} results)`);
        res.json({ success: true, count: results.length });
    } catch (error) {
        console.error('❌ network-status POST error:', error.message);
        res.status(500).json({ error: 'Failed to save network status', message: error.message });
    }
});

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
app.post('/api/email/send', requireAuth, requireRole(ROLES.AGENT, ROLES.ADMIN), async (req, res) => {
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
app.post('/api/email/ticket-notification', requireAuth, async (req, res) => {
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

        case 'escalated':
            subject = `[Ticket #${ticketId}] ⚠️ ESCALATED: ${ticketTitle}`;
            heading = '🚨 Ticket Escalated';
            body = `
                <p>${greeting}</p>
                <p>Ticket <strong>#${ticketId}</strong> has been <strong>automatically escalated</strong> and its priority raised.</p>
                <div style="background:#fef2f2;border-left:4px solid #DC2626;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
                    <p style="margin:0;"><strong>Reason:</strong> ${comment || 'SLA breach'}</p>
                    ${status ? `<p style="margin:6px 0 0;"><strong>Current status:</strong> ${status}</p>` : ''}
                </div>
                <p><strong>Subject:</strong> ${ticketTitle}</p>
                <p>Please action this ticket promptly.</p>`;
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

// ============================================
// SERVICE DESK ESCALATION ENGINE
// ============================================
// Runs on the always-on backend (Bitrix webhook exposes no scheduler, and a
// browser SPA can't reliably run background jobs). Every ESCALATION_INTERVAL it
// scans IT Support tickets (Bitrix group 14) and escalates:
//   • Overdue open tickets (past deadline)              → level 1
//   • Tickets unassigned longer than the SLA threshold  → level 1 (assignment breach)
//   • Overdue by 2x the grace window                    → level 2 (management)
// Escalation actions: bump Bitrix priority, add an audit comment, and send a
// branded escalation email. De-duplicated via the ticket_escalations table.

const BITRIX_WEBHOOK = process.env.BITRIX_WEBHOOK_URL || 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss';
const IT_GROUP_ID = process.env.IT_GROUP_ID || '14';
const ESCALATION_INTERVAL_MS = parseInt(process.env.ESCALATION_INTERVAL_MS || '900000', 10); // 15 min
const UNASSIGNED_SLA_MINUTES = parseInt(process.env.UNASSIGNED_SLA_MINUTES || '60', 10);      // 1h to first assignment
const ESCALATION_EMAIL = process.env.ESCALATION_EMAIL || 'admin@t3ssystems.co.za';           // manager/queue mailbox
const WEBHOOK_USER_ID = '1';

function bitrixCall(method, params) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BITRIX_WEBHOOK.replace(/\/$/, '')}/${method}.json`);
        const body = JSON.stringify(params || {});
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        };
        const reqB = https.request(options, (resp) => {
            let data = '';
            resp.on('data', (c) => (data += c));
            resp.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) return reject(new Error(parsed.error_description || parsed.error));
                    resolve(parsed);
                } catch (e) { reject(new Error(`Bitrix parse error: ${data.slice(0, 200)}`)); }
            });
        });
        reqB.on('error', reject);
        reqB.write(body);
        reqB.end();
    });
}

// Parse a "Field: value" line out of the ticket description (caller info).
function parseDescField(description, label) {
    if (!description) return '';
    const re = new RegExp(`^${label}:\\s*(.+)`, 'im');
    for (const line of description.split('\n')) {
        const m = re.exec(line.trim());
        if (m && m[1] && m[1].trim() && m[1].trim() !== 'Not provided') return m[1].trim();
    }
    return '';
}

async function alreadyEscalated(ticketId, level) {
    if (!pool) return false;
    const r = await pool.query('SELECT 1 FROM ticket_escalations WHERE ticket_id = $1 AND level = $2', [String(ticketId), level]);
    return r.rows.length > 0;
}

async function recordEscalation(ticketId, level, reason) {
    if (!pool) return;
    await pool.query(
        `INSERT INTO ticket_escalations (ticket_id, level, reason, escalated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (ticket_id, level) DO NOTHING`,
        [String(ticketId), level, reason]
    ).catch(() => {});
}

async function escalateTicket(task, level, reason) {
    const ticketId = task.id;
    const title = task.title || `Ticket #${ticketId}`;
    const reasonLabel = reason === 'unassigned' ? 'Unassigned beyond SLA'
        : reason === 'overdue' ? 'Past resolution deadline'
        : reason === 'overdue_critical' ? 'Severely overdue' : reason;

    // 1) Bump Bitrix priority (max is 2 = High in Bitrix)
    try {
        await bitrixCall('tasks.task.update', { taskId: ticketId, fields: { PRIORITY: '2' } });
    } catch (e) { console.warn(`   ⚠️ priority bump failed for #${ticketId}: ${e.message}`); }

    // 2) Add an audit comment on the ticket
    const comment = `⚠️ [AUTO-ESCALATION L${level}] ${reasonLabel}. This ticket has been flagged and priority raised. Please action promptly.`;
    try {
        await bitrixCall('task.commentitem.add', [ticketId, { POST_MESSAGE: comment }]);
    } catch (e) { console.warn(`   ⚠️ comment failed for #${ticketId}: ${e.message}`); }

    // 3) Send a branded escalation email (to manager mailbox + caller if known)
    const callerEmail = parseDescField(task.description, 'Email');
    const callerName = parseDescField(task.description, 'Reported By') || parseDescField(task.description, 'Full Name');
    if (process.env.AZURE_COMMS_CONNECTION_STRING) {
        try {
            const { endpoint, accessKey } = parseConnectionString(process.env.AZURE_COMMS_CONNECTION_STRING);
            const { subject, html } = buildTicketEmailContent({
                type: 'escalated', ticketId, ticketTitle: title,
                recipientName: 'IT Manager', status: TICKET_STATUS_LABEL(task.status),
                comment: reasonLabel,
            });
            const recipients = [{ address: ESCALATION_EMAIL, displayName: 'IT Manager' }];
            if (callerEmail && callerEmail !== ESCALATION_EMAIL) {
                recipients.push({ address: callerEmail, displayName: callerName || callerEmail });
            }
            await sendAzureEmail(endpoint, accessKey, {
                senderAddress: process.env.EMAIL_SENDER || 'DoNotReply@sdinmotion.co.za',
                recipients: { to: recipients },
                content: { subject, html, plainText: subject },
            });
        } catch (e) { console.warn(`   ⚠️ escalation email failed for #${ticketId}: ${e.message}`); }
    }

    await recordEscalation(ticketId, level, reason);
    console.log(`   🚨 Escalated #${ticketId} (L${level}, ${reason}): ${title}`);
}

function TICKET_STATUS_LABEL(code) {
    return ({ '2': 'New', '3': 'In Progress', '4': 'Awaiting User', '5': 'Resolved', '6': 'Deferred' })[String(code)] || 'Open';
}

async function runEscalationScan() {
    if (!pool) return { skipped: 'no database' };
    let escalated = 0, scanned = 0;
    try {
        // Read configurable escalation settings (fall back to env defaults).
        const cfg = (await loadSdeskConfig()) || {};
        const esc = cfg.escalation || {};
        if (esc.enabled === false) return { skipped: 'escalation disabled', scanned: 0, escalated: 0 };
        const graceMs = (Number.isFinite(esc.intervalMinutes) ? esc.intervalMinutes * 60000 : ESCALATION_INTERVAL_MS);
        const unassignedMs = (Number.isFinite(esc.unassignedSlaMinutes) ? esc.unassignedSlaMinutes : UNASSIGNED_SLA_MINUTES) * 60000;

        // Pull open IT tickets (not Resolved '5' / Deferred '6')
        const resp = await bitrixCall('tasks.task.list', {
            filter: { GROUP_ID: IT_GROUP_ID },
            select: ['ID', 'TITLE', 'STATUS', 'PRIORITY', 'DEADLINE', 'CREATED_DATE', 'RESPONSIBLE_ID', 'DESCRIPTION'],
        });
        const tasks = (resp.result && resp.result.tasks) || [];
        const now = Date.now();

        for (const t of tasks) {
            // Normalize field names (Bitrix returns camelCase via tasks.task.list)
            const task = {
                id: t.id || t.ID,
                title: t.title || t.TITLE,
                status: String(t.status || t.STATUS),
                deadline: t.deadline || t.DEADLINE || null,
                createdDate: t.createdDate || t.CREATED_DATE || null,
                responsibleId: String(t.responsibleId || t.RESPONSIBLE_ID || ''),
                description: t.description || t.DESCRIPTION || '',
            };
            if (task.status === '5' || task.status === '6') continue; // closed
            scanned++;

            const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : null;
            const createdMs = task.createdDate ? new Date(task.createdDate).getTime() : null;
            const isUnassigned = !task.responsibleId || task.responsibleId === WEBHOOK_USER_ID;

            // Level 2 — severely overdue (past deadline by >= grace window again)
            if (deadlineMs && now > deadlineMs + graceMs && !(await alreadyEscalated(task.id, 2))) {
                await escalateTicket(task, 2, 'overdue_critical');
                escalated++;
                continue;
            }
            // Level 1 — past deadline
            if (deadlineMs && now > deadlineMs && !(await alreadyEscalated(task.id, 1))) {
                await escalateTicket(task, 1, 'overdue');
                escalated++;
                continue;
            }
            // Level 1 — unassigned beyond SLA
            if (isUnassigned && createdMs && now > createdMs + unassignedMs && !(await alreadyEscalated(task.id, 1))) {
                await escalateTicket(task, 1, 'unassigned');
                escalated++;
            }
        }
    } catch (e) {
        console.error('❌ Escalation scan error:', e.message);
        return { error: e.message };
    }
    return { scanned, escalated };
}

/** Manual trigger for testing / on-demand runs. */
app.post('/api/escalation/run', requireAgentOrAdmin, async (req, res) => {
    console.log('▶️ Manual escalation scan triggered');
    const result = await runEscalationScan();
    res.json({ success: !result.error, ...result });
});

// Kick off the periodic scan (only if DB is available)
setTimeout(() => {
    if (pool) {
        console.log(`🕒 Escalation engine active (every ${Math.round(ESCALATION_INTERVAL_MS / 60000)} min)`);
        runEscalationScan().then(r => console.log('   Initial scan:', JSON.stringify(r)));
        setInterval(() => { runEscalationScan().catch(e => console.error('Escalation loop error:', e.message)); }, ESCALATION_INTERVAL_MS);
    }
}, 5000);

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
