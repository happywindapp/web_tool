// Find / replace inside the selection (CodeMirror's panel has no such toggle): uses the panel's current query; two buttons are added to the panel.
const SearchInSelection = (() => {
  const query = view => { const q = CM.search.getSearchQuery(view.state); return q && q.search && q.valid ? q : null; };
  const unquote = s => s.replace(/\\([nrt\\])/g, (m, c) => c === "n" ? "\n" : c === "r" ? "\r" : c === "t" ? "\t" : "\\");

  // Regex replacement is applied to each matched text on its own (lookbehind / ^ outside the match are not seen).
  function replacement(q, text) {
    const rep = q.literal ? q.replace : unquote(q.replace);
    return q.regexp ? text.replace(new RegExp(q.search, q.caseSensitive ? "" : "i"), rep) : rep;
  }

  function matches(view, q) {
    const out = [];
    for (const r of view.state.selection.ranges) {
      if (r.empty) continue;
      const cur = q.getCursor(view.state, r.from, r.to);
      for (let m = cur.next(); !m.done && out.length < 100000; m = cur.next()) out.push({ from: m.value.from, to: m.value.to });
    }
    return out;
  }

  function ready(view) {
    if (view.state.selection.ranges.every(r => r.empty)) { StatusBar.msg(T("Chọn vùng văn bản trước, rồi tìm / thay trong vùng đó."), "warn"); return null; }
    const q = query(view);
    if (!q) { CM.search.openSearchPanel(view); StatusBar.msg(T("Gõ nội dung cần tìm vào ô Tìm trước."), "warn"); }
    return q;
  }

  function selectAll(view) {
    const q = ready(view), ms = q ? matches(view, q) : null;
    if (!ms) return;
    if (!ms.length) { StatusBar.msg(T("Không thấy kết quả nào trong vùng chọn."), "warn"); return; }
    const { EditorSelection } = CM.state;
    view.dispatch({ selection: EditorSelection.create(ms.map(m => EditorSelection.range(m.from, m.to))), scrollIntoView: true });
    StatusBar.msg(T("Đã chọn {n} kết quả trong vùng chọn.", { n: I18n.num(ms.length) }), "good");
  }

  function replaceAll(view) {
    const q = ready(view), ms = q ? matches(view, q) : null;
    if (!ms) return;
    if (!ms.length) { StatusBar.msg(T("Không thấy kết quả nào trong vùng chọn."), "warn"); return; }
    view.dispatch({ changes: ms.map(m => ({ from: m.from, to: m.to, insert: replacement(q, view.state.sliceDoc(m.from, m.to)) })), userEvent: "input.replace.all" });
    StatusBar.msg(T("Đã thay {n} chỗ trong vùng chọn.", { n: I18n.num(ms.length) }), "good");
  }

  // Called on every editor update: adds the two buttons once to a newly opened search panel.
  function decorate(view) {
    const panel = view.dom.querySelector(".cm-search");
    if (!panel || panel.dataset.inSel) return;
    panel.dataset.inSel = "1";
    const b = (text, title, fn) => {
      const x = document.createElement("button");
      Object.assign(x, { type: "button", className: "cm-button", textContent: text, title });
      x.onmousedown = e => e.preventDefault();
      x.onclick = () => fn(view);
      return x;
    };
    const close = panel.querySelector("button[name=close]");
    panel.insertBefore(document.createElement("br"), close);
    panel.insertBefore(b(T("chọn hết trong vùng chọn"), T("Chọn mọi kết quả nằm trong vùng đang chọn (Alt+Shift+Enter)"), selectAll), close);
    panel.insertBefore(b(T("thay hết trong vùng chọn"), T("Chỉ thay các kết quả nằm trong vùng đang chọn (Ctrl+Alt+Enter)"), replaceAll), close);
  }

  return { selectAll, replaceAll, decorate, replacement };
})();
