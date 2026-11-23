// Setup script for the per-user oneeditor-open: protocol (HKCU, no admin): any web page can call it, so the launcher only knows fixed actions on an existing local path and never runs a file.
const OpenWithSetup = (() => {
  const FILE = "one-editor-open-with-setup.ps1";
  const SCRIPT = String.raw`# One Editor "Open with" helper - registers the per-user URL protocol oneeditor-open: (HKCU, no admin rights needed).
#   Install:   powershell -ExecutionPolicy Bypass -File one-editor-open-with-setup.ps1
#   Uninstall: powershell -ExecutionPolicy Bypass -File one-editor-open-with-setup.ps1 -Uninstall
param([switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:LOCALAPPDATA 'OneEditorOpenWith'
$key = 'HKCU:\Software\Classes\oneeditor-open'
if ($Uninstall) {
  if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Recurse -Force }
  if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
  Write-Host 'Removed the oneeditor-open: protocol.'
  return
}
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$launcher = Join-Path $dir 'open-with.ps1'
Set-Content -LiteralPath $launcher -Encoding UTF8 -Value @'
# oneeditor-open:<action>?<url-encoded path> - actions: explorer, terminal, gitbash, powershell.
param([string]$Url, [switch]$DryRun)
$ErrorActionPreference = 'Stop'
function Fail([string]$msg) {
  # The text comes from a web page: keep it short so it cannot pose as a long system notice.
  if ($msg.Length -gt 160) { $msg = $msg.Substring(0, 160) + '...' }
  if ($DryRun) { Write-Output "ERROR: $msg" } else { (New-Object -ComObject WScript.Shell).Popup($msg, 0, 'One Editor - Open with', 48) | Out-Null }
  exit 1
}
function Run([string]$exe, [string[]]$argv, [string]$cwd) {
  if ($DryRun) { Write-Output ("RUN " + $exe + " | " + ($argv -join ' ') + " | " + $cwd); return }
  # -WorkingDirectory treats [ ] as wildcards on PowerShell 5.1.
  $wd = [Management.Automation.WildcardPattern]::Escape($cwd)
  if ($argv.Count) { Start-Process -FilePath $exe -ArgumentList $argv -WorkingDirectory $wd } else { Start-Process -FilePath $exe -WorkingDirectory $wd }
}
function Find-GitBash {
  foreach ($k in 'HKCU:\SOFTWARE\GitForWindows', 'HKLM:\SOFTWARE\GitForWindows') {
    $p = (Get-ItemProperty -LiteralPath $k -ErrorAction SilentlyContinue).InstallPath
    if ($p -and (Test-Path -LiteralPath (Join-Path $p 'git-bash.exe'))) { return (Join-Path $p 'git-bash.exe') }
  }
  $git = (Get-Command git.exe -ErrorAction SilentlyContinue).Source
  if ($git) { $p = Join-Path (Split-Path (Split-Path $git)) 'git-bash.exe'; if (Test-Path -LiteralPath $p) { return $p } }
  foreach ($p in (Join-Path $env:ProgramFiles 'Git\git-bash.exe'), (Join-Path $env:LOCALAPPDATA 'Programs\Git\git-bash.exe')) { if (Test-Path -LiteralPath $p) { return $p } }
  return $null
}
if ($Url -notmatch '^oneeditor-open:([a-z]+)\?(.+)$') { Fail "Unknown link: $Url" }
$action = $Matches[1]
$path = [Uri]::UnescapeDataString($Matches[2])
# Local drive paths only: a UNC path would make Windows contact (and authenticate to) another machine.
if ($path -notmatch '^[A-Za-z]:\\' -or $path -match '["\x00-\x1f*?<>|]') { Fail "Not a local path: $path" }
# Canonical form first ("x.exe\.." would pass as a folder); a second colon is an alternate data stream.
try { $path = [IO.Path]::GetFullPath($path) } catch { Fail "Not a local path: $path" }
if ($path -notmatch '^[A-Za-z]:\\' -or $path.IndexOf(':', 2) -ge 0) { Fail "Not a local path: $path" }
$path = $path.TrimEnd('\')
if ($path -match '^[A-Za-z]:$') { $path += '\' }
if (-not (Test-Path -LiteralPath $path)) { Fail "Not found: $path" }
$isDir = Test-Path -LiteralPath $path -PathType Container
$cwd = if ($isDir) { $path } else { [IO.Path]::GetDirectoryName($path) }
switch ($action) {
  'explorer' {
    # A file is only selected, never opened (opening would run it).
    # A drive root stays unquoted: "C:\" would end in an escaped quote.
    if ($isDir) { Run 'explorer.exe' @($(if ($path -match '^[A-Za-z]:\\$') { $path } else { '"' + $path + '"' })) $cwd } else { Run 'explorer.exe' @('/select,"' + $path + '"') $cwd }
  }
  'terminal' {
    if (Get-Command wt.exe -ErrorAction SilentlyContinue) { Run 'wt.exe' @('-d', '.') $cwd }
    else { Run 'powershell.exe' @('-NoExit') $cwd }
  }
  'powershell' {
    $ps = (Get-Command pwsh.exe -ErrorAction SilentlyContinue).Source
    if (-not $ps) { $ps = 'powershell.exe' }
    Run $ps @('-NoExit') $cwd
  }
  'gitbash' {
    $gb = Find-GitBash
    if (-not $gb) { Fail 'Git Bash (Git for Windows) was not found.' }
    # Trailing dot as in Git's own "Git Bash Here": keeps "C:\" from escaping the closing quote.
    Run $gb @('"--cd=' + $cwd + '."') $cwd
  }
  default { Fail "Unknown action: $action" }
}
'@
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
New-Item -Force -Path "$key\shell\open\command" | Out-Null
Set-ItemProperty -LiteralPath $key -Name '(default)' -Value 'URL:One Editor Open With'
Set-ItemProperty -LiteralPath $key -Name 'URL Protocol' -Value ''
Set-ItemProperty -LiteralPath "$key\shell\open\command" -Name '(default)' -Value ('"' + $ps + '" -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $launcher + '" "%1"')
Write-Host "Installed oneeditor-open: -> $launcher"
`;

  function download() {
    Dom.download(SCRIPT.replace(/\r?\n/g, "\r\n"), FILE, "text/plain;charset=utf-8");
    StatusBar.msg(T("Đã tải {file} — chạy: powershell -ExecutionPolicy Bypass -File {file} (gỡ: thêm -Uninstall). Không cần quyền admin.", { file: FILE }), "good");
  }

  return { download, SCRIPT, FILE };
})();
