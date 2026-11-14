// Binance spot public REST: USDT pairs directory, 24h tickers, klines (paged back for long history), order book, recent trades.
// api.binance.com first; a refused / blocked region (HTTP 451, network error) switches to the market-data mirror data-api.binance.vision.
const Spot = (() => {
  const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision"];
  let hi = 0;
  const TZ = -new Date().getTimezoneOffset() * 60;

  async function get(path, opt) {
    try { return await Http.json(HOSTS[hi] + path, opt); }
    catch (e) {
      if (e.rateLimited || hi === HOSTS.length - 1) throw e;
      console.warn("Spot.get - switch to mirror host", path, e.message);
      hi++;
      return Http.json(HOSTS[hi] + path, opt);
    }
  }

  // → Map base → "BASEUSDT" (trading pairs only).
  async function pairs() {
    const j = await get("/api/v3/exchangeInfo?permissions=SPOT&symbolStatus=TRADING", { ttl: 3600e3, timeout: 30000 });
    const m = new Map();
    for (const s of j.symbols || []) if (s.quoteAsset === "USDT" && s.status === "TRADING") m.set(s.baseAsset, s.symbol);
    return m;
  }

  // MINI ticker → common tick { pair, last, open, high, low, vol, qvol, pct, at }.
  const tick = t => {
    const last = +t.lastPrice || +t.c, open = +t.openPrice || +t.o;
    return { pair: t.symbol || t.s, last, open, high: +(t.highPrice ?? t.h), low: +(t.lowPrice ?? t.l), vol: +(t.volume ?? t.v), qvol: +(t.quoteVolume ?? t.q),
      pct: open ? (last / open - 1) * 100 : 0, at: +(t.closeTime ?? t.E) || Date.now() };
  };
  // pairs omitted → every symbol (weight 80, ~1 MB raw); otherwise ≤ 100 per call.
  async function tickers(list) {
    if (!list) return (await get("/api/v3/ticker/24hr?type=MINI", { timeout: 30000 })).map(tick);
    const out = [];
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      out.push(...(await get(`/api/v3/ticker/24hr?type=MINI&symbols=${encodeURIComponent(JSON.stringify(chunk))}`)).map(tick));
    }
    return out;
  }

  const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M"];
  const bar = k => ({ time: Math.floor(k[0] / 1000) + TZ, open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5], qv: +k[7] });
  // Newest `limit` bars (≤ 5,000 → up to 5 pages of 1,000 walking back with endTime).
  async function klines(pair, interval, limit = 1000) {
    let out = [], end = null;
    while (out.length < limit) {
      const n = Math.min(1000, limit - out.length);
      const page = await get(`/api/v3/klines?${Http.qs({ symbol: pair, interval, limit: n, endTime: end })}`, { ttl: interval === "1m" ? 0 : 20e3 });
      if (!page.length) break;
      out = page.map(bar).concat(out);
      if (page.length < n) break;
      end = page[0][0] - 1;
    }
    return out;
  }
  const liveBar = k => bar([k.t, k.o, k.h, k.l, k.c, k.v, 0, k.q]);

  async function depth(pair, limit = 20) {
    const j = await get(`/api/v3/depth?symbol=${pair}&limit=${limit}`);
    return { bids: j.bids.map(([p, q]) => [+p, +q]), asks: j.asks.map(([p, q]) => [+p, +q]) };
  }
  // Aggregated trades → { p, q, t, buy } (buy = taker bought, i.e. buyer was not the maker).
  const trade = a => ({ p: +a.p, q: +a.q, t: a.T, buy: !a.m });
  const trades = async (pair, limit = 60) => (await get(`/api/v3/aggTrades?symbol=${pair}&limit=${limit}`)).map(trade).reverse();

  return { pairs, tickers, tick, klines, liveBar, depth, trades, trade, INTERVALS, TZ };
})();
