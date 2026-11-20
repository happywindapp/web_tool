// Regex pane: /pattern/ flags + replacement in the bar; source with matches marked, match table (numbered + named groups), replace preview, token explanation. Text nodes only.
const PvRegex = {
  create(p) {
    const { mk } = PowerUi, SHOW_SRC = 100000, SHOW_ROWS = 500;
    const box = (cls, ph) => mk("input", cls, null, { type: "text", spellcheck: false, autocomplete: "off", placeholder: ph });
    const pat = box("dq-input rx-pat", ""), flags = box("rx-flags", "g"), repl = box("rx-repl", "");
    const v = { el: mk("div", "pv-regex"), tools: [pat, flags, repl], last: null };
    const send = Dom.debounce(() => { if (v.last) RegexOp.set(v.last.srcId, { pattern: pat.value, flags: flags.value, replace: repl.value }); }, 300);
    [pat, flags, repl].forEach(x => { x.oninput = send; });

    const section = (title, ...kids) => { const s = mk("section", "rx-sec"); s.append(mk("h4", "", title), ...kids); return s; };
    function source(d) {
      const pre = mk("pre", "rx-src"), t = d.source.slice(0, SHOW_SRC);
      let at = 0;
      d.list.forEach((m, i) => {
        if (m.at >= t.length || m.end <= at) return;
        pre.append(t.slice(at, m.at), mk("mark", i % 2 ? "rx-b" : "rx-a", t.slice(m.at, Math.min(m.end, t.length)) || "∅", { title: "#" + (i + 1) }));
        at = Math.min(m.end, t.length);
      });
      pre.append(t.slice(at) + (d.source.length > SHOW_SRC ? "\n…" : ""));
      return pre;
    }
    function table(d) {
      const tb = mk("table", "rx-tab"), head = mk("tr"), groups = d.list[0]?.groups || [];
      ["#", T("Dòng:cột"), T("Khớp"), ...groups.map(g => g.n + (g.name ? " " + g.name : ""))].forEach(h => head.append(mk("th", "", h)));
      tb.append(head);
      for (const [i, m] of d.list.slice(0, SHOW_ROWS).entries()) {
        const tr = mk("tr"), pos = d.pos(m.at), src = Docs.get(d.srcId);
        tr.append(mk("td", "", String(i + 1)), mk("td", "rx-pos", pos.line + ":" + pos.col), mk("td", "", m.text === "" ? "∅" : m.text), ...m.groups.map(g => mk("td", g.text == null ? "rx-none" : "", g.text ?? "—")));
        tr.onclick = () => src && PowerUi.select(src, m.at, m.end);
        tb.append(tr);
      }
      return tb;
    }
    function explain(d) {
      const ul = mk("ul", "rx-exp");
      for (const e of RegexCore.explain(d.o.pattern)) { const li = mk("li"); li.append(mk("code", "", e.tok), " " + e.desc); ul.append(li); }
      for (const f of d.o.flags) if (RegexCore.FLAGS[f]) { const li = mk("li"); li.append(mk("code", "", f), " " + T(RegexCore.FLAGS[f])); ul.append(li); }
      return ul;
    }

    function render() {
      const d = v.last, n = d.list.length;
      p.type.textContent = d.bad ? T("Regex · lỗi") : T("Regex · {n} khớp", { n: I18n.num(n) + (d.more ? "+" : "") });
      const parts = [mk("div", "rp-warn", T("Cú pháp regex JavaScript (ECMAScript) — khác .NET / Java (có (?i), nhóm nguyên tử, \\A \\Z) và Go RE2 (không có nhìn trước / nhìn sau, không \\1)."))];
      if (d.bad) parts.push(mk("div", "rx-bad", "✖ " + d.bad));
      else if (!d.o.pattern) parts.push(mk("div", "rp-none", T("Gõ regex vào ô trên thanh — tab nguồn là chuỗi thử.")));
      else {
        parts.push(section(T("Chuỗi thử ({n} khớp được tô)", { n: I18n.num(Math.min(n, RegexCore.MAX)) }), source(d)));
        if (n) parts.push(section(T("Các khớp + nhóm bắt"), table(d), ...(n > SHOW_ROWS ? [mk("div", "rp-none", T("Chỉ hiện {n} dòng đầu — đủ kết quả nằm trong text của tab (JSON).", { n: SHOW_ROWS }))] : [])));
        if (d.replaced != null) parts.push(section(T("Xem trước thay thế"), mk("pre", "rx-src", d.replaced.length > SHOW_SRC ? d.replaced.slice(0, SHOW_SRC) + "\n…" : d.replaced)));
      }
      if (d.o.pattern) parts.push(section(T("Giải thích"), explain(d)));
      v.el.replaceChildren(...parts);
    }

    v.labels = () => {
      pat.placeholder = T("regex, vd (?<sym>[A-Z]+)=(\\d+)"); pat.title = T("Mẫu regex (không cần dấu / bao quanh)");
      flags.title = T("Cờ: g i m s u v y d"); repl.placeholder = T("thay bằng… ($1, $<tên>, \\n)"); repl.title = T("Chuỗi thay thế — để trống thì không xem trước thay thế");
      if (v.last) render();
    };
    v.show = d => {
      v.last = d;
      RegexMarks.track(p.doc, d.srcId);
      for (const [x, val] of [[pat, d.o.pattern], [flags, d.o.flags], [repl, d.o.replace]]) if (document.activeElement !== x) x.value = val;
      render();
      return true;
    };
    return v;
  },
};
