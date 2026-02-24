# 🚀 Quick Setup - Railway Environment Variables

## ✅ Ready to Copy & Paste!

All values are ready. Just add them to Railway.

---

## 📋 Add These 3 Variables to Railway

Go to: **Railway Dashboard** → Your Project → **Variables** → **"+ New Variable"**

### Variable 1: APNS_TEAM_ID
```
Name: APNS_TEAM_ID
Value: R4K5T5B397
```

### Variable 2: APNS_KEY_CONTENT
```
Name: APNS_KEY_CONTENT
Value: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZytFTzA2ZTMzMlVtWW1YaXMKOWNRR3krcElMYmtacmUvNFg0K2swblY3UGtTZ0NnWUlLb1pJemowREFRZWhSQU5DQUFTdW1Oa2F4c0dDZWNidAoya0dCU1EvTU9NNkVMWjZLYWNMczhzZkhqT2NhQXk3a2QvdUorWC9OLzA2Q01FU1hiZE1uTjlaaS84QzZLQUNICkg0eWhuWnN6Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=
```

### Variable 3: APNS_BUNDLE_ID
```
Name: APNS_BUNDLE_ID
Value: jbmarks.JbmrksIOs
```

---

## 📝 Step-by-Step

1. **Open Railway Dashboard**
   - https://railway.app/dashboard
   - Click your project

2. **Go to Variables**
   - Click **"Variables"** tab

3. **Add Each Variable**
   - Click **"+ New Variable"**
   - Copy-paste Name and Value from above
   - Click **"Add"**
   - Repeat for all 3 variables

4. **Wait for Redeploy**
   - Railway will automatically redeploy
   - Takes ~1-2 minutes

5. **Verify in Logs**
   - Go to **Deployments** → Latest deployment → **Logs**
   - Look for: `✅ APNs provider initialized`

---

## ✅ After Setup

Your push notification server will be ready! The iOS app can now:
- Register device tokens
- Receive push notifications
- Navigate to specific screens from notifications

---

**That's it!** Just copy-paste the 3 variables above into Railway.
