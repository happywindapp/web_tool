# link-shared-skills.ps1: tao junction de moi AI tool doc chung skills tu ai-context/skills/ (idempotent, khong can admin; ASCII-only cho PS 5.1)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$canonical = Join-Path $root 'ai-context\skills'
if (-not (Test-Path $canonical)) { New-Item -ItemType Directory -Force -Path $canonical | Out-Null }

$links = '.agents\skills', '.claude\skills', '.github\skills', '.agent\skills', '.gemini\skills'

foreach ($rel in $links) {
    $path = Join-Path $root $rel
    if (Test-Path $path) {
        $item = Get-Item $path -Force
        if ($item.LinkType) { Write-Host "OK    $rel (junction da co)" }
        else { Write-Warning "SKIP  $rel - la thu muc that: gop noi dung vao ai-context\skills, xoa thu muc, chay lai" }
        continue
    }
    $parent = Split-Path -Parent $path
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    New-Item -ItemType Junction -Path $path -Target $canonical | Out-Null
    Write-Host "LINK  $rel -> ai-context\skills"
}

Write-Host ""
Write-Host "Xong. Junction da duoc gitignore - clone moi chay lai script nay."
