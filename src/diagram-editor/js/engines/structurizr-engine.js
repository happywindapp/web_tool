const StructurizrEngine = (() => {
  const keywords = new Set("workspace model views styles person softwareSystem softwaresystem container component group tags description technology include exclude autoLayout autolayout systemLandscape systemContext element relationship background color shape this title !identifiers".split(" "));

  const message = i => `${i.line}: ${T(i.msg, i.args)}`;

  async function render(code, cfg) {
    const ws = StructurizrParser.parse(code);
    if (ws.errors.length) throw new DiagramError(ws.errors.map(message).join("\n"), { line: ws.errors[0].line, syntax: true });
    const views = StructurizrViews.list(ws);
    if (!views.length) throw new DiagramError(T("Workspace chưa có phần tử nào để vẽ."), { syntax: true });
    const view = views.find(v => v.id === cfg.view) || views[0], out = StructurizrViews.dot(ws, view);
    if (!out.count) throw new DiagramError(T("View “{name}” không có phần tử nào.", { name: view.label }), { line: view.line || 0 });
    return {
      svg: Graphviz.svg(out.text), type: view.label, bg: "#ffffff",
      warnings: [...ws.warnings, ...out.warnings].map(message),
      pick: { key: "view", value: view.id, options: views.map(v => [v.id, v.label]) },
    };
  }

  return {
    id: "structurizr", label: "Structurizr", lib: "Graphviz", ext: ".dsl", accept: ".dsl,.md,.txt", fence: "structurizr",
    defaultConfig: "{}", comment: "(?://|^\\s*#).*$|/\\*[\\s\\S]*?\\*/", keywords,
    placeholder: "Gõ Structurizr DSL, ví dụ: workspace {\n  model {\n    user = person \"User\"\n  }\n}",
    get samples() { return STRUCTURIZR_SAMPLES; },
    firstSample: "banking",
    controls: [],
    ready: () => Graphviz.ready(),
    render,
  };
})();
