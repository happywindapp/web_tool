# Rebuild the Diagram Editor renderers in tools/vendor/ from npm: wrap ESM/CJS bundles as classic scripts because file:// blocks ES modules and module workers.
# Usage: pwsh scripts/vendor-diagram-renderers.ps1   (needs npm + curl; bump the versions below, then update the paths in src/diagram-editor/js/core/vendor-script-loader.js)
$ErrorActionPreference = 'Stop'

$plantumlVer = '1.2026.9'
$d2Ver = '0.1.33'
$dbmlVer = '11.0.0'

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'tools/vendor'
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("diagram-renderers-" + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Package([string]$spec) {
  $dir = Join-Path $tmp ($spec -replace '[@/]', '_')
  New-Item -ItemType Directory -Force $dir | Out-Null
  npm pack $spec --pack-destination $dir --silent | Out-Null
  tar -xzf (Get-ChildItem $dir -Filter *.tgz | Select-Object -First 1).FullName -C $dir
  Join-Path $dir 'package'
}

function Read-Text([string]$path) { [IO.File]::ReadAllText($path, $utf8) }
function Write-Text([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $utf8) }

# Fail loudly when an upstream release changes the text a patch relies on.
function Replace-Once([string]$text, [string]$old, [string]$new) {
  $i = $text.IndexOf($old, [StringComparison]::Ordinal)
  if ($i -lt 0) { throw "Patch target not found: $old" }
  if ($text.IndexOf($old, $i + 1, [StringComparison]::Ordinal) -ge 0) { throw "Patch target not unique: $old" }
  $text.Substring(0, $i) + $new + $text.Substring($i + $old.Length)
}

try {
  New-Item -ItemType Directory -Force $tmp | Out-Null

  # PlantUML: the engine resolves themes/emoji/stdlib through PLANTUML_STDLIB_BASE, so they stay together in one folder.
  $pkg = Get-Package "@plantuml/core@$plantumlVer"
  $dir = Join-Path $out "plantuml-$plantumlVer"
  New-Item -ItemType Directory -Force $dir | Out-Null
  $js = Replace-Once (Read-Text "$pkg/plantuml.js") 'export{C as render,D as renderToString};' 'globalThis.PlantUML={render:C,renderToString:D};'
  Write-Text "$dir/plantuml.js" "(function(){`n$js`n})();`n"
  foreach ($f in 'viz-global.js', 'themes.js', 'emoji.js', 'openiconic.js') { Copy-Item "$pkg/$f" $dir -Force }
  Copy-Item "$pkg/LICENSE" (Join-Path $out 'plantuml-LICENSE.txt') -Force
  curl.exe -sSfL -o "$dir/c4.min.js" 'https://plantuml.github.io/plantuml/js-plantuml/c4.min.js'
  curl.exe -sSfL -o (Join-Path $out 'viz-js-LICENSE.txt') 'https://raw.githubusercontent.com/mdaines/viz-js/v3/LICENSE'

  # D2: file:// refuses a module worker, so the worker source becomes a classic script.
  $pkg = Get-Package "@terrastruct/d2@$d2Ver"
  $js = Read-Text "$pkg/dist/browser/index.js"
  $js = Replace-Once $js 'export{lw as D2};' 'globalThis.D2=lw;'
  $js = Replace-Once $js '{type:"module"}' '{}'
  $js = Replace-Once $js 'export function setupMessageHandler(' 'function setupMessageHandler('
  $js = Replace-Once $js '`export let BrotliDecode' '`let BrotliDecode'
  Write-Text (Join-Path $out "d2-$d2Ver.min.js") "(function(){`n$js`n})();`n"
  curl.exe -sSfL -o (Join-Path $out 'd2-LICENSE.txt') 'https://raw.githubusercontent.com/terrastruct/d2/master/LICENSE.txt'

  # DBML: the CommonJS build gets its exports object from the wrapper.
  $pkg = Get-Package "@dbml/parse@$dbmlVer"
  $js = Read-Text "$pkg/dist/dbml-parse.js"
  Write-Text (Join-Path $out "dbml-parse-$dbmlVer.min.js") "(function(exports){`n$js`n})(globalThis.DbmlParse={});`n"
  Copy-Item "$pkg/LICENSE" (Join-Path $out 'dbml-parse-LICENSE.txt') -Force

  Get-ChildItem $out -Recurse -File | ForEach-Object { '{0,8:N0} KB  {1}' -f ($_.Length / 1KB), $_.FullName.Substring($root.Length + 1) }
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
