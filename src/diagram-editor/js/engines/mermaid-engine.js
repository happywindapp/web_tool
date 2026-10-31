const MermaidEngine = (() => {
  const THEMES = ["default", "neutral", "dark", "forest", "base", "neo", "neo-dark", "redux", "redux-dark", "redux-color", "redux-dark-color"];
  const keywords = new Set(("graph flowchart sequenceDiagram classDiagram stateDiagram stateDiagram-v2 erDiagram gantt pie journey gitGraph mindmap timeline " +
    "quadrantChart xychart xychart-beta sankey sankey-beta block block-beta architecture architecture-beta kanban requirementDiagram packet packet-beta " +
    "radar-beta treemap-beta C4Context C4Container C4Component C4Dynamic C4Deployment subgraph end direction participant actor loop alt else opt par and " +
    "critical break rect note over activate deactivate autonumber box class classDef style linkStyle click state section title dateFormat axisFormat " +
    "excludes todayMarker commit branch checkout merge requirement element accTitle accDescr columns group service junction in").split(" "));

  const bgOf = c => c.themeVariables?.background || (/dark/.test(c.theme || "") ? "#333333" : "#ffffff");

  // Mermaid drops front-matter, "%% …" lines and leading blanks before parsing → map its line N back to the editor line.
  function editorLine(code, n) {
    const lines = code.split("\n"), fence = l => /^-{3}\s*$/.test(l);
    let i = 0, seen = 0, started = false;
    if (fence(lines[0])) { const end = lines.findIndex((l, k) => k > 0 && fence(l)); if (end > 0) i = end + 1; }
    for (; i < lines.length; i++) {
      if (/^\s*%%(?!\{)[^\n]+/.test(lines[i])) continue;
      if (!started && (!lines[i].trim() || /^\s*%%\{.*\}%%\s*$/.test(lines[i]))) continue;
      started = true;
      if (++seen === n) break;
    }
    // EOF errors land on trailing blank lines → point at the last line with content
    let at = Math.min(i, lines.length - 1);
    while (at > 0 && !lines[at].trim()) at--;
    return at + 1;
  }

  async function render(code, cfg, seq) {
    try {
      mermaid.initialize({ ...cfg, startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true });
      const { svg, diagramType } = await mermaid.render("mmd-" + seq, code);
      return { svg, type: diagramType, bg: bgOf(cfg) };
    } catch (e) {
      const msg = String(e?.message || e), syntax = /Parse error|Lexer error|Parsing failed|Expecting/i.test(msg);
      const m = syntax && msg.match(/line\s+(\d+)/i), line = m ? editorLine(code, +m[1]) : 0;
      const what = /No diagram type detected/i.test(msg) ? T("Không nhận ra loại sơ đồ (dòng đầu phải là flowchart, sequenceDiagram…)") : "";
      throw new DiagramError(msg, { line, syntax, what });
    }
  }

  return {
    id: "mermaid", label: "Mermaid", lib: "Mermaid", ext: ".mmd", accept: ".mmd,.mermaid,.md,.txt", fence: "mermaid", configTab: true,
    defaultConfig: '{\n  "theme": "default"\n}', comment: "%%.*$", keywords, editorLine,
    placeholder: "Gõ mã Mermaid, ví dụ: flowchart LR\n    A --> B",
    get samples() { return MERMAID_SAMPLES; },
    firstSample: "flowchart",
    controls: [
      { key: "theme", title: "Theme (ghi vào cấu hình)", keep: true, dflt: "default", options: THEMES.map(t => [t, `Theme: ${t}`]) },
      { key: "look", title: "Kiểu nét", dflt: "classic", options: [["classic", "Nét chuẩn"], ["handDrawn", "Vẽ tay"], ["neo", "Neo"]] },
    ],
    ready: () => VendorScripts.load("mermaid"),
    render,
  };
})();
