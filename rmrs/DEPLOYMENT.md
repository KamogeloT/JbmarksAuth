# RMRS Deployment Guide

## Prerequisites

| Component | Minimum Version | Purpose |
|-----------|----------------|---------|
| Windows Server | 2019+ | Host OS |
| IIS | 10.0 | Reverse proxy for Kestrel |
| .NET 8 Runtime | 8.0.x | ASP.NET Core hosting |
| .NET 8 Hosting Bundle | 8.0.x | IIS integration module |
| SQL Server | 2022 | Database |
| Node.js | 18.x LTS | Angular build toolchain |
| URL Rewrite Module | 2.1+ | IIS HTTPS redirect and SPA routing |

## 1. Database Setup

### 1.1 Create the Database

```sql
CREATE DATABASE RmrsDb;
GO
```

### 1.2 Create Application User

```sql
USE RmrsDb;
GO

CREATE LOGIN RmrsAppUser WITH PASSWORD = '<STRONG_PASSWORD>';
CREATE USER RmrsAppUser FOR LOGIN RmrsAppUser;

-- Grant standard CRUD access
ALTER ROLE db_datareader ADD MEMBER RmrsAppUser;
ALTER ROLE db_datawriter ADD MEMBER RmrsAppUser;

-- Grant DDL for EF Core migrations (can be revoked after initial deploy)
ALTER ROLE db_ddladmin ADD MEMBER RmrsAppUser;
GO
```

### 1.3 Apply EF Core Migrations

From the solution root directory:

```bash
dotnet ef database update --project src/Rmrs.Infrastructure --startup-project src/Rmrs.Api --connection "Server=PROD-SQL-SERVER;Database=RmrsDb;User Id=RmrsAppUser;Password=<PASSWORD>;Encrypt=True;TrustServerCertificate=False"
```

### 1.4 Enforce Audit Log Immutability

After migrations are applied, execute the following to prevent modification of audit records:

```sql
USE RmrsDb;
GO

DENY UPDATE ON dbo.AuditLogs TO RmrsAppUser;
DENY DELETE ON dbo.AuditLogs TO RmrsAppUser;
GO
```

### 1.5 Enable Transparent Data Encryption (TDE)

TDE encrypts the database at rest with no application changes required.

```sql
-- Step 1: Create a master key in the master database
USE master;
GO
CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<MASTER_KEY_PASSWORD>';
GO

-- Step 2: Create a certificate for TDE
CREATE CERTIFICATE RmrsTDECert WITH SUBJECT = 'RMRS TDE Certificate';
GO

-- Step 3: Create a database encryption key
USE RmrsDb;
GO
CREATE DATABASE ENCRYPTION KEY
    WITH ALGORITHM = AES_256
    ENCRYPTION BY SERVER CERTIFICATE RmrsTDECert;
GO

-- Step 4: Enable TDE
ALTER DATABASE RmrsDb SET ENCRYPTION ON;
GO
```

> **IMPORTANT:** Back up the TDE certificate and private key immediately after creation.
> Store backups in a secure location separate from database backups.

```sql
USE master;
GO
BACKUP CERTIFICATE RmrsTDECert
    TO FILE = 'C:\Backups\Certificates\RmrsTDECert.cer'
    WITH PRIVATE KEY (
        FILE = 'C:\Backups\Certificates\RmrsTDECert.pvk',
        ENCRYPTION BY PASSWORD = '<CERT_BACKUP_PASSWORD>'
    );
GO
```

## 2. Backup Strategy

### 2.1 Automated Daily Backup (24-hour RPO)

Configure a SQL Server Agent Job for daily full backups:

```sql
-- Daily full backup at 01:00
BACKUP DATABASE RmrsDb
    TO DISK = 'D:\Backups\RMRS\RmrsDb_Full.bak'
    WITH FORMAT, INIT, COMPRESSION,
         NAME = 'RMRS Full Backup',
         STATS = 10;
GO
```

### 2.2 Transaction Log Backups (for point-in-time recovery)

```sql
-- Every 15 minutes for finer RPO when needed
BACKUP LOG RmrsDb
    TO DISK = 'D:\Backups\RMRS\RmrsDb_Log.trn'
    WITH NOFORMAT, NOINIT, COMPRESSION,
         NAME = 'RMRS Log Backup';
GO
```

### 2.3 Backup Retention

- Keep daily full backups for 30 days
- Keep transaction log backups for 7 days
- Store offsite copies weekly

## 3. IIS Site Configuration

### 3.1 Install Prerequisites

```powershell
# Install IIS with required features
Install-WindowsFeature -Name Web-Server, Web-Asp-Net45, Web-Net-Ext45, Web-ISAPI-Ext, Web-ISAPI-Filter, Web-Mgmt-Console, Web-Websockets

# Install .NET 8 Hosting Bundle (download from https://dotnet.microsoft.com/download/dotnet/8.0)
# Run dotnet-hosting-8.0.x-win.exe

# Install URL Rewrite Module
# Download from https://www.iis.net/downloads/microsoft/url-rewrite
```

### 3.2 Create IIS Site

```powershell
# Create application pool
New-WebAppPool -Name "RmrsAppPool"
Set-ItemProperty "IIS:\AppPools\RmrsAppPool" -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty "IIS:\AppPools\RmrsAppPool" -Name "startMode" -Value "AlwaysRunning"

# Create website
New-Website -Name "RMRS" `
    -PhysicalPath "C:\Apps\RMRS\publish" `
    -ApplicationPool "RmrsAppPool" `
    -Port 443 `
    -Ssl `
    -HostHeader "records.sdinmotion.co.za"
```

### 3.3 Deploy Application

```bash
# Build and publish .NET application
dotnet publish src/Rmrs.Api/Rmrs.Api.csproj -c Release -o C:\Apps\RMRS\publish

# Build Angular SPA
cd client
npm ci
npm run build:prod

# Copy Angular output to wwwroot
xcopy /E /Y dist\rmrs-client\browser\* C:\Apps\RMRS\publish\wwwroot\
```

## 4. SSL Certificate Setup

### 4.1 Obtain SSL Certificate

Request a certificate for `records.sdinmotion.co.za` from your organization's CA or a public CA.

### 4.2 Bind Certificate in IIS

```powershell
# Import certificate
$cert = Import-PfxCertificate -FilePath "C:\Certificates\records.sdinmotion.co.za.pfx" `
    -CertStoreLocation "Cert:\LocalMachine\My" `
    -Password (ConvertTo-SecureString -String "<PFX_PASSWORD>" -AsPlainText -Force)

# Bind to site
New-WebBinding -Name "RMRS" -Protocol "https" -Port 443 -HostHeader "records.sdinmotion.co.za" -SslFlags 1
$binding = Get-WebBinding -Name "RMRS" -Protocol "https"
$binding.AddSslCertificate($cert.Thumbprint, "My")
```

### 4.3 TLS Configuration

Ensure only TLS 1.2+ is enabled on the server:

```powershell
# Disable TLS 1.0
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -Force
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.0\Server' -Name 'Enabled' -Value 0 -Type DWord

# Disable TLS 1.1
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -Force
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.1\Server' -Name 'Enabled' -Value 0 -Type DWord

# Ensure TLS 1.2 is enabled
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server' -Force
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server' -Name 'Enabled' -Value 1 -Type DWord

# Ensure TLS 1.3 is enabled (Windows Server 2022+)
New-Item 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Force
Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.3\Server' -Name 'Enabled' -Value 1 -Type DWord
```

## 5. Environment Variables for Secrets

Never store secrets in configuration files. Use environment variables or a secret manager:

```powershell
# Set environment variables for the application pool identity
[Environment]::SetEnvironmentVariable("ConnectionStrings__DefaultConnection", "Server=PROD-SQL-SERVER;Database=RmrsDb;User Id=RmrsAppUser;Password=<PASSWORD>;Encrypt=True;TrustServerCertificate=False;MultipleActiveResultSets=true", "Machine")
[Environment]::SetEnvironmentVariable("Bitrix__ClientId", "<BITRIX_CLIENT_ID>", "Machine")
[Environment]::SetEnvironmentVariable("Bitrix__ClientSecret", "<BITRIX_CLIENT_SECRET>", "Machine")
```

> Alternatively, use Azure Key Vault or Windows DPAPI for secret management.

The .NET configuration system reads environment variables with the `__` (double underscore) separator for nested keys.

## 6. Post-Deployment Verification

### 6.1 Health Check

```bash
curl https://records.sdinmotion.co.za/health
# Expected: Healthy
```

### 6.2 HTTPS Enforcement

```bash
curl -I http://records.sdinmotion.co.za
# Expected: 301 Redirect to https://records.sdinmotion.co.za
```

### 6.3 Security Headers

```bash
curl -I https://records.sdinmotion.co.za
# Verify headers:
#   X-Content-Type-Options: nosniff
#   X-Frame-Options: DENY
#   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 6.4 Swagger Disabled

```bash
curl https://records.sdinmotion.co.za/swagger
# Expected: 404 Not Found (Swagger disabled in production)
```

### 6.5 SPA Routing

```bash
curl https://records.sdinmotion.co.za/dashboard
# Expected: 200 OK (returns index.html via SPA fallback)
```

## 7. Maintenance

### 7.1 Application Updates

```bash
# Stop the application pool
Stop-WebAppPool -Name "RmrsAppPool"

# Deploy new version
dotnet publish src/Rmrs.Api/Rmrs.Api.csproj -c Release -o C:\Apps\RMRS\publish

# Apply any pending migrations
dotnet ef database update --project src/Rmrs.Infrastructure --startup-project src/Rmrs.Api

# Start the application pool
Start-WebAppPool -Name "RmrsAppPool"
```

### 7.2 Log Monitoring

Application logs are written to:
- SQL Server `Logs` table (structured via Serilog)
- stdout logs at `C:\Apps\RMRS\publish\logs\` (if enabled in web.config)

### 7.3 Performance Monitoring

- IIS request logging for traffic analysis
- SQL Server DMVs for query performance
- Windows Performance Monitor for resource utilization
- Health check endpoint at `/health` for uptime monitoring
