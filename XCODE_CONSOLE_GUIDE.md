# How to Open Xcode Console - Quick Guide

## Method 1: Keyboard Shortcut (Fastest) ⚡

**Press:** `⌘ + Shift + Y` (Command + Shift + Y)

This toggles the debug area at the bottom of Xcode.

---

## Method 2: Menu Bar

1. Click **View** in the menu bar
2. Select **Debug Area**
3. Click **Show Debug Area** (or **Activate Console**)

---

## Method 3: Toolbar Button

Look at the **bottom-right corner** of Xcode window:
- Click the button that looks like a **split view icon** (two rectangles)
- This shows/hides the debug area

---

## Method 4: Automatic (While Running)

When you **run your app** (⌘ + R), the console usually appears automatically at the bottom.

---

## What You'll See

The console shows:
- ✅ Your `print()` statements
- ✅ Error messages
- ✅ Debugger output
- ✅ Network logs

---

## For OAuth Debugging

When you test the OAuth flow, look for:

```
🔄 Token Exchange Request:
   URL: https://oauth.bitrix.info/oauth/token/
   Client ID: local.69526f981da4a0.86875975
   Redirect URI: https://jbmarks-oauth-redirect-e9deetemhta3caef.southafricanorth-01.azurewebsites.net/oauth_redirect
   Code length: XX
```

If there's an error:
```
❌ Token exchange failed:
   Status: 400
   Response: {"error":"invalid_client",...}
   Client ID: local.69526f981da4a0.86875975
   Redirect URI: ...
   Token URL: ...
```

---

## Tips

1. **Clear Console:** Right-click in console → "Clear Console"
2. **Filter Output:** Use the search box at the bottom to filter logs
3. **Show Only Errors:** Click the filter button to show only errors/warnings

---

## Visual Guide

```
┌─────────────────────────────────────┐
│  Xcode Window                       │
│                                     │
│  [Your Code Editor]                │
│                                     │
├─────────────────────────────────────┤ ← Debug Area Toggle (⌘+Shift+Y)
│  Console Output                     │
│  🔄 Token Exchange Request...       │
│  ❌ Token exchange failed...        │
│                                     │
└─────────────────────────────────────┘
```

---

## Quick Steps to Debug OAuth

1. **Open Console:** Press `⌘ + Shift + Y`
2. **Run App:** Press `⌘ + R` (or click Play button)
3. **Try OAuth Login:** Tap "Sign in" button
4. **Watch Console:** Look for the debug messages
5. **Copy Error:** If you see an error, copy the full message

---

That's it! The console is now open and you can see all the debug output.
