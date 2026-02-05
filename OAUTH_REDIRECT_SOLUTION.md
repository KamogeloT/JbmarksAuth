# OAuth Redirect Solution for Bitrix24

## Problem
Bitrix24 Local Applications require an HTTPS redirect URI, but mobile apps need a custom URI scheme (`jbmarks://`) for deep linking.

## Solution: Intermediate Redirect Server

Create a simple web endpoint that:
1. Receives OAuth callback from Bitrix24 (HTTPS URL)
2. Extracts the authorization code
3. Redirects to the app's deep link (`jbmarks://oauth_redirect?code=...`)

### Option 1: Azure Static Web App (Recommended - Free & Simple)

**Steps:**
1. Create an Azure Static Web App
2. Add a simple HTML/JavaScript page that redirects
3. Configure Bitrix24 to use: `https://your-app.azurestaticapps.net/oauth_redirect`

**Code needed:**
```html
<!-- index.html at /oauth_redirect -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
</head>
<body>
    <script>
        // Extract code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (code) {
            // Redirect to app deep link
            window.location.href = `jbmarks://oauth_redirect?code=${code}`;
        } else if (error) {
            // Handle error
            window.location.href = `jbmarks://oauth_redirect?error=${error}`;
        } else {
            alert('No authorization code received');
        }
    </script>
    <p>Redirecting to app...</p>
</body>
</html>
```

### Option 2: Azure Function (More Control)

**Steps:**
1. Create an Azure Function App
2. Create an HTTP trigger function
3. Return a redirect response

**Function Code:**
```javascript
module.exports = async function (context, req) {
    const code = req.query.code;
    const error = req.query.error;
    
    let redirectUrl;
    if (code) {
        redirectUrl = `jbmarks://oauth_redirect?code=${code}`;
    } else if (error) {
        redirectUrl = `jbmarks://oauth_redirect?error=${error}`;
    } else {
        redirectUrl = `jbmarks://oauth_redirect?error=no_code`;
    }
    
    return {
        status: 302,
        headers: {
            'Location': redirectUrl
        }
    };
};
```

### Option 3: Simple Node.js/Express Server (Any Hosting)

**Quick Setup:**
```javascript
const express = require('express');
const app = express();

app.get('/oauth_redirect', (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    
    if (code) {
        res.redirect(`jbmarks://oauth_redirect?code=${code}`);
    } else if (error) {
        res.redirect(`jbmarks://oauth_redirect?error=${error}`);
    } else {
        res.status(400).send('No authorization code received');
    }
});

app.listen(3000);
```

## Update Your Bitrix24 Configuration

1. Get your redirect server URL (e.g., `https://your-app.azurestaticapps.net/oauth_redirect`)
2. Update Bitrix24 Local Application:
   - **Your handler path**: `https://your-app.azurestaticapps.net/oauth_redirect`
   - Keep all other settings the same

## Update Android App (No changes needed!)

The app will still receive the deep link `jbmarks://oauth_redirect?code=...` 
The only difference is the redirect happens via the intermediate server.
