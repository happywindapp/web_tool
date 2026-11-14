// Under the chart: rule-based technical read (TechOutlook score −100…+100) on 1h / 4h / 1D candles — trend label, RSI, ADX, ATR,
// support / resistance, pivots, the daily signal list, and how often price rose after past bars with a similar score.
const OutlookView = (() => {
  const TFS = [["1h", "1 giờ", 500], ["4h", "4 giờ", 500], ["1d", "1 ngày", 1000]];
  const SIG = { aboveFast: "Giá so với MA20", aboveMid: "Giá so với MA50", aboveSlow: "Giá so với MA200", maOrder: "Thứ tự MA20 / MA50 / MA200", slope: "Độ dốc MA50 (5 nến)",
    rsi: "RSI 14", macd: "MACD so với đường tín hiệu", macdHist: "Histogram MACD", adx: "ADX (sức mạnh xu hướng)", bb: "Vị trí trong dải Bollinger", volume: "Khối lượng so với TB 20 nến" };
  const cache = new Map();
  let sym = "", seq = 0;
  const e = s => Dom.esc(s ?? "");
  const tone = b => b > 0 ? "up" : b < 0 ? "down" : "ref";
  const vote = v => v > 0 ? ["up", "Tích cực"] : v < 0 ? ["down", "Tiêu cực"] : ["ref", "Trung tính"];

  async function frames(pair) {
    const key = pair, hit = cache.get(key);
    if (hit && Date.now() - hit.at < 60e3) return hit.list;
    const list = await Promise.all(TFS.map(async ([iv, label, n]) => ({ iv, label, f: TechOutlook.frame(await Spot.klines(pair, iv, n), "D", [1, 5]) })));
    cache.set(key, { at: Date.now(), list });
    return list;
  }

  function card(x) {
    const f = x.f;
    if (!f) return `<div class="ol-card"><b>${e(T(x.label))}</b><p class="muted">${e(T("Chưa đủ dữ liệu."))}</p></div>`;
    const o = f.odds[5];
    return `<div class="ol-card"><div class="ol-h"><b>${e(T(x.label))}</b><span class="badge ${tone(f.bucket)}">${e(T(f.label))} · ${f.score > 0 ? "+" : ""}${f.score}</span></div>`
      + `<div class="ol-meter"><i style="left:${((f.score + 100) / 2).toFixed(0)}%"></i></div>`
      + `<div class="stats"><div><span>RSI 14</span><b>${f.rsi == null ? "—" : Fmt.en(f.rsi, 0)}</b></div><div><span>ADX</span><b>${f.adx == null ? "—" : Fmt.en(f.adx, 0)}</b></div>`
      + `<div><span>${e(T("Biên độ ATR"))}</span><b>${f.atrPct == null ? "—" : Fmt.en(f.atrPct, 2) + "%"}</b></div>`
      + `<div><span>${e(T("Hỗ trợ / kháng cự"))}</span><b>${e(Fmt.price(f.support))} / ${e(Fmt.price(f.resistance))}</b></div>`
      + `<div><span>Pivot</span><b>${e(Fmt.price(f.pivots.p))}</b></div><div><span>R1 / S1</span><b>${e(Fmt.price(f.pivots.r1))} / ${e(Fmt.price(f.pivots.s1))}</b></div></div>`
      + (o && o.n ? `<p class="muted ol-odds">${e(T("Lịch sử: sau {n} nến có điểm tương tự, giá cao hơn 5 nến sau {p}% số lần (trung vị {m}%).", { n: o.n, p: Fmt.en(o.up, 0), m: Fmt.signed(o.median, 1) }))}${o.broad ? " " + e(T("(gộp cả nhóm cùng chiều vì ít mẫu)")) : ""}</p>` : "")
      + `</div>`;
  }

  function signals(f) {
    if (!f) return "";
    return `<table class="dtable"><thead><tr><th>${e(T("Tín hiệu (khung ngày)"))}</th><th>${e(T("Giá trị"))}</th><th>${e(T("Đánh giá"))}</th></tr></thead><tbody>`
      + f.signals.map(s => { const [c, l] = vote(s.vote); return `<tr><td>${e(T(SIG[s.key] || s.key))}</td><td>${s.val == null ? "" : e(Math.abs(s.val) >= 1 ? Fmt.price(s.val) : Fmt.en(s.val, 2))}</td><td class="${c}">${e(T(l))}</td></tr>`; }).join("")
      + `</tbody></table>`;
  }

  async function open(s) {
    sym = s;
    const my = ++seq, el = $("dOutlook"), pair = Coins.pair(s);
    if (!pair) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="dsec"><b>${e(T("Nhận định kỹ thuật"))}</b></div><p class="pad muted">${e(T("Đang tính…"))}</p>`;
    try {
      const list = await frames(pair);
      if (my !== seq) return;
      el.innerHTML = `<div class="dsec"><b>${e(T("Nhận định kỹ thuật"))}</b><span class="muted">${e(T("theo quy tắc, không phải lời khuyên đầu tư"))}</span></div>`
        + `<div class="ol-grid">${list.map(card).join("")}</div>` + signals(list[2].f);
    } catch (err) {
      if (my !== seq) return;
      console.warn("OutlookView.open - load klines fail", s, err.message);
      el.innerHTML = `<div class="errbox">${e(T("Không tải được nến để tính nhận định."))}</div>`;
    }
  }

  return { open, close: () => { seq++; } };
})();
