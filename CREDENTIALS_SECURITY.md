# Credentials Security Guide

## Current Status

### ⚠️ Security Issue
**OAuth 2.0 credentials are currently hardcoded in the app:**
- `JbmrksIOs/JbmrksIOs/Config/OAuthConfig.swift` contains:
  - Client ID: `local.69526f981da4a0.86875975`
  - Client Secret: `z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU`

### Why This Is a Problem
1. **Source Code Exposure**: Credentials are visible in source code
2. **Binary Extraction**: Anyone can extract credentials from the compiled app
3. **Git Repository**: If committed, credentials are in version control
4. **No Secret Rotation**: Can't change secrets without app update

---

## Recommended Solutions

### Option 1: Use Backend Token Exchange (Most Secure) ✅ RECOMMENDED

**How it works:**
- App only stores Client ID (public)
- Client Secret stays on backend server
- App sends authorization code to your backend
- Backend exchanges code for tokens using secret
- Backend returns tokens to app

**Benefits:**
- Client secret never exposed
- Can rotate secrets without app update
- Better security control

**Implementation:**
You already have backend token exchange servers:
- Azure Function: `https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken`
- Railway: `https://jbmarksauth-production.up.railway.app/api/exchangetoken`

**Next Steps:**
1. Modify `OAuthService.swift` to call backend instead of direct Bitrix24
2. Remove client secret from app
3. Only keep client ID in app

---

### Option 2: Environment-Based Configuration (Better than Hardcoded)

**How it works:**
- Create `OAuthConfig.swift` from `OAuthConfig.example.swift`
- Add `OAuthConfig.swift` to `.gitignore`
- Each developer/CI has their own config file

**Benefits:**
- Secrets not in git
- Different configs for dev/staging/production
- Still extractable from binary (but better than nothing)

**Implementation:**
1. Copy `OAuthConfig.example.swift` to `OAuthConfig.swift`
2. Fill in your credentials
3. `OAuthConfig.swift` is already in `.gitignore`

---

### Option 3: Xcode Build Configuration (iOS-Specific)

**How it works:**
- Use Xcode build settings or Info.plist
- Different values for Debug/Release
- Can use environment variables

**Benefits:**
- No hardcoded values in source
- Different configs per build type
- Still in binary (but obfuscated)

---

## Current Setup (What You Have Now)

### iOS App
- ✅ Uses OAuth 2.0 (not webhooks)
- ⚠️ Client secret hardcoded
- ✅ Client ID is public (OK to expose)

### Android App
- ✅ Uses OAuth 2.0
- ⚠️ Client secret hardcoded in `Config.kt`
- ⚠️ Also has webhook credentials (for admin/testing)

---

## Immediate Actions

### 1. Secure the Current Setup (Quick Fix)
1. Ensure `OAuthConfig.swift` is in `.gitignore` ✅ (already done)
2. Create `OAuthConfig.example.swift` as template ✅ (created)
3. Document that real credentials should not be committed

### 2. Long-Term Solution (Recommended)
1. **Use Backend Token Exchange**
   - Modify `OAuthService.exchangeCodeForTokens()` to call your backend
   - Remove client secret from app
   - Backend handles secret securely

2. **Benefits:**
   - Most secure approach
   - Can rotate secrets anytime
   - Better for production apps

---

## Files to Update for Backend Token Exchange

If you want to use backend token exchange:

1. **`OAuthService.swift`**:
   ```swift
   // Instead of calling Bitrix24 directly:
   // Call your backend: https://jbmarksauth-production.up.railway.app/api/exchangetoken
   // Backend handles client secret
   ```

2. **`OAuthConfig.swift`**:
   ```swift
   // Remove clientSecret
   // Keep only clientId (public)
   ```

3. **Backend already exists** at:
   - Railway: `https://jbmarksauth-production.up.railway.app/api/exchangetoken`
   - Azure: `https://jbmarks-token-exchange-v2.azurewebsites.net/api/exchangetoken`

---

## Summary

**Current State:**
- ✅ OAuth 2.0 implemented
- ⚠️ Client secret hardcoded (security risk)
- ✅ No webhook in iOS (good - OAuth is better)

**Recommended Next Step:**
- Use backend token exchange for production
- Keep current setup for development/testing
- Document security considerations

**Quick Fix:**
- Ensure `OAuthConfig.swift` is gitignored ✅
- Use `OAuthConfig.example.swift` as template ✅
