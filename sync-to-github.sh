#!/bin/bash

# Script to sync server code to GitHub repo for Railway deployment

echo "🔄 Syncing server code to GitHub repository..."

# GitHub repo path (update if different)
GITHUB_REPO_PATH="$HOME/JbmarksAuth"

# Current project path
CURRENT_PROJECT="/Users/kamogelotshukudu/projects/JBMARKS"

# Check if GitHub repo exists
if [ ! -d "$GITHUB_REPO_PATH" ]; then
    echo "📦 GitHub repo not found. Cloning..."
    cd ~
    git clone https://github.com/KamogeloT/JbmarksAuth.git
    if [ $? -ne 0 ]; then
        echo "❌ Failed to clone GitHub repo. Please clone it manually:"
        echo "   cd ~"
        echo "   git clone https://github.com/KamogeloT/JbmarksAuth.git"
        exit 1
    fi
fi

# Copy updated files
echo "📋 Copying updated files..."
cp "$CURRENT_PROJECT/server-simple.js" "$GITHUB_REPO_PATH/"
cp "$CURRENT_PROJECT/package.json" "$GITHUB_REPO_PATH/"

# Check if railway.json exists, copy if it doesn't
if [ ! -f "$GITHUB_REPO_PATH/railway.json" ] && [ -f "$CURRENT_PROJECT/railway.json" ]; then
    cp "$CURRENT_PROJECT/railway.json" "$GITHUB_REPO_PATH/"
fi

# Check if Procfile exists, copy if it doesn't
if [ ! -f "$GITHUB_REPO_PATH/Procfile" ] && [ -f "$CURRENT_PROJECT/Procfile" ]; then
    cp "$CURRENT_PROJECT/Procfile" "$GITHUB_REPO_PATH/"
fi

# Navigate to GitHub repo
cd "$GITHUB_REPO_PATH"

# Check git status
echo "📊 Checking git status..."
git status

# Add files
echo "➕ Adding files..."
git add server-simple.js package.json

# Commit
echo "💾 Committing changes..."
git commit -m "feat: Add push notification endpoints

- Add PostgreSQL database support for storing APNs tokens
- Add APNs provider initialization
- Add /api/push/register-token endpoint
- Add /api/push/send endpoint
- Add /api/push/token/:user_id DELETE endpoint
- Update package.json with pg and apn dependencies
- All existing endpoints remain unchanged and functional
- Safe to deploy - only additions, no breaking changes"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main 2>/dev/null || git push origin master

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "🔄 Railway will automatically deploy in 1-2 minutes"
    echo ""
    echo "Next steps:"
    echo "1. Go to Railway dashboard and add PostgreSQL database"
    echo "2. Add environment variables (see RAILWAY_SETUP_INSTRUCTIONS.md)"
    echo "3. Wait for Railway to deploy"
else
    echo "❌ Failed to push. Please check:"
    echo "   - GitHub credentials are set up"
    echo "   - You have write access to the repo"
    echo "   - Internet connection is working"
fi
