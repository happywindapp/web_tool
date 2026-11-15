// "Kỹ thuật" tab: rule-based read per timeframe (day / week / month / year) + outlook for tomorrow → long term with this ticker's historical odds.
const OutlookView = (() => {
  const e = s => Dom.esc(s ?? "");
  const f2 = v => Number.isFinite(v) ? Fmt.en(v, 2) : "—";
  const pct = (v, d = 1) => Number.isFinite(v) ? `<span class="${v > 0 ? "up" : v < 0 ? "down" : "ref"}">${Fmt.signed(v, d)}%</span>` : "—";
  const tone = b => b > 0 ? "up" : b < 0 ? "down" : "ref";
  const TF = { D: "Ngày", W: "Tuần", M: "Tháng" };

  async function load(sym) {
    const now = Math.floor(Date.now() / 1000), daily = await History.load(sym, "D", now - 11 * 366 * 86400, now);
    if (daily.length < 60) return { empty: true };
    return { D: TechOutlook.frame(daily, "D", [1, 5]), W: TechOutlook.frame(ChartRange.shape(daily, "1W"), "W", [1, 4]),
      M: TechOutlook.frame(ChartRange.shape(daily, "1M"), "M", [1, 12]), L: TechOutlook.longTerm(daily), bars: daily };
  }

  // One readable sentence per signal (Vietnamese source keys, translated via T).
  function sigText(s, tf) {
    const [nf, nm, ns] = TechOutlook.PERIODS[tf], up = s.vote > 0, v = s.val;
    switch (s.key) {
      case "aboveFast": return T(up ? "Giá trên MA{n}" : "Giá dưới MA{n}", { n: nf });
      case "aboveMid": return T(up ? "Giá trên MA{n}" : "Giá dưới MA{n}", { n: nm });
      case "aboveSlow": return T(up ? "Giá trên MA{n}" : "Giá dưới MA{n}", { n: ns });
      case "maOrder": return T(s.vote > 0 ? "MA xếp tăng (ngắn > vừa > dài)" : s.vote < 0 ? "MA xếp giảm (ngắn < vừa < dài)" : "Các đường MA đan xen");
      case "slope": return T(up ? "MA{n} đang đi lên" : "MA{n} đang đi xuống", { n: nm });
      case "rsi": return v >= 70 ? T("RSI {v}: quá mua, dễ điều chỉnh", { v: f2(v) }) : v <= 30 ? T("RSI {v}: quá bán, dễ hồi phục", { v: f2(v) }) : T(v >= 50 ? "RSI {v}: trên 50, phe mua nhỉnh hơn" : "RSI {v}: dưới 50, phe bán nhỉnh hơn", { v: f2(v) });
      case "macd": return T(up ? "MACD nằm trên đường tín hiệu" : "MACD nằm dưới đường tín hiệu");
      case "macdHist": return T(up ? "Động lượng MACD đang tăng" : "Động lượng MACD đang giảm");
      case "adx": return s.vote === 0 ? T("ADX {v}: chưa có xu hướng rõ", { v: f2(v) }) : T(up ? "ADX {v}: xu hướng mạnh, phe mua chiếm ưu thế" : "ADX {v}: xu hướng mạnh, phe bán chiếm ưu thế", { v: f2(v) });
      case "bb": return T(s.vote < 0 ? "Giá vượt dải Bollinger trên (căng, dễ điều chỉnh)" : s.vote > 0 ? "Giá thủng dải Bollinger dưới (quá bán)" : "Giá nằm trong dải Bollinger");
      case "volume": return s.vote === 0 ? T("Khối lượng bình thường ({v}× TB 20)", { v: f2(v) }) : T(up ? "Khối lượng {v}× TB 20, xác nhận đà tăng" : "Khối lượng {v}× TB 20, xác nhận đà giảm", { v: f2(v) });
      default: return s.key;
    }
  }

  const meter = s => `<div class="meter"><i class="${s >= 0 ? "upb" : "downb"}" style="${s >= 0 ? "left:50%" : `left:${50 + s / 2}%`};width:${Math.abs(s) / 2}%"></i></div>`;

  function card(fr) {
    if (!fr) return "";
    return `<div class="tcard"><div class="tc-h"><b>${e(T(TF[fr.tf]))}</b><span class="tag ${tone(fr.bucket)}">${e(T(fr.label))} ${Fmt.signed(fr.score, 0)}</span></div>${meter(fr.score)}`
      + `<div class="tc-r">${e(T("Hỗ trợ {s} · kháng cự {r}", { s: f2(fr.support), r: f2(fr.resistance) }))}</div>`
      + `<details><summary>${e(T("{n} tín hiệu", { n: fr.signals.length }))}</summary><ul class="checks">`
      + fr.signals.map(s => `<li><i class="${s.vote > 0 ? "ok" : s.vote < 0 ? "no" : "na"}">${s.vote > 0 ? "▲" : s.vote < 0 ? "▼" : "•"}</i> ${e(sigText(s, fr.tf))}</li>`).join("") + `</ul></details></div>`;
  }

  function yearCard(L) {
    const b = (L.ret1y > 0) + (L.aboveMa250 === true) - (L.ret1y < 0) - (L.aboveMa250 === false), t = b > 0 ? 1 : b < 0 ? -1 : 0;
    const label = t > 0 ? "Tăng" : t < 0 ? "Giảm" : "Đi ngang";
    const ma = L.aboveMa250 ? T("Giá trên MA250 phiên ({v})", { v: f2(L.ma250) }) : T("Giá dưới MA250 phiên ({v})", { v: f2(L.ma250) });
    return `<div class="tcard"><div class="tc-h"><b>${e(T("Năm"))}</b><span class="tag ${tone(t)}">${e(T(label))}</span></div>`
      + `<ul class="checks"><li>${e(T("12 tháng qua"))}: ${pct(L.ret1y)}</li><li>${e(ma)}</li>`
      + `<li>${e(T("Cách đỉnh 52 tuần"))}: ${pct(L.fromHi52)} · ${e(T("cách đáy"))}: ${pct(L.fromLo52)}</li><li>${e(T("Biến động năm (σ)"))}: ${f2(L.vol)}%</li></ul></div>`;
  }

  const oddsCell = o => !o || !o.n ? `<span class="muted">${e(T("chưa đủ mẫu"))}</span>`
    : `${e(T("{u}% số lần tăng · trung vị", { u: Fmt.en(o.up, 0) }))} ${pct(o.median)}`
      + ` <span class="muted">(${o.n >= 8 ? e(T("{a}…{b}", { a: Fmt.signed(o.p25, 1) + "%", b: Fmt.signed(o.p75, 1) + "%" })) + ", " : ""}n=${o.n}${o.broad ? " · " + e(T("gộp mọi mức cùng chiều")) : ""}${o.n < 20 ? " · " + e(T("ít mẫu")) : ""})</span>`;
  const range = (c, w) => Number.isFinite(c) && Number.isFinite(w) ? `${f2(c - w)} – ${f2(c + w)}` : "—";

  function outlook(d) {
    const { D, W, M, L } = d;
    const row = (name, fr, rng, o, extra = "") => `<tr><td><b>${e(T(name))}</b></td><td>${fr ? `<span class="tag ${tone(fr.bucket)}">${e(T(fr.label))}</span>` : "—"}</td>`
      + `<td>${rng}${extra}</td><td>${oddsCell(o)}</td></tr>`;
    const longText = [L.cagr5 != null ? T("Tăng trưởng bình quân 5 năm {v}%/năm", { v: Fmt.signed(L.cagr5, 1) }) : L.cagr3 != null ? T("Tăng trưởng bình quân 3 năm {v}%/năm", { v: Fmt.signed(L.cagr3, 1) }) : "",
      T("sụt giảm tối đa 5 năm {v}%", { v: Fmt.en(L.mdd5, 1) }), T("cách đỉnh lịch sử {v}%", { v: Fmt.signed(L.fromAth, 1) })].filter(Boolean).join(" · ");
    const longBias = (L.cagr5 ?? L.cagr3 ?? 0) > 5 && L.aboveMa250 ? 1 : (L.cagr5 ?? L.cagr3 ?? 0) < 0 && !L.aboveMa250 ? -1 : 0;
    const longLabel = longBias > 0 ? T("Tích cực") : longBias < 0 ? T("Tiêu cực") : T("Trung tính");
    return `<div class="dsec"><b>${e(T("Phán đoán (dựa trên quy tắc + thống kê lịch sử của mã)"))}</b></div>`
      + `<div class="fscroll"><table class="dtable outlook"><thead><tr><th>${e(T("Kỳ"))}</th><th>${e(T("Xu hướng"))}</th><th>${e(T("Vùng giá dự kiến"))}</th><th>${e(T("Lịch sử khi tín hiệu tương tự"))}</th></tr></thead><tbody>`
      + row("Ngày mai", D, range(D?.close, D?.atr), D?.odds[1], D ? `<div class="muted">${e(T("Pivot {p} · S1 {s} · R1 {r}", { p: f2(D.pivots.p), s: f2(D.pivots.s1), r: f2(D.pivots.r1) }))}</div>` : "")
      + row("Tuần tới", W, range(W?.close, W?.atr), W?.odds[1], W ? `<div class="muted">${e(T("Pivot {p} · S1 {s} · R1 {r}", { p: f2(W.pivots.p), s: f2(W.pivots.s1), r: f2(W.pivots.r1) }))}</div>` : "")
      + row("Tháng tới", M, range(M?.close, M?.atr), M?.odds[1])
      + row("Năm tới", M, L.band1y ? `${f2(L.band1y[0])} – ${f2(L.band1y[1])}` : "—", M?.odds[12], `<div class="muted">${e(T("±1σ biến động năm"))}</div>`)
      + `<tr><td><b>${e(T("Dài hạn"))}</b></td><td><span class="tag ${tone(longBias)}">${e(longLabel)}</span></td><td colspan="2">${e(longText)}</td></tr>`
      + `</tbody></table></div>`;
  }

  function summary(d) {
    const lab = fr => fr ? T(fr.label).toLowerCase() : "—";
    return `<p class="pad tsum">${e(T("Tóm tắt: ngắn hạn (ngày) {d}, trung hạn (tuần) {w}, dài hơn (tháng) {m}.", { d: lab(d.D), w: lab(d.W), m: lab(d.M) }))}`
      + (d.D && d.W && d.D.bucket * d.W.bucket < 0 ? ` ${e(T("Khung ngày và tuần đang ngược chiều — tín hiệu ngắn hạn kém tin cậy."))}` : "") + `</p>`;
  }

  function html(d) {
    if (!d || d.empty || !d.D) return TabHtml.empty(T("Chưa đủ dữ liệu giá để phân tích (cần ít nhất 60 phiên)."));
    return `<div class="dsec"><b>${e(T("Nhận định kỹ thuật tự động"))}</b></div>` + summary(d)
      + `<div class="tcards">${card(d.D)}${card(d.W)}${card(d.M)}${yearCard(d.L)}</div>` + outlook(d)
      + `<p class="muted pad">${e(T("Nhận định do tool tự tính từ chỉ báo kỹ thuật (MA, RSI, MACD, ADX, Bollinger, khối lượng) và thống kê giá quá khứ của chính mã trên dữ liệu VNDirect; không phải khuyến nghị đầu tư — quá khứ không đảm bảo tương lai."))}</p>`;
  }

  return { load, html };
})();
