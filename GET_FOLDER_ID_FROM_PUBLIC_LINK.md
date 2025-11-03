# How to Get Folder ID from Bitrix24 Public Link

## Your Electric Department Public Link
Hash: `DY3ZD`
Full Link: `https://your-portal.bitrix24.com/~DY3ZD` (or similar)

## Method 1: Using Browser Developer Tools (Easiest)

1. **Open the public link in your browser**
   - Go to: `https://your-portal.bitrix24.com/~DY3ZD`
   - (Replace with your actual Bitrix24 portal URL)

2. **Open Developer Tools**
   - Press `F12` on your keyboard
   - Or right-click → "Inspect"

3. **Go to the Network tab**
   - Click on "Network" tab in developer tools
   - Keep it open

4. **Refresh the page or click on the folder**
   - Press `F5` to refresh
   - Watch the Network tab for API calls

5. **Look for API calls containing folder information**
   - Look for calls to endpoints like:
     - `disk.folder.get`
     - `disk.folder.getchildren`
     - URLs containing `/disk/folder/`
   - Click on these calls

6. **Find the folder ID**
   - In the call details, look for:
     - `id`: This is the folder ID (usually a number like 123, 456, etc.)
   - OR check the URL parameters for `id=XXX`

## Method 2: Check the URL When Logged In

1. **Log in to your Bitrix24 account**

2. **Navigate to the Electric workgroup**
   - Go to Workgroups → Electric Department

3. **Open the Drive tab**

4. **Find the shared folder**
   - It should be the folder you created the public link for

5. **Click on the folder**

6. **Check the browser address bar**
   - The URL will look like: `/workgroups/group/6/disk/folder/123/`
   - OR: `/company/personal/user/1/disk/folder/456/`
   - The number after `/folder/` is your folder ID

## Method 3: Use Bitrix24 REST API

If you have access to make API calls:

```
https://your-portal.bitrix24.com/rest/USER_ID/WEBHOOK_CODE/disk.folder.get.json?id=<try_different_ids>
```

Or use this to list all folders in the Electric workgroup storage:

```
https://your-portal.bitrix24.com/rest/USER_ID/WEBHOOK_CODE/disk.storage.getchildren.json?id=<ELECTRIC_STORAGE_ID>
```

## What to Do Once You Have the Folder ID

1. **Open the `.env` file** (I'll open it for you with notepad)

2. **Add this line:**
   ```
   VITE_BITRIX24_DRIVE_FOLDER_ELECTRICITY=<YOUR_FOLDER_ID>
   ```

3. **Example:**
   ```
   VITE_BITRIX24_DRIVE_FOLDER_ELECTRICITY=123
   ```

4. **Save the file**

5. **Rebuild the app** (I'll help you with this)

## Expected Folder ID Format

- Should be a number: `123`, `456`, `789`, etc.
- NOT a hash like `DY3ZD`
- NOT a URL

## Troubleshooting

### Can't find folder ID in Network tab
- Make sure you're refreshing the page while Network tab is open
- Try clicking into the folder and subfolders
- Look for calls with "folder" or "disk" in the name

### URL doesn't show folder ID
- You might be viewing a public link view (not logged in)
- Log in to Bitrix24 first, then navigate to the folder normally

### Still can't find it
- Contact your Bitrix24 administrator
- They can navigate to the folder and check the ID for you

