// DefiLlama (public, CORS *): lazy per-dataset loaders that slim the big payloads right after parsing; own 10-min memo with stale fallback.
const Llama = (() => {
  const API = "https://api.llama.fi", STABLE = "https://stablecoins.llama.fi", TTL = 10 * 60 * 1000, memo = new Map();
  const DIM = "excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true";
  const n = v => Number.isFinite(+v) ? +v : 0;

  async function load(key, url, parse, timeout = 45000) {
    const hit = memo.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.data;
    try {
      const data = parse(await Http.json(url, { ttl: 0, timeout }));
      memo.set(key, { at: Date.now(), data });
      return data;
    } catch (e) {
      if (hit) return hit.data;
      console.warn("Llama.load - fetch fail", key, e.message);
      throw e;
    }
  }

  const tvlHistory = () => load("tvl", `${API}/v2/historicalChainTvl`, j => j.filter(p => p.tvl > 0).map(p => ({ time: +p.date, value: +p.tvl })));
  const chains = () => load("chains", `${API}/v2/chains`, j => j.map(c => ({ name: c.name, tvl: n(c.tvl), symbol: c.tokenSymbol || "" })));

  const protocols = () => load("protocols", `${API}/protocols`, j => j.map(p => ({ id: String(p.id), name: p.name, slug: p.slug, symbol: p.symbol && p.symbol !== "-" ? String(p.symbol).toUpperCase() : "",
    category: p.category || "Other", chains: p.chains || [], tvl: n(p.tvl), change_1d: p.change_1d, change_7d: p.change_7d, mcap: p.mcap > 0 ? +p.mcap : null,
    gecko_id: p.gecko_id || null, parentProtocol: p.parentProtocol || null, parent: p.parentProtocol || null })));

  const dim = (path, type) => load(path + (type || ""), `${API}/overview/${path}?${DIM}${type ? "&dataType=" + type : ""}`, j => ({
    total24h: n(j.total24h), total7d: n(j.total7d), total30d: n(j.total30d), total1y: n(j.total1y), change_1d: j.change_1d ?? null, change_7d: j.change_7d ?? null,
    rows: (j.protocols || []).map(p => ({ id: String(p.defillamaId), name: p.displayName || p.name, slug: p.slug, category: p.category || "Other", chains: p.chains || [],
      parent: p.parentProtocol || null, d1: n(p.total24h), p1: n(p.total48hto24h), d7: n(p.total7d), d30: n(p.total30d), y1: n(p.total1y) })) }));

  const fees = () => dim("fees");
  const revenue = () => dim("fees", "dailyRevenue");
  const dexs = () => dim("dexs");

  const stables = () => load("stables", `${STABLE}/stablecoins?includePrices=false`, j => (j.peggedAssets || []).map(s => ({ name: s.name, symbol: s.symbol, peg: s.pegType || "", mech: s.pegMechanism || "",
    cur: n(s.circulating?.peggedUSD), d1: n(s.circulatingPrevDay?.peggedUSD), d7: n(s.circulatingPrevWeek?.peggedUSD), d30: n(s.circulatingPrevMonth?.peggedUSD), chains: (s.chains || []).length }))
    .filter(s => s.cur > 0));
  const stableHistory = () => load("stableChart", `${STABLE}/stablecoincharts/all`, j => j.map(p => ({ time: +p.date, value: n(p.totalCirculatingUSD?.peggedUSD) })).filter(p => p.value > 0));

  return { tvlHistory, chains, protocols, fees, revenue, dexs, stables, stableHistory, clear: () => memo.clear() };
})();
