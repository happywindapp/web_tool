// Pure: foreign / proprietary net-flow ranking over the last N sessions (values in VND).
const FlowRank = (() => {
  // raw finfo rows (foreigns: tradingDate/buyVal/sellVal · proprietary: date/buyingVal/sellingVal) → { date, code, floor, net, buy, sell }.
  const norm = r => ({ date: String(r.tradingDate || r.date || ""), code: String(r.code || ""), floor: String(r.floor || ""),
    net: +r.netVal || 0, buy: +(r.buyVal ?? r.buyingVal) || 0, sell: +(r.sellVal ?? r.sellingVal) || 0 });

  // Newest n distinct dates present in the rows.
  const lastDates = (rows, n) => [...new Set(rows.map(r => r.date))].sort().reverse().slice(0, n);

  // Rows of the given dates (floor "" = all) → one entry per ticker with summed values.
  function sum(rows, dates, floor = "") {
    const keep = new Set(dates), m = new Map();
    for (const r of rows) {
      if (!keep.has(r.date) || (floor && r.floor !== floor)) continue;
      const x = m.get(r.code) || { code: r.code, floor: r.floor, net: 0, buy: 0, sell: 0 };
      x.net += r.net; x.buy += r.buy; x.sell += r.sell;
      m.set(r.code, x);
    }
    return [...m.values()];
  }

  function rank(list, n = 15) {
    const tot = list.reduce((s, x) => ({ net: s.net + x.net, buy: s.buy + x.buy, sell: s.sell + x.sell }), { net: 0, buy: 0, sell: 0 });
    return { buy: list.filter(x => x.net > 0).sort((a, b) => b.net - a.net).slice(0, n), sell: list.filter(x => x.net < 0).sort((a, b) => a.net - b.net).slice(0, n), tot };
  }

  return { norm, lastDates, sum, rank };
})();
