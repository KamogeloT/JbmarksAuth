/**
 * Secret management module
 * Supports Azure Key Vault (with Managed Identity) or environment variables
 */

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

let secretCache = {};
let keyVaultClient = null;

/**
 * Initialize Key Vault client if KEY_VAULT_URL is configured
 */
function initializeKeyVault() {
    const keyVaultUrl = process.env.KEY_VAULT_URL;
    
    if (!keyVaultUrl) {
        console.log('Key Vault not configured - using environment variables');
        return null;
    }

    try {
        const credential = new DefaultAzureCredential();
        keyVaultClient = new SecretClient(keyVaultUrl, credential);
        console.log(`Key Vault client initialized: ${keyVaultUrl}`);
        return keyVaultClient;
    } catch (error) {
        console.warn('Failed to initialize Key Vault client:', error.message);
        console.warn('Falling back to environment variables');
        return null;
    }
}

/**
 * Get secret from Key Vault or environment variable
 * @param {string} secretName - Name of the secret
 * @param {string} envVarName - Environment variable name as fallback
 * @returns {Promise<string>} Secret value
 */
async function getSecret(secretName, envVarName) {
    // Check cache first
    if (secretCache[secretName]) {
        return secretCache[secretName];
    }

    // Try Key Vault if available
    if (keyVaultClient) {
        try {
            const secret = await keyVaultClient.getSecret(secretName);
            secretCache[secretName] = secret.value;
            return secret.value;
        } catch (error) {
            console.warn(`Failed to get secret '${secretName}' from Key Vault:`, error.message);
            // Fall through to environment variable
        }
    }

    // Fallback to environment variable
    const envValue = process.env[envVarName];
    if (!envValue) {
        throw new Error(`Secret '${secretName}' not found in Key Vault or environment variable '${envVarName}'`);
    }

    secretCache[secretName] = envValue;
    return envValue;
}

/**
 * Get Bitrix24 client ID
 */
async function getBitrixClientId() {
    return getSecret('BITRIX_CLIENT_ID', 'BITRIX_CLIENT_ID');
}

/**
 * Get Bitrix24 client secret
 */
async function getBitrixClientSecret() {
    return getSecret('BITRIX_CLIENT_SECRET', 'BITRIX_CLIENT_SECRET');
}

/**
 * Get Bitrix24 redirect URI
 */
async function getBitrixRedirectUri() {
    return getSecret('BITRIX_REDIRECT_URI', 'BITRIX_REDIRECT_URI');
}

/**
 * Clear secret cache (useful for testing or rotation)
 */
function clearCache() {
    secretCache = {};
}

// Initialize Key Vault on module load
initializeKeyVault();

module.exports = {
    getSecret,
    getBitrixClientId,
    getBitrixClientSecret,
    getBitrixRedirectUri,
    clearCache,
    initializeKeyVault
};
