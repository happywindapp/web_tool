// Tab strip of one view: click to show, click the active tab's name / double-click / right-click menu to rename in place, 📌 to pin, × / middle-click / Alt+W to close, drag along the tab bar to reorder / onto another view to move it (⇥ does the same on touch).
const TabStrip = (() => {
  let editing = null;
  const TAB_TYPE = "application/x-one-editor-tab";
  const ICON = { note: "📝", file: "📄", temp: "✳", output: "⇢", clone: "⧉", folder: "📁", trash: "🗑", results: "🔎", settings: "⚙" };
  const SOURCE = {
    note: "Ghi chú — tự lưu trong trình duyệt",
    file: "File trên máy",
    temp: "Tab tạm (mẫu / link) — sửa thì được giữ lại thành ghi chú",
    output: "Kết quả liên kết — chạy lại sẽ cập nhật tab này",
    clone: "Bản hiển thị thứ hai của một tab — sửa ở đây là sửa tab gốc",
    folder: "Tab folder — danh sách file như Windows Explorer, đường dẫn ở thanh địa chỉ",
    trash: "Thùng rác — file đã xoá trong Explorer, khôi phục được",
    results: "Kết quả tìm / so sánh file — ↻ để chạy lại",
    settings: "Cài đặt One Editor — đổi là áp dụng ngay",
  };
  const HAND_EDITED = "Kết quả đã sửa tay — không tự cập nhật nữa; đóng tab thì được giữ thành ghi chú";
  const sourceOf = doc => doc.kind === "output" && doc.edited ? HAND_EDITED : SOURCE[doc.kind];

  function render(g) {
    if (editing && g.tabs.includes(editing)) return;
    const strip = g.el.querySelector(".tabs");
    strip.replaceChildren(...g.tabs.map(id => Docs.get(id)).filter(Boolean).map(doc => {
      const tab = document.createElement("div");
      tab.className = "tab" + (doc.id === g.active ? " on" : "") + (doc.kind === "output" ? " out" : "") + (doc.pinned ? " pinned" : "");
      Object.assign(tab, { role: "tab", tabIndex: 0, draggable: true, title: doc.name + "\n" + T(sourceOf(doc)) + "\n" + T("Bấm tên tab đang mở / chuột phải: đổi tên, ghim, đóng…") });
      tab.dataset.id = doc.id;
      tab.setAttribute("aria-selected", doc.id === g.active);
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = ICON[doc.kind] + " " + doc.name + (doc.kind === "output" && doc.edited ? " ✎" : "") + (Docs.root(doc).diskChanged ? " ⚠" : "");
      if (Docs.root(doc).diskChanged) tab.title += "\n⚠ " + T("File đã bị sửa bên ngoài — chuột phải → “Đọc lại từ đĩa / so sánh…”");
      const x = document.createElement("button");
      x.className = "x";
      x.textContent = Docs.root(doc).dirty ? "●" : "×";
      x.title = T("Đóng (Alt+W)");
      const pin = document.createElement("button");
      Object.assign(pin, { className: "pin", textContent: "📌", title: doc.pinned ? T("Bỏ ghim tab") : T("Ghim tab (Ctrl+K Shift+Enter)") });
      pin.setAttribute("aria-pressed", doc.pinned);
      tab.append(name, pin, x);
      return tab;
    }));
    strip.querySelector(".tab.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    syncs.get(g.i)?.();
  }

  // Where a dragged tab lands on the tab bar under x → { at (among the other tabs), el, after } for the insert mark; null off the bar.
  let dragId = null;
  function dropAt(target, x) {
    const strip = target.closest?.(".gbar")?.querySelector(".tabs");
    if (!strip) return null;
    const tabs = [...strip.querySelectorAll(".tab")].filter(t => t.dataset.id !== dragId);
    const k = tabs.findIndex(t => { const r = t.getBoundingClientRect(); return x < r.left + r.width / 2; });
    return k < 0 ? { at: tabs.length, el: tabs.at(-1), after: true } : { at: k, el: tabs[k], after: false };
  }

  // Too many tabs: the wheel scrolls the strip sideways, ‹ › at both ends show only while it overflows (disabled at an end).
  function scroller(strip) {
    let aim = null;
    // Clicks during a smooth scroll add up from where it is heading, not from where it is now.
    const step = dir => {
      const max = strip.scrollWidth - strip.clientWidth;
      aim = Math.min(max, Math.max(0, (aim ?? strip.scrollLeft) + dir * Math.max(120, strip.clientWidth * 0.8)));
      strip.scrollTo({ left: aim, behavior: "smooth" });
    };
    strip.addEventListener("scrollend", () => { aim = null; });
    const btn = (cls, txt, tip, dir) => {
      const b = Object.assign(document.createElement("button"), { className: "tscroll " + cls, textContent: txt, title: T(tip), hidden: true, tabIndex: -1 });
      b.onclick = () => step(dir);
      return b;
    };
    const prev = btn("tprev", "‹", "Cuộn tab sang trái (hoặc lăn chuột trên thanh tab)", -1), next = btn("tnext", "›", "Cuộn tab sang phải (hoặc lăn chuột trên thanh tab)", 1);
    strip.before(prev);
    strip.after(next);
    const sync = () => {
      const max = strip.scrollWidth - strip.clientWidth, over = max > 1;
      prev.hidden = next.hidden = !over;
      prev.disabled = strip.scrollLeft <= 0;
      next.disabled = strip.scrollLeft >= max - 1;
    };
    strip.addEventListener("scroll", sync, { passive: true });
    strip.addEventListener("wheel", e => {
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : 0;
      if (!d || strip.scrollWidth <= strip.clientWidth) return;
      e.preventDefault();
      aim = null;
      strip.scrollLeft += d * (e.deltaMode === 1 ? 16 : 1);
    }, { passive: false });
    new ResizeObserver(sync).observe(strip);
    return sync;
  }
  const syncs = new Map();

  const save = (doc, raw) => { const name = ShareState.cleanName(raw ?? ""); if (name && name !== doc.name && Docs.get(doc.id)) Docs.rename(doc, name); };
  const label = doc => doc.kind === "file" ? T("Tên tab (không đổi tên file trên đĩa):") : T("Tên mới:");

  // In place when the tab is on screen (Enter / leaving the box saves, Esc cancels); a note that is not open falls back to a prompt.
  function rename(doc) {
    if (editing) return;
    const tab = [...document.querySelectorAll(".tabs .tab")].find(t => t.dataset.id === doc.id && t.offsetParent);
    if (!tab) { save(doc, prompt(label(doc), doc.name)); return; }
    const input = document.createElement("input");
    Object.assign(input, { className: "tab-rename", value: doc.name, size: Math.min(Math.max(doc.name.length + 2, 8), 40), spellcheck: false });
    input.setAttribute("aria-label", label(doc));
    let done = false;
    const finish = (keep, refocus) => {
      if (done) return;
      done = true;
      editing = null;
      if (keep) save(doc, input.value);
      Views.groups.forEach(render);
      if (refocus && Views.activeDoc()) Views.activeView().focus();
    };
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); finish(e.key === "Enter", true); }
    });
    input.addEventListener("blur", () => finish(true, false));
    editing = doc.id;
    tab.draggable = false;
    tab.querySelector(".name").replaceWith(input);
    input.focus();
    input.select();
  }

  function init() {
    for (const g of Views.groups) {
      const strip = g.el.querySelector(".tabs"), idOf = e => e.target.closest(".tab-rename") ? null : e.target.closest(".tab")?.dataset.id;
      syncs.set(g.i, scroller(strip));
      strip.addEventListener("click", e => {
        const id = idOf(e);
        if (!id) return;
        if (e.target.closest(".x")) Views.close(id);
        else if (e.target.closest(".pin")) Views.togglePin(Docs.get(id));
        else if (id === g.active && Views.focused === g.i && e.target.closest(".name")) rename(Docs.get(id));
        else Views.activate(g.i, id);
      });
      strip.addEventListener("dblclick", e => { const d = !e.target.closest(".pin") && Docs.get(idOf(e)); if (d) rename(d); });
      strip.addEventListener("auxclick", e => { if (e.button === 1 && idOf(e)) { e.preventDefault(); Views.close(idOf(e)); } });
      strip.addEventListener("contextmenu", e => {
        if (e.target.closest(".tab-rename")) return;
        const tab = e.target.closest(".tab");
        if (!tab && !g.active) return;
        e.preventDefault();
        const r = (tab || strip).getBoundingClientRect(), byKey = !e.clientX && !e.clientY;
        TabMenu.open(g.i, tab?.dataset.id || g.active, byKey ? r.left : e.clientX, byKey ? r.bottom : e.clientY);
      });
      strip.addEventListener("keydown", e => {
        const id = !e.target.closest("button") && idOf(e);
        if (!id) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Views.activate(g.i, id); }
        else if (e.key === "Delete") Views.close(id);
      });
      strip.addEventListener("dragstart", e => {
        const id = idOf(e);
        if (!id) return;
        dragId = id;
        e.dataTransfer.setData(TAB_TYPE, id);
        e.dataTransfer.effectAllowed = "move";
      });
      strip.addEventListener("dragend", () => { dragId = null; });
      g.el.querySelector(".gnew").onclick = () => Actions.newNote(g.i);
      g.el.querySelector(".gmove").onclick = () => Actions.moveTab(g.i);
    }
  }

  return { init, render, rename, sourceOf, dropAt, TAB_TYPE, ICON };
})();
