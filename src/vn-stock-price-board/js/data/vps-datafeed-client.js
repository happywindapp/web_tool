// VPS public datafeed (unofficial, CORS *): the only host this tool talks to — also pinned by the page CSP connect-src.
const Feed = (() => {
  const BASE = "https://bgapidatafeed.vps.com.vn/", CHUNK = 300;

  async function get(path, ms = 15000) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(BASE + path, { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const text = await r.text();
      return text.trim() ? JSON.parse(text) : [];
    } finally { clearTimeout(timer); }
  }
  const arr = v => Array.isArray(v) ? v : [];

  // Basket / exchange symbol list: VN30, VN100, HNX30, hose, hnx, upcom… (unknown key → empty body).
  const list = async key => [...new Set(arr(await get("getlistckindex/" + encodeURIComponent(key))).filter(WatchParse.isSymbol))];

  async function quotes(symbols) {
    const parts = [];
    for (let i = 0; i < symbols.length; i += CHUNK) parts.push(get("getliststockdata/" + symbols.slice(i, i + CHUNK).join(",")));
    return (await Promise.all(parts)).flatMap(arr).filter(r => r && WatchParse.isSymbol(r.sym)).map(QuoteModel.quote);
  }

  const indices = async () => arr(await get("getlistindexdetail/" + Object.keys(QuoteModel.INDEX_CODES).join(","))).map(QuoteModel.index);
  // Whole-day match history (FPT ≈ 8k trades / 3.5 MB, not gzipped) → load on demand only.
  const trades = async sym => arr(await get("getliststocktrade/" + sym, 30000)).map(QuoteModel.trade);
  const universe = async () => arr(await get("getlistallstock", 30000));

  return { list, quotes, indices, trades, universe };
})();

// Symbol directory (name, exchange, type) cached once per Vietnam trading date; ETF / CW tabs are built from it.
const Universe = (() => {
  const KEY = "web_tool.vn-stock-price-board.universe";
  let map = new Map(), pending = null;

  function fill(rows) {
    map = new Map();
    for (const r of rows) if (r && WatchParse.isSymbol(r.stock_code))
      map.set(r.stock_code, { vi: String(r.name_vn || ""), en: String(r.name_en || ""), ex: String(r.post_to || ""), type: String(r.type || "") });
  }

  const load = () => pending ||= loadOnce().catch(e => { pending = null; throw e; });
  async function loadOnce() {
    const day = QuoteModel.vnDate();
    try { const c = JSON.parse(localStorage.getItem(KEY) || "null"); if (c && c.day === day && Array.isArray(c.rows)) { fill(c.rows); return; } } catch { /* storage blocked */ }
    const rows = await Feed.universe();
    fill(rows);
    const slim = rows.map(r => ({ stock_code: r.stock_code, name_vn: r.name_vn, name_en: r.name_en, post_to: r.post_to, type: r.type }));
    try { localStorage.setItem(KEY, JSON.stringify({ day, rows: slim })); } catch { /* quota / blocked → refetch next load */ }
  }

  const name = (sym, lang) => { const e = map.get(sym); return e ? (lang === "en" && e.en ? e.en : e.vi) : ""; };
  const ofType = t => [...map].filter(([, e]) => e.type === t).map(([s]) => s).sort();
  const has = sym => map.has(sym);
  const ready = () => map.size > 0;

  return { load, name, ofType, has, ready };
})();
