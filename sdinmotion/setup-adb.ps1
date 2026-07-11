# Setup ADB for current PowerShell session
# Run this if you open a new terminal and adb doesn't work

Write-Host "Setting up Android Debug Bridge (ADB)..." -ForegroundColor Cyan

$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"

if (Test-Path "$androidSdkPath\adb.exe") {
    $env:Path += ";$androidSdkPath"
    Write-Host "✓ ADB added to PATH" -ForegroundColor Green
    
    # Test ADB
    Write-Host "`nChecking connected devices..." -ForegroundColor Cyan
    adb devices
    
    Write-Host "`n✓ ADB is ready!" -ForegroundColor Green
    Write-Host "Make sure your Samsung A04 is connected via USB with USB Debugging enabled." -ForegroundColor Yellow
} else {
    Write-Host "✗ Android SDK not found at: $androidSdkPath" -ForegroundColor Red
    Write-Host "Please install Android Studio first." -ForegroundColor Yellow
}

