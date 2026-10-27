#!/usr/bin/env pwsh
# apply-template.ps1 — fill the AI-Native Workspace template from template.config.json (run once per project).
[CmdletBinding()]
param(
  [string]$Config = "$PSScriptRoot/../template.config.json",
  [string]$Root   = "$PSScriptRoot/..",
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path
$cfg  = [System.IO.File]::ReadAllText((Resolve-Path $Config).Path) | ConvertFrom-Json   # UTF-8 read (Get-Content -Raw is ANSI in PS 5.1)

function Resolve-Val($v, $services) {
  if ($v -is [string] -and $v.StartsWith('@svc:')) {
    $p = $v.Substring(5).Split(':')                       # key:field
    $svc = $services | Where-Object { $_.key -eq $p[0] } | Select-Object -First 1
    if ($null -eq $svc) { return "{{?$($p[0])?}}" }
    return [string]$svc.($p[1])
  }
  return [string]$v
}

# ── scalar replacement map ──
$map = [ordered]@{}
foreach ($p in $cfg.scalars.PSObject.Properties)  { $map["{{$($p.Name)}}"] = [string]$p.Value }
foreach ($p in $cfg.tokenMap.PSObject.Properties) { $map["{{$($p.Name)}}"] = Resolve-Val $p.Value $cfg.services }

# ── generated blocks ──
$TIERS = 'frontend','bff','gateway','domain','integration','infra'
function Sort-ByTier($services) {
  # stable: tier order from $TIERS, manifest order within a tier (Sort-Object is NOT stable)
  $ordered = @()
  foreach ($t in $TIERS) { $ordered += @($services | Where-Object { [string]$_.tier -eq $t }) }
  $ordered += @($services | Where-Object { $TIERS -notcontains [string]$_.tier })   # unknown tiers last
  $ordered
}
function New-RegistryBlock($services) {
  $sb = [System.Text.StringBuilder]::new()
  [void]$sb.AppendLine('| Key | Service | Tier | Stack | Repo | Base URL env |')
  [void]$sb.AppendLine('|-----|---------|------|-------|------|--------------|')
  foreach ($s in (Sort-ByTier $services)) {
    [void]$sb.AppendLine("| ``$($s.key)`` | $($s.name) | $($s.tier) | $($s.stack) | ``$($s.repo)`` | ``$($s.baseUrlEnv)`` |")
  }
  $sb.ToString().TrimEnd()
}
function New-EnvBlock($cfg) {
  $sb = [System.Text.StringBuilder]::new()
  foreach ($t in $TIERS) {
    $svc = @($cfg.services | Where-Object { [string]$_.tier -eq $t })
    if ($svc.Count -eq 0) { continue }
    [void]$sb.AppendLine("**$t**"); [void]$sb.AppendLine('')
    [void]$sb.AppendLine('| Service | Env var | Value |')
    [void]$sb.AppendLine('|---------|---------|-------|')
    foreach ($s in $svc) { [void]$sb.AppendLine("| $($s.name) | ``$($s.baseUrlEnv)`` | ``{{host}}:{{port}}`` |") }
    [void]$sb.AppendLine('')
  }
  [void]$sb.AppendLine('**datastore**'); [void]$sb.AppendLine('')
  [void]$sb.AppendLine('| Store | Env vars |'); [void]$sb.AppendLine('|-------|----------|')
  foreach ($d in $cfg.datastores) {
    $x = $d.envPrefix
    [void]$sb.AppendLine("| $($d.type) | ``${x}_HOST`` ``${x}_PORT`` ``${x}_USER`` ``${x}_PASSWORD`` |")
  }
  [void]$sb.AppendLine(''); [void]$sb.AppendLine('**messaging**'); [void]$sb.AppendLine('')
  [void]$sb.AppendLine('| Type | Env var |'); [void]$sb.AppendLine('|------|---------|')
  foreach ($m in $cfg.messaging) { [void]$sb.AppendLine("| $($m.type) | ``$($m.env)`` |") }
  $sb.ToString().TrimEnd()
}
$blocks = @{ 'services-registry' = (New-RegistryBlock $cfg.services); 'env' = (New-EnvBlock $cfg) }

# ── process *.md files ──
$skip = @((Join-Path $Root 'README.md'))   # README documents the tokens — never substitute it
# skip vendored / submodule dirs (top-level dirs that are their own git repo)
$nestedRepos = @(Get-ChildItem -Path $Root -Directory -ErrorAction SilentlyContinue |
  Where-Object { Test-Path (Join-Path $_.FullName '.git') } | ForEach-Object { $_.FullName })
function Test-InNestedRepo($path, $repos) {
  foreach ($r in $repos) { if ($r -and $path.StartsWith($r, [StringComparison]::OrdinalIgnoreCase)) { return $true } }
  $false
}
$files = Get-ChildItem -Path $Root -Recurse -File -Filter *.md |
         Where-Object {
           $_.FullName -notmatch '[\\/](node_modules|\.git)[\\/]' -and
           $skip -notcontains $_.FullName -and
           -not (Test-InNestedRepo $_.FullName $nestedRepos)
         }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$changed = @()
foreach ($f in $files) {
  $orig = [System.IO.File]::ReadAllText($f.FullName)
  $text = $orig
  foreach ($k in $map.Keys) { $text = $text.Replace($k, $map[$k]) }
  foreach ($name in $blocks.Keys) {
    $pattern = "(?s)<!-- BEGIN gen:$name -->.*?<!-- END gen:$name -->"
    $repl = "<!-- BEGIN gen:$name -->`n" + $blocks[$name] + "`n<!-- END gen:$name -->"
    $text = [regex]::Replace($text, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $repl })
  }
  if ($text -ne $orig) {
    $changed += $f.FullName
    if (-not $DryRun) { [System.IO.File]::WriteAllText($f.FullName, $text, $utf8) }
  }
}

Write-Host "apply-template: $($changed.Count) file(s) " -NoNewline -ForegroundColor Cyan
Write-Host $(if ($DryRun) { '(dry-run, not written)' } else { 'updated' }) -ForegroundColor Cyan
$changed | ForEach-Object { Write-Host "  $($_.Substring($Root.Length+1))" }

# ── stamp template version (survives deleting template.config.json/this script later) ──
if (-not $DryRun) {
  $ver = if ($cfg.PSObject.Properties.Name -contains 'templateVersion') { [string]$cfg.templateVersion } else { 'unknown' }
  $stampPath = Join-Path $Root '.template-version'
  $stamp = "templateVersion=$ver`nappliedAt=$(Get-Date -Format 'yyyy-MM-dd')`n"
  [System.IO.File]::WriteAllText($stampPath, $stamp, $utf8)
  Write-Host "Stamped .template-version (templateVersion=$ver)" -ForegroundColor DarkGray
}

Write-Host "`nNext: run scripts/validate-template.ps1, then delete template.config.json + this script if no longer needed." -ForegroundColor DarkGray
