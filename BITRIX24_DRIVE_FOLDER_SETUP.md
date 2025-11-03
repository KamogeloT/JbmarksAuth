# Bitrix24 Drive Setup Guide - SIMPLIFIED! 🎉

## ✅ NO MANUAL CONFIGURATION NEEDED!

**Good news:** The app now automatically uses each workgroup's Drive storage based on the workgroup ID! 

You **DO NOT** need to find or configure individual Drive folder IDs anymore. The system will:
1. Automatically locate the workgroup's Drive storage using the workgroup ID
2. Upload the photo to that workgroup's Drive
3. Attach the file to the task

This is all handled automatically!

## How It Works

When a user submits a fault report with a photo:

1. **System identifies the workgroup** based on the fault type (Water, Electricity, Roads, or Waste)
2. **Automatically queries Bitrix24** to get the workgroup's Drive storage ID using `disk.storage.getlist` API
3. **Uploads the photo** to that workgroup's Drive root folder using `disk.storage.uploadfile` API
4. **Attaches the file** to the newly created task using `tasks.task.files.attach` API

All of this happens automatically without any folder ID configuration!

## What You Need

Just ensure your `.env` file has the correct workgroup IDs:

```env
VITE_BITRIX24_WEBHOOK_URL=https://your-portal.bitrix24.com/rest/1/your_webhook_code/
VITE_BITRIX24_USER_ID=1

# These are the workgroup IDs - the system will automatically find their Drive storage
VITE_BITRIX24_GROUP_WATER=5
VITE_BITRIX24_GROUP_ELECTRICITY=6
VITE_BITRIX24_GROUP_ROADS=7
VITE_BITRIX24_GROUP_WASTE=8
```

## Verification

To test that everything is working:

1. Submit a test fault report with a photo for each department
2. Go to the respective workgroup in Bitrix24 (Water, Electricity, Roads, or Waste)
3. Open the workgroup's Drive
4. Verify the image appears in the Drive root folder
5. Open the created task and verify the image is attached

## Troubleshooting

### Images not uploading
- **Check webhook permissions:** Ensure "Drive" permission is enabled in your inbound webhook
- **Check workgroup IDs:** Verify the workgroup IDs in `.env` match your actual Bitrix24 workgroup IDs
- **Check webhook user access:** The webhook user must have access to the workgroups

### Images uploaded but not attached to tasks
- This means the Drive upload worked but task attachment failed
- Check browser console for detailed error messages (press F12)
- Verify "Tasks" permission is enabled in your webhook

### "Could not access workgroup Drive" error
- The system couldn't find a Drive storage for the workgroup
- Verify the workgroup ID is correct
- Ensure the workgroup exists and has Drive enabled
- Check that the webhook user has access to the workgroup

### Permission denied errors
- The webhook user may not have access to the workgroup
- Go to the workgroup settings and add the webhook user as a member

## Where Files Are Uploaded

Files are uploaded to the **root folder** of each workgroup's Drive. If you want better organization, you can:

**Option 1: Let files accumulate in root** (simplest)
- All fault report images will be in the workgroup's Drive root
- Still attached to tasks, so easy to find via the task

**Option 2: Manually organize later**
- Create folders in the workgroup Drive (e.g., "2025 Fault Reports")
- Periodically move files into organized folders
- Files will remain attached to tasks even if moved

**Option 3: Advanced - Custom folder creation** (requires code modification)
- The code could be modified to create dated folders automatically
- This is not implemented by default to keep the setup simple

## Technical Details

The system uses these Bitrix24 REST API methods:

1. `disk.storage.getlist` - Find the workgroup's Drive storage
   - Filters by `ENTITY_TYPE: "group"` and `ENTITY_ID: <workgroupId>`
   
2. `disk.storage.uploadfile` - Upload file to the storage
   - Uses the storage ID obtained from step 1
   
3. `tasks.task.files.attach` - Attach file to task
   - Links the uploaded file to the created task

## Need Help?

If you're having trouble:
1. Check browser console (F12) for detailed error messages
2. Verify all webhook permissions are enabled (Drive + Tasks)
3. Test with the Bitrix24 REST API Explorer
4. Check Bitrix24 API documentation: https://apidocs.bitrix24.com/

