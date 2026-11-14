// Financial statements tab: balance sheet / income / cash flow × quarter / year as a table or a bar chart, plus this year's estimate vs actual.
const FinView = (() => {
  const KINDS = [["is", "Kết quả kinh doanh"], ["bs", "Cân đối kế toán"], ["cf", "Lưu chuyển tiền tệ"]];
  const PERIOD = [["quarter", "Quý"], ["year", "Năm"]];
  const MODE = [["table", "Bảng"], ["chart", "Biểu đồ"]];
  // Chart series by item code (first code found wins: banks report total operating income 421701 instead of net sales 21001).
  const SERIES = { is: [[[21001, 421701], "barA"], [[23000], "barB"]], bs: [[[14400], "barA"], [[13000], "barC"], [[14000], "barB"]], cf: [[[32000], "barA"], [[33000], "barC"], [[34000], "barB"]] };
  const clean = raw => ({ kind: KINDS.some(k => k[0] === raw?.kind) ? raw.kind : "is", period: raw?.period === "year" ? "year" : "quarter", mode: raw?.mode === "chart" ? "chart" : "table" });
  let st = clean(Prefs.get("fin", {}));
  const e = s => Dom.esc(s ?? "");

  const seg = (act, list, cur) => `<span class="seg">${list.map(([k, l]) => `<button data-act="${act}" data-v="${k}"${k === cur ? ' class="on"' : ""}>${e(T(l))}</button>`).join("")}</span>`;

  function tableHtml(table, lang) {
    const head = `<tr><th>${e(T("Chỉ tiêu (tỷ đồng)"))}</th>${table.periods.map(p => `<th>${FinTable.label(p, table.period)}</th>`).join("")}</tr>`;
    const rows = table.lines.map(l => {
      const name = lang === "en" && l.en ? l.en : l.vi;
      const cells = l.values.map((v, i) => {
        const g = FinTable.growth(l.values, i), tip = g == null ? "" : ` title="${e(T("{g}% so với kỳ trước", { g: Fmt.signed(g) }))}"`;
        return `<td class="${v < 0 ? "down" : ""}"${tip}>${FinTable.fmt(v, l)}</td>`;
      }).join("");
      return `<tr class="lv${l.level}"><th title="${e(name)}">${e(name)}</th>${cells}</tr>`;
    }).join("");
    return `<div class="fscroll"><table class="ftable"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`
      + `<p class="muted pad">${e(T("Nguồn: VNDirect. Rê chuột lên ô để xem % thay đổi so với kỳ trước; EPS tính bằng đồng."))}</p>`;
  }

  function chartHtml(table, lang) {
    const found = SERIES[table.kind].map(([codes, cls]) => ({ cls, line: codes.map(c => table.lines.find(l => l.code === c)).find(Boolean) })).filter(s => s.line);
    if (!found.length) return `<p class="muted pad">${e(T("Chưa có số liệu để vẽ biểu đồ."))}</p>`;
    const labels = table.periods.map(p => FinTable.label(p, table.period)).reverse();
    const series = found.map(s => ({ cls: s.cls, values: s.line.values.map(v => v == null ? null : v / 1e9).reverse() }));
    let line = null;
    if (table.kind === "is" && found.length === 2) line = { cls: "acc", values: found[0].line.values.map((r, i) => r && found[1].line.values[i] != null ? found[1].line.values[i] / r * 100 : null).reverse() };
    const legend = found.map(s => `<span><i class="sw ${s.cls}"></i>${e(lang === "en" && s.line.en ? s.line.en : s.line.vi)}</span>`).join("")
      + (line ? `<span><i class="sw acc"></i>${e(T("Biên LNST (%)"))}</span>` : "");
    return `<div class="legend pad">${legend}</div>${VSvg.bars(labels, series, line)}<p class="muted pad">${e(T("Đơn vị: tỷ đồng."))}</p>`;
  }

  function estHtml(est) {
    if (!est || (!est.rev && !est.np)) return "";
    const row = (label, plan, act) => plan ? `<tr><td>${e(T(label))}</td><td>${Fmt.en(plan / 1e9, 0)}</td><td>${act != null ? Fmt.en(act / 1e9, 0) : "—"}</td>`
      + `<td>${act != null ? `<b class="${act / plan >= 1 ? "up" : "ref"}">${Fmt.en(act / plan * 100, 1)}%</b>` : "—"}</td></tr>` : "";
    const rows = row("Doanh thu", est.rev, est.revAct) + row("LNST công ty mẹ", est.np, est.npAct);
    return `<div class="dsec"><b>${e(T("Dự phóng {y} của VNDirect vs thực hiện ({q} quý)", { y: est.year, q: est.quarters }))}</b></div>`
      + `<table class="dtable num"><thead><tr><th></th><th>${e(T("Dự phóng (tỷ)"))}</th><th>${e(T("Luỹ kế (tỷ)"))}</th><th>${e(T("Hoàn thành"))}</th></tr></thead>`
      + `<tbody>${rows}</tbody></table>`;
  }

  // table: load() result, or null while loading / on error (message shown instead).
  function html(table, lang, message) {
    const bar = `<div class="cbar">${seg("kind", KINDS, st.kind)}${seg("period", PERIOD, st.period)}${seg("mode", MODE, st.mode)}</div>`;
    if (message) return bar + `<p class="muted pad">${e(message)}</p>`;
    const est = table ? estHtml(table.est) : "";
    if (!table || !table.lines.length) return est + bar + `<p class="muted pad">${e(T("Chưa có báo cáo tài chính cho mã này."))}</p>`;
    return est + bar + (st.mode === "chart" ? chartHtml(table, lang) : tableHtml(table, lang));
  }

  // Estimate for the current calendar year vs the sum of its reported quarters; failures only hide this block.
  async function loadEst(sym) {
    const y = new Date().getUTCFullYear(), codes = [21001, 421701, 23000];
    try {
      const [est, q] = await Promise.all([Finfo.items(sym, "ESTIMATION", codes, `${y}-01-01`), Finfo.items(sym, "QUARTER", codes, `${y}-01-01`)]);
      const plan = Health.byYear(est).find(r => r.year === y);
      if (!plan) return null;
      const sum = c => { const v = q.filter(r => +r.itemCode === c).map(r => +r.numericValue).filter(Number.isFinite); return v.length ? v.reduce((s, x) => s + x, 0) : null; };
      const quarters = new Set(q.map(r => r.fiscalDate)).size;
      return { year: y, quarters, rev: plan.v[21001] ?? plan.v[421701] ?? null, np: plan.v[23000] ?? null, revAct: sum(21001) ?? sum(421701), npAct: sum(23000) };
    } catch (err) { console.warn("FinView.loadEst - get estimates fail", sym, err); return null; }
  }

  async function load(sym) {
    // Labels follow the period the table was fetched with, not the (maybe already changed) current choice.
    const { kind, period } = st, [models, est] = await Promise.all([Finfo.models(sym), loadEst(sym)]), model = FinTable.pickModel(models, kind);
    if (!model) return { periods: [], lines: [], kind, period, est };
    return { ...FinTable.build(model, await Finfo.values(sym, model.modelType, period, FinTable.since(period))), kind, period, est };
  }

  // "reload" when kind / period changed (new data), "render" for table ↔ chart, false when nothing changed.
  function act(el) {
    const a = el.dataset.act, v = el.dataset.v;
    if (!["kind", "period", "mode"].includes(a) || st[a] === v) return false;
    st = clean({ ...st, [a]: v });
    Prefs.set("fin", st);
    return a === "mode" ? "render" : "reload";
  }

  return { html, load, act, get: () => ({ ...st }), set: raw => { st = clean(raw); Prefs.set("fin", st); } };
})();
