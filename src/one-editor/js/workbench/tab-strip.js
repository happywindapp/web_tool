// Tab strip of one view: click to show, double-click to rename, × / middle-click / Alt+W to close, drag onto the other view to move it (⇥ does the same on touch).
const TabStrip = (() => {
  const TAB_TYPE = "application/x-one-editor-tab";
  const ICON = { note: "📝", file: "📄", temp: "✳", output: "⇢" };
  const SOURCE = {
    note: "Ghi chú — tự lưu trong trình duyệt",
    file: "File trên máy",
    temp: "Tab tạm (mẫu / link) — sửa thì được giữ lại thành ghi chú",
    output: "Kết quả liên kết — chạy lại sẽ cập nhật tab này",
  };

  function render(g) {
    const strip = g.el.querySelector(".tabs");
    strip.replaceChildren(...g.tabs.map(id => Docs.get(id)).filter(Boolean).map(doc => {
      const tab = document.createElement("div");
      tab.className = "tab" + (doc.id === g.active ? " on" : "") + (doc.kind === "output" ? " out" : "");
      Object.assign(tab, { role: "tab", tabIndex: 0, draggable: true, title: doc.name + "\n" + T(SOURCE[doc.kind]) });
      tab.dataset.id = doc.id;
      tab.setAttribute("aria-selected", doc.id === g.active);
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = ICON[doc.kind] + " " + doc.name;
      const x = document.createElement("button");
      x.className = "x";
      x.textContent = doc.dirty ? "●" : "×";
      x.title = T("Đóng (Alt+W)");
      tab.append(name, x);
      return tab;
    }));
    strip.querySelector(".tab.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function rename(doc) {
    const msg = doc.kind === "file" ? T("Tên tab (không đổi tên file trên đĩa):") : T("Tên mới:");
    const name = ShareState.cleanName(prompt(msg, doc.name) ?? "");
    if (name && name !== doc.name) Docs.rename(doc, name);
  }

  function init() {
    for (const g of Views.groups) {
      const strip = g.el.querySelector(".tabs"), idOf = e => e.target.closest(".tab")?.dataset.id;
      strip.addEventListener("click", e => {
        const id = idOf(e);
        if (!id) return;
        if (e.target.closest(".x")) Views.close(id); else Views.activate(g.i, id);
      });
      strip.addEventListener("dblclick", e => { const d = Docs.get(idOf(e)); if (d) rename(d); });
      strip.addEventListener("auxclick", e => { if (e.button === 1 && idOf(e)) { e.preventDefault(); Views.close(idOf(e)); } });
      strip.addEventListener("keydown", e => {
        const id = idOf(e);
        if (!id) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Views.activate(g.i, id); }
        else if (e.key === "F2") { e.preventDefault(); rename(Docs.get(id)); }
        else if (e.key === "Delete") Views.close(id);
      });
      strip.addEventListener("dragstart", e => {
        const id = idOf(e);
        if (!id) return;
        e.dataTransfer.setData(TAB_TYPE, id);
        e.dataTransfer.effectAllowed = "move";
      });
      g.el.querySelector(".gnew").onclick = () => Actions.newNote(g.i);
      g.el.querySelector(".gmove").onclick = () => { if (g.active) { Views.move(g.active, 1 - g.i); PhoneLayout.show(2 - g.i); } };
    }
  }

  return { init, render, rename, TAB_TYPE, ICON, SOURCE };
})();
