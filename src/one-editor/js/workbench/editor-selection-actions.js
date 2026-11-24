// Selected-text actions (editor right-click menu + Command Palette): translate / ▶ run just the selection, open it in another tool, ask an AI chat site (ADR #26).
const SelectionActions = (() => {
  // ?q= prefills the prompt box where the site supports it; Gemini and Copilot M365 drop it (tested), so they get the clipboard only.
  const AI = [
    { name: "ChatGPT", url: "https://chatgpt.com/?q=" },
    { name: "Gemini", url: "https://gemini.google.com" },
    { name: "Copilot", url: "https://copilot.microsoft.com/?q=" },
    { name: "Copilot M365", url: "https://copilot.cloud.microsoft" },
    { name: "Perplexity", url: "https://www.perplexity.ai/search?q=" },
    { name: "Grok", url: "https://grok.com/?q=" },
    { name: "Claude", url: "https://claude.ai/new?q=" },
    { name: "Google", url: "https://www.google.com/search?q=" },
  ];
  // Longer query strings get HTTP 414 on some sites, so the text then goes by clipboard only.
  const Q_MAX = 6000;

  // Selected text of view v, several ranges joined by new lines; "" = nothing selected.
  const text = v => v ? v.state.selection.ranges.filter(r => !r.empty).map(r => v.state.sliceDoc(r.from, r.to)).join("\n") : "";
  // The fragment's own content decides; one it cannot tell (a few lines of code) keeps the tab's language.
  const langOf = (sel, doc) => LangDetect.byHeader(sel) || LangDetect.byContent(sel) || Docs.effectiveLang(doc);
  const tabName = doc => T("{name} · vùng chọn", { name: Docs.root(doc).name });

  function aiUrl(ai, sel) {
    if (!ai.url.endsWith("?q=")) return ai.url;
    const q = encodeURIComponent(sel);
    return q.length > Q_MAX ? ai.url.slice(0, -3) : ai.url + q;
  }

  function current() {
    const v = Views.activeView(), doc = Views.activeDoc(), sel = doc ? text(v) : "";
    if (!sel.trim()) { StatusBar.msg(T("Chưa tô đen đoạn nào."), "warn"); return null; }
    return { doc, sel, gi: Views.focused };
  }

  // The selection becomes a temp tab beside its source, so the result tab links to it and re-runs on it, never on the whole source.
  function runOnSelection(kind) {
    const c = current();
    if (!c) return;
    const tmp = Docs.create({ kind: "temp", name: tabName(c.doc), lang: kind === "run" ? langOf(c.sel, c.doc) : "", text: c.sel });
    Views.open(tmp, c.gi, false);
    Views.activate(c.gi, c.doc.id, false);
    OutputLink.run(tmp, kind === "run" ? RunOp.suggest(tmp) : "translate");
  }

  // Clipboard first, while this page still has the focus; then the AI page in a new tab.
  function askAi(name) {
    const c = current(), ai = AI.find(a => a.name === name);
    if (!c || !ai) return;
    const copied = Dom.copy(c.sel), w = OpenInTool.popup();
    if (!w) return;
    const url = aiUrl(ai, c.sel), filled = url !== ai.url.replace(/\?q=$/, "");
    w.location.replace(url);
    copied.then(ok => StatusBar.msg(filled
      ? T("Đã mở {ai} với vùng chọn trong ô hỏi.", { ai: name }) + (ok ? " " + T("Cũng đã chép vào clipboard — ô hỏi trống thì nhấn Ctrl+V.") : "")
      : ok ? T("Đã mở {ai} — vùng chọn đã chép vào clipboard, nhấn Ctrl+V vào ô hỏi.", { ai: name }) : T("Đã mở {ai} nhưng trình duyệt chặn chép clipboard — hãy tự chép vùng chọn.", { ai: name }), ok ? "good" : "warn"));
  }

  function aiMenu(x, y) {
    const head = Object.assign(document.createElement("div"), { className: "menu-head", textContent: T("Hỏi AI về vùng chọn (mở tab mới)") });
    TabMenu.show([head, ...AI.map(a => TabMenu.entry(a.name, a.url.endsWith("?q=") ? "" : T("dán Ctrl+V"), () => askAi(a.name)))], x, y);
  }

  // Rows for the editor right-click menu; none without a selection.
  function nodes(v, x, y) {
    const sel = text(v), doc = Views.activeDoc();
    if (!sel.trim() || !doc) return [];
    return [
      TabMenu.entry(T("🌐 Dịch vùng chọn"), "", () => runOnSelection("translate")),
      TabMenu.entry(T("▶ Chạy vùng chọn"), langOf(sel, doc), () => runOnSelection("run")),
      TabMenu.entry(T("↗ Mở vùng chọn bằng tool…"), "", () => OpenInTool.menuAt(x, y)),
      TabMenu.entry(T("🤖 Hỏi AI…"), "", () => aiMenu(x, y)),
      Object.assign(document.createElement("hr"), { className: "menu-sep" }),
    ];
  }

  // Command Palette rows (the touch path: long-press keeps the browser menu).
  function register(C) {
    const has = () => !!Views.activeDoc() && !!text(Views.activeView()).trim();
    C("selTranslate", "🌐 Dịch vùng chọn ở view kia", null, () => runOnSelection("translate"), has);
    C("selRun", "▶ Chạy vùng chọn (tự nhận ngôn ngữ)", null, () => runOnSelection("run"), has);
    for (const a of AI) C("askAi-" + a.name, () => T("🤖 Hỏi {ai} về vùng chọn", { ai: a.name }), null, () => askAi(a.name), has);
  }

  return { AI, text, langOf, tabName, aiUrl, nodes, register, askAi };
})();
