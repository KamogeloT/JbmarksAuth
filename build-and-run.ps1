# Quick build and run script
# This builds your app and deploys it to your Samsung A04

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Building and Running on Samsung A04" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Setup ADB
$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
if (Test-Path "$androidSdkPath\adb.exe") {
    $env:Path += ";$androidSdkPath"
}

# Check device connected
Write-Host "`n1. Checking for connected devices..." -ForegroundColor Yellow
$devices = adb devices
if ($devices -match "device$") {
    Write-Host "✓ Device connected!" -ForegroundColor Green
} else {
    Write-Host "✗ No device found!" -ForegroundColor Red
    Write-Host "Please connect your Samsung A04 via USB and enable USB debugging." -ForegroundColor Yellow
    exit 1
}

# Build and sync
Write-Host "`n2. Building React app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build successful!" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Syncing to Android..." -ForegroundColor Yellow
npx cap sync

Write-Host "`n4. Building APK..." -ForegroundColor Yellow
cd android
.\gradlew assembleDebug
cd ..

Write-Host "`n5. Installing on your phone..." -ForegroundColor Yellow
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

Write-Host "`n6. Launching app..." -ForegroundColor Yellow
adb shell am start -n com.municipality.faultreporter/.MainActivity

Write-Host "`nDone! Check your Samsung A04" -ForegroundColor Green

