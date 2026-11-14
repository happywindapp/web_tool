// Inputs of the buy / sell ideas: daily Binance candles (400) of the top ~60 tradable coins → technical scores, 200-day MA, weekly score.
// 6 requests at a time, result cached 15 min (Binance public weight: ~2 per call).
const PicksData = (() => {
  const N = 60, POOL = 6, TTL = 900e3;
  let cache = null, running = null;

  function rowOf(r, daily) {
    const c = daily.map(b => b.close), price = r.last || c[c.length - 1];
    const f = TechOutlook.frame(daily, "D", [5]), weekly = ChartRange.shape(daily, "1W"), fw = weekly.length >= 30 ? TechOutlook.frame(weekly, "W", [4]) : null;
    const ma = c.length >= 200 ? TA.sma(c, 200)[c.length - 1] : null;
    return { sym: r.sym, price, rank: r.rank || 999, d: f ? f.score : null, rsi: f ? f.rsi : null, up5: f && f.odds[5] && f.odds[5].n ? f.odds[5].up : null,
      w: fw ? fw.score : null, above200: ma ? price > ma : null, mayer: ma ? price / ma : null, athPct: r.athPct, ret1y: r.pct1y,
      fdvR: r.fdv && r.mcap ? r.fdv / r.mcap : null, turnover: r.qvol && r.mcap ? r.qvol / r.mcap * 100 : null };
  }

  // onProgress(done, total) while loading; resolves to { rows, at }.
  async function load(onProgress = () => {}) {
    if (cache && Date.now() - cache.at < TTL) return cache;
    if (running) return running;
    running = (async () => {
      const coins = [...new Set(Coins.list().map(g => g.sym))].map(Coins.row).filter(r => r.pair && MarketMath.tradable(r)).sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9)).slice(0, N);
      const rows = [];
      let done = 0;
      for (let i = 0; i < coins.length; i += POOL) {
        await Promise.all(coins.slice(i, i + POOL).map(async r => {
          try { const d = await Spot.klines(r.pair, "1d", 400); if (d.length >= 30) rows.push(rowOf(r, d)); }
          catch (e) { console.warn("PicksData.load - klines fail", r.pair, e.message); }
          onProgress(++done, coins.length);
        }));
      }
      if (rows.length) cache = { rows, at: Date.now() };
      return cache || { rows, at: Date.now() };
    })();
    try { return await running; } finally { running = null; }
  }

  return { load, cached: () => cache };
})();
