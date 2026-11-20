// Compare the active tabs of two views (Notepad++ Compare): both stay editable, the diff re-runs 150 ms after an edit, scrolling is synced, Alt+↑/↓ jumps between blocks; narrow screens get one inline (unified) view.
const Compare = (() => {
  let s = null, timer = 0, ignore = null;
  const opt = { ws: false, case: false, inline: false };
  const narrow = () => matchMedia("(max-width: 640px)").matches;
  const docs = () => [Docs.get(s.a), Docs.get(s.b)];
  const viewOf = gi => Views.groups[gi].view;
  const lines = (d, f, t) => t > f ? d.lineAt(t - 1).number - d.lineAt(f).number + 1 : 0;

  function init() {
    Object.assign(opt, Prefs.get("compare", {}));
    Docs.on((type, doc) => { if (s && type !== "rename" && type !== "lang" && (doc.id === s.a || doc.id === s.b)) { clearTimeout(timer); timer = setTimeout(() => s && diff(), 150); } });
    CompareDeco.onArrow = (view, pos) => { if (s && !s.inline) copyAt(view === viewOf(s.ga), pos); };
    Views.onChange(() => { if (s && (s.gb >= Views.count || Views.groups[s.ga].active !== s.a || Views.groups[s.gb].active !== s.b)) stop(); });
  }

  function start(ga = Views.focused) {
    if (Views.count < 2) Views.setLayout("2c");
    const gb = Views.other(ga), a = Views.activeDoc(ga), b = Views.activeDoc(gb);
    if (!a || !b) { StatusBar.msg(T("Cần 2 tab đang mở ở 2 view để so sánh — mở thêm tab ở View {n}.", { n: (a ? gb : ga) + 1 }), "warn"); return false; }
    stop(true);
    s = { ga, gb, a: a.id, b: b.id, chunks: [], inline: opt.inline || narrow() };
    if (!s.inline) {
      [ga, gb].forEach(gi => viewOf(gi).scrollDOM.addEventListener("scroll", onScroll));
      [a, b].forEach(d => Views.applyEffect(d, CmSetup.compareEffect(CompareDeco.gutter)));
    }
    document.body.classList.add("comparing");
    diff();
    if (s.inline) PhoneLayout.show(gb + 1);
    return true;
  }

  function stop(silent = false) {
    if (!s) return;
    [s.ga, s.gb].forEach(gi => viewOf(gi).scrollDOM.removeEventListener("scroll", onScroll));
    docs().forEach(d => d && Views.applyEffect(d, [CompareDeco.clear(), CmSetup.compareEffect([])]));
    s = null;
    clearTimeout(timer);
    document.body.classList.remove("comparing");
    if (!silent) StatusBar.msg(T("Đã tắt so sánh."));
  }

  function diff() {
    const [a, b] = docs();
    if (!a || !b || !a.state || !b.state) { stop(); return; }
    const da = a.state.doc, db = b.state.doc;
    if (s.inline) {
      Views.applyEffect(b, CmSetup.compareEffect(CM.merge.unifiedMergeView({ original: da, mergeControls: false, gutter: true, highlightChanges: true, syntaxHighlightDeletions: true, diffConfig: config() })));
      return report((CM.merge.getChunks(Docs.get(s.b).state) || { chunks: [] }).chunks.length);
    }
    s.chunks = CM.merge.Chunk.build(da, db, config());
    Views.applyEffect(a, CompareDeco.effect(da, s.chunks, "a"));
    Views.applyEffect(b, CompareDeco.effect(db, s.chunks, "b"));
    report(s.chunks.length);
  }

  // Ignoring whitespace / case: a line diff on normalised lines replaces the default character diff.
  const config = () => opt.ws || opt.case ? { override: (x, y) => CompareIgnore.changes(x, y, opt).map(c => new CM.merge.Change(c.fromA, c.toA, c.fromB, c.toB)) } : {};

  function report(n) {
    const how = [opt.ws && T("bỏ qua khoảng trắng"), opt.case && T("bỏ qua hoa / thường"), s.inline && T("inline")].filter(Boolean).join(", ");
    StatusBar.msg((n ? T("So sánh View {a} ↔ View {b}: {n} khối khác nhau — Alt+↓ / Alt+↑ để nhảy.", { a: s.ga + 1, b: s.gb + 1, n }) : T("So sánh View {a} ↔ View {b}: giống hệt nhau.", { a: s.ga + 1, b: s.gb + 1 })) + (how ? " (" + how + ")" : ""), n ? "" : "good");
  }

  // Line n of one side → the matching line of the other side (inside a block: same offset, clamped).
  function mapLine(n, fromA) {
    const [a, b] = docs(), dS = (fromA ? a : b).state.doc, dT = (fromA ? b : a).state.doc;
    let delta = 0;
    for (const c of s.chunks) {
      const fS = fromA ? c.fromA : c.fromB, tS = Math.min(fromA ? c.toA : c.toB, dS.length), fT = fromA ? c.fromB : c.fromA, tT = Math.min(fromA ? c.toB : c.toA, dT.length);
      const lS = dS.lineAt(fS).number;
      if (lS > n) break;
      const nS = lines(dS, fS, tS), nT = lines(dT, fT, tT);
      if (n < lS + nS) return dT.lineAt(fT).number + Math.min(n - lS, Math.max(nT - 1, 0));
      delta += nT - nS;
    }
    return n + delta;
  }

  function onScroll(e) {
    if (!s || s.inline) return;
    const fromA = e.currentTarget === viewOf(s.ga).scrollDOM, src = viewOf(fromA ? s.ga : s.gb), dst = viewOf(fromA ? s.gb : s.ga);
    if (ignore === src) { ignore = null; return; }
    const top = Math.max(0, src.scrollDOM.scrollTop - src.documentPadding.top), blk = src.lineBlockAtHeight(top), dd = dst.state.doc;
    const ln = Math.min(Math.max(mapLine(src.state.doc.lineAt(blk.from).number, fromA), 1), dd.lines);
    const target = dst.lineBlockAt(dd.line(ln).from).top + dst.documentPadding.top + (top - blk.top), before = dst.scrollDOM.scrollTop;
    dst.scrollDOM.scrollLeft = src.scrollDOM.scrollLeft;
    if (Math.abs(before - target) < 1) return;
    ignore = dst;
    dst.scrollDOM.scrollTop = target;
    if (dst.scrollDOM.scrollTop === before) ignore = null;
  }

  function jump(dir) {
    if (!s) return;
    const gi = s.inline || Views.focused === s.gb ? s.gb : s.ga, v = viewOf(gi);
    if (s.inline) { (dir > 0 ? CM.merge.goToNextChunk : CM.merge.goToPreviousChunk)(v); v.focus(); return; }
    const starts = s.chunks.map(c => Math.min(gi === s.ga ? c.fromA : c.fromB, v.state.doc.length));
    if (!starts.length) { report(0); return; }
    const line = v.state.doc.lineAt(v.state.selection.main.head);
    let k = starts.findIndex(p => p > line.to);
    if (dir < 0) { k = -1; starts.forEach((p, i) => { if (p < line.from) k = i; }); }
    if (k < 0) k = dir > 0 ? 0 : starts.length - 1;
    v.dispatch({ selection: { anchor: starts[k] }, effects: CM.view.EditorView.scrollIntoView(starts[k], { y: "center" }) });
    v.focus();
    StatusBar.msg(T("Khối khác {k}/{n}", { k: k + 1, n: starts.length }));
  }

  // Copies the block under the cursor from the focused side over the other side (same rule as @codemirror/merge acceptChunk).
  function copyBlock() {
    if (!s || s.inline) return;
    const fromA = Views.focused !== s.gb;
    copyAt(fromA, viewOf(fromA ? s.ga : s.gb).state.selection.main.head);
  }

  function copyAt(fromA, pos) {
    const v = viewOf(fromA ? s.ga : s.gb), w = viewOf(fromA ? s.gb : s.ga);
    const c = s.chunks.find(c => { const f = fromA ? c.fromA : c.fromB, t = fromA ? c.toA : c.toB; return pos >= f && (pos < t || pos === f); });
    if (!c) { StatusBar.msg(T("Đặt con trỏ vào một khối khác nhau trước."), "warn"); return; }
    const src = v.state.doc, dst = w.state.doc, [fS, tS, fT, tT] = fromA ? [c.fromA, c.toA, c.fromB, c.toB] : [c.fromB, c.toB, c.fromA, c.toA];
    let insert = src.sliceString(fS, Math.max(fS, tS - 1));
    if (fS !== tS && tT <= dst.length) insert += "\n";
    w.dispatch({ changes: { from: fT, to: Math.min(dst.length, tT), insert }, userEvent: "input.compare" });
  }

  function setOpt(key) {
    opt[key] = !opt[key];
    Prefs.set("compare", opt);
    if (s) start(s.ga); else StatusBar.msg(T("Tuỳ chọn so sánh đã lưu — bật so sánh để áp dụng."));
  }

  // JSON compared by structure (key order ignored) → a report tab in the focused view.
  function jsonTree() {
    if (Views.count < 2) Views.setLayout("2c");
    const ga = Views.focused, a = Views.activeDoc(ga), b = Views.activeDoc(Views.other(ga));
    if (!a || !b) { StatusBar.msg(T("Cần 2 tab JSON ở 2 view."), "warn"); return; }
    const value = d => { const r = JsonTool.parse(Docs.text(Docs.root(d))); if (!r.ast) throw new Error(T("“{name}” không có JSON.", { name: d.name })); return Val.fromAst(r.ast, []); };
    let list;
    try { list = JsonDiff.compare(value(a), value(b)); } catch (e) { StatusBar.msg(e.message, "bad"); return; }
    const head = [T("So JSON theo cấu trúc (bỏ qua thứ tự key): {a} ⇄ {b}", { a: a.name, b: b.name }), list.length ? T("{n} khác biệt:", { n: list.length }) : T("Không có khác biệt."), ""];
    const doc = Docs.create({ kind: "temp", name: a.name + " ⇄ " + b.name, lang: "Plain Text", text: head.concat(list.map(JsonDiff.describe)).join("\n") + "\n" });
    Views.open(doc, ga, true);
    StatusBar.msg(T("✔ So JSON theo cấu trúc: {n} khác biệt.", { n: list.length }), list.length ? "" : "good");
  }

  return { init, start, stop, toggle: () => s ? stop() : start(), jump, copyBlock, setOpt, jsonTree, get active() { return !!s; }, opt };
})();
