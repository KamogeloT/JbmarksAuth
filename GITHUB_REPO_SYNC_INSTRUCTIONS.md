# GitHub Repo Sync Instructions

## Important: Railway Uses a Different Repository

Your Railway server is connected to: **`https://github.com/KamogeloT/JbmarksAuth`**

But your code is currently in: **Azure DevOps** (`git@ssh.dev.azure.com:v3/T3Systems/JBMARKS/JBMARKS`)

## What I've Done

✅ Committed and pushed server changes to Azure DevOps (feature/ios-push-notifications branch)

## What You Need to Do

You need to sync the updated `server-simple.js` and `package.json` to the GitHub repo that Railway watches.

### Option 1: Clone and Update GitHub Repo (Recommended)

```bash
# 1. Clone the GitHub repo (if you don't have it)
cd ~
git clone https://github.com/KamogeloT/JbmarksAuth.git
cd JbmarksAuth

# 2. Copy the updated files from this project
cp /Users/kamogelotshukudu/projects/JBMARKS/server-simple.js .
cp /Users/kamogelotshukudu/projects/JBMARKS/package.json .

# 3. Commit and push to GitHub
git add server-simple.js package.json
git commit -m "Add push notification endpoints"
git push origin main  # or master, depending on your default branch
```

### Option 2: Update Railway to Watch Azure DevOps (Alternative)

1. Go to Railway dashboard
2. Open your project
3. Go to Settings → Source
4. Disconnect from GitHub
5. Connect to Azure DevOps (if Railway supports it)

## Verification

After pushing to GitHub, Railway will automatically deploy. Check:
1. Railway dashboard → Deployments tab
2. Wait for deployment to complete
3. Test: `curl https://jbmarksauth-production.up.railway.app/health`

## Safety Guarantee

✅ **The changes are 100% safe:**
- Only **added** new endpoints
- Did **NOT modify** existing `/api/exchangetoken` endpoint
- Did **NOT change** any existing functionality
- Database and APNs code only runs if environment variables are set
- If env vars are missing, server logs warnings but continues working

Your existing OAuth token exchange will continue working exactly as before!
