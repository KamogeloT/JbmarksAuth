# Step-by-Step: Upload Files via Kudu (Azure Portal)

## Prerequisites
- Files ready to upload:
  - `exchangeToken/index.js`
  - `exchangeToken/function.json`
  - `host.json` (in root)
  - `package.json` (in root)

## Step-by-Step Instructions

### Step 1: Open Azure Portal
1. Go to: **https://portal.azure.com**
2. Sign in with your Azure account (`admin@t3ssystems.co.za`)

### Step 2: Navigate to Function App
1. In the search bar at the top, type: **`jbmarks-token-exchange-v2`**
2. Click on the Function App when it appears

### Step 3: Open Kudu (Advanced Tools)
1. In the left sidebar, scroll down to **"Development Tools"** section
2. Click on **"Advanced Tools (Kudu)"**
3. Click the **"Go"** button (opens Kudu in a new tab)

### Step 4: Open Debug Console
1. In Kudu, click on the **"Debug console"** dropdown menu at the top
2. Select **"CMD"** (or PowerShell if you prefer)

### Step 5: Navigate to Function Directory
1. You'll see a file browser on the left side
2. Navigate to: **`site`** → **`wwwroot`**
3. Look for the **`exchangeToken`** folder
   - If it exists, click on it
   - If it doesn't exist, you'll need to create it first (see Step 6)

### Step 6: Create exchangeToken Folder (if needed)
**Option A: Via File Browser**
1. In the file browser, right-click on **`wwwroot`**
2. Select **"New"** → **"Folder"**
3. Name it: **`exchangeToken`**
4. Press Enter

**Option B: Via Command Line**
1. In the command prompt at the bottom, type:
   ```
   cd site\wwwroot
   mkdir exchangeToken
   cd exchangeToken
   ```

### Step 7: Upload index.js
1. Make sure you're in the **`exchangeToken`** folder
2. Click the **folder icon** (📁) in the top-right corner of the file browser
   - This opens the file upload interface
3. **Method 1: Drag and Drop**
   - Drag `index.js` from your computer into the file browser
   - Wait for upload to complete
4. **Method 2: Upload Button**
   - Click the **"+"** button or **"Upload"** button
   - Browse and select `index.js`
   - Click **"Open"**

### Step 8: Upload function.json
1. Still in the **`exchangeToken`** folder
2. Upload `function.json` using the same method (drag-drop or upload button)

### Step 9: Upload Root Files
1. Navigate back to **`wwwroot`** folder (click ".." or navigate up)
2. Upload **`host.json`** here (if it doesn't exist or needs updating)
3. Upload **`package.json`** here (if it doesn't exist or needs updating)

### Step 10: Verify Files Are Uploaded
1. Check that you can see:
   - `site/wwwroot/exchangeToken/index.js`
   - `site/wwwroot/exchangeToken/function.json`
   - `site/wwwroot/host.json`
   - `site/wwwroot/package.json`
2. Right-click on `index.js` → **"Edit"** to verify content (optional)

### Step 11: Restart Function App
1. Go back to Azure Portal (close Kudu tab or switch tabs)
2. In the Function App overview page, click **"Restart"** button at the top
3. Wait for restart to complete (30-60 seconds)

### Step 12: Test Function
1. Go to **"Functions"** in the left sidebar
2. Click on **"exchangeToken"** function
3. Click **"Test/Run"** tab
4. Click **"Run"** to test
5. Check the output for errors

## Troubleshooting

### Can't see "Advanced Tools (Kudu)"?
- Make sure you're in the Function App, not the Resource Group
- Try refreshing the page

### Files won't upload?
- Make sure you're in the correct folder (`exchangeToken` for function files, `wwwroot` for root files)
- Try using the command line method instead:
  ```
  cd site\wwwroot\exchangeToken
  # Then use the upload button
  ```

### Function still shows "File does not exist"?
- Verify file names are exactly: `index.js` and `function.json` (case-sensitive)
- Check that `function.json` has `"scriptFile": "index.js"` inside
- Restart the Function App again
- Check Application Insights logs for detailed errors

### Need to edit files after upload?
- Right-click on the file in Kudu file browser
- Select **"Edit"**
- Make changes and save
- Restart Function App

## Quick Reference: File Locations
```
site/wwwroot/
├── host.json                    ← Upload here
├── package.json                 ← Upload here
└── exchangeToken/
    ├── index.js                 ← Upload here
    └── function.json            ← Upload here
```
