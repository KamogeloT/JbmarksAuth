# Database Table Setup Guide

## Problem
The `push_tokens` table was not being created automatically in PostgreSQL.

## Solution Applied

I've updated the server code to:
1. ✅ Create tables asynchronously on server startup
2. ✅ Add better error handling and logging
3. ✅ Add a manual setup endpoint

## Automatic Setup

The server will now automatically create the table when it starts, **IF**:
- `DATABASE_URL` environment variable is set in Railway
- Database connection is successful
- No errors occur during table creation

## Manual Setup (If Needed)

If the table still doesn't exist after Railway redeploys, you can create it manually:

### Option 1: Use the Setup Endpoint (Easiest)

After Railway redeploys, call this endpoint:

```bash
curl -X POST https://jbmarksauth-production.up.railway.app/api/db/setup
```

This will:
- Create the `push_tokens` table
- Create the index
- Verify the table exists

### Option 2: Use Railway's Database Dashboard

1. Go to Railway Dashboard
2. Click on your PostgreSQL database
3. Click "Query" or "Connect" tab
4. Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    apns_token TEXT NOT NULL,
    platform VARCHAR(10) DEFAULT 'ios',
    portal_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, apns_token)
);

CREATE INDEX IF NOT EXISTS idx_user_id ON push_tokens(user_id);
```

### Option 3: Check Railway Logs

After Railway redeploys, check the logs for:
- `✅ Database connection established`
- `✅ push_tokens table created/verified`
- `✅ Database indexes created/verified`

If you see errors, they'll be logged with details.

## Verify Table Exists

### Check Health Endpoint

```bash
curl https://jbmarksauth-production.up.railway.app/health
```

Should show:
```json
{
  "status": "healthy",
  "database": "connected",
  ...
}
```

### Check Database Directly

In Railway's database dashboard, run:
```sql
SELECT * FROM push_tokens;
```

Should return an empty table (no errors = table exists).

## Troubleshooting

### Table Still Not Created?

1. **Check DATABASE_URL is set**
   - Railway Dashboard → Variables → Look for `DATABASE_URL`
   - Should be: `postgresql://postgres:...@postgres.railway.internal:5432/railway`

2. **Check Railway Logs**
   - Look for database connection errors
   - Look for table creation errors

3. **Try Manual Setup**
   - Use Option 1 or 2 above

4. **Verify Connection**
   - The health endpoint should show `"database": "connected"`

## What the Table Stores

The `push_tokens` table stores:
- `user_id` - Bitrix24 user ID
- `apns_token` - iOS device push token
- `platform` - "ios" or "android"
- `portal_url` - Bitrix24 portal URL
- `created_at` - When token was first registered
- `updated_at` - Last update time

## Next Steps

1. ✅ Wait for Railway to redeploy (~2 minutes)
2. ✅ Check Railway logs for table creation messages
3. ✅ If needed, call `/api/db/setup` endpoint
4. ✅ Verify table exists using health endpoint or database query

---

**The table should now be created automatically when Railway redeploys!** 🎉
