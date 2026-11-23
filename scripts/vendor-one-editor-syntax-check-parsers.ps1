# Build tools/vendor/syntax-check-parsers-<ver>/syntax-check-parsers.min.js: one lazy classic script with tree-sitter (WASM as base64, file:// cannot fetch .wasm), Go/Java/Python grammars and node-sql-parser MySQL/PostgreSQL/T-SQL.
# Usage: pwsh scripts/vendor-one-editor-syntax-check-parsers.ps1   (needs npm; pin releases at least 2 weeks old)
$ErrorActionPreference = 'Stop'

$bundleVer = '1'
$treeSitterVer = '0.22.6'
$grammarsVer = '0.1.13'
$sqlParserVer = '5.4.0'
$grammars = 'go', 'java', 'python'
$sqlDialects = 'mysql', 'postgresql', 'transactsql'

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "tools/vendor/syntax-check-parsers-$bundleVer"
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("one-editor-syntax-" + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Text([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $utf8) }
function Read-Text([string]$path) { [IO.File]::ReadAllText($path, $utf8) -replace '(?m)^//# sourceMappingURL=.*$', '' }
function B64([string]$path) { [Convert]::ToBase64String([IO.File]::ReadAllBytes($path)) }

try {
  New-Item -ItemType Directory -Force $tmp, $outDir | Out-Null
  Push-Location $tmp
  try {
    npm init -y --silent | Out-Null
    npm install --save-exact --no-audit --no-fund --silent "web-tree-sitter@$treeSitterVer" "tree-sitter-wasms@$grammarsVer" "node-sql-parser@$sqlParserVer" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  } finally { Pop-Location }
  $nm = Join-Path $tmp 'node_modules'

  # UMD / emscripten files run inside a function with their own module object, so nothing leaks onto window (all three SQL builds export "Parser").
  $parts = @("(function () {", "var S = globalThis.SyntaxParsers = { wasm: {}, sql: {}, versions: { treeSitter: '$treeSitterVer', grammars: '$grammarsVer', sqlParser: '$sqlParserVer' } };")
  $parts += "(function () { var Module; " + (Read-Text "$nm/web-tree-sitter/tree-sitter.js") + "`nS.TreeSitter = TreeSitter; })();"
  $parts += "S.wasm.runtime = '" + (B64 "$nm/web-tree-sitter/tree-sitter.wasm") + "';"
  foreach ($g in $grammars) { $parts += "S.wasm.$g = '" + (B64 "$nm/tree-sitter-wasms/out/tree-sitter-$g.wasm") + "';" }
  foreach ($d in $sqlDialects) { $parts += "(function () { var module = { exports: {} }, exports = module.exports; " + (Read-Text "$nm/node-sql-parser/umd/$d.umd.js") + "`nS.sql.$d = module.exports.Parser; })();" }
  $parts += "})();"
  Write-Text (Join-Path $outDir 'syntax-check-parsers.min.js') ($parts -join "`n")

  $lic = @()
  foreach ($p in @(@{ n = 'web-tree-sitter'; d = 'web-tree-sitter' }, @{ n = 'tree-sitter-wasms (grammars: tree-sitter-go, tree-sitter-java, tree-sitter-python, MIT)'; d = 'tree-sitter-wasms' }, @{ n = 'node-sql-parser'; d = 'node-sql-parser' })) {
    $pj = Get-Content "$nm/$($p.d)/package.json" -Raw | ConvertFrom-Json
    $file = Get-ChildItem "$nm/$($p.d)" -Filter 'LICENSE*' -File | Select-Object -First 1
    $text = if ($file) { [IO.File]::ReadAllText($file.FullName) } else { "License: $($pj.license) (declared in package.json; the npm package ships no LICENSE file). Source: $($pj.repository.url ?? $pj.repository)" }
    $lic += "===== $($p.n) $($pj.version) ($($pj.license)) =====`n$text`n"
  }
  Write-Text (Join-Path $outDir 'syntax-check-parsers-LICENSES.txt') ($lic -join "`n")
  Get-ChildItem $outDir -File | ForEach-Object { '{0,8:N0} KB  {1}' -f ($_.Length / 1KB), $_.FullName.Substring($root.Length + 1) }
} finally {
  Set-Location $root
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
