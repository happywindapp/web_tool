// Key profiles: Notepad++ (default), VS Code (CodeMirror's own keys already match it), Sublime Text — editor keys only, the app's shortcuts stay; Vim (vendored, loaded when on) above any profile.
const KeyProfiles = (() => {
  const NAMES = { vscode: "VS Code", sublime: "Sublime Text", notepadpp: "Notepad++" }, DEFAULT = "notepadpp";
  const cmd = name => v => CM.commands[name](v), fold = name => v => CM.language[name](v);
  const text = id => () => { NppActions.text(id); return true; }, lines = id => () => { NppActions.lines(id); return true; };
  // Notepad++ Ctrl+L: the lines touched by each selection go to the clipboard (with their line end), then are deleted.
  function cutLines(v) {
    const st = v.state, seen = new Set(), parts = [];
    for (const r of st.selection.ranges) {
      // A selection ending at a line start does not take that line (same rule as deleteLine).
      const last = st.doc.lineAt(r.to > r.from && st.doc.lineAt(r.to).from === r.to ? r.to - 1 : r.to).number;
      for (let n = st.doc.lineAt(r.from).number; n <= last; n++) if (!seen.has(n)) { seen.add(n); parts.push(st.doc.line(n).text); }
    }
    Dom.copy(parts.join("\n") + "\n");
    return st.readOnly || CM.commands.deleteLine(v);
  }
  // Ctrl+T / Ctrl+Shift+T (browser tabs), Ctrl+B (Explorer), Ctrl+K (chords), Ctrl+Alt+Enter, Alt+1…4 (views) stay with the browser / app.
  const PROFILES = {
    vscode: [],
    sublime: [["Mod-Shift-d", cmd("copyLineDown")], ["Mod-Shift-ArrowUp", cmd("moveLineUp")], ["Mod-Shift-ArrowDown", cmd("moveLineDown")], ["Mod-m", cmd("cursorMatchingBracket")], ["Mod-j", lines("join")], ["Mod-Shift-u", text("upper")], ["Mod-u", text("lower")]],
    notepadpp: [["Mod-d", cmd("copyLineDown")], ["Mod-Shift-l", cmd("deleteLine")], ["Mod-l", cutLines], ["Mod-Shift-ArrowUp", cmd("moveLineUp")], ["Mod-Shift-ArrowDown", cmd("moveLineDown")],
      ["Mod-u", text("lower")], ["Mod-Shift-u", text("upper")], ["Mod-j", lines("join")], ["Mod-q", cmd("toggleComment")], ["Mod-Shift-q", cmd("toggleBlockComment")],
      ["Mod-h", v => CM.search.openSearchPanel(v)], ["Mod-F3", v => TokenStyles.findNext(v, 1)], ["Mod-Shift-F3", v => TokenStyles.findNext(v, -1)],
      ["Mod-Shift-Backspace", cmd("deleteToLineStart")], ["Mod-Shift-Delete", cmd("deleteToLineEnd")],
      ["Alt-0", fold("foldAll")], ["Alt-Shift-0", fold("unfoldAll")], ["Mod-Alt-f", fold("foldCode")], ["Mod-Alt-Shift-f", fold("unfoldCode")]],
  };
  const current = () => Object.hasOwn(PROFILES, Prefs.get("keys", DEFAULT)) ? Prefs.get("keys", DEFAULT) : DEFAULT;
  const ext = id => PROFILES[id].length ? CM.state.Prec.high(CM.view.keymap.of(PROFILES[id].map(([key, run]) => ({ key, run, preventDefault: true })))) : [];
  const label = () => NAMES[current()] + (Prefs.get("vim", false) === true ? " + Vim" : "");

  function set(id, quiet = false) {
    Prefs.set("keys", id);
    CmSetup.setExtra("keys", ext(id));
    StatusBar.refresh();
    if (!quiet) StatusBar.msg(T("Bộ phím: {name} — phím của ứng dụng (Ctrl+P, Ctrl+Shift+P…) giữ nguyên.", { name: NAMES[id] }), "good");
  }

  async function setVim(on, quiet = false) {
    if (on && !CM.vim) {
      try { await VendorPaths.load("cmVim"); }
      catch (e) { StatusBar.msg(T("Không nạp được Vim ({file}).", { file: e.message }), "bad"); return; }
    }
    // ":w" saves like Ctrl+S.
    if (on && !CM.vim.wired) { CM.vim.wired = true; CM.vim.Vim.defineEx("write", "w", () => Actions.save(false)); }
    Prefs.set("vim", !!on);
    CmSetup.setExtra("vim", on ? CM.state.Prec.highest(CM.vim.vim({ status: true })) : []);
    StatusBar.refresh();
    if (!quiet) StatusBar.msg(on ? T("Vim: bật — Esc về Normal, i để gõ, :w lưu.") : T("Vim: tắt."), "good");
  }

  // Applies the remembered choices once the extras are loaded.
  function init() {
    if (current() !== "vscode") set(current(), true);
    if (Prefs.get("vim", false) === true) setVim(true, true);
  }

  return { set, setVim, init, PROFILES, current, label };
})();
