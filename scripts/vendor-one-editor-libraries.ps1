# Rebuild the One Editor libraries in tools/vendor/ from npm: CodeMirror 6 as classic IIFE scripts (file:// blocks ES modules), Prettier standalone + plugins, sql-formatter.
# Usage: pwsh scripts/vendor-one-editor-libraries.ps1   (needs npm; pin releases at least 2 weeks old, then update the paths in src/one-editor/js/core/one-editor-vendor-paths.js)
$ErrorActionPreference = 'Stop'

$cmPackages = @(
  '@codemirror/state@6.7.6', '@codemirror/view@6.43.15', '@codemirror/language@6.13.1', '@codemirror/commands@6.11.1',
  '@codemirror/search@6.7.2', '@codemirror/autocomplete@6.20.4', '@codemirror/lint@6.9.8', '@codemirror/merge@6.12.3',
  '@codemirror/theme-one-dark@6.1.3', '@codemirror/language-data@6.5.2'
)
$cmVer = '6.43.15'
$prettierVer = '3.9.10'
$sqlFormatterVer = '15.9.0'
$esbuildVer = '0.28.2'
$prettierPlugins = 'babel', 'estree', 'typescript', 'postcss', 'html', 'markdown', 'yaml', 'graphql'

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'tools/vendor'
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("one-editor-libs-" + [guid]::NewGuid().ToString('N'))
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Package([string]$spec) {
  $dir = Join-Path $tmp ($spec -replace '[@/]', '_')
  New-Item -ItemType Directory -Force $dir | Out-Null
  npm pack $spec --pack-destination $dir --silent | Out-Null
  tar -xzf (Get-ChildItem $dir -Filter *.tgz | Select-Object -First 1).FullName -C $dir
  Join-Path $dir 'package'
}

function Write-Text([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $utf8) }

try {
  New-Item -ItemType Directory -Force $tmp | Out-Null

  # CodeMirror: the language bundle imports @codemirror/* and @lezer/* through shims onto globalThis.CM,
  # because two copies of @lezer/highlight tags or @codemirror/state facets silently break highlighting and indentation.
  $cm = Join-Path $tmp 'codemirror'
  New-Item -ItemType Directory -Force "$cm/shims" | Out-Null
  Push-Location $cm
  npm init -y --silent | Out-Null
  npm install --save-exact --no-audit --no-fund --silent @($cmPackages + "esbuild@$esbuildVer") | Out-Null
  Pop-Location

  $shared = [ordered]@{
    state = '@codemirror/state'; view = '@codemirror/view'; language = '@codemirror/language'; commands = '@codemirror/commands'
    search = '@codemirror/search'; autocomplete = '@codemirror/autocomplete'; lint = '@codemirror/lint'
    lezerCommon = '@lezer/common'; lezerHighlight = '@lezer/highlight'; lezerLr = '@lezer/lr'
  }
  $core = $shared.GetEnumerator() | ForEach-Object { "import * as $($_.Key) from '$($_.Value)';" }
  $core += "import * as merge from '@codemirror/merge';", "import * as oneDark from '@codemirror/theme-one-dark';"
  $core += "globalThis.CM = { $((@($shared.Keys) + 'merge', 'oneDark') -join ', ') };"
  Write-Text "$cm/core-entry.mjs" ($core -join "`n")
  Write-Text "$cm/languages-entry.mjs" "import { languages } from '@codemirror/language-data';`nglobalThis.CM.languages = languages;`n"
  $alias = @{}
  foreach ($e in $shared.GetEnumerator()) {
    Write-Text "$cm/shims/$($e.Key).cjs" "module.exports = globalThis.CM.$($e.Key);`n"
    $alias[$e.Value] = "./shims/$($e.Key).cjs"
  }
  Write-Text "$cm/alias.json" ($alias | ConvertTo-Json)
  Write-Text "$cm/build.mjs" @'
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const [outDir] = process.argv.slice(2);
const common = { bundle: true, minify: true, format: 'iife', target: 'es2020', legalComments: 'none', logLevel: 'warning' };
await build({ ...common, entryPoints: ['core-entry.mjs'], outfile: `${outDir}/codemirror-core.min.js` });
await build({ ...common, entryPoints: ['languages-entry.mjs'], outfile: `${outDir}/codemirror-languages.min.js`, alias: JSON.parse(readFileSync('alias.json', 'utf8')) });
'@
  $cmOut = Join-Path $out "codemirror-$cmVer"
  New-Item -ItemType Directory -Force $cmOut | Out-Null
  Push-Location $cm
  node build.mjs $cmOut
  if ($LASTEXITCODE -ne 0) { throw 'esbuild failed' }
  Pop-Location
  Copy-Item "$cm/node_modules/@codemirror/view/LICENSE" (Join-Path $out 'codemirror-LICENSE.txt') -Force

  # Prettier: UMD standalone + one file per plugin, loaded on demand per language.
  $pkg = Get-Package "prettier@$prettierVer"
  $pOut = Join-Path $out "prettier-$prettierVer"
  New-Item -ItemType Directory -Force "$pOut/plugins" | Out-Null
  Copy-Item "$pkg/standalone.js" $pOut -Force
  foreach ($p in $prettierPlugins) { Copy-Item "$pkg/plugins/$p.js" "$pOut/plugins" -Force }
  Copy-Item "$pkg/LICENSE" (Join-Path $out 'prettier-LICENSE.txt') -Force

  # sql-formatter: UMD build exposes globalThis.sqlFormatter.
  $pkg = Get-Package "sql-formatter@$sqlFormatterVer"
  Copy-Item "$pkg/dist/sql-formatter.min.js" (Join-Path $out "sql-formatter-$sqlFormatterVer.min.js") -Force
  Copy-Item "$pkg/LICENSE" (Join-Path $out 'sql-formatter-LICENSE.txt') -Force

  Get-ChildItem $cmOut, $pOut -Recurse -File | ForEach-Object { '{0,8:N0} KB  {1}' -f ($_.Length / 1KB), $_.FullName.Substring($root.Length + 1) }
  Get-Item (Join-Path $out "sql-formatter-$sqlFormatterVer.min.js") | ForEach-Object { '{0,8:N0} KB  {1}' -f ($_.Length / 1KB), $_.FullName.Substring($root.Length + 1) }
} finally {
  Set-Location $root
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
