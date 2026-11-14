// Coin directory: Binance USDT pairs + CoinGecko top 250 (+ search hits) → one row per ticker for every board and the detail pane.
// Live Binance price wins when it agrees with CoinGecko (±15 %, guards against two coins sharing a ticker); market cap follows the live price.
const Coins = (() => {
  let pairMap = new Map(), gecko = new Map(), list = [], at = 0, err = null;
  const extra = new Map();

  async function loadPairs() { pairMap = await Spot.pairs(); }
  async function loadGecko() {
    try {
      const rows = await Gecko.markets(1);
      list = rows; gecko = new Map(); at = Date.now(); err = null;
      for (const r of rows) if (r.sym && !gecko.has(r.sym)) gecko.set(r.sym, r);
    } catch (e) { err = e; throw e; }
  }

  const pair = sym => pairMap.get(sym) || null;
  // Rows seen outside the top 250 (trending, network lists) still give price / cap to the detail pane.
  const g = sym => gecko.get(sym) || (extra.get(sym) && extra.get(sym).price != null ? extra.get(sym) : null);
  const name = sym => g(sym)?.name || extra.get(sym)?.name || "";
  const id = sym => g(sym)?.id || extra.get(sym)?.id || null;
  const known = sym => pairMap.has(sym) || gecko.has(sym) || extra.has(sym);

  const COPY = ["rank", "mcap", "fdv", "circ", "total", "max", "ath", "athPct", "athDate", "atl", "atlPct", "atlDate", "pct1h", "pct7d", "pct30d", "pct1y", "spark"];
  function row(sym) {
    const gr = g(sym), p = pair(sym), t = p ? Live.tick(p) : null, r = { sym, pair: p, name: name(sym), id: id(sym), src: "" };
    if (gr) { for (const k of COPY) r[k] = gr[k]; Object.assign(r, { last: gr.price, pct: gr.pct, high: gr.high, low: gr.low, qvol: gr.qvol, src: "gecko" }); }
    if (t && (!gr || !gr.price || Math.abs(t.last / gr.price - 1) < 0.15)) {
      Object.assign(r, { last: t.last, open: t.open, pct: t.pct, high: t.high, low: t.low, vol: t.vol, qvol: gr && gr.qvol > t.qvol ? gr.qvol : t.qvol, spotQvol: t.qvol, src: "binance", at: t.at });
      if (gr && gr.price) { const k = t.last / gr.price; if (gr.mcap) r.mcap = gr.mcap * k; if (gr.fdv) r.fdv = gr.fdv * k; if (gr.ath) r.athPct = (t.last / gr.ath - 1) * 100; }
    }
    return r;
  }

  // Ticker outside the top 250 / Binance → CoinGecko search (exact ticker, best rank) so the profile + name still work.
  async function resolve(sym) {
    if (known(sym)) return true;
    try {
      const hit = (await Gecko.search(sym)).filter(c => c.sym === sym).sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9))[0];
      if (hit) { extra.set(sym, { id: hit.id, name: hit.name }); return true; }
    } catch (e) { console.warn("Coins.resolve - search coin fail", sym, e.message); }
    return false;
  }

  // rows: CoinGecko-shaped { sym, id, name, price, mcap, … }; the top 250 keeps priority.
  const addExtra = rows => { for (const r of rows) if (r && CoinParse.isSymbol(r.sym) && !gecko.has(r.sym) && (!extra.has(r.sym) || r.price != null)) extra.set(r.sym, r); };

  return { loadPairs, loadGecko, addExtra, pair, gecko: g, name, id, known, row, resolve, list: () => list, spotBases: () => [...pairMap.keys()], hasSpot: b => pairMap.has(b),
    geckoAt: () => at, geckoError: () => err, ready: () => pairMap.size > 0 || gecko.size > 0 };
})();
