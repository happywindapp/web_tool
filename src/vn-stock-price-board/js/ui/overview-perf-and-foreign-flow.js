// Overview extras: price performance by period vs VNINDEX (daily candles) and foreign investors' net flow (20 / 60 / 120 sessions).
const OverviewExtra = (() => {
  const FLOW_N = [20, 60, 120];
  const LABEL = { "1W": "1 tuần", "1M": "1 tháng", "3M": "3 tháng", YTD: "Từ đầu năm", "1Y": "1 năm", "3Y": "3 năm", "5Y": "5 năm" };
  let flowN = 20;
  const e = s => Dom.esc(s ?? "");

  async function load(sym) {
    const now = Math.floor(Date.now() / 1000), from = now - 6 * 366 * 86400;
    // Each part degrades on its own: a failed candle or flow request leaves that block empty instead of failing the tab.
    const safe = p => p.catch(err => { console.warn("OverviewExtra.load - part fail", sym, err); return null; });
    const [bars, idx, flows] = await Promise.all([safe(History.load(sym, "D", from, now)), safe(History.load("VNINDEX", "D", from, now)), safe(Finfo.foreigns(sym, 120))]);
    return { perf: bars ? Valuation.perf(bars) : null, idx: idx ? Valuation.perf(idx) : null, flows: flows ? flows.slice().reverse() : null };
  }

  const pct = v => Number.isFinite(v) ? `<span class="${v > 0 ? "up" : v < 0 ? "down" : "ref"}">${Fmt.signed(v, 1)}%</span>` : "—";

  function perfHtml(p, idx) {
    if (!p) return "";
    const rows = Valuation.PERIODS.map(([k]) => {
      const rel = Number.isFinite(p[k]) && idx && Number.isFinite(idx[k]) ? p[k] - idx[k] : null;
      return `<tr><td>${e(T(LABEL[k]))}</td><td>${pct(p[k])}</td><td>${idx ? pct(idx[k]) : "—"}</td><td>${pct(rel)}</td></tr>`;
    }).join("");
    return `<div class="dsec"><b>${e(T("Hiệu suất giá"))}</b></div><table class="dtable num"><thead><tr><th>${e(T("Kỳ"))}</th><th>${e(T("Mã"))}</th><th>VNINDEX</th><th>${e(T("Chênh lệch"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function flowHtml(list) {
    if (!list || !list.length) return "";
    const last = list.slice(-flowN), net = last.reduce((s, x) => s + (+x.netVal || 0), 0), cur = list[list.length - 1];
    const room = +cur.totalRoom > 0 ? +cur.currentRoom / +cur.totalRoom * 100 : null;
    const seg = `<span class="seg">${FLOW_N.map(n => `<button data-act="flow" data-v="${n}"${n === flowN ? ' class="on"' : ""}>${n}</button>`).join("")}</span>`;
    return `<div class="dsec"><b>${e(T("Khối ngoại mua/bán ròng"))}</b>${seg}</div>`
      + VSvg.flows(last.map(x => +x.netVal / 1e9))
      + `<p class="pad">${e(T("{n} phiên: ròng {v} tỷ", { n: last.length, v: Fmt.signed(net / 1e9, 1) }))}`
      + (room != null ? ` · ${e(T("room còn {r}%", { r: Fmt.en(room, 1) }))}` : "") + `</p>`;
  }

  // Returns true when the click changed the view.
  function act(el) {
    if (el.dataset.act !== "flow") return false;
    const n = +el.dataset.v;
    if (!FLOW_N.includes(n) || n === flowN) return false;
    flowN = n;
    return true;
  }

  return { load, html: x => x ? perfHtml(x.perf, x.idx) + flowHtml(x.flows) : "", act };
})();
