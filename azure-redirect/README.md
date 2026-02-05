# Azure Static Web App - OAuth Redirect Server

This is a simple HTML page that acts as an intermediate redirect server for Bitrix24 OAuth.

## Setup Instructions

### Option 1: Azure Static Web Apps (Free Tier Available)

1. **Create Azure Static Web App:**
   - Go to Azure Portal → Create Resource → Static Web App
   - Choose Free tier
   - Connect to a GitHub repository (or deploy manually)

2. **Deploy the files:**
   - Upload `index.html` to your Static Web App
   - Place it in the root or in an `oauth_redirect` folder

3. **Get your URL:**
   - Your app will be available at: `https://your-app-name.azurestaticapps.net`
   - If file is at root: `https://your-app-name.azurestaticapps.net/index.html`
   - If in folder: `https://your-app-name.azurestaticapps.net/oauth_redirect/`

4. **Configure Bitrix24:**
   - Use your Azure URL as the redirect URI
   - Example: `https://jbmarks-redirect.azurestaticapps.net/oauth_redirect/`

### Option 2: Any Web Hosting (Netlify, Vercel, etc.)

1. Upload `index.html` to any web hosting service
2. Make sure it's accessible via HTTPS
3. Use that URL in Bitrix24 configuration

### Option 3: Azure Functions (More Control)

Create an HTTP trigger function:

```javascript
module.exports = async function (context, req) {
    const code = req.query.code;
    const error = req.query.error;
    
    let redirectUrl;
    if (code) {
        redirectUrl = `jbmarks://oauth_redirect?code=${encodeURIComponent(code)}`;
    } else if (error) {
        redirectUrl = `jbmarks://oauth_redirect?error=${encodeURIComponent(error)}`;
    } else {
        redirectUrl = 'jbmarks://oauth_redirect?error=no_code_received';
    }
    
    return {
        status: 302,
        headers: {
            'Location': redirectUrl
        }
    };
};
```

## How It Works

1. Bitrix24 redirects to: `https://your-server.com/oauth_redirect?code=ABC123`
2. This HTML page extracts the `code` parameter
3. Redirects to: `jbmarks://oauth_redirect?code=ABC123`
4. Android intercepts the deep link and opens your app
5. Your app processes the OAuth code

## Security Note

This is a public redirect endpoint. It only forwards the authorization code.
The code itself is single-use and expires quickly, so it's safe to use this pattern.
