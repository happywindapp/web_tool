// Bảng ghi chú chung dưới lịch tháng (không theo ngày): thêm / sửa / xóa, lưu localStorage, không vào link chia sẻ.
const NoteBoard = (() => {
  const MAX = 500;
  let o, notes = [], editing = null;
  const esc = s => Dom.esc(s);
  const clean = t => String(t || "").trim().slice(0, MAX);

  // Stored data is untrusted: keep only well-formed notes.
  function load() {
    const raw = o.store.get("notes", []);
    notes = Array.isArray(raw) ? raw.filter(n => n && typeof n.id === "string" && typeof n.text === "string").map(n => ({ id: n.id, text: clean(n.text), at: +n.at || 0 })) : [];
  }
  const save = () => { o.store.set("notes", notes); render(); };

  function item(n) {
    if (editing && editing.id === n.id) return `<li class="edit" data-id="${esc(n.id)}"><textarea class="nb-edit-text" rows="3" maxlength="${MAX}">${esc(editing.text)}</textarea>`
      + `<div class="nb-row"><button type="button" class="main" data-nb-save>${esc(T("Lưu"))}</button><button type="button" data-nb-cancel>${esc(T("Hủy"))}</button></div></li>`;
    return `<li data-id="${esc(n.id)}"><div class="nb-text">${esc(n.text)}</div><span class="nb-act">`
      + `<button type="button" data-nb-edit title="${esc(T("Sửa ghi chú"))}">✎</button><button type="button" data-nb-del title="${esc(T("Xóa ghi chú"))}">🗑</button></span></li>`;
  }

  // Newest first.
  function render() {
    const list = [...notes].sort((a, b) => b.at - a.at);
    $("nbList").innerHTML = list.length ? list.map(item).join("") : `<li class="muted empty">${esc(T("Chưa có ghi chú nào."))}</li>`;
  }

  function add(e) {
    e.preventDefault();
    const text = clean($("nbText").value);
    if (!text) { $("nbText").focus(); return; }
    notes.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, at: Date.now() });
    $("nbText").value = "";
    save();
  }

  function onList(e) {
    const li = e.target.closest("li[data-id]"), n = li && notes.find(x => x.id === li.dataset.id);
    if (!n) return;
    if (e.target.closest("[data-nb-edit]")) { editing = { id: n.id, text: n.text }; render(); $("nbList").querySelector(".nb-edit-text")?.focus(); }
    else if (e.target.closest("[data-nb-del]")) { if (confirm(T("Xóa ghi chú này?"))) { notes = notes.filter(x => x !== n); save(); } }
    else if (e.target.closest("[data-nb-cancel]")) { editing = null; render(); }
    else if (e.target.closest("[data-nb-save]")) {
      const text = clean(li.querySelector(".nb-edit-text").value);
      if (!text) return li.querySelector(".nb-edit-text").focus();
      Object.assign(n, { text, at: Date.now() });
      editing = null; save();
    }
  }

  // opts: { store }
  function init(opts) {
    o = opts;
    load();
    $("nbForm").onsubmit = add;
    $("nbText").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add(e); };
    $("nbList").addEventListener("click", onList);
    render();
  }

  return { init, render };
})();
