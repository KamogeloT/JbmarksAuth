/**
 * Local test script for the Azure Function
 * Run with: node test-local.js
 */

// Load the function
const exchangeToken = require('./exchangeToken/index');

// Mock context object
const context = {
    log: (...args) => console.log('[LOG]', ...args),
    res: null
};

// Mock request object (test with a dummy code)
const req = {
    body: {
        oauth_code: 'test_code_12345',
        domain: 'jbcompany.bitrix24.com'
    },
    query: {}
};

// Set environment variables
process.env.BITRIX_CLIENT_ID = 'local.69526f981da4a0.86875975';
process.env.BITRIX_CLIENT_SECRET = 'z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU';
process.env.BITRIX_REDIRECT_URI = 'https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect';

console.log('='.repeat(60));
console.log('Testing Azure Function Locally');
console.log('='.repeat(60));
console.log('\nTest Request:');
console.log(JSON.stringify(req.body, null, 2));
console.log('\nEnvironment Variables:');
console.log('BITRIX_CLIENT_ID:', process.env.BITRIX_CLIENT_ID);
console.log('BITRIX_REDIRECT_URI:', process.env.BITRIX_REDIRECT_URI);
console.log('\n' + '='.repeat(60));
console.log('Function Response:');
console.log('='.repeat(60) + '\n');

// Run the function
exchangeToken(context, req)
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log('Response Status:', context.res.status);
        console.log('Response Headers:', context.res.headers);
        console.log('Response Body:');
        console.log(JSON.stringify(context.res.body, null, 2));
        console.log('='.repeat(60));
        
        // Exit with appropriate code
        process.exit(context.res.status === 200 ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n' + '='.repeat(60));
        console.error('ERROR:', error.message);
        console.error(error.stack);
        console.error('='.repeat(60));
        process.exit(1);
    });
