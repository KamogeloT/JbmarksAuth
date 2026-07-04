# Dropdown & Version Fixes - Summary

## Issues Fixed

### 1. Dropdowns Not Showing
**Problem:** Area and City dropdowns were not visible in the app.

**Solution:**
- Enhanced `SelectField` component CSS styling
- Added `appearance-none` to remove default browser styling
- Added custom dropdown arrow icon (SVG background)
- Improved focus states and visibility
- Added global select styling in `index.css`

**Files Modified:**
- `src/components/FaultReporting.tsx` - Enhanced SelectField component
- `src/index.css` - Added global select element styling

### 2. Version Number Display
**Problem:** Need to show version number in footer for tracking.

**Solution:**
- Added `version` and `versionCode` to `config.ts`
- Updated all footer components to display version
- Shows format: "v1.7.8 • Build 18"

**Files Modified:**
- `src/config.ts` - Added version fields (version: "1.7.8", versionCode: 18)
- `src/components/HomePage.tsx` - Added version display in footer
- `src/components/FaultReporting.tsx` - Added version display in footer
- `src/components/ReportHistory.tsx` - Added version display in footer

## Current Version

- **Version Name:** 1.7.8
- **Version Code:** 18
- **Package:** com.jbmarks.faultreporter

## Dropdown Locations

The Area and City dropdowns appear in the fault reporting form:

1. **Area Dropdown** - Located after "Type of Issue"
   - Options: Township, Town
   - Optional field

2. **City Dropdown** - Located after "Area"
   - Options: Ventersdorp, Potchefstroom
   - Optional field

3. **Location Input** - Located after "City"

## CSS Enhancements

### SelectField Component
- Custom dropdown arrow icon
- Clear focus states
- Better padding and spacing
- Cursor pointer for better UX

### Global Select Styling
- Removed default browser appearance
- Enhanced focus states with shadow
- Better option visibility

## Testing Checklist

After rebuilding the app:

- [ ] Area dropdown is visible and functional
- [ ] City dropdown is visible and functional
- [ ] Version number appears in footer on HomePage
- [ ] Version number appears in footer on FaultReporting page
- [ ] Version number appears in footer on ReportHistory page
- [ ] Dropdowns work correctly on mobile devices
- [ ] Dropdowns work correctly in the built AAB

## Next Steps

1. Rebuild the app:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Build AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

3. Test on device to verify dropdowns are visible

## Updating Version

To update the version in future releases:

1. Update `versionCode` in `android/app/build.gradle`
2. Update `versionName` in `android/app/build.gradle`
3. Update `config.app.version` in `src/config.ts`
4. Update `config.app.versionCode` in `src/config.ts`
5. Rebuild and deploy

