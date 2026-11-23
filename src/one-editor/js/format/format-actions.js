// Format in place (Shift+Alt+F, format on save / paste) and the format options; the ✨ Format button itself writes to an output tab through OutputLink.
const FormatActions = (() => {
  const P = "fmt.";
  const flags = { onSave: false, onPaste: false };

  function load() {
    Object.assign(Formatter.opts, Prefs.get(P + "opts", {}));
    Object.assign(flags, Prefs.get(P + "flags", {}));
  }
  const keep = () => { Prefs.set(P + "opts", Formatter.opts); Prefs.set(P + "flags", flags); };

  // Smallest single change between two texts, so the cursor and scroll stay where they were.
  function minimalChange(a, b) {
    let p = 0, s = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    return { from: p, to: a.length - s, insert: b.slice(p, b.length - s) };
  }

  // quiet: format on save — no success message.
  async function inPlace(doc = Views.activeDoc(), quiet = false) {
    if (!doc) return false;
    doc = Docs.root(doc);
    if (doc.readOnly || doc.hex) { StatusBar.msg(T("Tab chỉ đọc — không format tại chỗ."), "warn"); return false; }
    const text = Docs.text(doc), lang = Docs.effectiveLang(doc);
    let r;
    try { r = await Formatter.format(text, lang); }
    catch (e) { FixMarks.show(doc, [], e); if (quiet) return e; StatusBar.msg(e.message, "bad", e.line ? () => Views.revealLine(doc, e.line) : null); return false; }
    if (!Docs.get(doc.id) || Docs.text(doc) !== text) return false;
    const gi = Views.groups.findIndex(g => g.active === doc.id && g.i < Views.count);
    if (r.text !== text) {
      const change = minimalChange(text, r.text);
      if (gi >= 0) Views.groups[gi].view.dispatch({ changes: change, userEvent: "input.format" });
      else Views.replaceText(doc, r.text);
    }
    FixMarks.show(doc, r.fixes);
    if (quiet && !r.fixes.length) return true;
    const parts = [r.text === text ? T("✔ Đã đúng định dạng — không đổi gì.") : T("✔ Đã format “{name}” ({lang}) — Ctrl+Z để hoàn tác.", { name: doc.name, lang }), ...r.notes];
    if (r.fixes.length) parts.push(T("Đã tự sửa {n} lỗi — bấm để xem danh sách.", { n: r.fixes.length }));
    StatusBar.msg(parts.join(" "), r.fixes.length ? "warn" : "good", r.fixes.length ? () => FixMarks.openList(doc) : null, T("Mở danh sách chỗ đã tự sửa"));
    return true;
  }

  // Paste into an empty tab formats it all; a paste inside text re-indents the pasted lines.
  function pasted(u) {
    if (!flags.onPaste || !u.transactions.some(tr => tr.isUserEvent("input.paste"))) return;
    const view = u.view, wasEmpty = u.startState.doc.length === 0;
    let from = view.state.doc.length, to = 0;
    u.changes.iterChangedRanges((fa, ta, fb, tb) => { from = Math.min(from, fb); to = Math.max(to, tb); });
    setTimeout(() => {
      if (wasEmpty) { inPlace(Views.activeDoc(Views.groups.findIndex(g => g.view === view))); return; }
      if (to <= from || to > view.state.doc.length) return;
      const changes = CM.language.indentRange(view.state, from, to);
      if (!changes.empty) view.dispatch({ changes, userEvent: "input.format" });
    });
  }

  // → the format error (the file is still saved unformatted, like VS Code) or null.
  async function beforeSave(doc) {
    if (!flags.onSave || Formatter.tier(Docs.effectiveLang(doc)) >= 3) return null;
    const r = await inPlace(doc, true);
    return r instanceof Error ? r : null;
  }

  // Appended after the save result so the save message does not hide the format error.
  function saveFormatFailed(doc, e) {
    StatusBar.msg($("status").textContent + " ⚠ " + T("Format khi lưu lỗi (đã lưu bản chưa format): {msg}", { msg: e.message }), "warn", e.line ? () => Views.revealLine(doc, e.line) : null);
  }

  function setOpt(key, value) {
    Formatter.opts[key] = value;
    keep();
    const label = key === "sql" ? Formatter.SQL_DIALECTS[value] : key === "width" ? String(value) : value === "tab" ? "Tab" : value === "auto" ? T("tự dò theo file") : T("{n} dấu cách", { n: value });
    StatusBar.msg(T("Format: {what} = {value}", { what: T(key === "sql" ? "SQL dialect" : key === "width" ? "độ rộng dòng" : "thụt lề"), value: label }), "good");
    // The SQL syntax check follows the dialect: a reconfigure re-lints the views (forceLinting only hurries a pending lint), then the syntax-check results re-run.
    if (key === "sql") {
      Views.applySettings();
      Docs.list().filter(d => d.kind === "output" && d.link?.op === "syntax-check" && Docs.get(d.link.src)).forEach(d => OutputLink.run(Docs.get(d.link.src), "syntax-check", true));
    }
  }

  function askWidth() {
    const v = prompt(T("Độ rộng dòng tối đa khi format (Prettier print width, 40–200):"), Formatter.opts.width);
    if (v !== null && +v >= 40 && +v <= 200) setOpt("width", Math.round(+v));
  }

  function toggle(flag) {
    flags[flag] = !flags[flag];
    keep();
    StatusBar.msg(T(flag === "onSave" ? "Format khi lưu: {state}" : "Format khi dán: {state}", { state: T(flags[flag] ? "bật" : "tắt") }), "good");
  }

  // FIX Parser reads the same #pako: share payload ({ text }).
  async function openInFixParser(doc = Views.activeDoc()) {
    if (!doc) return;
    const url = new URL("fix-message-parser.html", location.href);
    url.hash = await ShareCodec.encode({ text: Docs.text(Docs.root(doc)) });
    window.open(url.href, "_blank", "noopener");
  }

  return { load, inPlace, pasted, beforeSave, saveFormatFailed, setOpt, askWidth, toggle, openInFixParser, minimalChange, flags };
})();
