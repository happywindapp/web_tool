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
    prettier: P_DIR + "standalone.js",
    extras: "one-editor-extras.js",
  };
  for (const p of ["babel", "estree", "typescript", "postcss", "html", "markdown", "yaml", "graphql"]) PATHS["prettier-" + p] = P_DIR + "plugins/" + p + ".js";
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

  return { load, PATHS };
})();
