# 🔧 Fix for HTTP 404 Error: Missing Webhook URL

## ❌ Problem

You're seeing this error:
```
Error: HTTP 404 ERROR
URL: /tasks.task.add.json
Status: 404 Not Found
```

This means your **Bitrix24 webhook URL is NOT configured**. The empty URL (`/tasks.task.add.json`) shows the webhook URL is missing.

## ✅ Solution

### Step 1: Get Your Bitrix24 Webhook URL

1. Go to Bitrix24 → **Settings** → **Integrations** → **Webhooks**
2. Click **Inbound webhook**
3. If you have one, copy the webhook URL
4. If you don't have one:
   - Click **+ Add webhook**
   - Enable permissions: **Tasks**, **Disk**
   - Copy the webhook URL that looks like:
     ```
     https://www.sdinmotion.co.za/rest/1/YOUR_WEBHOOK_CODE/
     ```

### Step 2: Create .env File

1. Create a file named `.env` in the project root directory
2. Add your webhook URL:
   ```env
   VITE_BITRIX24_WEBHOOK_URL=https://www.sdinmotion.co.za/rest/1/YOUR_WEBHOOK_CODE/
   VITE_BITRIX24_USER_ID=1
   
   # Potchefstroom Department Groups
   VITE_BITRIX24_GROUP_POTCHEFSTROOM_WATER=6
   VITE_BITRIX24_GROUP_POTCHEFSTROOM_ELECTRICITY=5
   VITE_BITRIX24_GROUP_POTCHEFSTROOM_ROADS=7
   VITE_BITRIX24_GROUP_POTCHEFSTROOM_WASTE=8
   
   # Ventersdorp Department Groups
   VITE_BITRIX24_GROUP_VENTERSDORP_WATER=2
   VITE_BITRIX24_GROUP_VENTERSDORP_ELECTRICITY=1
   VITE_BITRIX24_GROUP_VENTERSDORP_ROADS=3
   VITE_BITRIX24_GROUP_VENTERSDORP_WASTE=4
   
   # Potchefstroom Storage IDs
   VITE_BITRIX24_STORAGE_POTCHEFSTROOM_WATER=11
   VITE_BITRIX24_STORAGE_POTCHEFSTROOM_ELECTRICITY=10
   VITE_BITRIX24_STORAGE_POTCHEFSTROOM_ROADS=12
   VITE_BITRIX24_STORAGE_POTCHEFSTROOM_WASTE=13
   
   # Potchefstroom Root Object IDs
   VITE_BITRIX24_ROOT_POTCHEFSTROOM_WATER=23
   VITE_BITRIX24_ROOT_POTCHEFSTROOM_ELECTRICITY=22
   VITE_BITRIX24_ROOT_POTCHEFSTROOM_ROADS=24
   VITE_BITRIX24_ROOT_POTCHEFSTROOM_WASTE=25
   
   # Ventersdorp Storage IDs
   VITE_BITRIX24_STORAGE_VENTERSDORP_WATER=7
   VITE_BITRIX24_STORAGE_VENTERSDORP_ELECTRICITY=6
   VITE_BITRIX24_STORAGE_VENTERSDORP_ROADS=8
   VITE_BITRIX24_STORAGE_VENTERSDORP_WASTE=9
   
   # Ventersdorp Root Object IDs
   VITE_BITRIX24_ROOT_VENTERSDORP_WATER=19
   VITE_BITRIX24_ROOT_VENTERSDORP_ELECTRICITY=18
   VITE_BITRIX24_ROOT_VENTERSDORP_ROADS=20
   VITE_BITRIX24_ROOT_VENTERSDORP_WASTE=21
   ```

3. **Replace `YOUR_WEBHOOK_CODE`** with your actual webhook code from Bitrix24

### Step 3: Restart Development Server

1. **Stop the current server** (press `Ctrl+C` in the terminal)
2. **Start it again**:
   ```bash
   npm run dev
   ```
3. **Refresh your browser** at `http://localhost:3000`

### Step 4: Test Again

Try submitting a fault report. You should now see either:
- ✅ Success! (Task created in Bitrix24)
- ❌ A more detailed error message if something else is wrong

## 🔍 Improved Error Handling

I've added better error handling. Now if the webhook URL is missing, you'll see a detailed error popup explaining exactly what to do.

## 📝 Important Notes

- The `.env` file is NOT committed to git (it's in `.gitignore`)
- Keep your webhook URL secure - don't share it publicly
- The webhook URL format should be: `https://domain.bitrix24.com/rest/1/WEBHOOK_CODE/`
- Make sure the webhook has **Tasks** and **Disk** permissions enabled

## 🆘 Still Having Issues?

If you still see errors after configuring the webhook URL:

1. Check the webhook URL is correct and active in Bitrix24
2. Verify webhook permissions include Tasks and Disk
3. Check browser console (F12) for more details
4. Try the webhook URL directly in browser:
   ```
   https://your-domain.bitrix24.com/rest/1/YOUR_WEBHOOK_CODE/tasks.task.list.json
   ```
   You should see a JSON response (not an error)

