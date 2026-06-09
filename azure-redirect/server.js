const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from oauth_redirect directory
app.use('/oauth_redirect', express.static(path.join(__dirname, 'oauth_redirect')));

// Root shows a simple status page
app.get('/', (req, res) => {
    res.send('JBmarks OAuth Redirect Server - Running');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'oauth-redirect' });
});

app.listen(PORT, () => {
    console.log(`OAuth redirect server running on port ${PORT}`);
});
