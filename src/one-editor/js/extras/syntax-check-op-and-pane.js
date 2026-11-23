// "syntax-check" op + pane: one row per syntax error (line:col, message, the source line) from CodeLint — click selects it in the source tab.
const SyntaxCheckOp = {
  async run(t, c) {
    const r = await CodeLint.check(t, c.lang);
    const lines = r.items.map(x => x.line + ":" + x.col + "\t" + (x.sev === "error" ? T("lỗi") : T("cảnh báo")) + "\t" + x.msg);
    const head = r.items.length ? T("{n} lỗi cú pháp · {lang} · {engine}", { n: I18n.num(r.items.length), lang: c.lang, engine: r.engine }) : T("✔ Không thấy lỗi cú pháp · {lang} · {engine}", { lang: c.lang, engine: r.engine });
    return { text: [head, ...lines].join("\n") + "\n", view: { kind: "syntax", srcId: c.id, lang: c.lang, ...r }, notes: [head + ".", T("Chỉ kiểm cú pháp, không chạy code: không bắt lỗi kiểu dữ liệu hay biến chưa khai báo.")] };
  },
};

const PvSyntax = {
  create(p) {
    const SHOW = 1000, { mk } = PowerUi;
    const v = { el: mk("div", "pv-invisible"), tools: [], last: null };

    function render() {
      const d = v.last, src = Docs.get(d.srcId), text = src ? Docs.text(src) : "";
      p.type.textContent = T("Kiểm cú pháp · {lang} · {engine} · {n}", { lang: d.lang, engine: d.engine, n: I18n.num(d.items.length) });
      const note = mk("div", "rp-none", T("Chỉ kiểm cú pháp, không chạy code: không bắt lỗi kiểu dữ liệu hay biến chưa khai báo."));
      if (!d.items.length) { v.el.replaceChildren(mk("div", "rp-none", T("✔ Không thấy lỗi cú pháp.")), note); return; }
      const list = mk("div", "iv-list");
      for (const x of d.items.slice(0, SHOW)) {
        const row = mk("div", "iv-row"), end = text.indexOf("\n", x.from - x.col + 1);
        const line = text.slice(x.from - x.col + 1, end < 0 ? text.length : end).trim();
        row.append(mk("span", "lf-n", x.line + ":" + x.col), mk("code", "", x.sev === "error" ? "✖" : "⚠"), mk("span", "iv-name", x.msg), mk("span", "iv-ctx", line.length > 80 ? line.slice(0, 80) + "…" : line));
        row.title = T("Bấm để chọn chỗ lỗi ở tab nguồn");
        row.onclick = () => PowerUi.select(src, x.from, x.to);
        list.append(row);
      }
      if (d.items.length > SHOW) list.append(mk("div", "rp-none", T("Chỉ hiện {n} lỗi đầu.", { n: I18n.num(SHOW) })));
      v.el.replaceChildren(list, note);
    }

    v.labels = () => { if (v.last) render(); };
    v.show = d => { v.last = d; render(); return true; };
    return v;
  },
};
