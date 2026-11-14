// Top strip: live BTC / ETH / SOL / BNB cards (7-day sparkline), total market cap, 24h volume, BTC & ETH dominance, Fear & Greed, USDT→VND.
const Strip = (() => {
  const COINS = ["BTC", "ETH", "SOL", "BNB"];
  let el, g = null, fg = null;
  const e = s => Dom.esc(s ?? "");

  function coin(sym) {
    const r = Coins.row(sym);
    if (!r.last) return "";
    const sp = BoardCols.spark(r.spark, r.pct7d).replace("<svg", '<svg class="spark"');
    return `<button class="ix ${Fmt.tone(r.pct)}" data-coin="${sym}" title="${e(T("Xem chi tiết {s}", { s: sym }))}"><div class="ix-h"><b>${sym}</b><span class="ix-v">${e(Fmt.money(r.last))}</span></div>`
      + `<div class="ix-c ${Fmt.tone(r.pct)}">${e(Fmt.pct(r.pct))} · 24h</div>${sp}</button>`;
  }
  const card = (label, value, sub, cls = "", extra = "", tip = "") => `<div class="ix" title="${e(tip)}"><div class="ix-h"><b>${e(label)}</b></div><div class="ix-v">${e(value)}</div>`
    + `<div class="ix-f"><span class="${cls}">${e(sub)}</span></div>${extra}</div>`;

  function render() {
    if (!el) return;
    const out = COINS.map(coin);
    if (g) {
      out.push(card(T("Tổng vốn hoá"), Fmt.moneyBig(g.mcap), T("{p} trong 24h", { p: Fmt.pct(g.pct) }), Fmt.tone(g.pct), "", T("Tổng vốn hoá thị trường crypto (CoinGecko)")));
      out.push(card(T("KL giao dịch 24h"), Fmt.moneyBig(g.vol), T("{n} coin đang hoạt động", { n: Fmt.en(g.coins) }), "muted"));
      out.push(card(T("Thị phần BTC"), Fmt.en(g.btcD, 1) + "%", T("ETH {p}%", { p: Fmt.en(g.ethD, 1) }), "muted", "", T("BTC dominance: tỷ trọng vốn hoá BTC / toàn thị trường; tăng = dòng tiền rút về BTC, giảm = mùa altcoin")));
    }
    if (fg && fg.length) {
      const now = fg[0], prev = fg[1];
      out.push(card(T("Sợ hãi & Tham lam"), `${now.v} · ${T(now.label)}`, prev ? T("Hôm qua {v}", { v: prev.v }) : "", now.v < 45 ? "down" : now.v > 55 ? "up" : "ref",
        `<div class="fg-bar"><i style="left:${now.v}%"></i></div>`, T("Chỉ số Fear & Greed (alternative.me): 0 = sợ hãi tột độ, 100 = tham lam tột độ")));
    }
    if (Currency.rate()) out.push(card("USDT / VND", Fmt.en(Currency.rate()), "CoinGecko", "muted"));
    el.innerHTML = out.join("") || `<div class="ix empty">${e(T("Đang tải dữ liệu thị trường…"))}</div>`;
  }

  async function loadSlow() {
    const [gl, f] = await Promise.allSettled([Gecko.global(), FearGreed.history(30)]);
    if (gl.status === "fulfilled") g = gl.value; else console.warn("Strip.loadSlow - get global stats fail", gl.reason && gl.reason.message);
    if (f.status === "fulfilled") fg = f.value; else console.warn("Strip.loadSlow - get fear & greed fail", f.reason && f.reason.message);
    render();
  }

  return { init: node => { el = node; render(); }, render, loadSlow, COINS, fearGreed: () => fg, global: () => g };
})();
