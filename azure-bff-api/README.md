# JBmarks Backend-for-Frontend (BFF) API

Backend-for-Frontend API for handling Bitrix24 OAuth token exchange for the JBmarks Android application.

## Overview

This BFF API replaces the Azure Function proxy with a proper Express.js backend service. It provides:

- **Better maintainability**: Standard Node.js/Express patterns
- **Easier debugging**: Full stack traces and proper error handling
- **Secret management**: Azure Key Vault integration (optional)
- **Monitoring**: Application Insights integration
- **Scalability**: Azure App Service auto-scaling

## Architecture

```
Android App → Azure App Service (BFF API) → Bitrix24 OAuth Endpoint
                ↓
         Azure Key Vault (secrets)
                ↓
      Application Insights (logging)
```

## Prerequisites

- Node.js 18+ installed locally (for development)
- Azure CLI installed and configured
- Azure subscription with permissions to create App Services
- Bitrix24 OAuth credentials (Client ID, Client Secret, Redirect URI)

## Quick Start

### 1. Install Dependencies

```bash
cd azure-bff-api
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Bitrix24 credentials:

```env
BITRIX_CLIENT_ID=local.69526f981da4a0.86875975
BITRIX_CLIENT_SECRET=your_client_secret_here
BITRIX_REDIRECT_URI=https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
```

### 3. Run Locally (Development)

```bash
npm start
```

The API will be available at `http://localhost:8080`

- Health check: `http://localhost:8080/health`
- Token exchange: `http://localhost:8080/api/auth/bitrix/exchange`

### 4. Deploy to Azure

Run the deployment script:

```powershell
.\deploy.ps1
```

Or manually:

```powershell
# Set variables
$ResourceGroup = "jbmarks-oauth-redirect-rg-za"
$AppName = "jbmarks-bff-api"
$Location = "southafricanorth"

# Create App Service (if not exists)
az webapp create --name $AppName --resource-group $ResourceGroup --plan jbmarks-bff-plan --runtime "NODE:18-lts"

# Set environment variables
az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings `
    BITRIX_CLIENT_ID="your_client_id" `
    BITRIX_CLIENT_SECRET="your_client_secret" `
    BITRIX_REDIRECT_URI="your_redirect_uri"

# Deploy code
az webapp deployment source config-zip --resource-group $ResourceGroup --name $AppName --src deploy.zip
```

## API Endpoints

### Health Check

**GET** `/health`

Returns API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-26T20:00:00.000Z",
  "service": "jbmarks-bff-api",
  "version": "1.0.0"
}
```

### Token Exchange

**POST** `/api/auth/bitrix/exchange`

Exchanges a Bitrix24 authorization code for access tokens.

**Request Body:**
```json
{
  "oauth_code": "authorization_code_from_bitrix",
  "domain": "jbmarks.sdinmotion.co.za",
  "member_id": "37ceff862118071301ad0a2e25e7fdb1"
}
```

**Success Response (200):**
```json
{
  "access_token": "abc123...",
  "refresh_token": "xyz789...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: Server configuration error
- `502 Bad Gateway`: Bitrix24 returned HTML instead of JSON

## Configuration

### Environment Variables

| Variable | Required | Description |
|---------|----------|-------------|
| `BITRIX_CLIENT_ID` | Yes | Bitrix24 OAuth Client ID |
| `BITRIX_CLIENT_SECRET` | Yes | Bitrix24 OAuth Client Secret |
| `BITRIX_REDIRECT_URI` | Yes | OAuth redirect URI (must match Bitrix24 config) |
| `KEY_VAULT_URL` | No | Azure Key Vault URL (if using Key Vault) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | No | Application Insights connection string |
| `PORT` | No | Server port (default: 8080) |
| `NODE_ENV` | No | Environment (production/development) |

### Azure Key Vault (Optional)

For production, use Azure Key Vault to store secrets securely:

1. Run `setup-keyvault.ps1` to create Key Vault and configure access
2. Store secrets in Key Vault:
   ```powershell
   az keyvault secret set --vault-name jbmarks-secrets-kv --name BITRIX_CLIENT_ID --value "your_client_id"
   az keyvault secret set --vault-name jbmarks-secrets-kv --name BITRIX_CLIENT_SECRET --value "your_client_secret"
   az keyvault secret set --vault-name jbmarks-secrets-kv --name BITRIX_REDIRECT_URI --value "your_redirect_uri"
   ```
3. Set `KEY_VAULT_URL` in App Service App Settings

The API will automatically use Key Vault if `KEY_VAULT_URL` is configured, otherwise it falls back to environment variables.

## Application Insights

Application Insights is automatically configured if `APPLICATIONINSIGHTS_CONNECTION_STRING` is set.

To enable:

1. Create Application Insights resource in Azure Portal
2. Copy the connection string
3. Set it in App Service App Settings

The API will automatically log:
- HTTP requests and responses
- Exceptions and errors
- Performance metrics
- Dependencies (Bitrix24 API calls)

## Security

### Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP address
- Returns `429 Too Many Requests` when exceeded

### CORS

Currently configured to allow all origins (`*`). For production, restrict to your Android app's origins if possible.

### Secrets

- Never commit `.env` file to version control
- Use Azure Key Vault for production secrets
- Secrets are never exposed to the client
- HTTPS only in production

## Development

### Project Structure

```
azure-bff-api/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── routes/
│   └── auth.js           # Authentication routes
├── config/
│   └── secrets.js        # Secret management (Key Vault/env vars)
├── middleware/
│   ├── errorHandler.js   # Error handling middleware
│   └── logger.js         # Request logging middleware
├── deploy.ps1            # Deployment script
├── setup-keyvault.ps1    # Key Vault setup script
└── README.md             # This file
```

### Testing Locally

Test the token exchange endpoint:

```bash
curl -X POST http://localhost:8080/api/auth/bitrix/exchange \
  -H "Content-Type: application/json" \
  -d '{
    "oauth_code": "test_code",
    "domain": "jbmarks.sdinmotion.co.za",
    "member_id": "test_member_id"
  }'
```

### Viewing Logs

**Local:**
```bash
# Logs appear in console
npm start
```

**Azure:**
```powershell
az webapp log tail --name jbmarks-bff-api --resource-group jbmarks-oauth-redirect-rg-za
```

Or view in Azure Portal: App Service → Log stream

## Troubleshooting

### API returns 500 errors

1. Check App Service logs: `az webapp log tail`
2. Verify environment variables are set correctly
3. Check Application Insights for detailed error traces

### Bitrix24 returns HTML instead of JSON

This usually means:
- Invalid `redirect_uri` (must match Bitrix24 config exactly)
- Missing or incorrect `client_secret`
- Bitrix24 OAuth module not properly configured

Check the error response body for details.

### Key Vault access denied

1. Verify Managed Identity is enabled on App Service
2. Check Key Vault access policy grants `get` and `list` permissions
3. Verify `KEY_VAULT_URL` is set correctly in App Settings

## Migration from Azure Function

This BFF API replaces the Azure Function. Migration steps:

1. Deploy BFF API to Azure App Service
2. Update Android app `Config.kt` with new BFF API URL
3. Test OAuth flow end-to-end
4. Monitor Application Insights for errors
5. Once stable, deprecate Azure Function

The Android app includes fallback logic to use the Azure Function if BFF API fails during migration.

## Support

For issues or questions:
1. Check Application Insights logs
2. Review Azure App Service logs
3. Verify Bitrix24 OAuth configuration
4. Check environment variables in Azure Portal

## License

ISC
