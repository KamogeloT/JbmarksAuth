/**
 * Authentication routes for Bitrix24 OAuth token exchange
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const secrets = require('../config/secrets');

/**
 * POST /api/auth/bitrix/exchange
 * Exchange Bitrix24 authorization code for access tokens
 * 
 * Request body:
 * {
 *   "oauth_code": "authorization_code_from_bitrix",
 *   "domain": "jbmarks.sdinmotion.co.za",
 *   "member_id": "37ceff862118071301ad0a2e25e7fdb1"
 * }
 * 
 * Response (success):
 * {
 *   "access_token": "...",
 *   "refresh_token": "...",
 *   "expires_in": 3600,
 *   ...
 * }
 */
router.post('/bitrix/exchange', async (req, res, next) => {
    try {
        const { oauth_code, domain, member_id } = req.body;

        // Validate required parameters
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

        // Get Bitrix24 credentials from Key Vault or environment variables
        const clientId = await secrets.getBitrixClientId();
        const clientSecret = await secrets.getBitrixClientSecret();
        const redirectUri = await secrets.getBitrixRedirectUri();

        if (!clientId || !clientSecret || !redirectUri) {
            console.error('Missing Bitrix24 credentials:', {
                clientId: !!clientId,
                clientSecret: !!clientSecret,
                redirectUri: !!redirectUri
            });
            return res.status(500).json({
                error: 'missing_credentials',
                message: 'Bitrix24 credentials not configured'
            });
        }

        // Build token URL
        const tokenUrl = `https://${domain}/oauth/token/`;

        console.log('Exchanging token:', {
            tokenUrl,
            clientId: clientId.substring(0, 20) + '...',
            code: oauth_code.substring(0, 20) + '...',
            redirectUri
        });

        // IMPORTANT: For on-prem portals, ONLY send these 5 parameters:
        // grant_type, client_id, client_secret, code, redirect_uri
        // DO NOT send domain or member_id - they cause Bitrix to return HTML instead of JSON
        const tokenData = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: oauth_code,
            redirect_uri: redirectUri
        });

        // Make request to Bitrix24 token endpoint
        const response = await axios.post(tokenUrl, tokenData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'JBmarks-BFF-API/1.0',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            maxRedirects: 0,
            validateStatus: () => true // Don't throw on non-2xx
        });

        const contentType = (response.headers['content-type'] || '').toLowerCase();

        console.log('Bitrix24 response:', {
            status: response.status,
            contentType,
            isJson: contentType.includes('application/json')
        });

        // Check if response is JSON
        if (contentType.includes('application/json')) {
            // Success - return tokens
            return res.status(response.status).json(response.data);
        } else {
            // Bitrix returned HTML (login page) - this shouldn't happen now
            const bodyPreview = typeof response.data === 'string'
                ? response.data.substring(0, 200)
                : String(response.data).substring(0, 200);

            console.error('Bitrix24 returned HTML instead of JSON:', bodyPreview);

            return res.status(502).json({
                error: 'bitrix_returned_html',
                message: 'Bitrix24 returned HTML login page instead of JSON tokens',
                status: response.status,
                contentType: response.headers['content-type'],
                bodyPreview: bodyPreview
            });
        }

    } catch (error) {
        console.error('Error in token exchange:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            body: { ...req.body, oauth_code: req.body.oauth_code ? '***' : undefined }
        });

        // Pass to error handler middleware
        next(error);
    }
});

module.exports = router;
