# Vendor One Editor's code formatters (phase 15b) as lazy classic scripts that run inside a Blob Worker (js/core/blob-worker-host.js):
#   tools/vendor/code-formatter-gofmt-<ver>/code-formatter-gofmt.js    @wasm-fmt/gofmt (Go's go/format built with TinyGo)
#   tools/vendor/code-formatter-clang-<ver>/code-formatter-clang.js    @wasm-fmt/clang-format (LLVM clang-format, emscripten + embind)
#   tools/vendor/code-formatter-ruff-<ver>/code-formatter-ruff.js      @wasm-fmt/ruff_fmt (ruff's Python formatter, wasm-bindgen)
# Each file only defines OEWorkerLibs.<name> = function () { …ESM glue without import/export…; return api; } with the .wasm as base64 (file:// cannot fetch it); no eval / new Function.
# Dev step that downloads from npm; the tool itself makes no network call. Usage: pwsh scripts/vendor-one-editor-code-formatters.ps1
$ErrorActionPreference = 'Stop'

$goVer = '0.7.3'
$clangVer = '23.1.1'
$ruffVer = '0.15.20'

$root = Split-Path -Parent $PSScriptRoot
$vendorDir = Join-Path $root 'tools/vendor'
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("one-editor-code-fmt-" + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Write-Text([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $utf8) }
# ESM → function body: drop "export " (the files have no import lines, no import.meta).
function Read-Glue([string]$path) { ([IO.File]::ReadAllText($path, $utf8) -replace '(?m)^//# sourceMappingURL=.*$', '') -replace '(?m)^export\s+', '' }
function B64([string]$path) { [Convert]::ToBase64String([IO.File]::ReadAllBytes($path)) }
function Wrap([string]$name, [string]$body) { "(globalThis.OEWorkerLibs = globalThis.OEWorkerLibs || {}).$name = function () {`n'use strict';`nvar bytes = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };`n$body`n};`n" }
function New-Out([string]$dir) { $d = Join-Path $vendorDir $dir; New-Item -ItemType Directory -Force $d | Out-Null; Get-ChildItem $d -File | Remove-Item; $d }
function License([string]$pkgDir, [string]$title) { "===== $title =====`n" + [IO.File]::ReadAllText((Join-Path $pkgDir 'LICENSE')) }

try {
  New-Item -ItemType Directory -Force $tmp | Out-Null
  Push-Location $tmp
  try {
    npm init -y --silent | Out-Null
    npm install --save-exact --no-audit --no-fund --silent "@wasm-fmt/gofmt@$goVer" "@wasm-fmt/clang-format@$clangVer" "@wasm-fmt/ruff_fmt@$ruffVer" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  } finally { Pop-Location }
  $nm = Join-Path $tmp 'node_modules/@wasm-fmt'

  # gofmt: format(src) returns src unchanged, the formatted text, or throws "line:col: message".
  $out = New-Out "code-formatter-gofmt-$goVer"
  $body = (Read-Glue "$nm/gofmt/gofmt_binding.js") + "`nvar WASM = '" + (B64 "$nm/gofmt/gofmt.wasm") + "', inst = null;`n" +
    "function init() { if (!inst) { inst = new WebAssembly.Instance(new WebAssembly.Module(bytes(WASM))).exports; inst._initialize(); } return inst; }`n" +
    "return { version: '$goVer', format: function (src) { return format(init(), src); } };"
  Write-Text (Join-Path $out 'code-formatter-gofmt.js') (Wrap 'fmtGofmt' $body)
  Write-Text (Join-Path $out 'code-formatter-gofmt-LICENSES.txt') ((License "$nm/gofmt" "@wasm-fmt/gofmt $goVer (MIT); wraps Go's go/format (BSD-3-Clause, The Go Authors), built with TinyGo") + "`nGo source license: https://go.dev/LICENSE (BSD-3-Clause)`n")

  # clang-format: emscripten module instantiated synchronously from a compiled WebAssembly.Module; a bad style throws, a syntax error does not (like the CLI).
  $out = New-Out "code-formatter-clang-$clangVer"
  $body = (Read-Glue "$nm/clang-format/clang-format.js") + "`n" + (Read-Glue "$nm/clang-format/clang-format-binding.js") + "`nvar WASM = '" + (B64 "$nm/clang-format/clang-format.wasm") + "', ready = false;`n" +
    "function init() { if (!ready) { set_wasm(createModule({ wasm: new WebAssembly.Module(bytes(WASM)) })); ready = true; } }`n" +
    "return { version: '$clangVer', format: function (src, file, style) { init(); return format(src, file, style); }, engineVersion: function () { init(); return version(); } };"
  Write-Text (Join-Path $out 'code-formatter-clang.js') (Wrap 'fmtClang' $body)
  Write-Text (Join-Path $out 'code-formatter-clang-LICENSES.txt') ((License "$nm/clang-format" "@wasm-fmt/clang-format $clangVer (MIT); wraps LLVM clang-format $clangVer (Apache-2.0 WITH LLVM-exception)") + "`nLLVM license: https://llvm.org/LICENSE.txt (Apache License v2.0 with LLVM Exceptions)`n")

  # ruff: wasm-bindgen glue; the import object is every exported __wbg_* / __wbindgen_* shim under the module name "./ruff_fmt_bg.js". A syntax error throws a string.
  $out = New-Out "code-formatter-ruff-$ruffVer"
  $glue = [IO.File]::ReadAllText("$nm/ruff_fmt/ruff_fmt_bg.js", $utf8)
  $shims = [regex]::Matches($glue, '(?m)^export function (__wb\w+)') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -ne '__wbg_set_wasm' }
  if (-not $shims) { throw 'ruff_fmt_bg.js: no wasm-bindgen shims found' }
  $imports = ($shims | ForEach-Object { "${_}: $_" }) -join ', '
  $body = (Read-Glue "$nm/ruff_fmt/ruff_fmt_bg.js") + "`nvar WASM = '" + (B64 "$nm/ruff_fmt/ruff_fmt_bg.wasm") + "', ready = false;`n" +
    "function init() { if (!ready) { __wbg_set_wasm(new WebAssembly.Instance(new WebAssembly.Module(bytes(WASM)), { './ruff_fmt_bg.js': { $imports } }).exports); ready = true; } }`n" +
    "return { version: '$ruffVer', format: function (src, path, config) { init(); return format(src, path, config); } };"
  Write-Text (Join-Path $out 'code-formatter-ruff.js') (Wrap 'fmtRuff' $body)
  Write-Text (Join-Path $out 'code-formatter-ruff-LICENSES.txt') ((License "$nm/ruff_fmt" "@wasm-fmt/ruff_fmt $ruffVer (MIT); wraps ruff's Python formatter (MIT, Astral Software Inc.)") + "`nruff license: https://github.com/astral-sh/ruff/blob/main/LICENSE (MIT)`n")

  foreach ($d in "code-formatter-gofmt-$goVer", "code-formatter-clang-$clangVer", "code-formatter-ruff-$ruffVer") {
    Get-ChildItem (Join-Path $vendorDir $d) -File | ForEach-Object { '{0,10:N0} B  {1}' -f $_.Length, $_.FullName.Substring($root.Length + 1) }
  }
} finally {
  Set-Location $root
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
