package com.example.jbmarks.config

/**
 * Configuration class for Bitrix24 OAuth and API settings
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create an intermediate redirect server (see azure-redirect/ folder)
 *    - Deploy the HTML file to Azure Static Web Apps, Netlify, or any HTTPS host
 *    - Get your redirect URL (e.g., https://jbmarks-redirect.azurestaticapps.net)
 * 
 * 2. Go to your Bitrix24 portal: https://your-portal.bitrix24.com/apps/local/
 * 3. Create a new "Local Application"
 * 4. Set "Your handler path" to your HTTPS redirect URL (from step 1)
 * 5. Copy the Client ID and Client Secret below
 * 
 * Note: Bitrix24 requires HTTPS URLs for redirect URIs, not custom schemes.
 * The intermediate server redirects to the app's deep link.
 */
object Config {
    
    // Bitrix24 OAuth Configuration
    // Get these from: Bitrix24 Portal > Apps > Local Applications > Your App
    const val BITRIX_CLIENT_ID = "local.69526f981da4a0.86875975"
    const val BITRIX_CLIENT_SECRET = "z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU"
    
    // HTTPS Redirect URI - must match what's configured in Bitrix24 Local Application
    // This is the intermediate redirect server URL (HTTPS)
    const val BITRIX_REDIRECT_URI_HTTPS = "https://jbmarks-oauth-redirect-prod.azurewebsites.net/oauth_redirect"
    
    // Deep link URI - used by the app to receive the final redirect
    // This is what the intermediate server redirects to
    // DO NOT change this - it must match AndroidManifest.xml deep link configuration
    const val BITRIX_REDIRECT_URI_DEEP_LINK = "jbmarks://oauth_redirect"
    
    // Default portal URL (can be overridden by user)
    const val DEFAULT_PORTAL_URL = "https://jbmarks.sdinmotion.co.za"
    
    // OAuth endpoints
    const val OAUTH_AUTHORIZE_PATH = "/oauth/authorize/"
    const val OAUTH_TOKEN_PATH = "/oauth/token/"
    
    // Bitrix24 OAuth token server (for standard/local applications)
    // Use oauth.bitrix.info instead of portal domain for token exchange
    const val BITRIX_OAUTH_TOKEN_SERVER = "https://oauth.bitrix.info"
    
    // BFF API URL for token exchange (for Bitrix24 Box/on-prem)
    // Backend-for-Frontend API hosted on Azure App Service (client's Azure)
    const val BFF_API_TOKEN_EXCHANGE_URL = "https://jbmarks-api-prod.azurewebsites.net/api/auth/bitrix/exchange"
    
    // Token exchange endpoint on client's Azure App Service
    const val AZURE_FUNCTION_TOKEN_EXCHANGE_URL = "https://jbmarks-api-prod.azurewebsites.net/api/exchangetoken"
    
    // Railway Token Exchange Server (fallback)
    const val TOKEN_EXCHANGE_URL = "https://jbmarksauth-production.up.railway.app/api/exchangetoken"
    
    // OAuth Scopes - permissions requested from Bitrix24
    const val OAUTH_SCOPES = "crm,task,tasks_extended,calendar,user,user_brief,user_basic,sonet_group,bizproc,log,placement,entity,disk,mailservice,lists,calendarmobile,tasks,tasksmobile,im"
    
    // Webhook authentication for user 1 (used for disk.attachedObject.get)
    const val WEBHOOK_USER_ID = "1"
    const val WEBHOOK_TOKEN = "accwtpjw1vnywkss"
    
    /**
     * Build the authorization URL for OAuth flow
     * Uses the HTTPS redirect URI (intermediate server) that Bitrix24 requires
     */
    fun buildAuthorizationUrl(portalUrl: String, clientId: String): String {
        val encodedRedirectUri = java.net.URLEncoder.encode(BITRIX_REDIRECT_URI_HTTPS, "UTF-8")
        val authUrl = "$portalUrl$OAUTH_AUTHORIZE_PATH?" +
                "client_id=${clientId}&" +
                "response_type=code&" +
                "redirect_uri=$encodedRedirectUri&" +
                "scope=$OAUTH_SCOPES"
        
        // Log for debugging redirect_uri matching
        android.util.Log.d("Config", "=== Authorization URL ===")
        android.util.Log.d("Config", "Redirect URI (raw): $BITRIX_REDIRECT_URI_HTTPS")
        android.util.Log.d("Config", "Redirect URI (encoded): $encodedRedirectUri")
        android.util.Log.d("Config", "Full Auth URL: $authUrl")
        
        return authUrl
    }
    
    /**
     * Build the token endpoint URL
     */
    fun buildTokenUrl(portalUrl: String): String {
        return "$portalUrl$OAUTH_TOKEN_PATH"
    }
}
