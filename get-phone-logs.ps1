# Script to pull debug logs from phone
Write-Host "Pulling debug logs from phone..." -ForegroundColor Cyan

# Get the log file path from the phone
$logPath = & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell "run-as com.municipality.faultreporter find /data/user/0/com.municipality.faultreporter/files -name 'sdinmotion_debug.log' 2>/dev/null"

if ($logPath) {
    Write-Host "Found log file: $logPath" -ForegroundColor Green
    
    # Pull the file
    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell "run-as com.municipality.faultreporter cat $logPath" > phone-debug.log
    
    Write-Host "`nLog file saved to: phone-debug.log" -ForegroundColor Green
    Write-Host "`nShowing last 100 lines:" -ForegroundColor Yellow
    Get-Content phone-debug.log | Select-Object -Last 100
} else {
    Write-Host "Log file not found. Trying Documents directory..." -ForegroundColor Yellow
    
    # Try Documents directory
    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" pull /sdcard/Documents/sdinmotion_debug.log phone-debug.log
    
    if (Test-Path phone-debug.log) {
        Write-Host "`nLog file pulled successfully!" -ForegroundColor Green
        Write-Host "`nShowing last 100 lines:" -ForegroundColor Yellow
        Get-Content phone-debug.log | Select-Object -Last 100
    } else {
        Write-Host "Could not find log file" -ForegroundColor Red
    }
}

