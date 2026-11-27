// Options dialog of a 15a text tool on the selection (or the whole tab): live preview, then replace in place (one Ctrl+Z), a linked result tab in the other view, or a 🔗 link.
const TextToolDlg = (() => {
  const { mk, button } = PowerUi;
  const PREVIEW_MAX = 20000, IN_MAX = 20 * 1024 * 1024;

  // The active tab + its first selection range, captured when the dialog opens.
  function capture() {
    const d = Views.activeDoc();
    if (!d) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return null; }
    const v = Views.activeView(), ranges = v ? v.state.selection.ranges.filter(r => !r.empty) : [];
    const src = Docs.root(d), sel = ranges.length && v ? { from: ranges[0].from, to: ranges[0].to, text: v.state.sliceDoc(ranges[0].from, ranges[0].to) } : null;
    return { src, view: v, gi: Views.focused, sel, text: sel ? sel.text : Docs.text(src) };
  }

  function field(f, val, onchange) {
    const lab = mk("label", f.type === "check" ? "chk" : "sql-f");
    if (f.type === "check") { const c = mk("input", "", null, { type: "checkbox", checked: !!val }); c.onchange = onchange; lab.append(c, T(f.label)); return { el: lab, get: () => c.checked, set: x => { c.checked = !!x; } }; }
    if (f.type === "multi") {
      const box = mk("div", "tt-multi"), cs = f.options.map(([k, l]) => { const c = mk("input", "", null, { type: "checkbox", checked: val.includes(k), value: k }); c.onchange = onchange; const L = mk("label", "chk"); L.append(c, T(l)); box.append(L); return c; });
      lab.append(mk("span", "", T(f.label)), box);
      return { el: lab, get: () => cs.filter(c => c.checked).map(c => c.value), set: x => cs.forEach(c => { c.checked = x.includes(c.value); }) };
    }
    let input;
    if (f.type === "select") { input = mk("select"); f.options.forEach(([k, l]) => input.append(mk("option", "", T(l), { value: k }))); input.value = val; input.onchange = onchange; }
    else { input = mk("input", "", null, { type: f.type === "number" ? "number" : "text", value: String(val ?? ""), spellcheck: false, autocomplete: "off", ...(f.type === "number" ? { min: "0" } : {}) }); input.oninput = onchange; }
    lab.append(mk("span", "", T(f.label)), input);
    return { el: lab, get: () => f.type === "number" ? +input.value || 0 : input.value, set: x => { input.value = String(x ?? ""); } };
  }

  function open(id) {
    const tool = TextTools.get(id), c = capture();
    if (!tool || !c) return;
    if (c.text.length > IN_MAX) { StatusBar.msg(T("Quá lớn ({mb} MB) — công cụ này nhận tối đa 20 MB.", { mb: (c.text.length / 1048576).toFixed(1) }), "warn"); return; }
    let o = { ...TextTools.opts(c.src.id, id) };
    const dlg = mk("dialog", "qp pw-dlg tt-dlg", null, { "aria-label": T(tool.title) }), form = mk("form", "", null, { method: "dialog" });
    const head = mk("p", "", T("{tool}: {what}", { tool: T(tool.title), what: c.sel ? T("vùng chọn ({n} ký tự)", { n: I18n.num(c.sel.text.length) }) : T("cả tab “{name}”", { name: c.src.name }) }));
    const grid = mk("div", "tt-grid"), out = mk("textarea", "tt-out", null, { readOnly: true, spellcheck: false, rows: 8, "aria-label": T("Xem trước") }), note = mk("p", "muted tt-note");
    let timer = 0;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fields.forEach(([f, w]) => { o[f.k] = w.get(); });
        o = tool.clean(o);
        try { const r = tool.run(c.text, o); out.value = r.text.length > PREVIEW_MAX ? r.text.slice(0, PREVIEW_MAX) + "\n…" : r.text; note.textContent = (r.notes || []).join(" "); note.classList.remove("bad"); }
        catch (e) { out.value = ""; note.textContent = e.message; note.classList.add("bad"); }
      }, 120);
    };
    const fields = tool.fields.map(f => [f, field(f, o[f.k], refresh)]);
    if (tool.presets) {
      const pick = field({ k: "preset", label: "Mẫu có sẵn", type: "select", options: tool.presets }, "", () => {
        const p = WrapLines.PRESETS[pick.get()];
        if (!p) return;
        fields.forEach(([f, w]) => { if (Object.hasOwn(p, f.k)) w.set(p[f.k]); });
        refresh();
      });
      grid.append(pick.el);
    }
    fields.forEach(([, w]) => grid.append(w.el));
    const done = msg => { dlg.close(); if (msg) StatusBar.msg(msg, "good"); };
    const save = () => { fields.forEach(([f, w]) => { o[f.k] = w.get(); }); o = tool.clean(o); };
    const acts = mk("div", "pw-acts tt-acts");
    if (tool.replace) acts.append(button(T("⤶ Thay tại chỗ"), () => { save(); replace(c, tool, o) && done(); }, T("Một lần Ctrl+Z để hoàn tác")));
    acts.append(button(T("⇢ Mở ở view kia"), () => { save(); toOther(c, id, o); done(); }, T("Tab kết quả liên kết — sửa nguồn là tự cập nhật")),
      button(T("🔗 Link"), () => { save(); PowerUi.shareLink({ v: 1, views: [[{ n: c.src.name, l: c.src.lang || "", t: c.text }], []], run: id, opts: o }, k => T("🔗 Đã chép link ({n} ký tự) — mở link là chạy lại với các tuỳ chọn này.", { n: k })); }),
      mk("button", "", T("Đóng"), { value: "cancel", formNoValidate: true }));
    form.append(head, grid, out, note, acts);
    dlg.append(form);
    dlg.addEventListener("close", () => { clearTimeout(timer); dlg.remove(); });
    document.body.append(dlg);
    dlg.showModal();
    refresh();
  }

  // One transaction on the captured range (or the whole tab).
  function replace(c, tool, o) {
    const v = c.view;
    if (!v || !Docs.get(c.src.id) || Views.groups[c.gi]?.active !== c.src.id) { StatusBar.msg(T("Tab nguồn đã đổi — mở lại hộp thoại."), "warn"); return false; }
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return false; }
    const from = c.sel ? c.sel.from : 0, to = c.sel ? c.sel.to : v.state.doc.length;
    if (v.state.sliceDoc(from, to) !== c.text) { StatusBar.msg(T("Tab nguồn đã đổi — mở lại hộp thoại."), "warn"); return false; }
    let r;
    try { r = tool.run(c.text, o); } catch (e) { StatusBar.msg(e.message, "bad"); return false; }
    v.dispatch({ changes: { from, to, insert: r.text }, selection: c.sel ? { anchor: from, head: from + r.text.length } : undefined, userEvent: "input.transform", scrollIntoView: true });
    StatusBar.msg(T("✔ {tool}: đã thay — Ctrl+Z để hoàn tác.", { tool: T(tool.title) }) + (r.notes?.length ? " " + r.notes.join(" ") : ""), "good");
    return true;
  }

  // A selection becomes a temp tab beside its source, so the result follows only that fragment.
  function toOther(c, id, o) {
    let src = c.src;
    if (c.sel) { src = Docs.create({ kind: "temp", name: SelectionActions.tabName(c.src), lang: "", text: c.sel.text }); Views.open(src, c.gi, false); Views.activate(c.gi, c.src.id, false); }
    PowerUi.saveOpts(src.id, id, o);
    // Saved again once the result tab exists: its link.opts keeps them over F5.
    OutputLink.run(src, id).then(ok => ok && PowerUi.saveOpts(src.id, id, o));
  }

  return { open };
})();
