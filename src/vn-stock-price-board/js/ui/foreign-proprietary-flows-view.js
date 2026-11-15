// "Dòng tiền" tab: top net buy / sell of foreign investors and proprietary desks over 1–20 sessions (VNDirect finfo), filter by exchange.
const FlowsView = (() => {
  const DAYS = [1, 5, 10, 20], FLOORS = ["", "HOSE", "HNX", "UPCOM"], N = 15;
  let days = DAYS.includes(Prefs.get("flowDays")) ? Prefs.get("flowDays") : 1, floor = FLOORS.includes(Prefs.get("flowFloor")) ? Prefs.get("flowFloor") : "";
  let data = null, key = "", busy = false, failed = false, seq = 0;
  const listeners = [];
  const e = s => Dom.esc(s ?? "");
  const bn = v => Fmt.signed(v / 1e9, 1);
  const dmy = s => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

  async function load() {
    const k = String(days);
    if (key === k && (data || busy)) return;
    const my = ++seq; key = k; busy = true; failed = false; data = null;
    try {
      const dates = await Finfo.tradingDates(days + 1);
      if (dates.length < days) throw new Error("no trading dates");
      // Proprietary data lags a day → read one session earlier and keep its own newest N dates.
      const [fr, pr] = await Promise.all([Finfo.foreignsSince(dates[days - 1]), Finfo.proprietarySince(dates[Math.min(days, dates.length - 1)])]);
      if (my !== seq) return;
      const f = fr.map(FlowRank.norm), p = pr.map(FlowRank.norm);
      data = { f, fd: FlowRank.lastDates(f, days), p, pd: FlowRank.lastDates(p, days) };
    } catch (err) {
      if (my !== seq) return;
      console.warn("FlowsView.load - get foreign / proprietary flows fail", err);
      failed = true; key = "";
    }
    busy = false;
    listeners.forEach(fn => fn());
  }

  function table(list, max, quotes) {
    if (!list.length) return `<p class="muted pad">${e(T("Không có dữ liệu."))}</p>`;
    return `<table class="dtable flow"><tbody>` + list.map(x => {
      const q = quotes.get(x.code), w = Math.max(2, Math.abs(x.net) / max * 100).toFixed(0);
      return `<tr data-sym="${e(x.code)}"><td><b>${e(x.code)}</b> <span class="muted">${e(x.floor)}</span></td>`
        + `<td>${q && q.last ? `<span class="${QuoteModel.tone(q.last, q)}">${Fmt.price(q.last)} ${Fmt.pct(q, q.pct)}</span>` : ""}</td>`
        + `<td class="${x.net > 0 ? "up" : "down"}"><b>${bn(x.net)}</b></td><td class="flow-bar"><i class="${x.net > 0 ? "upb" : "downb"}" style="width:${w}%"></i></td></tr>`;
    }).join("") + `</tbody></table>`;
  }

  function block(title, rows, dates, quotes, note) {
    if (!dates.length) return `<div class="dsec"><b>${e(title)}</b></div><p class="muted pad">${e(T("Không có dữ liệu."))}</p>`;
    const r = FlowRank.rank(FlowRank.sum(rows, dates, floor), N), max = Math.max(1, ...[...r.buy, ...r.sell].map(x => Math.abs(x.net)));
    const span = dates.length > 1 ? `${dmy(dates[dates.length - 1])} – ${dmy(dates[0])}` : dmy(dates[0]);
    const tot = T("Ròng {n} tỷ · mua {b} tỷ · bán {s} tỷ", { n: bn(r.tot.net), b: Fmt.en(r.tot.buy / 1e9, 0), s: Fmt.en(r.tot.sell / 1e9, 0) });
    return `<div class="dsec"><b>${e(title)}</b> <span class="muted">${e(span)}</span> <b class="${r.tot.net >= 0 ? "up" : "down"}">${e(tot)}</b></div>`
      + (note ? `<p class="muted pad">${e(note)}</p>` : "")
      + `<div class="mk-tops"><div class="mk-top"><b class="up">${e(T("Top mua ròng (tỷ đồng)"))}</b>${table(r.buy, max, quotes)}</div>`
      + `<div class="mk-top"><b class="down">${e(T("Top bán ròng (tỷ đồng)"))}</b>${table(r.sell, max, quotes)}</div></div>`;
  }

  function html(quotes) {
    load();
    const qm = new Map(quotes.map(q => [q.sym, q]));
    const bar = `<div class="dsec flow-bar-ctl"><label>${e(T("Số phiên"))} <select data-fl="days">${DAYS.map(d => `<option value="${d}"${d === days ? " selected" : ""}>${d}</option>`).join("")}</select></label>`
      + `<label>${e(T("Sàn giao dịch"))} <select data-fl="floor">${FLOORS.map(f => `<option value="${f}"${f === floor ? " selected" : ""}>${e(f || T("Tất cả"))}</option>`).join("")}</select></label></div>`;
    const wait = T(days >= 10 ? "Đang tải dòng tiền {n} phiên (khoảng 3 MB)…" : "Đang tải dòng tiền {n} phiên…", { n: days });
    const body = failed ? `<p class="muted pad">${e(T("Không tải được dữ liệu từ VNDirect. Thử lại sau."))}</p>`
      : !data ? `<p class="mk-progress">${e(wait)}</p>`
      : block(T("Khối ngoại"), data.f, data.fd, qm, "")
        + block(T("Tự doanh CTCK"), data.p, data.pd, qm, T("Tự doanh công bố sau phiên khoảng 1 ngày, chủ yếu cổ phiếu HOSE."));
    return `<div class="market">${bar}${body}<p class="muted pad">${e(T("Nguồn: VNDirect finfo, cuối ngày (không phải realtime). Bấm mã để xem chi tiết."))}</p></div>`;
  }

  // Select change → true when the view must be rebuilt.
  function act(el) {
    if (!el.dataset || !el.dataset.fl) return false;
    if (el.dataset.fl === "days") { days = +el.value; Prefs.set("flowDays", days); }
    else { floor = FLOORS.includes(el.value) ? el.value : ""; Prefs.set("flowFloor", floor); }
    return true;
  }

  return { html, act, onChange: f => listeners.push(f) };
})();
