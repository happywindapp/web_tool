// Whole-market data for the market / screener / sector tabs: listed tickers, ICB sectors, bulk valuation ratios (cached per Vietnam date).
const Market = (() => {
  const KEY = "web_tool.vn-stock-price-board.market.", RATIOS = ["MARKETCAP", "PRICE_TO_EARNINGS", "PRICE_TO_BOOK", "ROAE_TR_AVG5Q", "DIVIDEND_YIELD"];
  const CHUNK = 100, PARALLEL = 6;
  let all = null, sectors = null, sectorsP = null, ratios = null, ratiosP = null, progress = null;
  const listeners = [];

  const cacheGet = k => { try { const c = JSON.parse(localStorage.getItem(KEY + k) || "null"); return c && c.day === QuoteModel.vnDate() ? c.v : null; } catch { return null; } };
  const cacheSet = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify({ day: QuoteModel.vnDate(), v })); } catch { /* quota → refetch next visit */ } };

  async function allSymbols() {
    if (all) return all;
    const lists = await Promise.all(["hose", "hnx", "upcom"].map(Feed.list));
    if (lists.some(l => !l.length)) throw new Error("empty exchange list");
    return (all = [...new Set(lists.flat())]);
  }

  // { levels: { 1: [...], 2: [...], 3: [...] } as { code, vi, en, parent, codes[] }, of: sym → { 1, 2, 3 } sector codes }.
  function sectorsLoad() {
    return sectorsP ||= (async () => {
      let raw = cacheGet("sectors");
      if (!raw) {
        raw = await Promise.all([1, 2, 3].map(Finfo.industries));
        if (raw.some(l => !l.length)) throw new Error("empty ICB level");
        cacheSet("sectors", raw);
      }
      const levels = {}, of = new Map();
      raw.forEach((rows, i) => {
        levels[i + 1] = rows.filter(r => r && r.industryCode).map(r => ({ code: String(r.industryCode), vi: String(r.vietnameseName || ""), en: String(r.englishName || ""),
          parent: String(r.higherLevelCode || ""), codes: String(r.codeList || "").split(",").filter(WatchParse.isSymbol) }));
        for (const s of levels[i + 1]) for (const c of s.codes) (of.get(c) || of.set(c, {}).get(c))[i + 1] = s.code;
      });
      return (sectors = { levels, of });
    })().catch(e => { sectorsP = null; throw e; });
  }

  const sectorName = (code, lang) => { for (const l of [1, 2, 3]) { const s = sectors?.levels[l].find(x => x.code === code); if (s) return lang === "en" && s.en ? s.en : s.vi; } return code; };
  const sectorCodes = async code => { await sectorsLoad(); for (const l of [1, 2, 3]) { const s = sectors.levels[l].find(x => x.code === code); if (s) return s.codes.slice().sort(); } return []; };

  // sym → { mcap, pe, pb, roe, dy } for the given tickers, fetched in chunks with a small worker pool; onStep(done, total).
  async function ratiosFor(codes, onStep) {
    const chunks = [];
    for (let i = 0; i < codes.length; i += CHUNK) chunks.push(codes.slice(i, i + CHUNK));
    const out = new Map();
    let next = 0, done = 0, failed = 0;
    const worker = async () => {
      while (next < chunks.length) {
        const rows = await Finfo.ratiosBulk(chunks[next++], RATIOS).catch(e => { console.warn("Market.ratiosFor - chunk fail", e); return []; });
        if (!rows.length) failed++;
        for (const r of rows) {
          if (!WatchParse.isSymbol(r.code) || !Number.isFinite(+r.value)) continue;
          const o = out.get(r.code) || out.set(r.code, {}).get(r.code), k = { MARKETCAP: "mcap", PRICE_TO_EARNINGS: "pe", PRICE_TO_BOOK: "pb", ROAE_TR_AVG5Q: "roe", DIVIDEND_YIELD: "dy" }[r.ratioCode];
          if (k) o[k] = +r.value;
        }
        if (onStep) onStep(++done, chunks.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, worker));
    if (chunks.length && failed === chunks.length) throw new Error("all ratio chunks failed");
    out.partial = failed > 0;
    return out;
  }

  // Whole market once per day (~1,500 tickers, ~15–30 s the first time); listeners get progress and completion.
  function ratiosAll() {
    if (ratios && !ratios.partial) return Promise.resolve(ratios);
    return ratiosP ||= (async () => {
      const cached = cacheGet("ratios");
      if (cached) return (ratios = new Map(Object.entries(cached)));
      const syms = await allSymbols();
      const m = await ratiosFor(syms, (d, n) => { progress = { done: d, total: n }; listeners.forEach(f => f()); });
      if (!m.partial) cacheSet("ratios", Object.fromEntries(m));
      progress = null;
      // Partial data is shown now but the next market / screener visit fetches again.
      if (m.partial) ratiosP = null;
      return (ratios = m);
    })().catch(e => { ratiosP = null; progress = null; throw e; }).finally(() => listeners.forEach(f => f()));
  }

  return { allSymbols, sectorsLoad, sectorName, sectorCodes, ratiosFor, ratiosAll, sectors: () => sectors, ratios: () => ratios, progress: () => progress,
    onChange: f => listeners.push(f) };
})();
