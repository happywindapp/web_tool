// Annotations: one note per message (timeline marker, CSV/JSON, share links). Saved analyses: text + options + filters + notes + chain + layout in localStorage.
const Notes = (() => {
  let notes = {};
  const get = i => notes[i] || "";
  const set = (i, text) => { if (text.trim()) notes[i] = text; else delete notes[i]; };
  // Payload values are untrusted: only "index → string" pairs are kept.
  function load(obj) {
    notes = {};
    if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) if (/^\d+$/.test(k) && typeof v === "string" && v.trim()) notes[k] = v.slice(0, 2000);
  }
  return { get, set, load, all: () => ({ ...notes }), count: () => Object.keys(notes).length };
})();

const Saved = (() => {
  const KEY = "analyses", MAX = 30;
  let deps = null, current = null;
  const list = () => (Store.get(KEY, []) || []).filter(a => a && typeof a.id === "string" && typeof a.name === "string" && a.payload && typeof a.payload.text === "string");

  function fill() {
    const items = list(), esc = Dom.esc;
    $("saved").innerHTML = `<option value="">${esc(T("📂 Phân tích đã lưu ({n})", { n: items.length }))}</option>` +
      items.map(a => `<option value="${esc(a.id)}">${esc(`${a.name} · ${new Date(a.t).toLocaleString(I18n.lang)}`)}</option>`).join("");
    $("delSaved").hidden = !current;
  }

  function save() {
    const p = deps.snapshot();
    if (!p.text.trim()) return LinkIO.note(T("Chưa có dữ liệu để lưu."), "bad");
    const name = prompt(T("Tên phân tích (lưu trong trình duyệt này):"), current ? current.name : deps.suggestName());
    if (!name || !name.trim()) return;
    const id = current && current.name === name.trim() ? current.id : Date.now().toString(36);
    const entry = { id, name: name.trim().slice(0, 80), t: Date.now(), payload: p };
    if (!Store.set(KEY, [entry, ...list().filter(a => a.id !== id)].slice(0, MAX)))
      return LinkIO.note(T("✖ Không lưu được — bộ nhớ trình duyệt đầy hoặc bị chặn."), "bad");
    current = entry;
    fill();
    LinkIO.note(T("✔ Đã lưu phân tích “{name}”.", { name: entry.name }), "good");
  }

  function open(id) {
    const a = list().find(x => x.id === id);
    if (!a) return;
    LinkIO.keep();
    deps.open(a.payload);
    current = a;
    fill();
    LinkIO.note(T("Đã mở phân tích “{name}”.", { name: a.name }));
  }

  function remove() {
    if (!current || !confirm(T("Xoá phân tích “{name}” khỏi trình duyệt?", { name: current.name }))) return;
    Store.set(KEY, list().filter(a => a.id !== current.id));
    current = null;
    fill();
  }

  // deps: { snapshot(), open(payload), suggestName() }
  function init(d) {
    deps = d;
    fill();
    $("saved").onchange = e => { const v = e.target.value; e.target.value = ""; if (v) open(v); };
    $("saveBtn").onclick = save;
    $("delSaved").onclick = remove;
  }

  return { init, fill, forget: () => { current = null; fill(); } };
})();
