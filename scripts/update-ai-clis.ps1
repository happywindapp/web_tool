# update-ai-clis.ps1 — tự động cập nhật các AI CLI (claude / codex / gemini / copilot)
# Dùng: pwsh ./update-ai-clis.ps1 [-DryRun]
[CmdletBinding()]
param([switch]$DryRun)

$ErrorActionPreference = 'Continue'

# Các CLI cài qua npm global: <command> = <npm package>
$npmClis = [ordered]@{
    codex   = '@openai/codex'
    gemini  = '@google/gemini-cli'
    copilot = '@github/copilot'
}

function Get-CliVersion([string]$cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { return $null }
    try { (& $cmd --version 2>$null | Select-Object -First 1).Trim() } catch { '?' }
}

function Dash($v) { if ([string]::IsNullOrEmpty($v)) { '-' } else { $v } }
function Write-Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2([string]$msg){ Write-Host "    $msg" -ForegroundColor Yellow }

$results = @()

# 1) Claude Code — native installer, tự update
Write-Step 'claude (Claude Code)'
$before = Get-CliVersion 'claude'
if ($null -eq $before) {
    Write-Warn2 'chưa cài — bỏ qua'
    $results += [pscustomobject]@{ CLI='claude'; Before='-'; After='-'; Status='skipped' }
} elseif ($DryRun) {
    Write-Warn2 "[dry-run] claude update (hiện tại $before)"
    $results += [pscustomobject]@{ CLI='claude'; Before=$before; After=$before; Status='dry-run' }
} else {
    & claude update
    $after = Get-CliVersion 'claude'
    $results += [pscustomobject]@{
        CLI='claude'; Before=$before; After=$after
        Status = if ($after -ne $before) { 'updated' } else { 'up-to-date' }
    }
}

# 2) CLI cài qua npm global
foreach ($cmd in $npmClis.Keys) {
    $pkg = $npmClis[$cmd]
    Write-Step "$cmd ($pkg)"
    $before = Get-CliVersion $cmd
    if ($DryRun) {
        Write-Warn2 "[dry-run] npm install -g $pkg@latest (hiện tại $(Dash $before))"
        $results += [pscustomobject]@{ CLI=$cmd; Before=(Dash $before); After=(Dash $before); Status='dry-run' }
        continue
    }
    & npm install -g "$pkg@latest"
    if ($LASTEXITCODE -ne 0) {
        Write-Warn2 "npm install lỗi (exit $LASTEXITCODE)"
        $results += [pscustomobject]@{ CLI=$cmd; Before=(Dash $before); After=(Dash $before); Status='error' }
        continue
    }
    $after = Get-CliVersion $cmd
    $results += [pscustomobject]@{
        CLI=$cmd; Before=(Dash $before); After=(Dash $after)
        Status = if ($after -ne $before) { 'updated' } else { 'up-to-date' }
    }
}

Write-Host ''
Write-Step 'Tổng kết'
$results | Format-Table -AutoSize

if ($results.Status -contains 'error') { exit 1 } else { exit 0 }
