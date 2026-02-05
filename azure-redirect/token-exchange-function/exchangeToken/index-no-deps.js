/**
 * Azure Function to exchange Bitrix24 authorization code for tokens
 * Using ONLY built-in Node.js modules (no external dependencies)
 * Version: v2026-01-29-NO-DEPS
 */
const https = require('https');
const { URL } = require('url');

module.exports = async function (context, req) {
    try {
        context.log("### VERSION: exchangeToken v2026-01-29-NO-DEPS ###");
        context.log("exchangeToken: handler entered");
        
        // Parse request body
        let body = req.body;
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch (_) {
                body = {};
            }
        }
        
        const oauth_code = body?.oauth_code || req.query?.oauth_code;
        const domain = body?.domain || req.query?.domain;
        const member_id = body?.member_id || req.query?.member_id;
        
        // Validate required parameters
        if (!oauth_code) {
            context.res = {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: {
                    error: "missing_oauth_code",
                    message: "oauth_code parameter is required"
                }
            };
            return;
        }
        
        // Get credentials from environment variables
        const client_id = process.env.BITRIX_CLIENT_ID;
        const client_secret = process.env.BITRIX_CLIENT_SECRET;
        const redirect_uri = process.env.BITRIX_REDIRECT_URI;
        
        if (!client_id || !client_secret || !redirect_uri) {
            context.log("ERROR: Missing environment variables:", {
                client_id: !!client_id,
                client_secret: !!client_secret,
                redirect_uri: !!redirect_uri
            });
            context.res = {
                status: 500,
                headers: { "Content-Type": "application/json" },
                body: {
                    error: "missing_env",
                    message: "Missing required environment variables",
                    details: {
                        has_client_id: !!client_id,
                        has_client_secret: !!client_secret,
                        has_redirect_uri: !!redirect_uri
                    }
                }
            };
            return;
        }
        
        // Build token URL
        const tokenUrl = domain 
            ? `https://${domain}/oauth/token/`
            : `${process.env.BITRIX_PORTAL_URL || ''}/oauth/token/`;
        
        if (!tokenUrl || tokenUrl === '/oauth/token/') {
            context.res = {
                status: 400,
                headers: { "Content-Type": "application/json" },
                body: {
                    error: "missing_domain",
                    message: "Domain is required to build token URL"
                }
            };
            return;
        }
        
        // Build request body (form-urlencoded)
        const postData = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: client_id,
            client_secret: client_secret,
            code: oauth_code,
            redirect_uri: redirect_uri
        }).toString();
        
        context.log("Calling Bitrix24 token endpoint:", tokenUrl);
        context.log("Token request params (excluding domain/member_id):", {
            grant_type: "authorization_code",
            client_id: client_id.substring(0, 20) + "...",
            code: oauth_code.substring(0, 20) + "...",
            redirect_uri: redirect_uri
        });
        
        // Parse URL for request options
        const parsedUrl = new URL(tokenUrl);
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'JBmarks-AzureFunction/1.0',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        // Make HTTPS request
        const responseData = await new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const contentType = (res.headers['content-type'] || '').toLowerCase();
                    
                    context.log("Bitrix24 response:", {
                        status: res.statusCode,
                        contentType: contentType,
                        isJson: contentType.includes('application/json')
                    });
                    
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        contentType: contentType
                    });
                });
            });
            
            req.on('error', (error) => {
                context.log("ERROR: HTTPS request failed:", error.message);
                reject(error);
            });
            
            req.write(postData);
            req.end();
        });
        
        // Parse response
        if (responseData.contentType.includes('application/json')) {
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(responseData.body);
            } catch (e) {
                context.log("ERROR: Failed to parse JSON response:", e.message);
                jsonResponse = { error: "invalid_json", raw: responseData.body };
            }
            
            context.res = {
                status: responseData.statusCode,
                headers: { "Content-Type": "application/json" },
                body: jsonResponse
            };
        } else {
            // Bitrix returned HTML instead of JSON
            const bodyPreview = responseData.body.substring(0, 200);
            
            context.log("ERROR: Bitrix24 returned HTML instead of JSON:", bodyPreview);
            
            context.res = {
                status: 502,
                headers: { "Content-Type": "application/json" },
                body: {
                    error: "bitrix_returned_html",
                    message: "Bitrix24 returned HTML login page instead of JSON tokens",
                    status: responseData.statusCode,
                    contentType: responseData.contentType,
                    bodyPreview: bodyPreview
                }
            };
        }
        
    } catch (error) {
        context.log("ERROR: Exception in token exchange:", error.message);
        context.log("ERROR: Stack:", error.stack);
        
        context.res = {
            status: 500,
            headers: { "Content-Type": "application/json" },
            body: {
                error: "exception",
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5).join('\n')
            }
        };
    }
};
