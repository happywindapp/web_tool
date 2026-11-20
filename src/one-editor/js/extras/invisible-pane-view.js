// Pane of the "invisible" op: counts per kind with a fix button each, then one row per char (line:col, U+XXXX, name, context) — click selects it in the source.
const PvInvisible = {
  create(p) {
    const SHOW = 2000, { mk, button } = PowerUi;
    const v = { el: mk("div", "pv-invisible"), tools: [], last: null };
    const ACT = { zw: "Xoá", bidi: "Xoá", control: "Xoá", space: "Đổi thành dấu cách", sep: "Đổi thành xuống dòng", look: "Đổi sang chữ Latin" };

    function fix(kind) {
      const src = Docs.get(v.last?.srcId), view = src && PowerUi.viewOf(src);
      if (!view) return;
      PowerUi.edit(src, Invisible.edits(view.state.doc.toString(), kind), T(Invisible.LABELS[kind === "soh" ? "control" : kind]));
    }

    function render() {
      const d = v.last, src = Docs.get(d.srcId), text = src ? Docs.text(src) : "";
      p.type.textContent = T("Ký tự vô hình / lạ · {n}", { n: I18n.num(d.total) });
      if (!d.total) { v.el.replaceChildren(mk("div", "rp-none", T("✔ Không có ký tự vô hình, dấu cách lạ hay chữ giống Latin."))); return; }
      const sum = mk("div", "iv-sum");
      for (const k of Invisible.KINDS) {
        if (!d.counts[k]) continue;
        const row = mk("div", "iv-kind");
        row.append(mk("b", "", T(Invisible.LABELS[k]) + ": " + I18n.num(d.counts[k])), button(T(ACT[k]), () => fix(k), T("Sửa mọi ký tự loại này ở tab nguồn (1 lần Ctrl+Z)")));
        if (k === "control" && d.items.some(i => i.cp === 1)) row.append(button(T("SOH → |"), () => fix("soh"), T("Đổi dấu phân cách FIX (SOH) thành | cho dễ đọc")));
        sum.append(row);
      }
      const list = mk("div", "iv-list");
      for (const it of d.items.slice(0, SHOW)) {
        const c = Invisible.context(text, it), row = mk("div", "iv-row");
        const ctx = mk("span", "iv-ctx");
        ctx.append(c.before, mk("mark", "", c.mark), c.after);
        row.append(mk("span", "lf-n", it.line + ":" + it.col), mk("code", "", it.code), mk("span", "iv-name", it.name), ctx);
        row.onclick = () => PowerUi.select(src, it.at, it.at + it.len);
        list.append(row);
      }
      if (d.total > SHOW) list.append(mk("div", "rp-none", T("Chỉ hiện {n} ký tự đầu — nút Sửa vẫn sửa hết.", { n: I18n.num(SHOW) })));
      v.el.replaceChildren(sum, list);
    }

    v.labels = () => { if (v.last) render(); };
    v.show = d => { v.last = d; render(); return true; };
    return v;
  },
};
