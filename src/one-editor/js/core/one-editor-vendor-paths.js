// Vendored libraries (scripts/vendor-one-editor-libraries.ps1), each loaded once as a classic script: file:// blocks ES modules. A failed load can be retried.
const VendorPaths = (() => {
  const CM_DIR = "vendor/codemirror-6.43.15/";
  const PATHS = {
    cmCore: CM_DIR + "codemirror-core.min.js",
    cmLanguages: CM_DIR + "codemirror-languages.min.js",
  };
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
