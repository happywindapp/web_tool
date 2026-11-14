// CoinGecko public API (low rate limit → every call cached; callers poll ≥ 2 min): top coins by market cap, global stats,
// sector categories, trending, coin profile, USDT→VND rate. Rows are normalised to { sym, id, name, rank, price, mcap, … }.
const Gecko = (() => {
  const API = "https://api.coingecko.com/api/v3";
  const get = (path, ttl) => Http.json(API + path, { ttl, timeout: 25000, persist: true, opaqueLimit: true });

  const row = c => ({
    sym: String(c.symbol || "").toUpperCase(), id: c.id, name: c.name, rank: c.market_cap_rank, price: c.current_price, mcap: c.market_cap, fdv: c.fully_diluted_valuation,
    qvol: c.total_volume, high: c.high_24h, low: c.low_24h, pct1h: c.price_change_percentage_1h_in_currency, pct: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h,
    pct7d: c.price_change_percentage_7d_in_currency, pct30d: c.price_change_percentage_30d_in_currency, pct1y: c.price_change_percentage_1y_in_currency,
    circ: c.circulating_supply, total: c.total_supply, max: c.max_supply, ath: c.ath, athPct: c.ath_change_percentage, athDate: c.ath_date,
    atl: c.atl, atlPct: c.atl_change_percentage, atlDate: c.atl_date, spark: c.sparkline_in_7d ? c.sparkline_in_7d.price : null,
  });

  // page 1 = top 250 by market cap (with 7-day sparkline), cached 2 min.
  async function markets(page = 1, category = "") {
    const q = Http.qs({ vs_currency: "usd", order: "market_cap_desc", per_page: 250, page, sparkline: true, price_change_percentage: "1h,24h,7d,30d,1y", category });
    return (await get(`/coins/markets?${q}`, 120e3)).map(row);
  }

  async function global() {
    const d = (await get("/global", 300e3)).data;
    return { mcap: d.total_market_cap.usd, vol: d.total_volume.usd, pct: d.market_cap_change_percentage_24h_usd, btcD: d.market_cap_percentage.btc, ethD: d.market_cap_percentage.eth,
      coins: d.active_cryptocurrencies, markets: d.markets, share: d.market_cap_percentage };
  }

  // Sectors (Messari-style classification) → [{ id, name, mcap, pct, vol, top3: [] }]
  const categories = async () => (await get("/coins/categories", 600e3)).filter(c => c.market_cap > 0)
    .map(c => ({ id: c.id, name: c.name, mcap: c.market_cap, pct: c.market_cap_change_24h, vol: c.volume_24h }));

  // Trending items carry money as "$1,234,567" strings.
  const money = s => { const n = +String(s ?? "").replace(/[^0-9.]/g, ""); return n > 0 ? n : null; };
  const trending = async () => ((await get("/search/trending", 600e3)).coins || []).map(x => x.item).map(i => ({ sym: String(i.symbol).toUpperCase(), id: i.id, name: i.name, rank: i.market_cap_rank,
    price: i.data && +i.data.price || null, pct: i.data && i.data.price_change_percentage_24h ? i.data.price_change_percentage_24h.usd : null,
    mcap: money(i.data && i.data.market_cap), qvol: money(i.data && i.data.total_volume) }));

  // Spot exchanges by CoinGecko trust score → [{ id, name, year, country, url, trust, trustRank, volBtc }]
  const exchanges = async () => (await get("/exchanges?per_page=100&page=1", 600e3)).map(x => ({ id: x.id, name: x.name, year: x.year_established, country: x.country, url: x.url,
    trust: x.trust_score, trustRank: x.trust_score_rank, volBtc: x.trade_volume_24h_btc, incentive: !!x.has_trading_incentive }));

  // Profile for the "Hồ sơ" tab (no tickers / market data → small, cached 1 h).
  async function profile(id) {
    const c = await get(`/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`, 3600e3);
    const L = c.links || {}, first = a => (Array.isArray(a) ? a : []).filter(Boolean)[0] || "";
    return { id: c.id, name: c.name, sym: String(c.symbol || "").toUpperCase(), categories: c.categories || [], genesis: c.genesis_date, algo: c.hashing_algorithm, blockMin: c.block_time_in_minutes,
      desc: c.description && c.description.en || "", platforms: c.platforms || {}, links: { home: first(L.homepage), whitepaper: L.whitepaper || "", explorer: first(L.blockchain_site),
        github: first(L.repos_url && L.repos_url.github), twitter: L.twitter_screen_name ? "https://x.com/" + L.twitter_screen_name : "", reddit: L.subreddit_url || "", forum: first(L.official_forum_url) } };
  }

  // USDT priced in VND ≈ the street rate crypto users quote.
  const vndRate = async () => (await get("/simple/price?ids=tether&vs_currencies=vnd", 600e3)).tether.vnd;
  const search = async q => ((await get(`/search?query=${encodeURIComponent(q)}`, 3600e3)).coins || []).map(c => ({ id: c.id, sym: String(c.symbol).toUpperCase(), name: c.name, rank: c.market_cap_rank }));

  return { markets, global, categories, trending, exchanges, profile, vndRate, search, row };
})();

// Fear & Greed index (alternative.me): [{ t (ms), v, label }] newest first.
const FearGreed = (() => {
  const LABEL = { "Extreme Fear": "Sợ hãi tột độ", Fear: "Sợ hãi", Neutral: "Trung lập", Greed: "Tham lam", "Extreme Greed": "Tham lam tột độ" };
  async function history(limit = 365) {
    const j = await Http.json(`https://api.alternative.me/fng/?limit=${limit}`, { ttl: 1800e3 });
    return (j.data || []).map(d => ({ t: +d.timestamp * 1000, v: +d.value, label: LABEL[d.value_classification] || d.value_classification }));
  }
  return { history, LABEL };
})();
