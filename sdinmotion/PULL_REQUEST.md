# Pull Request: Add Area/City Selection and Bitrix24 Storage Configuration

## 🎯 Overview

This PR adds area and city selection functionality along with Bitrix24 Storage IDs configuration for optimized file uploads and city-based group routing.

## ✨ Features Added

### 1. Area & City Selection
- Added dropdown fields for "Area" (Township/Town) and "City" (Ventersdorp/Potchefstroom)
- Integrated with fault reporting form
- Area and city information included in task descriptions

### 2. Bitrix24 Storage Configuration
- **Storage IDs and Root Object IDs** configured for all departments
- **Direct storage access** - bypasses API lookup for faster uploads
- **City-based routing** - automatically routes to correct city department

### 3. Android Build Setup
- Automated build scripts for signed APK creation
- Comprehensive build documentation
- Keystore generation helpers

## 📊 Storage IDs Configured

### Ventersdorp Departments
- Electricity: Storage=6, Root=18
- Water: Storage=7, Root=19
- Roads: Storage=8, Root=20
- Waste: Storage=9, Root=21

### Potchefstroom Departments
- Electricity: Storage=10, Root=22
- Water: Storage=11, Root=23
- Roads: Storage=12, Root=24
- Waste: Storage=13, Root=25

## 🔧 Technical Changes

### Configuration (`src/config.ts`)
- Added nested storage structure by city → department
- Environment variable support for all storage IDs
- Backward compatible with existing configuration

### Service Updates (`src/services/bitrix24Service.ts`)
- Implemented `getConfiguredStorageInfo()` for direct storage access
- Updated `uploadFileToDrive()` to use configured storage IDs
- Fallback to API lookup if configuration not available
- City parameter support throughout call chain

### Form Updates (`src/components/FaultReporting.tsx`)
- Added Area and City dropdown fields
- Integrated with draft saving/loading
- Type-safe form handling

## 📝 Files Changed

**Modified:**
- `src/config.ts` - Added storage configuration
- `src/services/bitrix24Service.ts` - Storage ID integration
- `ENV_SETUP.md` - Updated with new environment variables
- `android/gradlew` - Made executable

**Added:**
- `ANDROID_BUILD_INSTRUCTIONS.md` - Detailed build guide
- `QUICK_START_APK_BUILD.md` - Quick start guide
- `SETUP_JAVA_AND_BUILD.md` - Java setup instructions
- `BUILD_VERIFICATION.md` - Configuration verification
- `prepare-apk-build.sh` - Automated build script
- `build-signed-apk.sh` - Alternative build script
- `create-keystore.sh` - Keystore generation helper

## ✅ Testing

- [x] TypeScript compilation passes
- [x] Production build successful
- [x] All IDs verified against provided data
- [x] Configuration structure tested
- [x] Build scripts tested

## 📋 Environment Variables Required

New environment variables added (see `ENV_SETUP.md` for details):

```env
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

## 🚀 Deployment Notes

- No breaking changes - backward compatible
- Environment variables have default values
- Storage IDs optional - falls back to API lookup if not configured
- Ready for production deployment

## 📚 Related Documentation

- `ENV_SETUP.md` - Environment variable setup
- `QUICK_START_APK_BUILD.md` - Android APK build guide
- `ANDROID_BUILD_INSTRUCTIONS.md` - Detailed build instructions

## 🔗 Commits

This PR includes 16 commits:
1. feat: add Bitrix24 storage IDs configuration and Android build setup
2. feat: add area and city selection dropdowns for all departments
3. fix: update Gradle JDK path configuration for macOS compatibility
4. ... (and 13 more commits)

## 📸 Screenshots

_Add screenshots of the new Area/City dropdowns if available_

---

**Ready for Review** ✅

