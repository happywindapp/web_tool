# start-chrome-cdp-for-rea.ps1: mo Chrome headless (profile tam, co CDP) tai URL tham khao de REA phan tich; -Stop de tat (ASCII-only cho PS 5.1)
param(
    [string]$Url,
    [int]$Port = 9333,
    [switch]$Headed,
    [switch]$Stop
)
$ErrorActionPreference = 'Stop'

$profileDir = Join-Path $env:TEMP 'web_tool-rea-chrome-profile'

if ($Stop) {
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
        Where-Object { $_.CommandLine -like "*$profileDir*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
    Write-Host "Da tat Chrome CDP (profile $profileDir)."
    return
}
if (-not $Url) { throw 'Thieu -Url. Vi du: .\scripts\start-chrome-cdp-for-rea.ps1 -Url https://jsonlint.com/' }

$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Khong tim thay chrome.exe' }

# Profile rieng: khong dung cookie/session that cua nguoi dung, CDP chi nghe loopback
$chromeArgs = @("--remote-debugging-port=$Port", "--remote-debugging-address=127.0.0.1", "--user-data-dir=$profileDir", '--no-first-run', $Url)
if (-not $Headed) { $chromeArgs = @('--headless=new') + $chromeArgs }
Start-Process $chrome -ArgumentList $chromeArgs | Out-Null

$endpoint = "http://127.0.0.1:$Port"
for ($i = 0; $i -lt 20; $i++) {
    try { Invoke-RestMethod "$endpoint/json/version" -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 500 }
}
Write-Host "CDP endpoint: $endpoint"
Write-Host "REA: list_browser_targets -> analyze_web_bundle / export_web_scripts / capture_web_screenshot"
Write-Host "Tat: .\scripts\start-chrome-cdp-for-rea.ps1 -Stop"
