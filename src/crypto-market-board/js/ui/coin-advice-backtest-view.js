// Backtest section at the end of the "Khuyến nghị" tab: on demand, replays CoinAdvice over history and shows per-horizon results (cached 30 min per pair).
const AdviceBacktestView = (() => {
  const TITLE = { short: "Hôm nay / ngắn hạn", medium: "Trung hạn", long: "Dài hạn" };
  const REASON = { target: "Chốt lời", stop: "Dừng lỗ", time: "Hết hạn giữ" };
  const cache = new Map();
  let seq = 0;
  const e = s => Dom.esc(s ?? "");
  const pct = (x, d = 1) => x == null ? "—" : Fmt.pct(x * 100, d);
  const day = t => Fmt.date(t * 1000);
  const closed = (bars, span) => bars.filter(b => b.time - Spot.TZ + span <= Date.now() / 1000);

  function card(r, rules) {
    const w = rules[r.id], row = (label, val, sub = "", cls = "") => `<div class="adv-row"><span>${e(T(label))}</span><b class="${cls}">${e(val)}</b>${sub ? `<em class="muted">${e(sub)}</em>` : ""}</div>`;
    const buy = r.entered
      ? row("Khuyến nghị mua (mô phỏng / tổng)", `${r.buyCalls} / ${r.buyAll}`, T("vào lệnh {n} lần ({p}%)", { n: r.entered, p: Fmt.en(r.entered / r.buyCalls * 100, 0) }))
        + row("Tỷ lệ thắng", `${Fmt.en(r.wins / r.entered * 100, 0)}%`, T("{n} lệnh có lãi sau phí", { n: r.wins }), r.wins / r.entered >= 0.5 ? "up" : "down")
        + row("Lãi trung bình / lệnh", pct(r.avg, 2), T("lệnh tệ nhất {w}", { w: pct(r.worst) }), Fmt.tone(r.avg))
        + row("Lãi gộp các lệnh", pct(r.compound), T("mua & giữ cùng kỳ {b}", { b: pct(r.bh) }), Fmt.tone(r.compound))
        + row("Sụt giảm tối đa", pct(r.maxDD), T("chuỗi lệnh nối tiếp"), "down")
        + row("Thời gian giữ trung bình", T("{d} ngày", { d: Fmt.en(r.avgDays, 1) }), T("chốt lời {a} · dừng lỗ {b} · hết hạn {c}", { a: r.targets, b: r.stops, c: r.entered - r.targets - r.stops }))
      : row("Khuyến nghị mua (mô phỏng / tổng)", `${r.buyCalls} / ${r.buyAll}`, r.buyCalls ? T("chưa có lần nào chạm vùng mua") : T("chưa có khuyến nghị mua nào"));
    const sell = row("Khuyến nghị bán", `${r.sellCalls}`, r.sellCalls ? T("giá thấp hơn sau {w} ngày: {p}% số lần (thay đổi TB {m})", { w: w.win, p: Fmt.en(r.sellHits / r.sellCalls * 100, 0), m: pct(r.sellAvg) }) : "");
    return `<div class="ol-card adv-card"><div class="ol-h"><b>${e(T(TITLE[r.id]))}</b><span class="badge">${e(r.from ? `${day(r.from)} → ${day(r.to)}` : "")}</span></div>`
      + buy + sell + row("Trung lập (chờ)", `${r.neutral}`) + (r.pending ? row("Chưa kết thúc", `${r.pending}`, T("bỏ qua vì dữ liệu chưa đủ để chốt kết quả")) : "")
      + (r.trades.length ? `<details class="bt-trades"><summary>${e(T("Lệnh gần nhất ({n})", { n: r.trades.length }))}</summary>${tradesTable(r)}</details>` : "") + `</div>`;
  }

  function tradesTable(r) {
    const th = ["Khuyến nghị", "Vào", "Giá vào", "Giá ra", "Kết thúc", "Ngày", "Lãi / lỗ"].map((h, i) => `<th${[2, 3, 5, 6].includes(i) ? ' class="r"' : ""}>${e(T(h))}</th>`).join("");
    const rows = r.trades.map(t => `<tr><td>${day(t.at)}</td><td>${day(t.t0)}</td><td class="r">${e(Fmt.price(t.entry))}</td><td class="r">${e(Fmt.price(t.exit))}</td><td>${e(T(REASON[t.reason]))}</td><td class="r">${t.days}</td><td class="r ${Fmt.tone(t.ret)}">${e(pct(t.ret, 2))}</td></tr>`).join("");
    return `<div class="bt-scroll"><table class="dtable"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function resultsHtml(res, bars) {
    const w = res.rules;
    return `<div class="ol-grid">${res.results.map(r => card(r, w)).join("")}</div>`
      + `<p class="sc-note">${e(T("Quy tắc: khuyến nghị mua → chờ giá chạm vùng mua trong {a} / {b} / {c} ngày (ngắn / trung / dài hạn), vào ở giá thấp hơn của giá mở cửa và đỉnh vùng mua; thoát khi chạm dừng lỗ hoặc vùng bán, nếu không thì sau {d} / {f} / {g} ngày. Nến vừa vào lệnh chỉ xét dừng lỗ; cùng nến chạm cả dừng lỗ và mục tiêu tính là dừng lỗ; gap qua mức thì khớp ở giá mở cửa. Phí {x}% mỗi chiều, không tính trượt giá, mỗi lệnh dùng toàn bộ vốn và các lệnh không chồng nhau.", { a: w.short.entry, b: w.medium.entry, c: w.long.entry, d: w.short.hold, f: w.medium.hold, g: w.long.hold, x: Fmt.en(res.fee * 100, 1) }))}</p>`
      + `<p class="sc-note">${e(T("Khuyến nghị bán: so giá đóng cửa sau {a} / {b} / {c} ngày với giá lúc khuyến nghị (các lần có thể chồng nhau; “có thể hồi kỹ thuật” tính là trung lập). Ngắn / trung hạn phát lại mỗi ngày trong ~2 năm gần nhất, dài hạn mỗi tuần trên toàn bộ lịch sử nến ngày ({n} nến). Chỉ dùng nến đã đóng tại thời điểm đó; bỏ qua funding, Fear & Greed, xu hướng BTC và thanh khoản. Quy tắc theo kỹ thuật, quá khứ không đảm bảo tương lai, không phải lời khuyên đầu tư.", { a: w.short.win, b: w.medium.win, c: w.long.win, n: bars }))}</p>`;
  }

  async function run(box, tok, pair, key) {
    const status = box.querySelector(".bt-status"), btn = box.querySelector("button");
    btn.disabled = true; status.textContent = T("Đang tải nến lịch sử…");
    try {
      const [h4, d1, w1] = (await Promise.all([Spot.klines(pair, "4h", 5000), Spot.klines(pair, "1d", 2000), Spot.klines(pair, "1w", 400)])).map((b, i) => closed(b, [14400, 86400, 604800][i]));
      if (tok !== seq) return;
      if (d1.length < 310) { status.textContent = T("Chưa đủ lịch sử giá (cần ≥ 310 nến ngày) để kiểm chứng."); btn.disabled = false; return; }
      const t0 = performance.now();
      const res = await CoinBacktest.run({ h4, d1, w1 }, { cancelled: () => tok !== seq, onProgress: f => { if (tok === seq) status.textContent = T("Đang phát lại lịch sử… {p}%", { p: Fmt.en(f * 100, 0) }); } });
      if (!res || tok !== seq) return;
      res.bars = d1.length; res.secs = (performance.now() - t0) / 1000;
      cache.set(key, { at: Date.now(), res });
      show(box, res);
    } catch (err) {
      if (tok !== seq) return;
      console.warn("AdviceBacktestView.run - backtest fail", pair, err.message);
      status.textContent = T("Không chạy được kiểm chứng."); btn.disabled = false;
    }
  }

  function show(box, res) {
    box.querySelector("button").disabled = false;
    box.querySelector("button").textContent = T("▶ Chạy lại kiểm chứng");
    box.querySelector(".bt-status").textContent = T("Đã chạy {n} lần phát lại trong {s} giây.", { n: res.steps, s: Fmt.en(res.secs, 1) });
    box.querySelector(".bt-out").innerHTML = resultsHtml(res, res.bars);
  }

  function mount(el, pair) {
    const tok = ++seq, key = pair;
    el.innerHTML = `<div class="dsec"><b>${e(T("Kiểm chứng quá khứ"))}</b><span class="muted">${e(T("phát lại khuyến nghị trên lịch sử, không nhìn trước tương lai"))}</span></div>`
      + `<div class="bt-bar"><button class="main">${e(T("▶ Kiểm chứng quá khứ"))}</button><span class="muted bt-status"></span></div><div class="bt-out"></div>`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 30 * 60e3) show(el, hit.res);
    el.querySelector("button").addEventListener("click", () => run(el, tok, pair, key));
  }

  return { mount, cancel: () => { seq++; } };
})();
