// "fix-lifecycle" op: a FIX tab → order lifecycles (chains 11 → 41 via FixChain), Markdown report as text; pane: order picker, table, ▶ Sequence diagram (Mermaid), 🔗 Link.
const FixLifeOp = (() => {
  const MAX = 20000;
  const clean = o => ({ order: typeof o?.order === "string" ? o.order.slice(0, 200) : "" });
  const opts = srcId => PowerUi.opts(srcId, "fix-lifecycle", clean, () => ({ order: "" }));
  const WARN = {
    afterTerminal: "39 đổi {from} → {to} sau trạng thái kết thúc", regress: "39 lùi {from} → {to}", cumDown: "CumQty giảm {from} → {to}", overfill: "CumQty {cum} > OrderQty {qty}",
    leaves: "CumQty {cum} + LeavesQty {leaves} ≠ OrderQty {qty}", tradeNoQty: "150=F (Trade) thiếu LastQty", afterDone: "Gửi yêu cầu sau khi lệnh đã kết thúc (39={status})",
  };
  const warnText = w => T(WARN[w.code] || w.code, w);

  function names(dict) {
    const m = (tag, v) => FixDict.meaning(dict, tag, v) || "";
    return { msg: v => FixDict.splitCamel(FixDict.msgName(dict, v) || ""), exec: v => m("150", v), status: v => m("39", v), side: v => m("54", v) };
  }

  function run(t, c) {
    const ex = FixLog.extract(t);
    if (!ex.items.length) throw new Error(T("Không thấy message FIX nào — cần dòng có 8=FIX… hoặc các cặp tag=value có 35=."));
    const items = ex.items.slice(0, MAX), dict = FixDict.get(items.some(FixVenue.isVenue) ? "venue" : "fix44");
    const msgs = items.map(it => FixCheck.analyse(it, dict)), orders = FixLifecycle.build(msgs, FixChain.link(msgs).root), nm = names(dict);
    const heads = [T("Dòng"), T("Thời điểm"), T("Chiều gửi"), "35", "150", "39", "11", "41", T("Giá"), T("Khối lượng"), "14", "151", T("Cảnh báo")];
    const warns = orders.reduce((n, o) => n + o.warns, 0), notes = [T("{n} lệnh · {m} message · {w} cảnh báo chuyển trạng thái.", { n: I18n.num(orders.length), m: I18n.num(msgs.length), w: I18n.num(warns) })];
    if (ex.items.length > MAX) notes.push(T("Chỉ đọc {n} message đầu.", { n: I18n.num(MAX) }));
    if (!orders.length) notes.push(T("Không có message lệnh (D / G / F / 8 / 9) — vòng đời trống."));
    if (ex.skipped) notes.push(T("Bỏ qua {n} dòng không phải FIX.", { n: I18n.num(ex.skipped) }));
    const o = opts(c.id);
    if (o.order && !orders.some(x => x.key === o.order)) notes.push(T("Không còn lệnh {key} — đang hiện tất cả.", { key: o.order }));
    const firstWarn = orders.flatMap(x => x.rows).find(r => r.warn.length);
    const error = firstWarn ? Object.assign(new Error(T("Dòng {n}: {msg}", { n: firstWarn.line, msg: warnText(firstWarn.warn[0]) }) + " " + notes[0]), { line: firstWarn.line, warn: true }) : null;
    const text = FixLifecycle.markdown(orders, nm, heads, warnText, T("Vòng đời lệnh FIX")) + "\n";
    return { text, notes, error, view: { kind: "fixlife", srcId: c.id, orders, names: nm, o, msgs: msgs.length } };
  }

  function set(srcId, o) {
    PowerUi.saveOpts(srcId, "fix-lifecycle", clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, "fix-lifecycle", true);
  }

  const picked = d => { const sel = d.o.order ? d.orders.filter(o => o.key === d.o.order) : []; return sel.length ? sel : d.orders; };

  // Sequence diagram of the picked order (or all): a Mermaid tab next to the pane, previewed in the other view.
  async function diagram(d, outId) {
    const list = picked(d);
    if (!list.length) { StatusBar.msg(T("Không có lệnh nào để vẽ."), "warn"); return; }
    const r = FixLifecycle.mermaid(list, d.names), src = Docs.get(d.srcId);
    const doc = Docs.create({ kind: "temp", name: (src ? src.name : "fix") + " ⇢ sequence.mmd", lang: "Mermaid", text: r.text });
    const at = Views.where(outId);
    Views.open(doc, at >= 0 ? at : Views.focused, false);
    await OutputLink.run(doc, "preview");
    if (r.shown < r.total) StatusBar.msg(T("Sơ đồ chỉ vẽ {n} / {total} message đầu (trần {n}) — chọn 1 lệnh để xem đủ.", { n: I18n.num(r.shown), total: I18n.num(r.total) }), "warn");
  }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: "fix-lifecycle", opts: opts(srcId) }, n => T("🔗 Đã chép link vòng đời lệnh ({n} ký tự) — mở link là dựng lại bảng.", { n }));
  }

  return { run, set, opts, diagram, share, warnText, picked };
})();

const PvFixLife = {
  create(p) {
    const { mk, button } = PowerUi;
    const pick = mk("select", "fl-pick"), draw = button("", () => v.last && FixLifeOp.diagram(v.last, p.doc)), link = button("", () => v.last && FixLifeOp.share(v.last.srcId));
    const v = { el: mk("div", "pv-fixlife"), tools: [pick, draw, link], last: null };
    pick.onchange = () => v.last && FixLifeOp.set(v.last.srcId, { order: pick.value });
    const named = (fn, x) => x ? x + (fn(x) ? " " + fn(x) : "") : "";

    function table(o, nm, d, budget) {
      const tb = mk("table", "rx-tab fl-tab"), head = mk("tr");
      [T("Dòng"), T("Thời điểm"), T("Chiều gửi"), "35", "150", "39", "11", "41", T("Giá"), T("Khối lượng"), "14", "151", T("Cảnh báo")].forEach(h => head.append(mk("th", "", h)));
      tb.append(head);
      for (const r of o.rows) {
        if (budget.left-- <= 0) { budget.cut = true; break; }
        const tr = mk("tr", r.warn.length ? "fl-warn" : "");
        [r.line, FixTime.short(r.time, "utc"), r.from + " → " + r.to, named(nm.msg, r.type), named(nm.exec, r.exec), named(nm.status, r.status), r.clOrdId, r.orig,
          r.lastPx || r.price, r.lastQty ? r.lastQty + " / " + r.qty : r.qty, r.cum, r.leaves, r.warn.map(w => "⚠ " + FixLifeOp.warnText(w)).join("\n")].forEach(x => tr.append(mk("td", "", String(x ?? ""))));
        tr.tabIndex = 0;
        const go = () => { const src = Docs.get(d.srcId); if (src) { Views.revealLine(src, r.line); PhoneLayout.show(Views.where(src.id) + 1); } };
        tr.onclick = go;
        tr.onkeydown = e => { if (e.key === "Enter") go(); };
        tb.append(tr);
      }
      return tb;
    }

    function render() {
      const d = v.last, nm = d.names, list = FixLifeOp.picked(d), budget = { left: 3000, cut: false };
      const warns = d.orders.reduce((n, o) => n + o.warns, 0);
      p.type.textContent = T("Vòng đời lệnh FIX · {n} lệnh · {w} ⚠", { n: I18n.num(d.orders.length), w: I18n.num(warns) });
      pick.replaceChildren(new Option(T("Tất cả lệnh ({n})", { n: I18n.num(d.orders.length) }), ""), ...d.orders.slice(0, 2000).map(o => new Option(o.key + (o.symbol ? " · " + o.symbol : "") + (o.status ? " · " + named(nm.status, o.status) : "") + (o.warns ? " · ⚠" + o.warns : ""), o.key)));
      pick.value = d.orders.some(o => o.key === d.o.order) ? d.o.order : "";
      const parts = [];
      if (!d.orders.length) parts.push(mk("div", "rp-none", T("Không có message lệnh (D / G / F / 8 / 9) — vòng đời trống.")));
      for (const o of list.slice(0, 200)) {
        parts.push(mk("h4", "fl-head" + (o.warns ? " fl-bad" : ""), o.key + (o.symbol ? " · " + o.symbol : "") + (o.side ? " · " + named(nm.side, o.side) : "") + (o.status ? " · 39=" + named(nm.status, o.status) : "") + (o.warns ? " · ⚠ " + o.warns : "")));
        parts.push(table(o, nm, d, budget));
        if (budget.cut) break;
      }
      if (budget.cut) parts.push(mk("div", "rp-none", T("Pane hiện {n} dòng đầu — đủ nằm trong text của tab (Markdown).", { n: I18n.num(3000) })));
      else if (list.length > 200) parts.push(mk("div", "rp-none", T("Pane hiện {n} lệnh đầu — đủ nằm trong text của tab (Markdown).", { n: 200 })));
      v.el.replaceChildren(...parts);
    }

    v.labels = () => {
      pick.title = T("Chọn lệnh (chuỗi ClOrdID 11 → 41)");
      draw.textContent = T("▶ Sơ đồ"); draw.title = T("Mermaid sequenceDiagram của lệnh đang chọn (participant theo 49 / 56, tối đa {n} message)", { n: FixLifecycle.MAX_DIAGRAM });
      link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: log FIX + lệnh đang chọn");
      if (v.last) render();
    };
    v.show = d => { v.last = d; render(); return true; };
    return v;
  },
};
