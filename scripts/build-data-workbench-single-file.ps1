# Build tools/data-workbench.html from src/data-workbench/ (kept for existing docs/habits; see build-single-file-tool.ps1).
# Usage: pwsh scripts/build-data-workbench-single-file.ps1 [-Check]   (-Check: exit 1 if the built file is stale)
param([switch]$Check)
& (Join-Path $PSScriptRoot 'build-single-file-tool.ps1') -Tool data-workbench -Check:$Check
exit $LASTEXITCODE
