// Activity bar (Explorer · Search) and the Find in files panel: open tabs, notes and the Explorer folder, scanned in time slices with progress and Stop; results grouped per file.
const SideBar = (() => {
  const box = $("sxResults"), input = $("sxQuery"), repl = $("sxReplace"), status = $("sxStatus");
  const LIMIT = FindCore.LIMITS.shownHits;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  // folded: groups the user collapsed (kept while results redraw); busy: a replace is running.
  let gen = 0, cur = null, busy = false;
  const folded = new Set();

  function show(name, focusReplace = false) {
    document.querySelectorAll("[data-side]").forEach(b => b.classList.toggle("on", b.dataset.side === name));
    document.querySelectorAll("[data-side-panel]").forEach(p => { p.hidden = p.dataset.sidePanel !== name; });
    document.body.classList.remove("no-explorer");
    PhoneLayout.show(0);
    if (name === "outline") EditorExtras.use(() => Outline.show());
    if (name === "search") {
      const v = Views.activeDoc() && Views.activeView(), sel = v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to) : "";
      if (sel && !sel.includes("\n")) input.value = sel;
      const f = focusReplace && input.value ? repl : input;
      f.focus();
      f.select();
      run();
    }
  }

  const opts = () => ({ matchCase: $("sxCase").checked, word: $("sxWord").checked, regex: $("sxRegex").checked });

  // An open tab jumps at once; a folder file opens as a tab first. Lines may have moved since the scan, so positions are clamped.
  async function jump(g, hit) {
    if (!g.doc || !Docs.get(g.doc.id)) {
      if (!g.node) { StatusBar.msg(T("Tab này đã đóng — tìm lại để cập nhật kết quả."), "warn"); return; }
      try { const { file, handle } = await g.node.read(); g.doc = await FileOpen.open(file, handle, Views.focused); }
      catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: g.name, msg: e.message }), "bad"); return; }
      if (!g.doc) return;
    }
    Views.revealLine(g.doc, hit.line);
    const v = Views.activeView(), d = v.state.doc, ln = d.line(Math.min(hit.line, d.lines)), from = Math.min(ln.from + hit.col, ln.to);
    v.dispatch({ selection: { anchor: from, head: Math.min(from + hit.to - hit.from, d.length) } });
    PhoneLayout.show(Views.focused + 1);
  }

  function hitRow(g, hit) {
    const b = el("button", "ex-item sx-hit"), t = hit.snip, end = Math.min(t.length, hit.at + hit.to - hit.from);
    b.append(el("small", "", hit.line + ": "), (hit.cut ? "…" : "") + t.slice(0, hit.at), el("b", "", t.slice(hit.at, end)), t.slice(end));
    b.title = T("Dòng {n}", { n: hit.line });
    b.onclick = () => jump(g, hit);
    return b;
  }

  function groupEl(g) {
    const d = el("details", "sx-file"), s = el("summary"), rep = el("button", "ex-act", "⇄");
    rep.title = T("Thay mọi kết quả trong file này");
    rep.onclick = e => { e.preventDefault(); replace([g]); };
    s.append(el("span", "sx-doc", g.icon + " " + g.name), el("small", "sx-path", g.path), el("span", "sx-n", (g.more ? "≥ " : "") + I18n.num(g.count)), rep);
    s.title = g.path || g.name;
    d.open = !folded.has(g.key);
    d.addEventListener("toggle", () => { if (d.open) folded.delete(g.key); else folded.add(g.key); });
    d.append(s, ...g.hits.map(h => hitRow(g, h)));
    return d;
  }

  function summary(c) {
    const st = c.st, hits = c.groups.reduce((n, g) => n + g.count, 0), notes = [];
    let head = hits ? T("{n} kết quả trong {files} file", { n: (c.groups.some(g => g.more) ? "≥ " : "") + I18n.num(hits), files: I18n.num(c.groups.length) }) : c.done ? T("Không có kết quả.") : "";
    if (!c.done) head = T("⏳ Đã quét {n} file…", { n: I18n.num(st.files) }) + (head ? " " + head : "");
    if (c.shown >= LIMIT && hits > c.shown) notes.push(T("chỉ hiện {max} kết quả đầu", { max: I18n.num(LIMIT) }));
    if ($("sxFolder").checked && !Explorer.root()) notes.push(T("chưa mở folder trong Explorer"));
    if (st.binary) notes.push(T("bỏ qua {n} file nhị phân", { n: I18n.num(st.binary) }));
    if (st.size) notes.push(T("bỏ qua {n} file lớn hơn {mb} MB", { n: I18n.num(st.size), mb: FindCore.LIMITS.fileBytes / 1048576 }));
    if (st.denied.length) notes.push(T("{n} tab file cần bấm vào để cấp quyền đọc", { n: st.denied.length }));
    if (st.errors.length) notes.push(T("{n} file / folder không đọc được", { n: st.errors.length }));
    if (st.cut) notes.push(T("{n} folder chỉ đọc {max} mục đầu", { n: st.cut, max: I18n.num(LocalFs.MAX_ENTRIES) }));
    if (st.capped) notes.push(T("dừng ở {max} file", { max: I18n.num(FindCore.LIMITS.files) }));
    if (c.stopped) notes.push(T("đã dừng"));
    if (c.failed) notes.push(T("tìm bị ngắt vì lỗi: {msg}", { msg: c.failed }));
    return head + (notes.length ? " — " + notes.join(" · ") : "");
  }

  function setStatus(text, cls = "") {
    status.textContent = text;
    status.className = cls;
    status.title = cur ? [...cur.st.denied, ...cur.st.errors].slice(0, 20).join("\n") : "";
  }

  // Red when the scan broke, amber when something was skipped that the user may want searched.
  function render(c) {
    const st = c.st;
    setStatus(summary(c), c.failed ? "bad" : st.denied.length || st.errors.length || st.cut || st.capped ? "warn" : "");
    $("sxStop").hidden = c.done;
    $("sxReplaceAll").disabled = busy || !c.done || !c.groups.length;
    box.replaceChildren(...c.groups.map(groupEl));
  }

  // A newer run (typing, options) or Stop ends the loop; whatever was found so far stays listed.
  async function run() {
    const my = ++gen;
    let re;
    try { re = FindCore.compile(input.value, opts()); }
    catch (e) { cur = null; $("sxStop").hidden = true; setStatus(T("Regex lỗi: {msg}", { msg: e.message }), "bad"); box.replaceChildren(); return; }
    if (!re) {
      cur = null;
      $("sxStop").hidden = true;
      $("sxReplaceAll").disabled = true;
      setStatus(T("Gõ nội dung cần tìm. Phạm vi: tab đang mở, ghi chú và folder đang mở trong Explorer."));
      box.replaceChildren();
      return;
    }
    const c = cur = { re, regex: opts().regex, st: FindSources.stats(), groups: [], shown: 0, stopped: false, done: false };
    let drawn = 0;
    const draw = () => { drawn = Date.now(); render(c); };
    draw();
    try {
      await FindCore.sliced(FindSources.items({ folder: $("sxFolder").checked, heavy: $("sxHeavy").checked }, c.st), ({ text, ...it }) => {
        const r = FindCore.matches(text, re, LIMIT - c.shown);
        if (!r.count) return;
        c.shown += r.hits.length;
        c.groups.push({ ...it, count: r.count, more: r.more, hits: r.hits });
      }, { stop: () => my !== gen || c.stopped, progress: () => { if (my === gen && Date.now() - drawn > 250) draw(); } });
    } catch (e) { c.failed = e.message; }
    if (my !== gen) return;
    c.done = true;
    draw();
  }

  async function replace(groups) {
    const c = cur;
    if (!c || !groups.length || busy) return;
    if (!c.done) { StatusBar.msg(T("Chờ tìm xong (hoặc bấm Dừng) rồi mới thay."), "warn"); return; }
    const n = groups.reduce((s, g) => s + g.count, 0), closed = groups.filter(g => !g.doc || Views.where(g.doc.id) < 0).length;
    const ask = T("Thay {n} kết quả trong {files} file bằng “{text}”?", { n: I18n.num(n), files: I18n.num(groups.length), text: repl.value })
      + (closed ? "\n" + T("{n} file chưa mở sẽ được mở thành tab rồi mới thay.", { n: closed }) : "")
      + "\n" + T("Chưa ghi ra đĩa: xem lại rồi Ctrl+S từng file; Ctrl+Z trong tab để hoàn tác.");
    if (!confirm(ask)) return;
    let r;
    busy = true;
    $("sxReplaceAll").disabled = true;
    try { r = await FindReplace.run(groups, c.re, repl.value, c.regex); }
    catch (e) { StatusBar.msg(T("Thay bị ngắt vì lỗi: {msg} — các tab đã thay vẫn giữ, Ctrl+Z để hoàn tác.", { msg: e.message }), "bad"); run(); return; }
    finally { busy = false; }
    const msg = T("Đã thay {n} chỗ trong {files} file — chưa lưu ra đĩa.", { n: I18n.num(r.replaced), files: r.files });
    StatusBar.msg(msg + (r.skipped.length ? " " + T("Bỏ qua: {list}", { list: r.skipped.join("; ") }) : ""), r.skipped.length ? "warn" : "good");
    run();
  }

  function init() {
    document.querySelectorAll("[data-side]").forEach(b => { b.onclick = () => show(b.dataset.side); });
    // The shared I18n translates title / placeholder only, not aria-label.
    const nav = document.querySelector(".activity"), navLabel = () => nav.setAttribute("aria-label", T("Thanh hoạt động"));
    navLabel();
    I18n.onChange(() => { navLabel(); if (cur) render(cur); else run(); });
    const later = Dom.debounce(run, 300);
    input.addEventListener("input", later);
    ["sxCase", "sxWord", "sxRegex", "sxFolder", "sxHeavy"].forEach(id => $(id).addEventListener("change", run));
    input.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
    repl.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("sxReplaceAll").click(); } });
    $("sxStop").onclick = () => { if (cur) cur.stopped = true; };
    $("sxReplaceAll").onclick = () => { if (cur) replace(cur.groups); };
  }

  return { init, show, run };
})();
