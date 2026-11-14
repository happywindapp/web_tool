// Pure money math: holdings P&L + allocation, DCA backtest on daily bars, futures liquidation / P&L, risk-based position size, conversion.
const Pnl = (() => {
  // h = { qty, cost (average buy price, USD) }
  function position(h, price) {
    if (!h || !(h.qty > 0) || !(price > 0)) return null;
    const value = h.qty * price, invested = h.cost > 0 ? h.qty * h.cost : null, pnl = invested == null ? null : value - invested;
    return { value, invested, pnl, pnlPct: invested ? pnl / invested * 100 : null };
  }
  // rows = [{ sym, qty, cost, price }] → totals + allocation sorted by value.
  function summary(rows) {
    let value = 0, invested = 0, costed = 0;
    const alloc = [];
    for (const r of rows) {
      const p = position(r, r.price);
      if (!p) continue;
      value += p.value; alloc.push({ sym: r.sym, value: p.value });
      if (p.invested != null) { invested += p.invested; costed += p.value; }
    }
    alloc.sort((a, b) => b.value - a.value).forEach(a => { a.share = value ? a.value / value * 100 : 0; });
    const pnl = invested ? costed - invested : null;
    return { value, invested: invested || null, pnl, pnlPct: invested ? pnl / invested * 100 : null, alloc };
  }
  return { position, summary };
})();

const Calc = (() => {
  const DAY = 86400;
  const sameBucket = (a, b, every) => {
    const da = new Date(a * 1000), db = new Date(b * 1000);
    if (every === "month") return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth();
    if (every === "week") return Math.floor((a / DAY + 3) / 7) === Math.floor((b / DAY + 3) / 7);
    return Math.floor(a / DAY) === Math.floor(b / DAY);
  };

  // bars: daily { time (s), close } oldest first. Buys `amount` USD at the first close of each period from `from`; compares with one lump sum on day one.
  function dca(bars, { amount, every = "week", from = 0 }) {
    const list = bars.filter(b => b.time >= from && b.close > 0);
    if (!list.length || !(amount > 0)) return null;
    let qty = 0, invested = 0, buys = 0, prev = null;
    const curve = [];
    for (const b of list) {
      if (prev === null || !sameBucket(prev, b.time, every)) { qty += amount / b.close; invested += amount; buys++; prev = b.time; }
      curve.push({ time: b.time, invested, value: qty * b.close });
    }
    const last = list[list.length - 1].close, value = qty * last, lumpQty = invested / list[0].close;
    return { buys, invested, qty, value, avgCost: invested / qty, roi: (value / invested - 1) * 100, last,
      lumpValue: lumpQty * last, lumpRoi: (last / list[0].close - 1) * 100, start: list[0].time, curve };
  }

  // Isolated margin, linear USDT contract: liquidation when the loss eats margin minus maintenance (mmr % of notional).
  function futures({ side = "long", entry, lev, margin, exit, mmr = 0.5 }) {
    if (!(entry > 0) || !(lev >= 1) || !(margin > 0)) return null;
    const s = side === "short" ? -1 : 1, notional = margin * lev, qty = notional / entry, m = mmr / 100;
    const liq = s > 0 ? entry * (1 - 1 / lev + m) : entry * (1 + 1 / lev - m);
    const pnl = exit > 0 ? s * (exit - entry) * qty : null;
    return { notional, qty, liq: Math.max(0, liq), liqDist: (liq / entry - 1) * 100, pnl, roe: pnl == null ? null : pnl / margin * 100 };
  }

  // Risk-based sizing: lose riskPct of the balance if the stop is hit.
  function size({ balance, riskPct, entry, stop }) {
    if (!(balance > 0) || !(riskPct > 0) || !(entry > 0) || !(stop > 0) || stop === entry) return null;
    const risk = balance * riskPct / 100, qty = risk / Math.abs(entry - stop), notional = qty * entry;
    return { risk, qty, notional, lev: notional / balance, stopPct: (stop / entry - 1) * 100 };
  }

  const convert = (amount, fromUsd, toUsd) => amount > 0 && fromUsd > 0 && toUsd > 0 ? amount * fromUsd / toUsd : null;

  return { dca, futures, size, convert };
})();
