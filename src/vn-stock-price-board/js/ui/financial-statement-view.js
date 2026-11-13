// Financial statements tab: balance sheet / income / cash flow × quarter / year, line items pivoted over the last 8 periods.
const FinView = (() => {
  const KINDS = [["is", "Kết quả kinh doanh"], ["bs", "Cân đối kế toán"], ["cf", "Lưu chuyển tiền tệ"]];
  const PERIOD = [["quarter", "Quý"], ["year", "Năm"]];
  const clean = raw => ({ kind: KINDS.some(k => k[0] === raw?.kind) ? raw.kind : "is", period: raw?.period === "year" ? "year" : "quarter" });
  let st = clean(Prefs.get("fin", {}));

  const seg = (act, list, cur) => `<span class="seg">${list.map(([k, l]) => `<button data-act="${act}" data-v="${k}"${k === cur ? ' class="on"' : ""}>${Dom.esc(T(l))}</button>`).join("")}</span>`;

  // table: FinTable.build(...) result, or null while loading / on error (message shown instead).
  function html(table, lang, message) {
    const bar = `<div class="cbar">${seg("kind", KINDS, st.kind)}${seg("period", PERIOD, st.period)}</div>`;
    if (message) return bar + `<p class="muted pad">${Dom.esc(message)}</p>`;
    if (!table || !table.lines.length) return bar + `<p class="muted pad">${Dom.esc(T("Chưa có báo cáo tài chính cho mã này."))}</p>`;
    const head = `<tr><th>${Dom.esc(T("Chỉ tiêu (tỷ đồng)"))}</th>${table.periods.map(p => `<th>${FinTable.label(p, table.period)}</th>`).join("")}</tr>`;
    const rows = table.lines.map(l => {
      const name = lang === "en" && l.en ? l.en : l.vi;
      const cells = l.values.map((v, i) => {
        const g = FinTable.growth(l.values, i), tip = g == null ? "" : ` title="${Dom.esc(T("{g}% so với kỳ trước", { g: Fmt.signed(g) }))}"`;
        return `<td class="${v < 0 ? "down" : ""}"${tip}>${FinTable.fmt(v, l)}</td>`;
      }).join("");
      return `<tr class="lv${l.level}"><th title="${Dom.esc(name)}">${Dom.esc(name)}</th>${cells}</tr>`;
    }).join("");
    return bar + `<div class="fscroll"><table class="ftable"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`
      + `<p class="muted pad">${Dom.esc(T("Nguồn: VNDirect. Rê chuột lên ô để xem % thay đổi so với kỳ trước; EPS tính bằng đồng."))}</p>`;
  }

  async function load(sym) {
    // Labels follow the period the table was fetched with, not the (maybe already changed) current choice.
    const { kind, period } = st, model = FinTable.pickModel(await Finfo.models(sym), kind);
    if (!model) return { periods: [], lines: [], kind, period };
    return { ...FinTable.build(model, await Finfo.values(sym, model.modelType, period, FinTable.since(period))), kind, period };
  }

  // Returns true when the click changed the view (caller reloads).
  function act(el) {
    const a = el.dataset.act, v = el.dataset.v;
    if (a === "kind" && v !== st.kind) st.kind = v;
    else if (a === "period" && v !== st.period) st.period = v;
    else return false;
    st = clean(st);
    Prefs.set("fin", st);
    return true;
  }

  return { html, load, act, get: () => ({ ...st }), set: raw => { st = clean(raw); Prefs.set("fin", st); } };
})();
