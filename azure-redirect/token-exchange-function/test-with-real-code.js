/**
 * Test with a REAL OAuth code from Bitrix
 * 
 * INSTRUCTIONS:
 * 1. Open this URL in your browser:
 *    https://jbcompany.bitrix24.com/oauth/authorize/?client_id=local.69526f981da4a0.86875975&response_type=code&redirect_uri=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect/
 * 
 * 2. After logging in, you'll be redirected to a URL like:
 *    https://jbmarks-oauth-redirect...azurewebsites.net/oauth_redirect/?code=XXXXXX&domain=...&member_id=...
 * 
 * 3. Copy the 'code' value and paste it below in the REAL_OAUTH_CODE variable
 * 
 * 4. Run: node test-with-real-code.js
 */

const REAL_OAUTH_CODE = ''; // PASTE YOUR CODE HERE
const DOMAIN = 'jbcompany.bitrix24.com'; // Or your actual domain

if (!REAL_OAUTH_CODE) {
    console.error('❌ ERROR: Please set REAL_OAUTH_CODE variable first!');
    console.log('\n📋 Follow the instructions in this file to get a real OAuth code.');
    process.exit(1);
}

// Load the function
const exchangeToken = require('./exchangeToken/index');

// Mock context object
const context = {
    log: (...args) => console.log('[LOG]', ...args),
    res: null
};

// Mock request with REAL code
const req = {
    body: {
        oauth_code: REAL_OAUTH_CODE,
        domain: DOMAIN
    },
    query: {}
};

// Set environment variables
process.env.BITRIX_CLIENT_ID = 'local.69526f981da4a0.86875975';
process.env.BITRIX_CLIENT_SECRET = 'z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU';
process.env.BITRIX_REDIRECT_URI = 'https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect';

console.log('='.repeat(70));
console.log('🧪 Testing Azure Function with REAL OAuth Code');
console.log('='.repeat(70));
console.log('\n📤 Request:');
console.log('  OAuth Code:', REAL_OAUTH_CODE.substring(0, 20) + '...');
console.log('  Domain:', DOMAIN);
console.log('\n⏳ Exchanging token with Bitrix...\n');

// Run the function
exchangeToken(context, req)
    .then(() => {
        console.log('\n' + '='.repeat(70));
        console.log('📨 Response:');
        console.log('='.repeat(70));
        console.log('Status:', context.res.status);
        console.log('\nBody:');
        console.log(JSON.stringify(context.res.body, null, 2));
        console.log('='.repeat(70));
        
        if (context.res.status === 200 && context.res.body.access_token) {
            console.log('\n✅ SUCCESS! Got access token:');
            console.log('   Access Token:', context.res.body.access_token.substring(0, 30) + '...');
            console.log('   Refresh Token:', context.res.body.refresh_token.substring(0, 30) + '...');
            console.log('   Expires In:', context.res.body.expires_in, 'seconds');
            console.log('\n🎉 The function works perfectly locally!');
            console.log('📌 The issue is 100% with Azure deployment, not the code.');
        } else {
            console.log('\n❌ Token exchange failed. Check the error message above.');
        }
        
        process.exit(context.res.status === 200 ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n' + '='.repeat(70));
        console.error('💥 ERROR:', error.message);
        console.error(error.stack);
        console.error('='.repeat(70));
        process.exit(1);
    });
