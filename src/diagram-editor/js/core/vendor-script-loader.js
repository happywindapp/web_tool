// Renderers load on first use, each as a classic script tag: file:// blocks ES modules. A failed load can be retried.
const VendorScripts = (() => {
  const PLANTUML_DIR = "vendor/plantuml-1.2026.9/";
  const PATHS = {
    mermaid: "vendor/mermaid-12.2.0.min.js",
    graphviz: PLANTUML_DIR + "viz-global.js",
    plantuml: PLANTUML_DIR + "plantuml.js",
    d2: "vendor/d2-0.1.33.min.js",
    dbml: "vendor/dbml-parse-11.0.0.min.js",
  };
  const loading = {};

  function load(name) {
    return loading[name] ??= new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = PATHS[name];
      s.onload = ok;
      s.onerror = () => { delete loading[name]; no(new Error(PATHS[name])); };
      document.head.append(s);
    });
  }

  return { load, PLANTUML_DIR };
})();

// line: 1-based editor line; syntax: the source is at fault; what: replaces the generic status text.
class DiagramError extends Error {
  constructor(message, { line = 0, syntax = false, what = "" } = {}) {
    super(message);
    Object.assign(this, { line, syntax, what });
  }
}
