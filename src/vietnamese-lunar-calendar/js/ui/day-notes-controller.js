// Ghi chú theo ngày: nút 📝 ở thanh Chi tiết ngày + mục ghi chú trên Danh ngôn (thêm / sửa / xóa), dấu 📝 trên ô lịch; lưu localStorage.
const DayNotes = (() => {
  const MAX = 500;
  let o, notes = [], editing = null;
  const esc = s => Dom.esc(s);
  const clean = t => String(t || "").trim().slice(0, MAX);

  function load() {
    const raw = o.store.get("dayNotes", []);
    notes = Array.isArray(raw) ? raw.filter(n => n && typeof n.id === "string" && typeof n.text === "string" && Number.isInteger(n.jd))
      .map(n => ({ id: n.id, jd: n.jd, text: clean(n.text), at: +n.at || 0 })) : [];
  }
  const save = () => { o.store.set("dayNotes", notes); editing = null; o.onChange(); };
  const editor = text => `<li class="edit"><textarea class="dn-text" rows="3" maxlength="${MAX}" placeholder="${esc(T("Ghi chú cho ngày này…"))}">${esc(text)}</textarea>`
    + `<div class="nb-row"><button type="button" class="main" data-dn-save>${esc(T("Lưu"))}</button><button type="button" data-dn-cancel>${esc(T("Hủy"))}</button></div></li>`;

  // Section shown above the quote when the day has notes or one is being written.
  function section(jd) {
    const mine = notes.filter(n => n.jd === jd).sort((a, b) => a.at - b.at), open = editing && editing.jd === jd;
    if (!mine.length && !open) return "";
    const items = mine.map(n => open && editing.id === n.id ? editor(editing.text)
      : `<li data-id="${esc(n.id)}"><div class="nb-text">${esc(n.text)}</div><span class="nb-act"><button type="button" data-dn-edit title="${esc(T("Sửa ghi chú"))}">✎</button>`
        + `<button type="button" data-dn-del title="${esc(T("Xóa ghi chú"))}">🗑</button></span></li>`);
    if (open && editing.id === null) items.push(editor(editing.text));
    return `<section class="day-notes"><div class="wx-head"><h3>${esc(T("📝 Ghi chú ngày này"))}</h3>`
      + `<button type="button" class="wx-more" data-dn-add title="${esc(T("Thêm ghi chú cho ngày này"))}">${esc(T("📝 Thêm"))}</button></div><ul class="nb-list">${items.join("")}</ul></section>`;
  }

  function start(jd, id = null, text = "") {
    editing = { jd, id, text };
    o.onChange();
    $("detail").querySelector(".dn-text")?.focus();
  }

  function onClick(e) {
    const jd = o.sel();
    if (e.target.closest("[data-dn-add]")) return start(jd);
    const li = e.target.closest(".day-notes li"), n = li && notes.find(x => x.id === li.dataset.id);
    if (e.target.closest("[data-dn-edit]") && n) start(jd, n.id, n.text);
    else if (e.target.closest("[data-dn-del]") && n) { if (confirm(T("Xóa ghi chú này?"))) { notes = notes.filter(x => x !== n); save(); } }
    else if (e.target.closest("[data-dn-cancel]")) { editing = null; o.onChange(); }
    else if (e.target.closest("[data-dn-save]")) {
      const text = clean(editing && editing.text);
      if (!text) return $("detail").querySelector(".dn-text")?.focus();
      const old = editing.id && notes.find(x => x.id === editing.id);
      if (old) Object.assign(old, { text, at: old.at });
      else notes.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), jd, text, at: Date.now() });
      save();
    }
  }

  // opts: { store, sel: () => selected jd, onChange: re-render grid + detail }
  function init(opts) {
    o = opts;
    load();
    $("dayNoteBtn").onclick = () => start(o.sel());
    $("detail").addEventListener("click", onClick);
    // Keep the draft across re-renders (weather refresh, language switch).
    $("detail").addEventListener("input", e => { if (editing && e.target.matches(".dn-text")) editing.text = e.target.value; });
  }

  return { init, section, days: () => new Set(notes.map(n => n.jd)) };
})();
