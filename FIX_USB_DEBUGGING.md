# Fix USB Debugging "Unauthorized" Issue

## 🎯 Your Phone: R83W7085G7T (Connected but Unauthorized)

## 📱 Complete Fix Guide

### Method 1: Enable Developer Options (Start Here)

**Step 1: Enable Developer Mode**
1. Open **Settings** on your phone
2. Scroll to **"About phone"**
3. Find **"Build number"** (might be under "Software information")
4. **Tap "Build number" 7 times fast**
5. You'll see: "You are now a developer!"

**Step 2: Enable USB Debugging**
1. Go back to **Settings**
2. Find **"Developer options"** (might be under System → Advanced → Developer options)
3. Toggle **"USB debugging"** to **ON** (should turn blue/green)

**Step 3: Revoke Authorizations**
1. Still in Developer Options
2. Scroll down to **"Revoke USB debugging authorizations"**
3. Tap it → Tap **"OK"**

**Step 4: Change USB Mode**
1. **Unplug USB cable**
2. **Plug it back in**
3. On your phone, select:
   - **"File Transfer"** or
   - **"Transfer files"** or
   - **"MTP"**
   - (NOT "Charging only")

**Step 5: Look for Popup**
After plugging in, you should see:
```
Allow USB debugging?
The computer's RSA key fingerprint is: ...
☐ Always allow from this computer
[Cancel] [OK]
```

✅ Check the box
✅ Tap OK

---

### Method 2: Alternative - Use Wireless Debugging (Android 11+)

If popup still doesn't work:

**Step 1: Enable Wireless Debugging**
1. Settings → Developer options
2. Find **"Wireless debugging"**
3. Toggle **ON**
4. Tap **"Wireless debugging"** to open settings
5. Tap **"Pair device with pairing code"**
6. You'll see:
   - IP address
   - Port
   - Pairing code

**Step 2: On Computer**
```bash
# Use the IP and port shown on your phone
adb pair <IP>:<PORT>
# Enter the pairing code when asked

# Then connect
adb connect <IP>:5555
adb devices
```

---

### Method 3: Reset ADB Keys

Sometimes the RSA key is corrupted:

**On Computer:**
```bash
# Delete old keys
del "%USERPROFILE%\.android\adbkey"
del "%USERPROFILE%\.android\adbkey.pub"

# Restart ADB
adb kill-server
adb start-server

# Unplug and replug phone
# Popup should appear now
```

---

### Method 4: Check USB Cable & Port

**Common Issues:**
- ❌ Charging-only cable (can't do data transfer)
- ❌ Damaged cable
- ❌ Broken USB port on computer
- ❌ USB hub (try direct connection)

**Test:**
1. Try different USB cable
2. Try different USB port on computer
3. Use USB 2.0 port instead of 3.0
4. Connect directly (not through hub)

---

### Method 5: Install USB Drivers (Samsung/LG/Xiaomi)

Some phones need specific drivers:

**Samsung:**
- Download Samsung USB Drivers
- Or Samsung Smart Switch (includes drivers)

**Other Brands:**
- Usually Windows installs drivers automatically
- Check Device Manager for yellow warnings

---

## 🔍 Verify It's Working

After any fix, run:
```bash
adb devices
```

**Should show:**
```
List of devices attached
R83W7085G7T     device
```

(Not "unauthorized" - just "device")

---

## 🎯 Quick Checklist

Before trying to connect:
- [ ] Developer options enabled
- [ ] USB debugging ON
- [ ] Revoked all authorizations
- [ ] USB mode set to "File Transfer"
- [ ] Using data cable (not charge-only)
- [ ] Direct USB port (not hub)
- [ ] Phone unlocked (not on lock screen)

---

## ⚡ Alternative: Use Web Tester Instead

If USB debugging is too difficult, you can test using the web tester:

```bash
# Open this file in Chrome:
test-upload.html

# Enter webhook URL
# Select image
# Test upload
# See results immediately
```

This tests the same upload logic without needing USB!

---

## 📞 Still Not Working?

Try these in order:

1. **Restart phone** - Sometimes needed after enabling dev options
2. **Restart computer** - Refresh USB stack
3. **Try different computer** - Test if it's computer-specific
4. **Use wireless debugging** - Android 11+ has WiFi option
5. **Use web tester** - test-upload.html works without USB

---

## 🎉 Success Looks Like This

```bash
$ adb devices
List of devices attached
R83W7085G7T     device    ← "device" not "unauthorized"
```

Then you can:
```bash
# Install app
adb install app-debug.apk

# View logs
adb logcat

# Chrome inspect
chrome://inspect → Your phone appears!
```

