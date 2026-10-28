// Named saves in localStorage (newest first, ≤ 30): 💾 asks a name and saves snapshot() · pick one in the <select> to reopen · 🗑 deletes the open one.
const SavedSessions = ({ select, saveBtn, delBtn, store, key = "saved", snapshot, open, suggestName = () => "", isEmpty = p => !String(p.text || "").trim(), note, keep = () => {} }) => {
  const MAX = 30;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let current = null;
  // Stored entries are only trusted after this shape check; the tool's open() still validates its own payload fields.
  const list = () => (store.get(key, []) || []).filter(a => a && typeof a.id === "string" && typeof a.name === "string" && a.payload && typeof a.payload === "object");

  function fill() {
    const items = list(), head = esc(T("📂 Đã lưu ({n})", { n: items.length }));
    select.innerHTML = `<option value="">${head}</option>` +
      items.map(a => `<option value="${esc(a.id)}">${esc(`${a.name} · ${new Date(a.t).toLocaleString(I18n.lang)}`)}</option>`).join("");
    delBtn.hidden = !current;
  }

  function save() {
    const p = snapshot();
    if (isEmpty(p)) return note(T("Chưa có dữ liệu để lưu."), "bad");
    const name = prompt(T("Tên bản lưu (lưu trong trình duyệt này):"), current ? current.name : suggestName());
    if (!name || !name.trim()) return;
    const id = current && current.name === name.trim() ? current.id : Date.now().toString(36);
    const entry = { id, name: name.trim().slice(0, 80), t: Date.now(), payload: p };
    if (!store.set(key, [entry, ...list().filter(a => a.id !== id)].slice(0, MAX))) return note(T("✖ Không lưu được — bộ nhớ trình duyệt đầy hoặc bị chặn."), "bad");
    current = entry;
    fill();
    note(T("✔ Đã lưu “{name}”.", { name: entry.name }), "good");
  }

  function openId(id) {
    const a = list().find(x => x.id === id);
    if (!a) return;
    keep();
    open(a.payload);
    current = a;
    fill();
    note(T("Đã mở “{name}”.", { name: a.name }), "muted");
  }

  function remove() {
    if (!current || !confirm(T("Xoá “{name}” khỏi trình duyệt?", { name: current.name }))) return;
    store.set(key, list().filter(a => a.id !== current.id));
    current = null;
    fill();
  }

  select.onchange = () => { const v = select.value; select.value = ""; if (v) openId(v); };
  saveBtn.onclick = save;
  delBtn.onclick = remove;
  fill();
  return { fill, forget: () => { current = null; fill(); } };
};
