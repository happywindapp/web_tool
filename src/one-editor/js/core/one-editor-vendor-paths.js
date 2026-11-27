// Vendored libraries (scripts/vendor-one-editor-libraries.ps1), each loaded once as a classic script: file:// blocks ES modules. A failed load can be retried.
const VendorPaths = (() => {
  const CM_DIR = "vendor/codemirror-6.43.15/", P_DIR = "vendor/prettier-3.9.10/";
  const PATHS = {
    cmCore: CM_DIR + "codemirror-core.min.js",
    cmLanguages: CM_DIR + "codemirror-languages.min.js",
    cmMinimap: CM_DIR + "codemirror-minimap.min.js",
    cmIndentMarkers: CM_DIR + "codemirror-indent-markers.min.js",
    cmVim: CM_DIR + "codemirror-vim.min.js",
    cmEmmet: CM_DIR + "codemirror-emmet.min.js",
    sqlFormatter: "vendor/sql-formatter-15.9.0.min.js",
    syntaxCheck: "vendor/syntax-check-parsers-1/syntax-check-parsers.min.js",
    prettier: P_DIR + "standalone.js",
    isoGit: "vendor/isomorphic-git-1.44.11/isomorphic-git-with-buffer.min.js",
    sqljs: "vendor/sqljs-1.16.0/sql-wasm-base64.js",
    sheetjs: "vendor/sheetjs-mini-0.20.3/xlsx-mini.js",
    mammoth: "vendor/mammoth-1.13.0/mammoth-browser.js",
    extras: "one-editor-extras.js",
  };
  for (const p of ["babel", "estree", "typescript", "postcss", "html", "markdown", "yaml", "graphql"]) PATHS["prettier-" + p] = P_DIR + "plugins/" + p + ".js";
  // Code formatters (scripts/vendor-one-editor-code-formatters.ps1), run in a Blob Worker.
  const FMT = [["fmtGofmt", "gofmt", "0.7.3"], ["fmtClang", "clang", "23.1.1"], ["fmtRuff", "ruff", "0.15.20"]];
  for (const [n, k, v] of FMT) PATHS[n] = "vendor/code-formatter-" + k + "-" + v + "/code-formatter-" + k + ".js";
  const loading = {};

  function load(name) {
    return loading[name] ??= new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = PATHS[name];
      s.onload = ok;
      s.onerror = () => { delete loading[name]; s.remove(); no(new Error(PATHS[name])); };
      document.head.append(s);
    });
  }

  return { load, PATHS, FMT };
})();
