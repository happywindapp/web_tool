// Shared daily Binance candles (400 per pair), cached 15 min, loaded 6 requests at a time (used by buy / sell ideas and the screener).
const DailyBars = (() => {
  const TTL = 900e3, POOL = 6, cache = new Map();

  function get(pair) {
    const hit = cache.get(pair);
    if (hit && Date.now() - hit.at < TTL) return hit.p;
    const p = Spot.klines(pair, "1d", 400);
    cache.set(pair, { at: Date.now(), p });
    p.catch(() => { if (cache.get(pair) && cache.get(pair).p === p) cache.delete(pair); });
    return p;
  }

  // pairs → Map pair → bars (failed pairs left out); onProgress(done, total).
  async function many(pairs, onProgress = () => {}) {
    const out = new Map();
    let done = 0;
    for (let i = 0; i < pairs.length; i += POOL) {
      await Promise.all(pairs.slice(i, i + POOL).map(async pair => {
        try { out.set(pair, await get(pair)); } catch (e) { console.warn("DailyBars.many - klines fail", pair, e.message); }
        onProgress(++done, pairs.length);
      }));
    }
    return out;
  }

  return { get, many };
})();
