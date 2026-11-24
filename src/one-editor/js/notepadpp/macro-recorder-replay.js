// Macro (Notepad++): records typed text, editor keys (arrows, Home/End, Enter, Backspace…) and commands; replays 1×, N× or to the end of the tab; named macros live in IndexedDB.
const Macro = (() => {
  const SKIP = new Set(["macroRecord", "macroPlay", "macroPlayN", "macroPlayEnd", "macroSave", "macroRun", "palette", "quickOpen"]);
  const MODS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock"]);
  let rec = null, last = null, saved = {}, keyed = false;

  async function load() { try { saved = (await NotesDb.getMeta("macros")) || {}; } catch { saved = {}; } }

  function init() {
    Commands.onRun(id => { if (rec && !SKIP.has(id)) rec.push({ c: id }); });
    document.addEventListener("keydown", onKey, true);
    load();
  }

  const inEditor = e => e.target.closest && e.target.closest(".cm-editor");
  function onKey(e) {
    keyed = false;
    if (!rec || !inEditor(e) || MODS.has(e.key) || Commands.bound(e)) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) { keyed = true; addText(e.key); return; }
    rec.push({ k: { key: e.key, code: e.code, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey } });
  }
  const addText = s => { const p = rec[rec.length - 1]; if (p && p.t !== undefined) p.t += s; else rec.push({ t: s }); };

  // Typing without key events (IME, phone keyboards) and paste come from the transactions.
  function typed(u) {
    if (!rec) return;
    for (const tr of u.transactions) {
      const paste = tr.isUserEvent("input.paste");
      if (!paste && (keyed || !tr.isUserEvent("input.type"))) continue;
      let ins = "";
      tr.changes.iterChanges((a, b, c, d, t) => { if (!ins) ins = t.toString(); });
      if (ins) { if (paste) rec.push({ p: ins }); else addText(ins); }
    }
    keyed = false;
  }

  function toggle() {
    if (!rec) { rec = []; document.body.classList.add("recording"); StatusBar.msg(T("⏺ Đang ghi macro — gõ / dùng phím / chạy lệnh; Alt+Shift+R để dừng."), "warn"); return; }
    last = rec.length ? rec : last;
    StatusBar.msg(rec.length ? T("⏹ Đã ghi macro {n} bước — Alt+Shift+P phát lại.", { n: rec.length }) : T("Macro trống — không có gì được ghi."), rec.length ? "good" : "warn");
    rec = null;
    document.body.classList.remove("recording");
  }

  // Typed characters go through the editor's input handlers so auto-closing brackets behave as when typing.
  function step(v, s) {
    if (s.c) { Commands.run(s.c); return; }
    if (s.k) { CM.view.runScopeHandlers(v, new KeyboardEvent("keydown", s.k), "editor"); return; }
    if (s.p !== undefined) { v.dispatch(v.state.replaceSelection(s.p), { userEvent: "input.paste" }); return; }
    const handlers = v.state.facet(CM.view.EditorView.inputHandler);
    for (const ch of s.t) {
      const { from, to } = v.state.selection.main, insert = () => v.state.update(v.state.replaceSelection(ch), { userEvent: "input.type" });
      if (!handlers.some(h => h(v, from, to, ch, insert))) v.dispatch(insert());
    }
  }

  // times: a count, or "end" — repeat while the cursor keeps moving down and the tab is not at its end.
  function play(times = 1) {
    const doc = Views.activeDoc(), v = doc && Views.activeView();
    if (!v) return;
    if (!last || !last.length) { StatusBar.msg(T("Chưa có macro — Alt+Shift+R để ghi."), "warn"); return; }
    if (rec) toggle();
    const toEnd = times === "end", max = toEnd ? 100000 : times, t0 = Date.now();
    let n = 0;
    for (; n < max && Date.now() - t0 < 10000; n++) {
      const line = v.state.doc.lineAt(v.state.selection.main.head).number;
      last.forEach(s => step(v, s));
      const head = v.state.selection.main.head;
      if (toEnd && (head >= v.state.doc.length || v.state.doc.lineAt(head).number <= line)) { n++; break; }
    }
    StatusBar.msg(T("▶ Đã phát macro {n} lần.", { n }), "good");
  }

  function playN() {
    const n = parseInt(prompt(T("Phát macro bao nhiêu lần?"), "10"), 10);
    if (n > 0) play(Math.min(n, 100000));
  }

  async function save() {
    if (!last) { StatusBar.msg(T("Chưa có macro để lưu."), "warn"); return; }
    const name = (prompt(T("Tên macro:"), "macro " + (Object.keys(saved).length + 1)) || "").trim();
    if (!name) return;
    saved[name] = last;
    try { await NotesDb.putMeta("macros", saved); StatusBar.msg(T("✔ Đã lưu macro “{name}” trong trình duyệt.", { name }), "good"); }
    catch (e) { StatusBar.msg(T("Không lưu được macro: {msg}", { msg: e.message }), "bad"); }
  }

  function runSaved() {
    const names = Object.keys(saved);
    if (!names.length) { StatusBar.msg(T("Chưa có macro đã lưu."), "warn"); return; }
    const name = prompt(T("Chạy macro nào? ({list})", { list: names.join(", ") }), names[0]);
    if (name && saved[name]) { last = saved[name]; play(1); }
  }

  const list = () => saved;
  async function putAll(map) { if (!(await NotesDb.putMeta("macros", map))) throw new Error(T("trình duyệt chặn IndexedDB")); saved = map; }

  return { init, typed, toggle, play, playN, save, runSaved, list, putAll, load, set: steps => { last = steps; }, get recording() { return !!rec; } };
})();
