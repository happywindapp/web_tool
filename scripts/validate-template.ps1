#!/usr/bin/env pwsh
# validate-template.ps1 - sanity-check the AI-Native Workspace template (run after apply-template.ps1, or anytime on the hub itself).
# Checks: (1) declared project tokens still unfilled, (2) broken relative links in docs/INDEX.md, (3) skill SKILL.md frontmatter.
[CmdletBinding()]
param(
  [string]$Config = "$PSScriptRoot/../template.config.json",
  [string]$Root   = "$PSScriptRoot/.."
)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

$errors   = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$infos    = New-Object System.Collections.Generic.List[string]

# ── shared: nested vendored repos are out of scope (same exclusion as apply-template.ps1) ──
$nestedRepos = @(Get-ChildItem -Path $Root -Directory -ErrorAction SilentlyContinue |
  Where-Object { Test-Path (Join-Path $_.FullName '.git') } | ForEach-Object { $_.FullName })
function Test-InNestedRepo($path, $repos) {
  foreach ($r in $repos) { if ($r -and $path.StartsWith($r, [StringComparison]::OrdinalIgnoreCase)) { return $true } }
  $false
}

# ── 1. declared project tokens (scalars + tokenMap keys) must not remain unfilled ──
# Only enforced as an ERROR once apply-template.ps1 has actually run (marked by .template-version).
# On the raw template repo itself (no stamp yet), leftover tokens are expected -> reported as info only.
$hasConfig = Test-Path $Config
$applied   = Test-Path (Join-Path $Root '.template-version')
if ($hasConfig) {
  $cfg = [System.IO.File]::ReadAllText((Resolve-Path $Config).Path) | ConvertFrom-Json
  $projectTokens = New-Object System.Collections.Generic.HashSet[string]
  foreach ($p in $cfg.scalars.PSObject.Properties)  { [void]$projectTokens.Add($p.Name) }
  foreach ($p in $cfg.tokenMap.PSObject.Properties) { [void]$projectTokens.Add($p.Name) }

  $skip = @((Join-Path $Root 'README.md'))   # apply-template.ps1 never touches root README.md
  $mdFiles = Get-ChildItem -Path $Root -Recurse -File -Filter *.md |
    Where-Object {
      $_.FullName -notmatch '[\\/](node_modules|\.git)[\\/]' -and
      $skip -notcontains $_.FullName -and
      -not (Test-InNestedRepo $_.FullName $nestedRepos)
    }

  $unknownCount = 0
  $unfilledCount = 0
  foreach ($f in $mdFiles) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    $relPath = $f.FullName.Substring($Root.Length + 1)
    foreach ($m in [regex]::Matches($text, '\{\{([^{}]+)\}\}')) {
      $tok = $m.Groups[1].Value
      if ($projectTokens.Contains($tok)) {
        $unfilledCount++
        if ($applied) {
          $errors.Add("[unfilled-token] ${relPath}: {{$tok}} should have been replaced by apply-template.ps1")
        }
      } else {
        $unknownCount++
      }
    }
  }
  if (-not $applied -and $unfilledCount -gt 0) {
    $infos.Add("$unfilledCount declared-token placeholder(s) found, but no .template-version stamp -> this looks like the raw template (not yet applied), so not flagged as errors. Run apply-template.ps1 first if you meant to instantiate a project.")
  }
  if ($unknownCount -gt 0) {
    $infos.Add("$unknownCount other {{...}} placeholder(s) found (use-time tokens like {{repo}}/{{host}} or illustrative examples in docs - expected to stay, not an error)")
  }
} else {
  $warnings.Add("template.config.json not found - skipping unfilled-token check (fine if you already deleted it per README step 4)")
}

# ── 2. relative links in docs/INDEX.md must resolve on disk ──
$indexPath = Join-Path $Root 'docs\INDEX.md'
if (Test-Path $indexPath) {
  $text = [System.IO.File]::ReadAllText($indexPath)
  foreach ($m in [regex]::Matches($text, '\]\(([^)#]+)\)')) {
    $link = $m.Groups[1].Value
    if ($link -match '^([a-z]+:)?//') { continue }   # skip http(s)/external links
    $target = Join-Path (Split-Path $indexPath) $link
    if (-not (Test-Path $target)) {
      $errors.Add("[broken-link] docs/INDEX.md -> $link (resolved: $target)")
    }
  }
} else {
  $warnings.Add("docs/INDEX.md not found")
}

# ── 3. skill SKILL.md frontmatter (advisory: open-standard skills should carry only name + description) ──
$skillsDir = Join-Path $Root 'ai-context\skills'
if (Test-Path $skillsDir) {
  $missingFile  = @()
  $extraFields  = @()
  foreach ($d in (Get-ChildItem -Path $skillsDir -Directory)) {
    $skillFile = Join-Path $d.FullName 'SKILL.md'
    if (-not (Test-Path $skillFile)) { $missingFile += $d.Name; continue }
    $text = [System.IO.File]::ReadAllText($skillFile)
    if ($text -match '(?s)^---\r?\n(.*?)\r?\n---') {
      $fm = $Matches[1]
      $keys = [regex]::Matches($fm, '(?m)^([a-zA-Z_-]+):') | ForEach-Object { $_.Groups[1].Value }
      if ($keys -notcontains 'name' -or $keys -notcontains 'description') {
        $errors.Add("[skill-frontmatter] $($d.Name)/SKILL.md missing required 'name' or 'description' key")
      }
      $extra = @($keys | Where-Object { $_ -notin @('name', 'description') })
      if ($extra.Count -gt 0) { $extraFields += "$($d.Name) ($($extra -join ', '))" }
    } else {
      $errors.Add("[skill-frontmatter] $($d.Name)/SKILL.md has no YAML frontmatter block")
    }
  }
  if ($missingFile.Count -gt 0) {
    $infos.Add("$($missingFile.Count) dir(s) under ai-context/skills without a SKILL.md (may be support folders, not skills): $($missingFile -join ', ')")
  }
  if ($extraFields.Count -gt 0) {
    $infos.Add("$($extraFields.Count) skill(s) carry frontmatter beyond name/description - fine for Claude-only use, breaks the cross-tool open standard (see ai-context/skills/README.md): $($extraFields -join '; ')")
  }
} else {
  $warnings.Add("ai-context/skills not found")
}

# ── report ──
Write-Host ""
Write-Host "=== validate-template ===" -ForegroundColor Cyan
if ($hasConfig -and ($cfg.PSObject.Properties.Name -contains 'templateVersion')) {
  Write-Host "templateVersion (config): $($cfg.templateVersion)" -ForegroundColor DarkGray
}
$stampPath = Join-Path $Root '.template-version'
if (Test-Path $stampPath) { Write-Host "$(Get-Content $stampPath -Raw)" -ForegroundColor DarkGray }

Write-Host "Errors:   $($errors.Count)"   -ForegroundColor $(if ($errors.Count -gt 0)   { 'Red' }    else { 'Green' })
Write-Host "Warnings: $($warnings.Count)" -ForegroundColor $(if ($warnings.Count -gt 0) { 'Yellow' } else { 'Green' })
if ($errors.Count -gt 0)   { Write-Host "`n-- Errors --"   -ForegroundColor Red;    $errors   | ForEach-Object { Write-Host "  $_" } }
if ($warnings.Count -gt 0) { Write-Host "`n-- Warnings --" -ForegroundColor Yellow; $warnings | ForEach-Object { Write-Host "  $_" } }
if ($infos.Count -gt 0)    { Write-Host "`n-- Info --"     -ForegroundColor DarkGray; $infos  | ForEach-Object { Write-Host "  $_" } }
Write-Host ""

if ($errors.Count -gt 0) { exit 1 } else { exit 0 }
