# View app logs from your Samsung A04
# Run this in a separate terminal while developing

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Viewing App Logs from Samsung A04" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Setup ADB
$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
if (Test-Path "$androidSdkPath\adb.exe") {
    $env:Path += ";$androidSdkPath"
}

Write-Host "Clearing old logs..." -ForegroundColor Yellow
adb logcat -c

Write-Host "Showing logs (Ctrl+C to stop)..." -ForegroundColor Green
Write-Host ""

# Show filtered logs for your app
adb logcat -s Capacitor Console ReactNativeJS Chromium *:E

