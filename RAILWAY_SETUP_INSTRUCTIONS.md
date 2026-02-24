# Railway Setup Instructions - Simple Step-by-Step

## What You Need to Understand

**Railway is just a hosting platform** - like a cloud computer that runs your code.

Here's the flow:
1. **You edit code HERE** (in this project on your computer)
2. **You push to GitHub** (git push)
3. **Railway automatically deploys** (it watches GitHub and runs your code)

## Step 1: Go to Railway Dashboard

1. Open your browser
2. Go to: https://railway.app/dashboard
3. Log in
4. Find your project (should be called something like "jbmarksauth-production")

## Step 2: Add PostgreSQL Database

1. In your Railway project, click the **"+ New"** button
2. Click **"Database"**
3. Click **"Add PostgreSQL"**
4. Wait for it to create (takes ~30 seconds)
5. **Done!** Railway automatically creates a `DATABASE_URL` environment variable

## Step 3: Add Environment Variables

1. In your Railway project, click on the **"Variables"** tab
2. Click **"+ New Variable"** for each of these:

### Variable 1: APNS_TEAM_ID
- **Name:** `APNS_TEAM_ID`
- **Value:** Your Apple Team ID (get it from https://developer.apple.com/account)
- Click **"Add"**

### Variable 2: APNS_KEY_CONTENT
- **Name:** `APNS_KEY_CONTENT`
- **Value:** (See Step 4 below to get this)
- Click **"Add"**

### Variable 3: APNS_BUNDLE_ID
- **Name:** `APNS_BUNDLE_ID`
- **Value:** Your iOS app bundle ID (e.g., `com.example.jbmarks` or check in Xcode)
- Click **"Add"**

## Step 4: Get Your APNs Key as Base64

Open Terminal on your Mac and run:

```bash
base64 -i ~/Downloads/AuthKey_KGVWC4F2KA.p8
```

This will output a long string. **Copy the ENTIRE output** (it's all one line, even if it looks like multiple lines).

Then:
1. Go back to Railway
2. Find the `APNS_KEY_CONTENT` variable you just created
3. Click **"Edit"**
4. Paste the entire base64 string
5. Click **"Save"**

## Step 5: Push Your Code to GitHub

I've already updated your `server-simple.js` and `package.json` files with the push notification code.

Now you need to:

1. **Install dependencies locally** (optional, for testing):
   ```bash
   npm install
   ```

2. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Add push notification endpoints"
   git push
   ```

3. **Railway will automatically deploy!** (takes 1-2 minutes)

## Step 6: Verify It Works

1. Wait for Railway to finish deploying (check the "Deployments" tab)
2. Test the health endpoint:
   ```bash
   curl https://jbmarksauth-production.up.railway.app/health
   ```

3. You should see:
   ```json
   {
     "status": "healthy",
     "service": "jbmarks-token-exchange",
     "version": "1.0.0",
     "timestamp": "..."
   }
   ```

## That's It!

Your server now has push notification endpoints:
- `POST /api/push/register-token` - iOS app will call this
- `POST /api/push/send` - Send notifications
- `DELETE /api/push/token/:user_id` - Remove tokens

## Troubleshooting

### Railway says "Build Failed"
- Check the "Logs" tab in Railway
- Make sure `package.json` has the new dependencies (pg, apn)

### Database connection error
- Make sure you added PostgreSQL database in Railway
- Check that `DATABASE_URL` is set (Railway sets this automatically)

### APNs not working
- Verify `APNS_TEAM_ID` is correct
- Check `APNS_KEY_CONTENT` is the full base64 string (no line breaks)
- Make sure `APNS_BUNDLE_ID` matches your iOS app

## Need Help?

Check Railway logs:
1. Go to Railway dashboard
2. Click on your project
3. Click "Deployments" tab
4. Click on the latest deployment
5. Click "View Logs"

The logs will show you exactly what's happening!
