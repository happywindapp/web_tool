// Which preview a tab gets: diagram engines render in the sandbox page (tools/one-editor-preview-sandbox.html), the rest in this page; null = no preview.
const PreviewKind = (() => {
  const DIAGRAM = { Mermaid: "mermaid", PlantUML: "plantuml", D2: "d2", DBML: "dbml", Structurizr: "structurizr", Graphviz: "graphviz" };
  const PAGE = { Markdown: "markdown", HTML: "html", CSV: "table", TSV: "table", JSON: "table" };
  const FENCE = { mermaid: "mermaid", plantuml: "plantuml", puml: "plantuml", d2: "d2", dbml: "dbml", dot: "graphviz", graphviz: "graphviz" };
  const PROLOG = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*/;

  // head: start of the text, telling an SVG or draw.io file from other XML.
  function of(lang, head = "", name = "") {
    if (Object.hasOwn(DIAGRAM, lang)) return { kind: "diagram", engine: DIAGRAM[lang] };
    if (Object.hasOwn(PAGE, lang)) return { kind: PAGE[lang] };
    if (lang !== "XML") return null;
    const root = /^<([\w:-]+)/.exec(String(head).replace(PROLOG, ""))?.[1] || "", ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase();
    if (root === "svg" || (!root && ext === "svg")) return { kind: "svg" };
    if (root === "mxfile" || root === "mxGraphModel" || (!root && (ext === "drawio" || ext === "dio"))) return { kind: "drawio" };
    return null;
  }

  // Engine options: light canvas like Diagram Editor; Structurizr draws the picked view (default: its first).
  function config(engine, view) {
    if (engine === "dbml") return { rankdir: "LR", fields: "all" };
    if (engine === "structurizr" && typeof view === "string" && view) return { view };
    return {};
  }

  const fence = info => Object.hasOwn(FENCE, info) ? FENCE[info] : null;

  return { of, config, fence, LANGS: [...Object.keys(DIAGRAM), ...Object.keys(PAGE), "SVG", "draw.io"] };
})();
