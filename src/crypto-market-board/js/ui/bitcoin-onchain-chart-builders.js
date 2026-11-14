// Chart specs of the Bitcoin on-chain tab: each entry builds SeriesChart series + options + the explanation text from BtcCycle.analyze output.
const OnchainCharts = (() => {
  const ink = () => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#d1d5db";
  const money = v => Fmt.moneyBig(v);
  const pts = (times, arr, color) => { const o = []; for (let i = 0; i < arr.length; i++) if (arr[i] != null) o.push(color ? { time: times[i], value: arr[i], color: color(arr[i]) } : { time: times[i], value: arr[i] }); return o; };
  const price = A => ({ title: T("Giá BTC"), data: pts(A.times, A.prices), color: ink(), width: 2, fmt: money });
  const line = (title, A, arr, color, extra = {}) => ({ title, data: pts(A.times, arr), color, width: 1.5, fmt: v => Fmt.en(v, 2), ...extra });
  const x2 = v => v == null ? "–" : Fmt.en(v, 2) + "×";
  const RAINBOW = ["#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#a3e635", "#eab308", "#f59e0b", "#f97316", "#ef4444", "#b91c1c"];
  const WMA_COLOR = r => r < 1 ? "#3b82f6" : r < 2 ? "#22c55e" : r < 3.5 ? "#eab308" : r < 5 ? "#f97316" : "#ef4444";
  const CYCLE_COLOR = ["#94a3b8", "#3b82f6", "#f59e0b", "#22c55e"];
  const fgLabel = v => v <= 24 ? T("Sợ hãi tột độ") : v <= 44 ? T("Sợ hãi") : v <= 55 ? T("Trung lập") : v <= 75 ? T("Tham lam") : T("Tham lam tột độ");
  const lastOf = BtcCycle.last;

  const list = [
    { id: "rainbow", label: "Cầu vồng (Rainbow)", opt: { log: true, fmt: money },
      series: A => [...RAINBOW.map((c, k) => ({ title: "", data: A.times.map((t, i) => ({ time: t, value: A.rainbow.edge(k, t) })).filter((_, i) => A.times[i] >= 1.29e9), color: c, width: 1, last: false, legend: false, fmt: money })), price(A)],
      note: A => T("Đường hồi quy log–log của giá theo số ngày kể từ 2009-01-03, chia thành 9 dải màu (xanh dương = rẻ, đỏ = đắt). Đây chỉ là mô hình thống kê trên dữ liệu quá khứ, không phải dự báo.")
        + " " + T("Hiện tại giá nằm ở dải: {band}.", { band: T(BtcCycle.BANDS[A.now.band]) }) },
    { id: "wma200", label: "200 tuần MA", opt: { log: true, fmt: money },
      series: A => [{ ...price(A), data: A.times.map((t, j) => ({ time: t, value: A.prices[j], ...(A.ratio200w[j] != null ? { color: WMA_COLOR(A.ratio200w[j]) } : {}) })) }, line(T("200WMA"), A, A.ma200w, "#e5e7eb", { width: 2, fmt: money, dash: true })],
      note: A => T("Giá so với đường trung bình 200 tuần (1400 ngày). Màu của đường giá: xanh dương dưới 1×, xanh lá 1–2×, vàng 2–3.5×, cam 3.5–5×, đỏ trên 5× đường 200WMA. Giá quanh hoặc dưới 200WMA thường nằm ở vùng đáy dài hạn.")
        + " " + T("Hiện tại: {x} đường 200WMA ({ma}).", { x: x2(A.now.ratio200w), ma: Fmt.money(A.now.ma200w) }) },
    { id: "pi", label: "Pi Cycle Top", opt: { log: true, fmt: money },
      series: A => [price(A), line(T("MA111"), A, A.ma111, "#22c55e", { fmt: money, markers: A.piCross.map(i => ({ time: A.times[i], position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: T("Cắt lên") })) }), line(T("2×MA350"), A, A.ma350x2, "#ef4444", { fmt: money })],
      note: A => T("Pi Cycle Top: khi trung bình 111 ngày cắt lên trên 2× trung bình 350 ngày (mũi tên đỏ), tín hiệu này từng trùng với các đỉnh chu kỳ năm 2013, 2017 và 2021.")
        + " " + T("Hiện tại: MA111 bằng {p}% của 2×MA350 (chỉ cắt lên khi vượt 100%).", { p: A.now.pi == null ? "–" : Fmt.en(A.now.pi * 100, 0) }) },
    { id: "mayer", label: "Mayer Multiple", opt: { fmt: v => Fmt.en(v, 2) },
      series: A => [line(T("Mayer Multiple"), A, A.mayer, "#f59e0b", { width: 2, levels: [{ price: 0.8, color: "#22c55e", title: "0.8" }, { price: 1, title: "1" }, { price: 2.4, color: "#ef4444", title: "2.4" }] })],
      note: A => T("Mayer Multiple = giá / trung bình 200 ngày. Dưới 0.8 thường là vùng rẻ, trên 2.4 là vùng quá nóng theo các ngưỡng quen dùng.") + " " + T("Hiện tại: {x}.", { x: x2(A.now.mayer) }) },
    { id: "golden", label: "Golden Ratio", opt: { log: true, fmt: money },
      series: A => [price(A), line(T("350DMA"), A, A.ma350, "#e5e7eb", { width: 2, fmt: money }), ...[[1.6, "#22c55e"], [2, "#eab308"], [3, "#f97316"], [5, "#ef4444"], [8, "#b91c1c"]].map(([k, c]) => line("350DMA × " + k, A, BtcCycle.scale(A.ma350, k), c, { fmt: money, last: false }))],
      note: A => T("Golden Ratio Multiplier: trung bình 350 ngày (350DMA) cùng các bội số 1.6, 2, 3, 5 và 8. Giá tiến sát các đường bội số cao là vùng nóng; thị trường yếu thì giá nằm quanh hoặc dưới 350DMA.")
        + " " + T("Hiện tại giá bằng {x} đường 350DMA.", { x: x2(A.now.price / lastOf(A.ma350)) }) },
    { id: "puell", label: "Puell Multiple", opt: { fmt: v => Fmt.en(v, 2) },
      series: A => [line(T("Puell Multiple"), A, A.puell, "#a78bfa", { width: 2, levels: [{ price: 0.5, color: "#22c55e", title: "0.5" }, { price: 1, title: "1" }, { price: 4, color: "#ef4444", title: "4" }] })],
      note: A => T("Puell Multiple = doanh thu thợ đào mỗi ngày (USD) / trung bình 365 ngày của chính nó. Dưới 0.5 là thợ đào chịu áp lực (vùng rẻ), trên 4 là doanh thu rất cao (vùng nóng).") + " " + T("Hiện tại: {x}.", { x: x2(A.now.puell) }) },
    { id: "s2f", label: "Stock-to-Flow", opt: { log: true, fmt: money },
      series: A => [price(A), line(T("Mô hình S2F"), A, A.s2f.model, "#f97316", { fmt: money, dash: true })],
      note: A => T("Stock-to-Flow = lượng BTC đang lưu hành / lượng phát hành trong 365 ngày gần nhất. Mô hình giá = e^-1.84 × S2F^3.36 (đường đứt). Chỉ là mô hình tham khảo; hãy nhìn độ lệch giữa giá thực tế và đường mô hình.")
        + " " + T("Hiện tại: giá {p}, mô hình S2F {m}.", { p: Fmt.money(A.now.price), m: Fmt.moneyBig(A.now.s2fModel) }) },
    { id: "halving", label: "Chu kỳ halving", opt: { log: true, axis: "days", fmt: v => Fmt.en(v, 2) + "×" },
      series: A => A.halvings.map((h, i) => ({ title: "Halving " + h.label, data: h.points, color: CYCLE_COLOR[i], width: 2, fmt: v => Fmt.en(v, 2) + "×" })).filter(s => s.data.length),
      note: A => { const c = A.halvings[A.halvings.length - 1].points, l = c[c.length - 1]; return T("Giá của mỗi chu kỳ chia cho giá đúng ngày halving (= 1), trục ngang là số ngày kể từ halving, thang log. Dùng để so nhịp đi của chu kỳ hiện tại với các chu kỳ trước.")
        + (l ? " " + T("Chu kỳ 2024: ngày {n} sau halving, giá bằng {x} giá ngày halving.", { n: Math.round(l.time / 86400), x: x2(l.value) }) : ""); } },
    { id: "drawdown", label: "Mức giảm từ đỉnh", opt: { fmt: v => Fmt.en(v, 0) + "%" },
      series: A => [{ title: T("Giảm từ đỉnh"), data: pts(A.times, A.drawdown), color: "#ef4444", type: "area", fmt: v => Fmt.en(v, 1) + "%" }],
      note: A => T("Mức giảm của giá so với đỉnh cao nhất mọi thời đại tính đến từng ngày.") + " " + T("Hiện tại: {x} so với đỉnh lịch sử ({ath}).", { x: Fmt.pct(A.now.drawdown, 1), ath: Fmt.money(Math.max(...A.prices)) }) },
    { id: "hash", label: "Hashrate + Hash Ribbons", opt: { fmt: v => Fmt.en(v, 0) },
      series: (A, X) => {
        const R = A.ribbon, eh = a => pts(R.times, a).map(p => ({ ...p, value: p.value / 1e18 })), f = v => Fmt.en(v, 0) + " EH/s";
        const diff = ((X.net && X.net.difficulty) || []).map(d => ({ time: d.t, value: d.v / 1e12 }));
        return R.times.length ? [{ title: "MA30", data: eh(R.s30), color: "#22c55e", width: 2, fmt: f, markers: R.recovery.map(i => ({ time: R.times[i], position: "belowBar", color: "#22c55e", shape: "arrowUp" })) },
          { title: "MA60", data: eh(R.s60), color: "#ef4444", width: 2, fmt: f }, { title: T("Độ khó (T)"), data: diff, color: "#38bdf8", width: 1.5, pane: 1, fmt: v => Fmt.en(v, 1) + "T" }] : [];
      },
      note: A => T("Hashrate trung bình 30 ngày (MA30) và 60 ngày (MA60), cùng độ khó mạng ở khung dưới. Khi MA30 xuống dưới MA60 là thợ đào đang chịu áp lực (capitulation); khi MA30 cắt lên lại trên MA60 (mũi tên xanh) là tín hiệu hồi phục của Hash Ribbons.")
        + " " + (A.now.capitulation ? T("Hiện tại: đang trong giai đoạn thợ đào đầu hàng (MA30 dưới MA60).") : T("Hiện tại: MA30 đang trên MA60, không còn đầu hàng.")) },
    { id: "fng", label: "Fear & Greed vs giá", opt: { log: true },
      series: (A, X) => { const f = (X.fg || []).slice().reverse(); return f.length ? [price(A), { title: "Fear & Greed", data: f.map(p => ({ time: Math.floor(p.t / 86400) * 86400, value: p.v })), color: "#f59e0b", width: 1.5, scale: "left", fmt: v => Fmt.en(v, 0) }] : []; },
      from: (A, X) => X.fg && X.fg.length ? Math.min(...X.fg.map(p => p.t)) : 0,
      note: A => T("Chỉ số Fear & Greed (0–100, trục trái) đặt cạnh giá BTC (trục phải, thang log). Sợ hãi cực độ thường đi cùng giai đoạn giá giảm mạnh, tham lam cực độ đi cùng giai đoạn giá tăng nóng.")
        + (A.now.fg != null ? " " + T("Hiện tại: {v} ({label}).", { v: A.now.fg, label: fgLabel(A.now.fg) }) : "") },
  ];

  const byId = id => list.find(c => c.id === id) || list[0];
  function build(id, A, X) {
    const c = byId(id), series = c.series(A, X);
    return { series, opt: { ...c.opt, from: c.from ? c.from(A, X) : undefined }, note: c.note(A, X) };
  }

  return { list, byId, build, fgLabel };
})();
