# Vendor One Editor's data libraries (phase 14b) as lazy classic scripts that run inside a Blob Worker (js/core/blob-worker-host.js):
#   tools/vendor/sqljs-<ver>/sql-wasm-base64.js          sql.js (SQLite in WASM, the .wasm as base64: file:// cannot fetch it)
#   tools/vendor/sheetjs-mini-<ver>/xlsx-mini.js          SheetJS CE mini (xlsx / xlsm / csv) — ONLY from cdn.sheetjs.com: npm "xlsx" 0.18.5 has CVE-2023-30533 + CVE-2024-22363
#   tools/vendor/mammoth-<ver>/mammoth-browser.js         mammoth (docx → HTML)
# Each file only defines OEWorkerLibs.<name> = function () { …library…; return api; }: the page never runs it, the worker source is "(" + fn + ")()".
# Dev step that downloads (npm + cdn.sheetjs.com); the tool itself makes no network call. Usage: pwsh scripts/vendor-one-editor-data-libraries.ps1
$ErrorActionPreference = 'Stop'

$sqlJsVer = '1.16.0'
$sheetVer = '0.20.3'
$mammothVer = '1.13.0'
$sheetSha = '0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939'

$root = Split-Path -Parent $PSScriptRoot
$vendorDir = Join-Path $root 'tools/vendor'
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("one-editor-data-libs-" + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Text([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $utf8) }
function Read-Text([string]$path) { [IO.File]::ReadAllText($path, $utf8) -replace '(?m)^//# sourceMappingURL=.*$', '' }
function Sha256([string]$path) { (Get-FileHash $path -Algorithm SHA256).Hash.ToLower() }
# CommonJS-style module object inside the function: the UMD headers export into it, nothing leaks onto self.
function Wrap([string]$name, [string]$body, [string]$ret) {
  "(globalThis.OEWorkerLibs = globalThis.OEWorkerLibs || {}).$name = function () {`nvar module = { exports: {} }, exports = module.exports, define;`n$body`nreturn $ret;`n};`n"
}
function New-Out([string]$dir) { $d = Join-Path $vendorDir $dir; New-Item -ItemType Directory -Force $d | Out-Null; Get-ChildItem $d -File | Remove-Item; $d }

try {
  New-Item -ItemType Directory -Force $tmp | Out-Null
  Push-Location $tmp
  try {
    npm init -y --silent | Out-Null
    npm install --save-exact --no-audit --no-fund --silent "sql.js@$sqlJsVer" "mammoth@$mammothVer" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
    $sheetJs = Join-Path $tmp 'xlsx.mini.min.js'
    $sheetLic = Join-Path $tmp 'sheetjs-LICENSE'
    Invoke-WebRequest "https://cdn.sheetjs.com/xlsx-$sheetVer/package/dist/xlsx.mini.min.js" -OutFile $sheetJs -UseBasicParsing
    Invoke-WebRequest "https://cdn.sheetjs.com/xlsx-$sheetVer/package/LICENSE" -OutFile $sheetLic -UseBasicParsing
    if ((Sha256 $sheetJs) -ne $sheetSha) { throw "xlsx.mini.min.js sha256 changed: $(Sha256 $sheetJs) — check the release, then update `$sheetSha" }
  } finally { Pop-Location }
  $nm = Join-Path $tmp 'node_modules'

  $out = New-Out "sqljs-$sqlJsVer"
  $wasm = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$nm/sql.js/dist/sql-wasm.wasm"))
  Write-Text (Join-Path $out 'sql-wasm-base64.js') (Wrap 'sqljs' (Read-Text "$nm/sql.js/dist/sql-wasm.js") "{ init: module.exports, wasm: '$wasm', version: '$sqlJsVer' }")
  Write-Text (Join-Path $out 'sqljs-LICENSE.txt') ("===== sql.js $sqlJsVer (MIT; SQLite is public domain) =====`n" + [IO.File]::ReadAllText("$nm/sql.js/LICENSE"))

  $out = New-Out "sheetjs-mini-$sheetVer"
  Write-Text (Join-Path $out 'xlsx-mini.js') (Wrap 'sheetjs' (Read-Text $sheetJs) 'exports')
  Write-Text (Join-Path $out 'sheetjs-LICENSE.txt') ("===== SheetJS Community Edition $sheetVer mini (Apache-2.0), https://cdn.sheetjs.com/xlsx-$sheetVer/package/dist/xlsx.mini.min.js sha256 $(Sha256 $sheetJs) =====`n" + [IO.File]::ReadAllText($sheetLic))

  $out = New-Out "mammoth-$mammothVer"
  Write-Text (Join-Path $out 'mammoth-browser.js') (Wrap 'mammoth' (Read-Text "$nm/mammoth/mammoth.browser.min.js") 'module.exports')
  Write-Text (Join-Path $out 'mammoth-LICENSE.txt') ("===== mammoth $mammothVer (BSD-2-Clause; the browser build bundles JSZip (MIT), underscore (MIT), bluebird (MIT), xmlbuilder (MIT), dingbat-to-unicode, lop, option (BSD-2)) =====`n" + [IO.File]::ReadAllText("$nm/mammoth/LICENSE"))

  foreach ($d in "sqljs-$sqlJsVer", "sheetjs-mini-$sheetVer", "mammoth-$mammothVer") {
    Get-ChildItem (Join-Path $vendorDir $d) -File | ForEach-Object { '{0,10:N0} B  {1}' -f $_.Length, $_.FullName.Substring($root.Length + 1) }
  }
} finally {
  Set-Location $root
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
