// Tab registry: lazy init on first open, ?tab= deep link, Ctrl+Enter → active tab's primary action, file drop → active tab, language switch → relang().
const Workbench = (() => {
  const tabs = {}, sendSelects = [];
  let active = "";

  // def: { label, init(), primary?(), receive?(text, meta), onFile?(file), demo?(name), relang?() }
  const register = (id, def) => { tabs[id] = { ...def, ready: false }; };

  function show(id) {
    if (!Object.hasOwn(tabs, id)) id = "format";
    active = id;
    document.querySelectorAll("[data-wb-tab]").forEach(b => b.classList.toggle("on", b.dataset.wbTab === id));
    document.querySelectorAll("[data-wb-panel]").forEach(p => { p.hidden = p.dataset.wbPanel !== id; });
    const t = tabs[id];
    if (!t.ready) { t.ready = true; t.init(); }
    Store.set("tab", id);
    try {
      const u = new URL(location.href);
      u.searchParams.set("tab", id); u.searchParams.delete("demo");
      history.replaceState(null, "", u);
    } catch { /* some browsers refuse replaceState on file:// */ }
  }

  function send(id, text, meta = {}) {
    show(id);
    if (tabs[id].receive) tabs[id].receive(text, meta);
  }

  // Fills a <select> with every other tab that can receive data; getPayload() → { text, kind } | null.
  const fillSendTo = (select, from) => {
    select.innerHTML = `<option value="">${T("Gửi kết quả sang…")}</option>` + Object.entries(tabs)
      .filter(([id, t]) => id !== from && t.receive).map(([id, t]) => `<option value="${id}">${T(t.label)}</option>`).join("");
  };
  function bindSendTo(select, from, getPayload) {
    sendSelects.push([select, from]);
    fillSendTo(select, from);
    select.onchange = () => {
      const id = select.value;
      select.value = "";
      const p = id && getPayload();
      if (p && p.text) send(id, p.text, p);
    };
  }

  function start() {
    I18n.init();
    I18n.onChange(() => {
      sendSelects.forEach(([select, from]) => fillSendTo(select, from));
      Object.values(tabs).forEach(t => { if (t.ready && t.relang) t.relang(); });
    });
    document.querySelectorAll("[data-wb-tab]").forEach(b => { b.onclick = () => show(b.dataset.wbTab); });
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && tabs[active].primary) { e.preventDefault(); tabs[active].primary(); }
    });
    const body = document.body;
    body.addEventListener("dragover", e => { e.preventDefault(); body.classList.add("drop"); });
    body.addEventListener("dragleave", e => { if (!e.relatedTarget) body.classList.remove("drop"); });
    body.addEventListener("drop", e => {
      e.preventDefault(); body.classList.remove("drop");
      const f = e.dataTransfer.files[0];
      if (f && tabs[active].onFile) tabs[active].onFile(f);
    });
    const q = new URLSearchParams(location.search), demo = q.get("demo");
    show(q.get("tab") || (demo ? "format" : Store.get("tab", "format")));
    if (demo && tabs[active].demo) tabs[active].demo(demo);
  }

  return { register, show, send, bindSendTo, start };
})();
