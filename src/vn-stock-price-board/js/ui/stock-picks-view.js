// "Thị trường" tab → buy / sell ideas: on demand, fetch 2 years of daily candles per ticker in the chosen universe, score them, rank with Picks.
const PicksView = (() => {
  const UNIS = [["VN30", "VN30"], ["VN100", "VN100"], ["VN100+HNX30", "VN100 + HNX30"], ["watch", "★ Danh mục"]];
  const HORIZON = [["Short", "Ngắn hạn (1–2 tuần)"], ["Medium", "Trung hạn (1–3 tháng)"], ["Long", "Dài hạn (trên 1 năm)"]];
  const e = s => Dom.esc(s ?? "");
  let uni = UNIS.some(u => u[0] === Prefs.get("picksUni")) ? Prefs.get("picksUni") : "VN100", result = cached(), progress = null, seq = 0, error = false;
  const listeners = [];
  const changed = () => listeners.forEach(f => f());

  function cached() {
    const c = Prefs.get("picks", null);
    return c && c.day === QuoteModel.vnDate() && c.uni === Prefs.get("picksUni", "VN100") && c.picks ? c : null;
  }

  async function universe() {
    if (uni === "watch") return Watch.all();
    if (uni === "VN100+HNX30") return [...new Set([...(await Feed.list("VN100")), ...(await Feed.list("HNX30"))])];
    return Feed.list(uni);
  }

  // One ticker → ranking row (technical scores from its own candles, valuation vs. sector median P/E).
  function row(sym, bars, r, secPe, q) {
    const d = TechOutlook.frame(bars, "D", []), w = TechOutlook.frame(ChartRange.shape(bars, "1W"), "W", []), c = bars.map(b => b.close), last = c[c.length - 1];
    const ma200 = c.length >= 200 ? c.slice(-200).reduce((s, x) => s + x, 0) / 200 : null, yAgo = bars.find(b => b.time >= bars[bars.length - 1].time - 365 * 86400);
    return { sym, price: q?.last || q?.ref || last, d: d?.score, rsi: d?.rsi, w: w?.score, above200: ma200 ? last > ma200 : null, ret1y: yAgo ? (last / yAgo.close - 1) * 100 : null,
      pe: r?.pe, pb: r?.pb, roe: Number.isFinite(r?.roe) ? r.roe * 100 : null, dy: Number.isFinite(r?.dy) ? r.dy * 100 : null, secPe, value: q ? Mkt.value(q) / 1e9 : null };
  }

  async function run() {
    const my = ++seq;
    error = false; progress = { done: 0, total: 0 }; changed();
    try {
      const syms = (await universe()).slice(0, 300);
      progress.total = syms.length; changed();
      const sec = await Market.sectorsLoad(), all = await Market.ratiosAll().catch(() => null), ratios = all || await Market.ratiosFor(syms);
      const secMed = Picks.sectorPe([...ratios].map(([s, r]) => ({ sector: sec.of.get(s)?.[2], pe: r.pe })));
      const now = Math.floor(Date.now() / 1000), rows = [], quotes = Board.state().quotes;
      let next = 0;
      const worker = async () => {
        while (next < syms.length && my === seq) {
          const s = syms[next++];
          try { const bars = await History.load(s, "D", now - 2 * 366 * 86400, now); if (bars.length >= 60) rows.push(row(s, bars, ratios.get(s), secMed.get(sec.of.get(s)?.[2]), quotes.get(s))); }
          catch (err) { console.warn("PicksView.run - candles fail", s, err); }
          progress.done++;
          if (progress.done % 10 === 0) changed();
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (my !== seq) return;
      result = { day: QuoteModel.vnDate(), uni, at: Date.now(), n: rows.length, picks: Picks.rank(rows) };
      Prefs.set("picks", result);
    } catch (err) { console.warn("PicksView.run - fail", err); if (my === seq) error = true; }
    if (my === seq) { progress = null; changed(); }
  }

  const sg = v => Fmt.signed(v, 0);
  const REASON = { day: v => T("Ngày {v}", { v: sg(v) }), week: v => T("Tuần {v}", { v: sg(v) }), rsi: v => T("RSI {v}", { v: Fmt.en(v, 0) }), above200: () => T("Trên MA200"),
    below200: () => T("Dưới MA200"), pe: v => T("P/E {v}", { v: Fmt.en(v, 1) }), secPe: v => T("P/E ngành {v}", { v: Fmt.en(v, 1) }), roe: v => T("ROE {v}%", { v: Fmt.en(v, 0) }),
    dy: v => T("Cổ tức {v}%", { v: Fmt.en(v, 1) }), cheap: () => T("Rẻ hơn ngành"), dear: () => T("Đắt hơn ngành") };

  function list(items, side) {
    if (!items.length) return `<p class="muted pad">${e(T("Không có mã nào đạt tiêu chí."))}</p>`;
    return `<table class="dtable picks-t">${items.map(x => `<tr data-sym="${e(x.sym)}"><td><b class="${side === "buy" ? "up" : "down"}">${e(x.sym)}</b></td><td>${Fmt.price(x.price)}</td>`
      + `<td>${x.reasons.map(r => `<span class="rchip">${e(REASON[r.key] ? REASON[r.key](r.v) : r.key)}</span>`).join("")}</td></tr>`).join("")}</table>`;
  }

  function html() {
    const opts = UNIS.map(([k, l]) => `<option value="${k}"${k === uni ? " selected" : ""}>${e(T(l))}</option>`).join("");
    const state = progress ? T("Đang phân tích {d}/{n} mã…", { d: progress.done, n: progress.total || "…" }) : error ? T("Phân tích lỗi — thử lại sau.")
      : result ? T("Phân tích lúc {t} · {n} mã", { t: new Date(result.at).toLocaleTimeString(I18n.lang === "en" ? "en-GB" : "vi-VN", { hour12: false }), n: result.n }) : "";
    const head = `<div class="dsec"><b>${e(T("Gợi ý mua / bán"))}</b><select data-picks="uni" title="${e(T("Phạm vi mã được phân tích"))}">${opts}</select>`
      + `<button data-picks="run"${progress ? " disabled" : ""}>🔍 ${e(T("Phân tích"))}</button><span class="muted">${e(state)}</span></div>`;
    if (!result) return head + `<p class="muted pad">${e(T("Bấm “Phân tích” để chấm điểm các mã trong phạm vi (tải lịch sử giá 2 năm từng mã, khoảng 10–40 giây)."))}</p>`;
    const side = (s, title) => `<div class="pick-col ${s}"><h4>${e(T(title))}</h4>` + HORIZON.map(([h, l]) => `<div class="pick-h">${e(T(l))}</div>${list(result.picks[s + h] || [], s)}`).join("") + `</div>`;
    const buy = side("buy", "Nên cân nhắc mua"), sell = side("sell", "Nên cân nhắc bán / tránh");
    return head + `<div class="picks">${buy}${sell}</div>`
      + `<p class="muted pad">${e(T("Gợi ý tự động theo quy tắc: ngắn hạn = điểm kỹ thuật ngày + RSI, trung hạn = điểm tuần + MA200, dài hạn = P/E so với trung vị ngành, ROE, cổ tức. Một mã có thể vừa đáng mua dài hạn (rẻ, lãi tốt) vừa nên tránh ngắn hạn (xu hướng đang giảm). Không phải khuyến nghị đầu tư; tự kiểm tra trước khi giao dịch."))}</p>`;
  }

  // Returns true when the market view should re-render.
  function act(el, ev) {
    if (ev === "change" && el.dataset.picks === "uni" && UNIS.some(u => u[0] === el.value)) { uni = el.value; Prefs.set("picksUni", uni); result = cached(); seq++; progress = null; return true; }
    if (ev === "click" && el.dataset.picks === "run" && !progress) { run(); return true; }
    return false;
  }

  return { html, act, onChange: f => listeners.push(f) };
})();
