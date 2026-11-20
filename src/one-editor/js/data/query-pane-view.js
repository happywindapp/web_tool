// Query pane: JSONPath / XPath box in the pane bar, results as rows (path · value · line) — click a row ⇒ its source line. Text nodes only.
const PvQuery = {
  create(p) {
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const input = Object.assign(mk("input", "dq-input"), { type: "text", spellcheck: false, autocomplete: "off" }), go = Object.assign(mk("button"), { type: "button" });
    const v = { el: mk("div", "pv-query"), tools: [input, go], last: null };
    const run = () => {
      const src = Docs.get(v.last?.srcId);
      if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
      DataOps.state(src.id).q = input.value;
      OutputLink.run(src, "query");
    };
    go.onclick = run;
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); run(); } });

    v.labels = () => {
      go.textContent = T("▶ Truy vấn");
      go.title = T("Chạy lại truy vấn trên tab nguồn (Enter)");
      const json = !v.last || v.last.lang === "JSONPath";
      input.placeholder = json ? "$..price · $.items[?(@.qty > 10)].id" : "//item[@id='2']/name · count(//item)";
      input.title = json ? T("JSONPath: $ . .. * [n] [a,b] [s:e] ['k'] [?(@.x == 1 && @.y =~ /re/)]") : T("XPath 1.0 của trình duyệt; namespace mặc định dùng //*[local-name()='item']");
      if (v.last) p.type.textContent = T("{lang} · {n} kết quả", { lang: v.last.lang, n: I18n.num(v.last.count) });
    };
    v.show = d => {
      v.last = d;
      // A live re-run keeps what the user is typing; a new query (run, demo, F5) fills the box.
      if (d.q !== v.lastQ) { input.value = d.q; v.lastQ = d.q; }
      const table = mk("table");
      for (const [i, r] of d.rows.entries()) {
        const tr = mk("tr"), val = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
        tr.append(mk("td", "dq-n", String(i + 1)), mk("td", "dq-path", r.path), mk("td", "dq-val", val.length > 300 ? val.slice(0, 300) + "…" : val), mk("td", "dq-line", r.line ? T("dòng {n}", { n: r.line }) : ""));
        if (r.line) tr.onclick = () => { const src = Docs.get(d.srcId); if (src) { Views.revealLine(src, r.line); PhoneLayout.show(Views.where(src.id) + 1); } };
        table.append(tr);
      }
      v.el.replaceChildren(d.rows.length ? table : mk("div", "rp-none", T("Không có kết quả.")));
      v.labels();
      return true;
    };
    return v;
  },
};
