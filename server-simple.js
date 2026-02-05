/**
 * Simple Express server for Bitrix24 OAuth token exchange
 * Works on Railway, Render, Vercel, or any Node.js host
 */

const express = require('express');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

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
        service: 'JBmarks Token Exchange API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            tokenExchange: 'POST /api/exchangetoken'
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
