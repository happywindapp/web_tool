// Binance USDⓈ-M perpetuals (public): mark / index / funding for every contract, 24h stats, and per-contract history
// (open interest, long/short account ratio, top-trader positions, taker buy/sell volume, funding) — the CryptoQuant / Coinglass view.
const Futures = (() => {
  const API = "https://fapi.binance.com";
  const get = (path, ttl = 0) => Http.json(API + path, { ttl, timeout: 25000 });

  // "1000PEPEUSDT" → { sym: "PEPE", mult: 1000 } unless spot lists the prefixed name itself (1000SATS).
  function base(pair, hasSpot) {
    const b = pair.replace(/USDT$/, ""), m = /^(1000000|1000)([A-Z0-9]+)$/.exec(b);
    if (m && !hasSpot(b)) return { sym: m[2], mult: +m[1] };
    return { sym: b, mult: 1 };
  }

  // Every live USDT perpetual → { pair, sym, mult, last, pct, qvol, high, low, mark, index, funding (%/8h), next (ms), basis (%) }.
  async function board(hasSpot = () => false, ttl = 0) {
    const [prem, tick] = await Promise.all([get("/fapi/v1/premiumIndex", ttl), get("/fapi/v1/ticker/24hr", ttl)]);
    const t24 = new Map(tick.map(t => [t.symbol, t])), fresh = Date.now() - 2 * 864e5, out = [];
    for (const p of prem) {
      const t = t24.get(p.symbol);
      if (!p.symbol.endsWith("USDT") || !t || +t.closeTime < fresh || !(+p.markPrice > 0)) continue;
      const mark = +p.markPrice, index = +p.indexPrice, b = base(p.symbol, hasSpot);
      out.push({ pair: p.symbol, sym: b.sym, mult: b.mult, last: +t.lastPrice, pct: +t.priceChangePercent, qvol: +t.quoteVolume, high: +t.highPrice, low: +t.lowPrice,
        mark, index, funding: +p.lastFundingRate * 100, next: +p.nextFundingTime, basis: index ? (mark / index - 1) * 100 : null });
    }
    return out;
  }

  const P = { "1h": "1h", "4h": "4h", "1d": "1d" };
  const hist = (path, pair, period, limit) => get(`${path}?symbol=${pair}&period=${P[period] || "1d"}&limit=${limit}`, 60e3);
  // → [{ t, oi (coins), oiv (USD) }]
  const openInterest = async (pair, period = "1d", limit = 30) => (await hist("/futures/data/openInterestHist", pair, period, limit)).map(x => ({ t: x.timestamp, oi: +x.sumOpenInterest, oiv: +x.sumOpenInterestValue }));
  // → [{ t, long (0–1), short, ratio }]
  const ratio = x => ({ t: x.timestamp, long: +x.longAccount, short: +x.shortAccount, ratio: +x.longShortRatio });
  const longShort = async (pair, period = "1d", limit = 30) => (await hist("/futures/data/globalLongShortAccountRatio", pair, period, limit)).map(ratio);
  const topTraders = async (pair, period = "1d", limit = 30) => (await hist("/futures/data/topLongShortPositionRatio", pair, period, limit)).map(ratio);
  // → [{ t, buy, sell (coin volume), ratio }]
  const taker = async (pair, period = "1d", limit = 30) => (await hist("/futures/data/takerlongshortRatio", pair, period, limit)).map(x => ({ t: x.timestamp, buy: +x.buyVol, sell: +x.sellVol, ratio: +x.buySellRatio }));
  // → [{ t, rate (%) }] oldest first
  const funding = async (pair, limit = 90) => (await get(`/fapi/v1/fundingRate?symbol=${pair}&limit=${limit}`, 60e3)).map(x => ({ t: +x.fundingTime, rate: +x.fundingRate * 100 }));

  return { board, base, openInterest, longShort, topTraders, taker, funding };
})();
