// Explorer "New ▸" (folder row / empty area): Folder · Empty file · templates (FileTemplates). A template asks the name with the part before the extension selected, writes the body, opens the tab; undo = like "New file".
const ExplorerNew = (() => {
  const E = (label, key, run) => TabMenu.entry(label, key, run);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let dlg = null;

  function build() {
    dlg = el("dialog", "name-ask");
    dlg.dataset.i18nSkip = "";
    const form = el("form"), label = el("label"), input = el("input"), row = el("div", "name-ask-btns"), cancel = el("button", "", ""), ok = el("button", "main", "");
    form.method = "dialog";
    Object.assign(input, { type: "text", spellcheck: false, autocomplete: "off" });
    Object.assign(cancel, { type: "button", onclick: () => dlg.close("") });
    Object.assign(ok, { type: "submit", value: "ok" });
    label.append(el("span"), input);
    row.append(cancel, ok);
    form.append(label, row);
    dlg.append(form);
    // Backdrop only: the dialog's own padding and a text selection released outside the box are clicks on dlg too.
    const outside = e => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
    let downOut = false;
    dlg.addEventListener("pointerdown", e => { downOut = e.target === dlg && outside(e); });
    dlg.addEventListener("click", e => { if (downOut && e.target === dlg && outside(e)) dlg.close(""); downOut = false; });
    document.body.append(dlg);
  }
  // → the cleaned name, "" when cancelled; the name part (not the extension) is selected like Windows.
  function askName(msg, value) {
    if (!dlg) build();
    const input = dlg.querySelector("input"), [cancel, ok] = dlg.querySelectorAll(".name-ask-btns > button");
    dlg.querySelector("label > span").textContent = msg;
    cancel.textContent = T("Huỷ");
    ok.textContent = T("Tạo");
    input.value = value;
    dlg.returnValue = "";
    dlg.showModal();
    const k = value.lastIndexOf(".");
    input.focus();
    input.setSelectionRange(0, k > 0 ? k : value.length);
    return new Promise(done => dlg.addEventListener("close", () => {
      const n = dlg.returnValue === "ok" ? ShareState.cleanName(input.value) : "";
      done(n && n !== "." && n !== ".." ? n : "");
    }, { once: true }));
  }

  // A taken name suggests "name (2).ext", like Windows "New Text Document (2).txt".
  const free = (dir, name) => TrashQuota.freeName(name, false, async n => !!await LocalFs.exists(dir.handle, n));

  async function fromTemplate(dir, tpl) {
    try {
      const name = await askName(T("Tên file mới ({what}):", { what: T(tpl.label) }), await free(dir, tpl.name));
      if (!name) return;
      const h = await LocalFs.create(dir, name, false);
      if (tpl.body) await LocalFs.writeHandle(h, tpl.body);
      ExplorerDisk.reload(dir);
      ExplorerUndo.created(T("Tạo file “{name}”", { name }), [{ handle: h, parent: dir.handle, path: dir.path }]);
      await FileOpen.openMany([{ file: await h.getFile(), handle: h }], Views.focused);
    } catch (e) { StatusBar.msg(T("Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad"); }
  }

  // [] for a folder that cannot be written; OneDrive gets Folder + Empty file only.
  function entries(node) {
    const disk = ExplorerOps.writableNode(node);
    if (!disk && node.remote !== "onedrive") return [];
    const b = E(T("Mới") + " ▸", "", () => {
      const items = [el("div", "menu-head", T("Mới")), E(T("Folder…"), "", () => ExplorerDisk.newEntry(node, true)), E(T("File trống…"), "", () => ExplorerDisk.newEntry(node, false))];
      if (disk) items.push(el("hr", "menu-sep"), ...FileTemplates.LIST.map(tpl => E(T(tpl.label), tpl.name, () => fromTemplate(node, tpl))));
      TabMenu.show(items, at.left, at.top);
    });
    // The submenu opens where "New ▸" was (the entry is gone once it runs).
    let at = { left: 0, top: 0 };
    b.addEventListener("click", () => { const r = b.getBoundingClientRect(); at = { left: r.left + 16, top: r.top }; }, true);
    return [b];
  }

  return { entries, askName };
})();
