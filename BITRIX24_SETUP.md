# Bitrix24 Setup Guide

This guide will help you configure Bitrix24 for the Municipal Fault Reporting Mobile App.

## Step 1: Create Inbound Webhook

1. **Log in to Bitrix24** as an administrator

2. **Navigate to Webhooks:**
   - Go to Settings → Developer resources → Webhooks
   - Or direct URL: `https://your-domain.bitrix24.com/devops/`

3. **Create Inbound Webhook:**
   - Click "Add Webhook" or "Inbound webhook"
   - Give it a name: "Municipal Fault Reporting App"

4. **Grant Permissions:**
   
   Select the following permissions:
   
   **Required:**
   - ✅ **tasks** - All task permissions
     - `tasks.task.add` - Create tasks
     - `tasks.task.update` - Update tasks
     - `tasks.task.get` - Read tasks
   
   - ✅ **disk** - File management
     - `disk.storage.uploadfile` - Upload files
     - `disk.folder.uploadfile` - Upload to folder
     - `disk.file.get` - Read files
   
   - ✅ **user** - User information
     - `user.get` - Read user data
   
   **Optional:**
   - ✅ **sonet_group** - Workgroup access
     - `sonet_group.get` - Read workgroups

5. **Copy Webhook URL:**
   - After creation, copy the webhook URL
   - Format: `https://your-domain.bitrix24.com/rest/1/xxxxxxxxx/`
   - Save this for your `.env` file

## Step 2: Create Department Workgroups

Create a workgroup for each municipal department:

### Water & Sanitation Department

1. Go to Workgroups → Create Group
2. **Name:** Water & Sanitation Department
3. **Type:** Open group
4. **Permissions:** Allow members to create tasks
5. **Add Members:** Add relevant department staff
6. **Note the Group ID** (visible in the URL after creation)
   - URL format: `.../workgroups/group/XX/`
   - The XX is your Group ID

### Electricity Department

1. Create another workgroup
2. **Name:** Electricity Department
3. Follow same steps as above
4. **Note the Group ID**

### Roads & Stormwater Department

1. Create another workgroup
2. **Name:** Roads & Stormwater Department
3. Follow same steps as above
4. **Note the Group ID**

### Waste Management Department

1. Create another workgroup
2. **Name:** Waste Management Department
3. Follow same steps as above
4. **Note the Group ID**

## Step 3: Get Your User ID

1. Go to your Bitrix24 profile
2. Click on your name/avatar → Profile
3. Look at the URL: `.../company/personal/user/X/`
4. The X is your User ID
5. Or use the webhook user (usually ID: 1)

## Step 4: (Optional) Create Upload Folder

For better organization of uploaded photos:

1. Go to Bitrix24 Drive
2. Create a new folder: "Fault Report Attachments"
3. Note the folder ID from the URL
4. Add this to your `.env` file as `VITE_BITRIX24_DISK_FOLDER_ID`

## Step 5: Configure Environment Variables

Create a `.env` file in your project root:

```env
# Bitrix24 Webhook URL (from Step 1)
VITE_BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.com/rest/1/xxxxxxxxx

# User ID (from Step 3) - usually 1 for webhook user
VITE_BITRIX24_USER_ID=1

# Department Group IDs (from Step 2)
VITE_BITRIX24_GROUP_WATER=5
VITE_BITRIX24_GROUP_ELECTRICITY=6
VITE_BITRIX24_GROUP_ROADS=7
VITE_BITRIX24_GROUP_WASTE=8

# Optional: Disk Folder ID (from Step 4)
# VITE_BITRIX24_DISK_FOLDER_ID=123
```

## Step 6: Test the Integration

1. **Build and run the app:**
   ```bash
   npm install
   npm run dev
   ```

2. **Submit a test report:**
   - Open the app in your browser
   - Fill out a fault report
   - Submit it

3. **Verify in Bitrix24:**
   - Check the relevant workgroup (e.g., Water & Sanitation)
   - You should see a new task created
   - Task should have all the report details
   - If you uploaded a photo, it should be attached

## Troubleshooting

### Problem: "Access denied" or "Insufficient permissions"

**Solution:**
- Check webhook permissions include tasks and disk
- Ensure webhook is active (not expired)
- Verify user has access to workgroups

### Problem: Tasks not appearing in workgroups

**Solution:**
- Verify Group IDs are correct
- Check workgroup privacy settings
- Ensure webhook user is a member of the workgroups

### Problem: File uploads failing

**Solution:**
- Check disk permissions in webhook
- Verify file size is under 10MB
- Try without specifying DISK_FOLDER_ID first
- Ensure webhook has `disk.storage.uploadfile` permission

### Problem: "Invalid webhook URL"

**Solution:**
- Check URL format (should end with `/`)
- Ensure no extra characters or spaces
- Verify webhook is still active in Bitrix24
- Check if webhook was deleted or expired

### Problem: Wrong department receiving tasks

**Solution:**
- Double-check Group IDs in `.env`
- Verify the mapping in `src/config.ts`
- Test each category individually

## Finding Group IDs

If you're having trouble finding Group IDs:

1. Go to the workgroup in Bitrix24
2. Look at the browser URL
3. Format: `https://your-domain.bitrix24.com/workgroups/group/XX/`
4. The number XX is your Group ID

Or use the API method:

1. Open browser console on any Bitrix24 page
2. Run this in console:
   ```javascript
   BX24.callMethod('sonet_group.get', {}, function(result){
     console.log(result.data());
   });
   ```
3. Find your groups and note their IDs

## Task Priority and Deadline Settings

The app automatically sets:

- **Water & Electricity:** High priority (2), 24-hour deadline
- **Roads:** Medium priority (1), 72-hour deadline
- **Waste:** Medium priority (1), 48-hour deadline

You can customize these in `src/services/bitrix24Service.ts`

## API Limits

Bitrix24 has rate limits on API calls:

- **Cloud:** 2 requests/second
- **Self-hosted:** Higher limits

The app handles this by:
- Creating one task per report
- Optional file upload (separate call)
- No continuous polling

## Security Best Practices

1. **Keep webhook URL secret**
   - Don't commit to public repositories
   - Use environment variables
   - Rotate webhook periodically

2. **Monitor webhook usage**
   - Check Bitrix24 webhook logs regularly
   - Look for unusual activity

3. **Limit webhook permissions**
   - Only grant required permissions
   - Don't give full admin access

4. **Use HTTPS**
   - Always serve app over HTTPS
   - Bitrix24 webhooks are HTTPS only

## Support

For Bitrix24-specific issues:
- Bitrix24 Help Center: https://helpdesk.bitrix24.com/
- Developer Documentation: https://dev.bitrix24.com/

For app-specific issues:
- Check the main README.md
- Review DEPLOYMENT.md for configuration
