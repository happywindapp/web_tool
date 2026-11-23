# Vendor isomorphic-git (UMD, global `git`) into tools/vendor/isomorphic-git-<ver>/ for the One Editor Explorer git status icons; loaded lazily when a folder holds a .git directory.
# The UMD needs Node's Buffer: the `buffer` polyfill is passed in as a parameter, so no window.Buffer leaks to the other libraries on the page.
# Usage: pwsh scripts/vendor-one-editor-isomorphic-git.ps1   (needs npm; pin releases at least 2 weeks old)
$ErrorActionPreference = 'Stop'

$ver = '1.44.11'
$bufferVer = '6.0.3'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "tools/vendor/isomorphic-git-$ver"
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("one-editor-isogit-" + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Read-Js([string]$path) { [IO.File]::ReadAllText($path, $utf8) -replace '(?m)^//# sourceMappingURL=.*$', '' }

try {
  New-Item -ItemType Directory -Force $tmp, $outDir | Out-Null
  Push-Location $tmp
  try {
    npm init -y --silent | Out-Null
    npm install --save-exact --no-audit --no-fund --silent "isomorphic-git@$ver" "buffer@$bufferVer" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  } finally { Pop-Location }
  $nm = Join-Path $tmp 'node_modules'

  $parts = @(
    "(function () {",
    "var b64 = { exports: {} }; (function (module, exports) { " + (Read-Js "$nm/base64-js/index.js") + "`n})(b64, b64.exports);",
    "var ieee = { exports: {} }; (function (module, exports) { " + (Read-Js "$nm/ieee754/index.js") + "`n})(ieee, ieee.exports);",
    "var buf = { exports: {} }; (function (module, exports, require) { " + (Read-Js "$nm/buffer/index.js") + "`n})(buf, buf.exports, function (n) { return n === 'base64-js' ? b64.exports : ieee.exports; });",
    "(function (Buffer) { " + (Read-Js "$nm/isomorphic-git/index.umd.min.js") + "`n})(buf.exports.Buffer);",
    "})();"
  )
  Get-ChildItem $outDir -File | Remove-Item
  [IO.File]::WriteAllText((Join-Path $outDir 'isomorphic-git-with-buffer.min.js'), ($parts -join "`n"), $utf8)

  $lic = @()
  foreach ($d in 'isomorphic-git', 'buffer', 'base64-js', 'ieee754') {
    $pj = Get-Content "$nm/$d/package.json" -Raw | ConvertFrom-Json
    $file = Get-ChildItem "$nm/$d" -Filter 'LICENSE*' -File | Select-Object -First 1
    $lic += "===== $d $($pj.version) ($($pj.license)) =====`n" + [IO.File]::ReadAllText($file.FullName, $utf8) + "`n"
  }
  [IO.File]::WriteAllText((Join-Path $outDir 'isomorphic-git-LICENSES.txt'), ($lic -join "`n"), $utf8)
  Get-ChildItem $outDir -File | ForEach-Object { '{0,8:N0} KB  {1}' -f ($_.Length / 1KB), $_.FullName.Substring($root.Length + 1) }
} finally {
  Set-Location $root
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
