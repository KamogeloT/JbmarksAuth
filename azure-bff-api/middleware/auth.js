/**
 * API Key authentication middleware (optional)
 * Only validates API key if API_KEY environment variable is set
 */

function apiKeyAuth(req, res, next) {
    const apiKey = process.env.API_KEY;
    
    // If no API key is configured, skip authentication
    if (!apiKey || apiKey === '') {
        return next();
    }
    
    // Get API key from header
    const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!providedKey) {
        return res.status(401).json({
            error: 'unauthorized',
            message: 'API key required. Provide X-API-Key header or Authorization: Bearer <key>'
        });
    }
    
    if (providedKey !== apiKey) {
        return res.status(403).json({
            error: 'forbidden',
            message: 'Invalid API key'
        });
    }
    
    next();
}

module.exports = apiKeyAuth;
