# 🔧 Bitrix24 Setup Guide for JBmarks Municipality

## ⚠️ Important: This is Why Your Submissions Are Failing!

Your app needs to be connected to Bitrix24 to submit fault reports. Currently, the Bitrix24 webhook URL is not configured, which is why you're getting "Failed to fetch" errors.

---

## 📋 Step-by-Step Setup

### **Step 1: Log in to Bitrix24**

1. Go to your Bitrix24 account
2. Log in as an administrator

---

### **Step 2: Create an Inbound Webhook**

1. Click on **Settings** (⚙️) in the top right
2. Go to **Integrations** → **Webhooks**
3. Click **Inbound webhook**
4. Click **+ Add webhook**

---

### **Step 3: Configure Webhook Permissions**

Enable the following permissions:

✅ **Tasks** (tasks) - Required for creating fault reports as tasks
- `tasks.task.add` - Create tasks
- `tasks.task.update` - Update tasks
- `tasks.task.get` - Get task info

✅ **Disk** (disk) - Required for uploading photos
- `disk.folder.uploadfile` - Upload files
- `disk.storage.uploadfile` - Upload to storage

✅ **Optional: CRM** - If you want to link to CRM
- `crm.lead.add` - Create leads

---

### **Step 4: Copy Your Webhook URL**

After creating the webhook, you'll see a URL like:
```
https://jbmarks.bitrix24.com/rest/1/abc123xyz456/
```

**Copy this entire URL!**

---

### **Step 5: Add Webhook URL to Your App**

1. Open the `.env` file in your project folder:
   ```
   C:\Users\kamogelot\Downloads\fault-reporting-mobile-app\.env
   ```

2. Paste your webhook URL after the `=` sign:
   ```env
   VITE_BITRIX24_WEBHOOK_URL=https://jbmarks.bitrix24.com/rest/1/abc123xyz456/
   ```

3. **Save the file**

---

### **Step 6: Configure Group IDs (Optional but Recommended)**

1. In Bitrix24, go to **Workgroups** → **All workgroups**
2. Find or create groups for each department:
   - Water & Sanitation Department
   - Electricity Department
   - Roads & Stormwater Department
   - Waste Management Department

3. Click on each group and note the **Group ID** from the URL:
   ```
   https://jbmarks.bitrix24.com/workgroups/group/5/
                                              ↑
                                          This is the Group ID
   ```

4. Update the `.env` file with your actual group IDs:
   ```env
   VITE_BITRIX24_GROUP_WATER=5
   VITE_BITRIX24_GROUP_ELECTRICITY=6
   VITE_BITRIX24_GROUP_ROADS=7
   VITE_BITRIX24_GROUP_WASTE=8
   ```

---

### **Step 7: Find Your User ID**

1. In Bitrix24, click on your profile picture → **My Profile**
2. Look at the URL:
   ```
   https://jbmarks.bitrix24.com/company/personal/user/1/
                                                      ↑
                                                 This is your User ID
   ```

3. Update in `.env`:
   ```env
   VITE_BITRIX24_USER_ID=1
   ```

---

### **Step 8: Rebuild and Test**

After configuring the `.env` file, rebuild your app:

```bash
.\build-and-run.ps1
```

Now try submitting a fault report - it should work! ✅

---

## 🧪 Testing Your Setup

### **Test Submission:**
1. Open the app on your phone
2. Fill in a test fault report:
   - Name: Test User
   - Phone: 082 123 4567
   - Type: Water
   - Issue: Burst Pipe
   - Location: Test Street
   - Details: This is a test submission
3. Click **Submit Report**

### **Expected Result:**
- ✅ "Report Submitted!" success message
- ✅ Reference number displayed
- ✅ New task created in Bitrix24

### **Check in Bitrix24:**
1. Go to **Tasks** in your Bitrix24
2. You should see a new task: "Water & Sanitation Issue - Burst Pipe"
3. Open it to see all the details

---

## 🔍 Troubleshooting

### **Still Getting "Failed to Fetch" Error?**

**Check 1: Is the webhook URL correct?**
- Make sure it starts with `https://`
- Make sure it ends with `/`
- No extra spaces before or after

**Check 2: Are permissions enabled?**
- Go back to Bitrix24 webhook settings
- Make sure Tasks and Disk permissions are checked

**Check 3: Is the webhook active?**
- Sometimes webhooks expire or get disabled
- Check webhook status in Bitrix24

**Check 4: Did you rebuild the app?**
- After changing `.env`, you MUST rebuild:
  ```bash
  .\build-and-run.ps1
  ```

---

## 📞 Need Help?

If you're still having issues:

1. Check the app logs:
   ```bash
   adb logcat -s Capacitor Console Chromium
   ```

2. Check Chrome DevTools:
   - Open `chrome://inspect`
   - Click "inspect" on your app
   - Look at Console for error messages

---

## ✅ Configuration Checklist

- [ ] Logged in to Bitrix24 as administrator
- [ ] Created inbound webhook with Tasks and Disk permissions
- [ ] Copied webhook URL
- [ ] Pasted webhook URL in `.env` file
- [ ] Configured group IDs (optional)
- [ ] Configured user ID
- [ ] Saved `.env` file
- [ ] Rebuilt app with `.\build-and-run.ps1`
- [ ] Tested submission
- [ ] Verified task created in Bitrix24

---

**Once configured, all fault reports will automatically create tasks in Bitrix24!** 🎉

