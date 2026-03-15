# App Version Update Guide

## How the Update Check Works

The app now automatically checks for updates every time it starts (during the splash screen). This happens in the background and won't delay app startup.

### Update Types

1. **Critical Update (REQUIRED)** 
   - User MUST update to continue using the app
   - Shows alert dialog with "Update Now" button
   - Automatically opens Play Store

2. **Optional Update (AVAILABLE)**
   - User can choose to update now or later
   - Shows confirmation dialog
   - Opens Play Store only if user confirms

## When Releasing a New Version

### Step 1: Update Version in `android/app/build.gradle`

```gradle
defaultConfig {
    versionCode 4          // Increment by 1 (was 3)
    versionName "1.3"      // Update version number (was 1.2)
}
```

### Step 2: Update Latest Version in `src/services/updateService.ts`

```typescript
class UpdateService {
  // Update this to match your new version
  private readonly LATEST_VERSION = '1.3';  // Was '1.2'
  
  // Only update this if older versions MUST update
  private readonly MINIMUM_REQUIRED_VERSION = '1.0';
}
```

### Step 3: Build and Release

```bash
# Build the app
npm run build

# Sync to Android
npx cap sync android

# Create signed bundle
cd android
.\gradlew bundleRelease
```

## Version Comparison Logic

The update service compares version numbers intelligently:

- `1.0` < `1.1` → Update available
- `1.1` < `1.2` → Update available
- `1.2` = `1.2` → Up to date
- `1.9` < `2.0` → Update available
- `1.2.5` < `1.2.6` → Update available

## Examples

### Example 1: Regular Update (Optional)
- User has version `1.2`
- Latest version is `1.3`
- Minimum required is `1.0`
- **Result:** User sees optional update dialog

### Example 2: Critical Update (Required)
- User has version `0.9`
- Latest version is `1.3`
- Minimum required is `1.0`
- **Result:** User sees required update dialog

### Example 3: Up to Date
- User has version `1.3`
- Latest version is `1.3`
- **Result:** No dialog shown, app proceeds normally

## Testing Update Dialogs

To test the update check:

1. **Test "Update Available" dialog:**
   - Set `LATEST_VERSION = '999.0'` in `updateService.ts`
   - Build and run the app
   - You should see the optional update dialog

2. **Test "Update Required" dialog:**
   - Set `MINIMUM_REQUIRED_VERSION = '999.0'` in `updateService.ts`
   - Build and run the app
   - You should see the required update dialog

3. **Remember to restore the correct values after testing!**

## Important Notes

- The update check happens automatically during splash screen
- It runs in the background and doesn't block app startup
- If the update check fails (network error, etc.), the app continues normally
- The Play Store link uses the package name: `com.municipality.faultreporter`
- Users can always dismiss the "optional update" dialog
- Users CANNOT dismiss the "required update" dialog

## Future Enhancement

For production, you may want to:
- Store version numbers on a server/API instead of hardcoding
- Add analytics to track how many users are on each version
- Add a "Don't ask again today" option for optional updates
- Show a changelog or "What's New" message

