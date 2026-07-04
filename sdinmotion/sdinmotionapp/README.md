# 📱 Municipal Fault Reporting Mobile App

A **native mobile application** for Android and iOS for reporting municipal faults and issues. Built with React, TypeScript, Capacitor, and integrated with Bitrix24 for task management.

## 🎯 Features

✅ **Native Mobile App** - True native apps for Android & iOS  
✅ **App Store Ready** - Deploy to Google Play Store & Apple App Store  
✅ **Native Camera** - High-quality photo capture using device camera  
✅ **High-Accuracy GPS** - Precise location detection  
✅ **Four Fault Categories** - Water, Electricity, Roads, Waste  
✅ **Offline Support** - Save reports when offline  
✅ **Report History** - View all submitted reports  
✅ **Retry Failed Submissions** - Automatic retry for failed reports  
✅ **Bitrix24 Integration** - Auto-create tasks in department groups  
✅ **Reference Numbers** - Track report status

## 📱 Platform Support

- ✅ **Android** 5.0+ (API 21+)
- ✅ **iOS** 13.0+
- ✅ **Web Browser** (Progressive Web App mode)  

## Fixed Issues from Original Module

1. ✅ **Configurable Group IDs** - No longer hardcoded, uses environment variables
2. ✅ **Fixed File Upload** - Proper Bitrix24 file upload endpoint with folder support
3. ✅ **Report Tracking** - Full history and status tracking
4. ✅ **Offline Storage** - LocalStorage for offline support
5. ✅ **Auto-save Drafts** - Never lose your work
6. ✅ **Retry Mechanism** - Retry failed submissions
7. ✅ **Better Error Handling** - Clear error messages and recovery options

## 🚀 Quick Start

### For Mobile App Development

**See 📖 [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) for mobile app setup**  
**See 📘 [MOBILE_APP_GUIDE.md](MOBILE_APP_GUIDE.md) for complete mobile documentation**

```bash
# Install dependencies
npm install

# Build and sync to mobile platforms
npm run mobile:sync

# Open Android Studio
npm run mobile:android

# Open Xcode (macOS only)
npm run mobile:ios
```

### For Web Development

```bash
# Install dependencies
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your Bitrix24 credentials:

\`\`\`bash
   cp .env.example .env
\`\`\`

Edit `.env`:

\`\`\`env
VITE_BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.com/rest/1/your-webhook-code
VITE_BITRIX24_USER_ID=1
VITE_BITRIX24_GROUP_WATER=5
VITE_BITRIX24_GROUP_ELECTRICITY=6
VITE_BITRIX24_GROUP_ROADS=7
VITE_BITRIX24_GROUP_WASTE=8
\`\`\`

### 3. Development

\`\`\`bash
npm run dev
\`\`\`

Access the app at `http://localhost:3000`

For mobile testing on your local network:
\`\`\`bash
npm run dev -- --host
\`\`\`

Then access via your computer's IP address from your mobile device.

### 4. Build for Production

\`\`\`bash
npm run build
\`\`\`

The production build will be in the `dist` folder.

### 5. Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Bitrix24 Setup

### 1. Create Webhook

1. Go to Bitrix24 → Settings → Webhooks → Inbound webhook
2. Grant permissions:
   - `tasks` (all task permissions)
   - `disk` (file management)
   - `user` (user info)
3. Copy the webhook URL

### 2. Create Department Workgroups

Create workgroups for each department:

1. Water & Sanitation Department (note the Group ID)
2. Electricity Department (note the Group ID)
3. Roads & Stormwater Department (note the Group ID)
4. Waste Management Department (note the Group ID)

Update the group IDs in your `.env` file.

### 3. Optional: Create Upload Folder

1. Go to Bitrix24 Drive
2. Create a folder for fault report attachments
3. Note the folder ID and add to `.env` as `VITE_BITRIX24_DISK_FOLDER_ID`

## Deployment Options

### Option 1: Static Hosting (Netlify, Vercel)

1. Build the project: `npm run build`
2. Upload the `dist` folder to your hosting provider
3. Set environment variables in hosting dashboard

### Option 2: GitHub Pages

See `deploy.yml` in `.github/workflows` for automatic deployment.

### Option 3: Traditional Web Server

1. Build: `npm run build`
2. Copy `dist` folder contents to your web server
3. Configure web server to serve `index.html` for all routes

## Configuration

### App Configuration

Edit `src/config.ts` to customize:

- App name
- Support email
- Support phone number
- Default Bitrix24 settings

### Styling

The app uses Tailwind CSS. Customize colors in `tailwind.config.js`:

\`\`\`js
colors: {
  'brand-blue': '#1e3a8a',
  'brand-green': '#16a34a',
  'brand-gold': '#fbbf24',
}
\`\`\`

## 📱 Mobile App Commands

```bash
# Build and sync to both platforms
npm run mobile:sync

# Open in Android Studio
npm run mobile:android

# Open in Xcode (macOS)
npm run mobile:ios

# Run on Android device
npm run mobile:run:android

# Run on iOS device (macOS)
npm run mobile:run:ios
```

## 🌐 Browser Support (Web Mode)

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (iOS 13+)
- Samsung Internet

## 📂 File Structure

```
fault-reporting-mobile-app/
├── src/
│   ├── components/
│   │   ├── FaultReporting.tsx    # Main form (Native Camera & GPS)
│   │   ├── ReportHistory.tsx      # History & tracking
│   │   ├── HomePage.tsx           # Landing page
│   │   ├── Navigation.tsx         # Bottom navigation
│   │   └── icons.tsx              # SVG icons
│   ├── services/
│   │   ├── bitrix24Service.ts    # Bitrix24 API (FIXED)
│   │   └── storageService.ts     # LocalStorage
│   ├── App.tsx                    # Main app component
│   ├── config.ts                  # Configuration
│   ├── types.ts                   # TypeScript types
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── android/                       # ✨ Android native project
├── ios/                           # ✨ iOS native project
├── capacitor.config.ts            # ✨ Capacitor configuration
├── dist/                          # Built web assets
├── public/                        # Static assets
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS config
├── MOBILE_QUICK_START.md          # 📱 Quick mobile guide
├── MOBILE_APP_GUIDE.md            # 📘 Complete mobile docs
└── package.json                   # Dependencies
```

## Troubleshooting

### Reports not submitting
- Check Bitrix24 webhook URL and permissions
- Verify group IDs are correct
- Check browser console for errors

### File uploads failing
- Ensure disk permissions in webhook
- Try setting `VITE_BITRIX24_DISK_FOLDER_ID`
- Check file size (max 10MB)

### PWA not installing
- Must be served over HTTPS (except localhost)
- Check service worker registration
- Clear browser cache

### Offline mode not working
- Check if service worker is registered
- Verify browser supports service workers
- Check LocalStorage is not disabled

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Email: support@municipality.gov.za
- Phone: +27 18 297 5111

## 🛠️ Technology Stack

Built with:
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Capacitor** - Native mobile wrapper
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Workbox** - PWA/Offline support
- **Bitrix24 API** - Task management
- **Native Plugins**:
  - @capacitor/camera - Native camera
  - @capacitor/geolocation - GPS
  - @capacitor/filesystem - File storage

## 📚 Documentation

- **[MOBILE_QUICK_START.md](MOBILE_QUICK_START.md)** - Get started in 5 minutes
- **[MOBILE_APP_GUIDE.md](MOBILE_APP_GUIDE.md)** - Complete mobile app guide
- **[BITRIX24_SETUP.md](BITRIX24_SETUP.md)** - Bitrix24 integration guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Web deployment guide
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Original setup guide
