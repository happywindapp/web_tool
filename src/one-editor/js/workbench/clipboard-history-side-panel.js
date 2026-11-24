// Clipboard history side panel (📋): copy / cut in the editor and One Editor's ⧉ buttons, kept in memory (📌 pins in IndexedDB, all of it only with ⚙ clipKeep); click inserts at the cursor. Locked notes never enter it.
const ClipHistory = (() => {
  const L = SidePanelList, el = L.el, box = $("cbList"), filter = $("cbFilter");
  let items = [], warned = false;
  const keep = () => Prefs.get("clipKeep", false) === true;
  const fail = e => console.warn("One Editor clipboard history:", e);

  const persist = Dom.debounce(() => {
    NotesDb.putMeta("clipPins", items.filter(x => x.pin)).catch(fail);
    if (keep()) NotesDb.putMeta("clipHistory", items.filter(x => !x.pin)).catch(fail);
  }, 300);
  const changed = () => { persist(); render(); };

  // doc: where the text came from (default: the active tab).
  function add(text, doc = Views.activeDoc()) {
    const d = doc && Docs.root(doc);
    if (d && (d.crypt || d.sealed)) return;
    const r = ClipList.add(items, text, d ? d.name : "One Editor");
    if (r.skipped === "big" && !warned) { warned = true; StatusBar.msg(T("Đoạn chép lớn hơn 256 KB — không lưu vào lịch sử clipboard."), "warn"); }
    if (r.skipped) return;
    items = r.items;
    changed();
  }

  // Same text CM puts on the clipboard: the selected ranges joined by newlines, or whole lines when nothing is selected.
  function grab(e, view) {
    const st = view.state, rs = st.selection.ranges, sel = rs.filter(r => !r.empty), g = Views.groups.find(x => x.view === view);
    add(sel.length ? sel.map(r => st.sliceDoc(r.from, r.to)).join("\n") : rs.map(r => st.doc.lineAt(r.head).text).join("\n") + "\n", g && Docs.get(g.active));
    return false;
  }
  const extension = () => CM.view.EditorView.domEventHandlers({ copy: grab, cut: grab });

  function insert(it) {
    const d = Views.activeDoc(), v = d && Views.activeView();
    if (!v || Docs.isList(d)) { StatusBar.msg(T("Chưa có tab nào đang chọn."), "warn"); return; }
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return; }
    v.dispatch(v.state.replaceSelection(it.text), { userEvent: "input", scrollIntoView: true });
    v.focus();
    PhoneLayout.show(Views.focused + 1);
  }

  const set = next => { items = next; changed(); };
  const ago = t => new Date(t).toLocaleTimeString(I18n.lang, { hour: "2-digit", minute: "2-digit" });

  function row(it) {
    const pin = L.act("📌", T(it.pin ? "Bỏ ghim" : "Ghim — giữ qua F5 (lưu trong trình duyệt này)"), () => set(ClipList.pin(items, it.id, !it.pin)));
    pin.setAttribute("aria-pressed", String(it.pin));
    return L.row([el("span", "cb-text", ClipList.preview(it.text)), el("small", "cb-meta", ago(it.t) + " · " + it.src + " · " + T("{n} ký tự", { n: I18n.num(it.text.length) }))],
      { title: it.text.slice(0, 500), cls: "cb-item" + (it.pin ? " cb-pin" : ""), onclick: () => insert(it),
        acts: [L.act("⧉", T("Chép lại vào clipboard"), () => Dom.copy(it.text)), pin, L.act("✕", T("Xoá khỏi lịch sử"), () => set(ClipList.remove(items, it.id)))] });
  }

  function render() {
    if (!L.visible("clipboard")) return;
    const q = filter.value.trim().toLowerCase(), list = ClipList.order(items).filter(x => !q || x.text.toLowerCase().includes(q) || x.src.toLowerCase().includes(q));
    box.replaceChildren(...(list.length ? list.map(row) : [L.empty(items.length ? T("Không có mục khớp.") : T("Chưa có gì. Chép (Ctrl+C) hoặc cắt trong editor, hay bấm ⧉ ở One Editor — mặc định chỉ giữ trong bộ nhớ, F5 là mất (trừ mục 📌)."))]));
  }

  function pick() {
    if (!items.length) { StatusBar.msg(T("Lịch sử clipboard đang trống."), "warn"); return; }
    QuickPick.pick(ClipList.order(items).map(x => ({ label: (x.pin ? "📌 " : "") + ClipList.preview(x.text, 1, 80), detail: ago(x.t) + " · " + x.src, run: () => insert(x) })), T("Dán từ lịch sử clipboard"));
  }

  async function load() {
    const pins = ClipList.clean(await NotesDb.getMeta("clipPins").catch(() => null), true);
    const rest = keep() ? ClipList.clean(await NotesDb.getMeta("clipHistory").catch(() => null)) : [];
    items = ClipList.clean([...items, ...pins, ...rest].filter((x, i, a) => a.findIndex(y => y.text === x.text) === i));
    render();
  }

  // ⚙ "Remember across F5": off deletes the stored copy at once.
  function setKeep(v) {
    Prefs.set("clipKeep", !!v);
    if (v) persist(); else NotesDb.delMeta("clipHistory").catch(fail);
  }

  function init() {
    const copy = Dom.copy;
    const page = location.href.split(/[?#]/)[0] + "#";
    Dom.copy = text => { if (!String(text).startsWith(page)) add(text); return copy(text); };
    filter.addEventListener("input", L.later("clipboard", render, 150));
    $("cbClear").onclick = () => set(ClipList.clearUnpinned(items));
    I18n.onChange(render);
    SidePanels.register("clipboard", { show: (a, quiet) => { render(); if (!quiet && !L.coarse()) filter.focus(); } });
  }

  return { init, load, add, extension, pick, setKeep, keep };
})();
