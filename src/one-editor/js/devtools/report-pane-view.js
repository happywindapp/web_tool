// Pane body of the dev tool reports (JWT, URL): warning, tables and JSON blocks from DevReport.build — text nodes only, redrawn when the UI language changes.
const PvReport = {
  create(p) {
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const copy = mk("button");
    copy.type = "button";
    const v = { el: mk("div", "pv-report"), tools: [copy], last: null };
    copy.onclick = async () => {
      const d = Docs.get(p.doc), ok = !!d && await Dom.copy(Docs.text(d));
      StatusBar.msg(ok ? T("✔ Đã chép JSON.") : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
    };

    function table(s) {
      const tb = mk("table");
      if (s.head) { const tr = mk("tr"); s.head.forEach(h => tr.append(mk("th", "", h))); tb.append(tr); }
      for (const r of s.rows) { const tr = mk("tr", r.s); r.c.forEach((x, i) => tr.append(mk(i || s.head ? "td" : "th", "", x))); tb.append(tr); }
      return tb;
    }

    function render() {
      const r = DevReport.build(v.last), parts = [];
      p.type.textContent = r.title;
      if (r.warn) parts.push(mk("div", "rp-warn", "⚠ " + r.warn));
      for (const s of r.sections) {
        const sec = mk("section");
        sec.append(mk("h4", "", s.title));
        if (s.rows) sec.append(s.rows.length ? table(s) : mk("div", "rp-none", T("(không có)")));
        if (s.code != null) sec.append(mk("pre", "rp-code", s.code));
        parts.push(sec);
      }
      v.el.replaceChildren(...parts);
    }

    v.labels = () => {
      copy.textContent = T("⧉ Chép JSON");
      copy.title = T("Chép nội dung tab (JSON) vào clipboard");
      if (v.last) render();
    };
    v.show = d => {
      if (d.empty) { v.last = null; v.el.replaceChildren(); return false; }
      v.last = d;
      render();
      return true;
    };
    return v;
  },
};
