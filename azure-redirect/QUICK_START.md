# Quick Start - Azure Static Web App Setup

## Windows (PowerShell) - Recommended

1. **Open PowerShell in the `azure-redirect` folder**

2. **Run the setup script:**
   ```powershell
   .\setup-azure.ps1
   ```

3. **Follow the prompts and copy the output URLs**

4. **Update your app:**
   - Edit `app/src/main/java/com/example/jbmarks/config/Config.kt`
   - Replace `BITRIX_REDIRECT_URI_HTTPS` with the URL from step 3

5. **Update Bitrix24:**
   - Use the same URL in the "Handler path" field

## Linux/Mac (Bash)

1. **Make script executable:**
   ```bash
   chmod +x setup-azure.sh
   ```

2. **Run the script:**
   ```bash
   ./setup-azure.sh
   ```

3. **Follow steps 4-5 above**

## Manual Method

See `manual-deploy.md` for step-by-step manual instructions.

## Prerequisites

- Azure account ([sign up free](https://azure.microsoft.com/free/))
- Azure CLI installed ([download here](https://aka.ms/installazurecliwindows))
- Logged into Azure: `az login`

## Need Help?

- Check `manual-deploy.md` for detailed instructions
- Azure documentation: https://docs.microsoft.com/azure/static-web-apps/
