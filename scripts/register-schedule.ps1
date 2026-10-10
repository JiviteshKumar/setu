# Registers a daily Windows scheduled task that runs scripts/run-checks.ps1 at 09:00.
# Run once:   powershell -ExecutionPolicy Bypass -File scripts\register-schedule.ps1
# Remove:     Unregister-ScheduledTask -TaskName "Setu daily checks" -Confirm:$false
$script = Join-Path $PSScriptRoot "run-checks.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 3)
Register-ScheduledTask -TaskName "Setu daily checks" -Action $action -Trigger $trigger -Settings $settings -Description "Watch official sources, re-verify facts, refresh DAAD data weekly (Setu)" -Force
Write-Host "Registered 'Setu daily checks' (daily 09:00; runs at next start if the laptop was off)."
