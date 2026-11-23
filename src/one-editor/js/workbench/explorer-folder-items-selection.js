// Multi-selection for list tabs (folder tab, recycle bin): Ctrl / Shift+click, check boxes, Ctrl+A, Ctrl+Space, Shift+arrows; on touch a check box starts a selection mode with an action bar. Rows carry dataset.key; t.sel = selected keys, t.selName = focused key.
const FolderSel = (() => {
  const coarse = () => matchMedia("(pointer:coarse)").matches;
  const rows = t => [...t.ui.list.querySelectorAll(".fi-row")];
  const keysOf = t => rows(t).map(r => r.dataset.key);
  // Selected keys in view order: rows hidden by a quick filter are left out.
  const keys = t => keysOf(t).filter(k => t.sel.has(k));

  function init(t, list = []) { t.sel = new Set(list); t.anchor = list[0] ?? null; t.selMode = false; }

  function count(t) {
    const shown = rows(t).length, picked = keys(t), total = t.total ?? shown;
    const parts = [total > shown ? T("{shown} / {total} mục", { shown, total }) : T("{n} mục", { n: shown })];
    if (picked.length) {
      const sizes = picked.map(k => t.sizeOf?.(k)).filter(s => s != null);
      parts.push(T("{n} đã chọn", { n: picked.length }) + (sizes.length ? " · " + FolderFmt.size(sizes.reduce((a, b) => a + b, 0)) : ""));
    }
    t.ui.count.textContent = parts.join(" · ");
  }

  function paintBar(t) {
    const b = t.ui.selbar;
    if (!b) return;
    b.hidden = !(t.selMode && t.sel.size);
    if (b.hidden) return;
    const mk = (text, title, run) => { const x = document.createElement("button"); Object.assign(x, { type: "button", textContent: text, title, onclick: run }); return x; };
    const n = Object.assign(document.createElement("span"), { className: "fi-selcount", textContent: T("{n} đã chọn", { n: keys(t).length }) });
    b.replaceChildren(n, ...(t.barActions?.() || []).map(([text, title, run]) => mk(text, title, run)),
      mk("☑", T("Chọn hết"), () => set(t, keysOf(t))), mk("✕", T("Thoát chế độ chọn"), () => clear(t)));
  }

  function sync(t) {
    for (const r of rows(t)) { const on = t.sel.has(r.dataset.key); r.classList.toggle("on", on); r.setAttribute("aria-pressed", on); }
    count(t);
    paintBar(t);
    t.onSel?.();
  }

  function set(t, list, anchor = t.anchor) {
    t.sel = new Set(list);
    t.anchor = anchor;
    if (!t.sel.size) t.selMode = false;
    sync(t);
  }
  const clear = t => { t.selMode = false; set(t, []); };
  const single = (t, r) => set(t, [r.dataset.key], r.dataset.key);
  function toggle(t, r) {
    const k = r.dataset.key, s = new Set(t.sel);
    if (s.has(k)) s.delete(k); else s.add(k);
    set(t, [...s], k);
  }
  const extend = (t, r) => set(t, NameMatch.range(keysOf(t), t.anchor, r.dataset.key), t.anchor ?? r.dataset.key);

  // → true when the click only changed the selection (a touch tap must not open the item then).
  function click(t, r, e) {
    if (e.target.closest?.(".fi-chk")) { if (e.pointerType === "touch" || coarse()) t.selMode = true; toggle(t, r); return true; }
    if (t.selMode) { toggle(t, r); return true; }
    if (e.shiftKey) { extend(t, r); return true; }
    if (e.ctrlKey || e.metaKey) { toggle(t, r); return true; }
    single(t, r);
    return false;
  }

  // Keyboard focus moved to r: Shift extends from the anchor, otherwise it selects r alone.
  const moved = (t, r, e) => (e.shiftKey ? extend(t, r) : single(t, r));
  // Focus by keyboard with nothing selected selects the row; focus from a press leaves it to click() (else Ctrl+click would select, then unselect).
  function focusin(t, r) {
    t.selName = r.dataset.key;
    if (!t.sel.size && !t.ptr) single(t, r);
    t.ptr = false;
  }
  function wire(t) {
    const list = t.ui.list;
    list.addEventListener("pointerdown", () => { t.ptr = true; }, true);
    list.addEventListener("focusin", e => { const r = e.target.closest(".fi-row"); if (r) focusin(t, r); });
    list.addEventListener("click", e => { t.ptr = false; if (e.target === list) clear(t); });
  }

  function hotkey(t, e) {
    const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey, r = document.activeElement?.closest?.(".fi-row");
    if (ctrl && e.key.toLowerCase() === "a") { set(t, keysOf(t)); return true; }
    if (ctrl && e.key === " " && r && t.ui.list.contains(r)) { toggle(t, r); return true; }
    return false;
  }

  // Check boxes: the View menu option, always on touch screens (no Ctrl / Shift there).
  const showChecks = () => FolderView.checks() || coarse();
  // Drop keys whose item is gone (deleted, renamed) so they neither stay selected nor come back on a new item of that name.
  function prune(t, has) {
    const kept = [...t.sel].filter(has);
    if (kept.length !== t.sel.size) { t.sel = new Set(kept); if (!has(t.anchor)) t.anchor = kept[0] ?? null; }
  }
  return { init, wire, prune, sync, count, set, clear, single, click, moved, hotkey, keys, showChecks };
})();
