// Key profiles: VS Code (default — CodeMirror's own keys already match it), Sublime Text, Notepad++ (editor keys only, the app's shortcuts stay); Vim (vendored, loaded when on) above any profile.
const KeyProfiles = (() => {
  const NAMES = { vscode: "VS Code", sublime: "Sublime Text", notepadpp: "Notepad++" };
  const cmd = name => v => CM.commands[name](v);
  const text = id => () => { NppActions.text(id); return true; }, lines = id => () => { NppActions.lines(id); return true; };
  const PROFILES = {
    vscode: [],
    sublime: [["Mod-Shift-d", cmd("copyLineDown")], ["Mod-Shift-ArrowUp", cmd("moveLineUp")], ["Mod-Shift-ArrowDown", cmd("moveLineDown")], ["Mod-m", cmd("cursorMatchingBracket")], ["Mod-j", lines("join")], ["Mod-Shift-u", text("upper")], ["Mod-u", text("lower")]],
    notepadpp: [["Mod-d", cmd("copyLineDown")], ["Mod-Shift-l", cmd("deleteLine")], ["Mod-Shift-ArrowUp", cmd("moveLineUp")], ["Mod-Shift-ArrowDown", cmd("moveLineDown")], ["Mod-u", text("lower")], ["Mod-Shift-u", text("upper")], ["Mod-j", lines("join")], ["Mod-q", cmd("toggleComment")]],
  };
  const current = () => Object.hasOwn(PROFILES, Prefs.get("keys", "vscode")) ? Prefs.get("keys", "vscode") : "vscode";
  const ext = id => PROFILES[id].length ? CM.state.Prec.high(CM.view.keymap.of(PROFILES[id].map(([key, run]) => ({ key, run, preventDefault: true })))) : [];

  function set(id, quiet = false) {
    Prefs.set("keys", id);
    CmSetup.setExtra("keys", ext(id));
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
    if (!quiet) StatusBar.msg(on ? T("Vim: bật — Esc về Normal, i để gõ, :w lưu.") : T("Vim: tắt."), "good");
  }

  // Applies the remembered choices once the extras are loaded.
  function init() {
    if (current() !== "vscode") set(current(), true);
    if (Prefs.get("vim", false) === true) setVim(true, true);
  }

  return { set, setVim, init, PROFILES, current };
})();
