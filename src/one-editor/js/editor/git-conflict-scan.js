// Git conflicts in tabs on screen: rescanned 300 ms after an edit / tab switch, count in the status bar, items in Problems, Accept … in one transaction; the block widget loads from the extras bundle (ConflictUi).
const Conflicts = (() => {
  const MAX = 5 * 1048576, seen = new Map(), pending = new Set();
  const ok = d => d && d.state && !d.hex && !d.big && d.kind !== "output" && d.state.doc.length <= MAX;
  const onScreen = () => Views.groups.slice(0, Views.count).map(g => Docs.get(g.active)).filter(Boolean);

  // fresh: rescan when the text changed since the last scan; otherwise the last result (status bar, no work).
  function list(d, fresh = true) {
    if (!ok(d)) return [];
    const c = seen.get(d.id), t = d.state.doc;
    if (c && (c.text === t || !fresh)) return c.list;
    const r = { text: t, list: GitConflict.find(t.toString()) };
    seen.set(d.id, r);
    return r.list;
  }
  const count = d => (d && seen.get(d.id)?.list.length) || 0;

  function scan(d) {
    if (!ok(d)) return;
    const before = count(d), n = list(d).length;
    if (n || before) PowerTools.use(() => ConflictUi.show(d));
    if (n !== before) StatusBar.refresh();
  }

  const flush = Dom.debounce(() => { for (const id of pending) { const d = Docs.get(id); if (d) scan(d); } pending.clear(); }, 300);
  const queue = d => { pending.add(d.id); flush(); };

  const items = d => list(d).map(b => ({ from: b.from, line: b.line, col: 1, sev: "warning", msg: T("Conflict Git: {a} ⇄ {b}", { a: b.a || "HEAD", b: b.b || "?" }), src: "git" }));

  const docOf = view => Docs.get(Views.groups.find(g => g.view === view)?.active);

  function jump(dir) {
    const v = Views.activeView(), L = list(Views.activeDoc());
    if (!L.length) { StatusBar.msg(T("Tab này không có conflict Git."), "warn"); return; }
    const head = v.state.selection.main.head;
    let k = dir > 0 ? L.findIndex(b => b.from > head) : L.findLastIndex(b => b.from < head);
    if (k < 0) k = dir > 0 ? 0 : L.length - 1;
    v.dispatch({ selection: { anchor: L[k].from }, effects: CM.view.EditorView.scrollIntoView(L[k].from, { y: "center" }) });
    v.focus();
    StatusBar.msg(T("Conflict {k}/{n} — dòng {l}.", { k: k + 1, n: L.length, l: L[k].line }));
  }

  // One block (the one holding `at`, default the cursor) or every block (all) → one transaction, Ctrl+Z undoes it.
  function accept(choice, at, view = Views.activeView(), all = false) {
    const d = docOf(view);
    if (!d) return;
    if (view.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return; }
    const t = view.state.doc.toString(), L = GitConflict.find(t), pos = at ?? view.state.selection.main.head;
    const pick = all ? L : L.filter(b => pos >= b.from && (pos < b.to || pos === b.from));
    if (!pick.length) { StatusBar.msg(all ? T("Tab này không có conflict Git.") : T("Đặt con trỏ trong một khối conflict trước."), "warn"); return; }
    view.dispatch({ changes: GitConflict.changes(t, pick, choice), selection: { anchor: Math.min(pick[0].from, t.length) }, userEvent: "input.conflict", scrollIntoView: true });
    scan(d);
    const left = count(d), what = { current: "Accept Current", incoming: "Accept Incoming", both: "Accept Both" }[choice];
    StatusBar.msg(T("✔ {what}: {n} conflict — còn {left} · Ctrl+Z để hoàn tác.", { what, n: pick.length, left }), "good");
  }

  function init() {
    Docs.on((type, doc) => {
      if (type === "remove") { seen.delete(doc.id); return; }
      if (onScreen().includes(doc)) queue(doc);
    });
    Views.onChange(() => onScreen().forEach(queue));
    onScreen().forEach(scan);
  }

  return { init, list, count, items, jump, accept, acceptAll: choice => accept(choice, 0, Views.activeView(), true), docOf };
})();
