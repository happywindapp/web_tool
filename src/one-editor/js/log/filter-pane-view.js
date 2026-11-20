// Filter pane: pattern box + regex / case / exclude / context controls in the pane bar; matched lines (context lines faded) — click ⇒ the source line. Text nodes only.
const PvFilter = {
  create(p) {
    const SHOW = 5000, mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const input = Object.assign(mk("input", "dq-input"), { type: "text", spellcheck: false, autocomplete: "off" }), go = Object.assign(mk("button"), { type: "button" });
    const box = cls => { const l = mk("label", "chk"), c = Object.assign(mk("input"), { type: "checkbox" }), t = mk("span"); l.append(c, t); return { l, c, t }; };
    const rx = box(), cs = box(), inv = box(), ctx = mk("select");
    ctx.append(...[0, 1, 2, 3, 5, 10].map(n => Object.assign(mk("option"), { value: n, textContent: "±" + n })));
    const v = { el: mk("div", "pv-filter"), tools: [input, rx.l, cs.l, inv.l, ctx, go], last: null };

    function run() {
      const src = Docs.get(v.last?.srcId);
      if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
      const s = LineFilter.state(src.id);
      Object.assign(s, { q: input.value, regex: rx.c.checked, cs: cs.c.checked, invert: inv.c.checked, ctx: +ctx.value });
      try { LineFilter.filter("", s); LineFilter.save(s); } catch { /* a broken regex is shown by the run, not remembered */ }
      OutputLink.run(src, "filter");
    }
    go.onclick = run;
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); run(); } });
    [rx.c, cs.c, inv.c, ctx].forEach(x => { x.onchange = run; });

    v.labels = () => {
      go.textContent = T("▶ Lọc"); go.title = T("Lọc lại tab nguồn (Enter)");
      input.placeholder = T("chuỗi hoặc regex, vd ERROR|WARN");
      rx.t.textContent = "Regex"; cs.t.textContent = "Aa"; cs.l.title = T("Phân biệt hoa / thường");
      inv.t.textContent = T("Loại"); inv.l.title = T("Bỏ các dòng khớp, giữ phần còn lại");
      ctx.title = T("Số dòng ngữ cảnh trước / sau mỗi dòng khớp");
      if (v.last) p.type.textContent = T("Lọc dòng · {hits} / {total} dòng khớp", { hits: I18n.num(v.last.hits), total: I18n.num(v.last.total) });
    };
    v.show = d => {
      v.last = d;
      if (document.activeElement !== input) input.value = d.s.q;
      Object.assign(rx.c, { checked: d.s.regex }); Object.assign(cs.c, { checked: d.s.cs }); Object.assign(inv.c, { checked: d.s.invert }); ctx.value = d.s.ctx; ctx.disabled = d.s.invert;
      const list = mk("div", "lf-list");
      for (const r of d.rows.slice(0, SHOW)) {
        if (r.gap) { list.append(mk("div", "lf-gap", "⋯")); continue; }
        const row = mk("div", r.hit ? "lf-row" : "lf-row lf-ctx");
        row.append(mk("span", "lf-n", String(r.n)), mk("span", "lf-t", r.t));
        row.onclick = () => { const src = Docs.get(d.srcId); if (src) { Views.revealLine(src, r.n); PhoneLayout.show(Views.where(src.id) + 1); } };
        list.append(row);
      }
      if (d.rows.length > SHOW) list.append(mk("div", "rp-none", T("Chỉ hiện {n} dòng đầu — đủ kết quả nằm trong text của tab.", { n: I18n.num(SHOW) })));
      v.el.replaceChildren(d.rows.length ? list : mk("div", "rp-none", T("Không có dòng nào khớp.")));
      v.labels();
      return true;
    };
    return v;
  },
};
