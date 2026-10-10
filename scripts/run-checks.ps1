# Setu scheduled checks (Windows). Run daily by Task Scheduler — see scripts/register-schedule.ps1.
#   Daily:  watch official sources for changes + re-verify every fact.
#   Sunday: also refresh all DAAD course data (records deadline/fee changes for students' saved courses).
# Nothing is published automatically: official-page changes wait in http://localhost:3000/admin for a person.

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$logDir = Join-Path $root "data\watch\logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir ("{0:yyyy-MM-dd}.log" -f (Get-Date))

function Run([string]$label, [string]$cmd) {
  Add-Content $log "`n=== $label  $(Get-Date -Format HH:mm:ss)"
  $out = cmd /c "$cmd 2>&1"
  $code = $LASTEXITCODE
  Add-Content $log $out
  Add-Content $log "exit code $code"
  return $code
}

$watch = Run "Watch official sources" "npm run alerts:watch --silent"
$facts = Run "Re-verify facts" "npm run check:facts --silent"

if ((Get-Date).DayOfWeek -eq "Sunday") {
  Run "Refresh DAAD listing + changed pages" "npm run data:programmes --silent -- --refresh" | Out-Null
  Run "Map / geocoding (new cities only)" "npm run data:map --silent" | Out-Null
  Run "Rebuild course data" "npm run data:build --silent" | Out-Null
  # City guides: fill in up to 20 missing cities per week (gentle on the free OpenStreetMap servers).
  Run "City guides (missing cities)" "npm run data:cities --silent -- --max-new 20" | Out-Null
}

# Windows notification when a person needs to look (watch exit 2 = changes queued, facts exit 1 = a fact's source changed).
if ($watch -eq 2 -or $facts -ne 0) {
  $msg = @()
  if ($watch -eq 2) { $msg += "Official pages changed - review them in Setu /admin." }
  if ($facts -eq 3) { $msg += "Some official sources could not be reached today (network) - facts not re-checked." }
  elseif ($facts -ne 0) { $msg += "A fact no longer matches its official source." }
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $texts = $xml.GetElementsByTagName("text")
    $texts.Item(0).AppendChild($xml.CreateTextNode("Setu needs a review")) | Out-Null
    $texts.Item(1).AppendChild($xml.CreateTextNode(($msg -join " "))) | Out-Null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Setu").Show($toast)
  } catch {
    Add-Content $log "notification failed: $_"
  }
}
Add-Content $log "=== done $(Get-Date -Format HH:mm:ss)"
