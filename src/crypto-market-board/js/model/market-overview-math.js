// Pure whole-market reads on CoinGecko top-250 rows: stablecoin / wrapped-token filters, Altcoin Season index, top movers, dominance slices.
const MarketMath = (() => {
  const STABLE = new Set(["USDT", "USDC", "DAI", "FDUSD", "TUSD", "USDE", "USDS", "PYUSD", "USD1", "BUSD", "USDD", "FRAX", "RLUSD", "USDG", "GHO", "LUSD", "USDX", "USDB", "USD0", "EURC", "XAUT", "PAXG", "BFUSD", "USDTB", "USDF", "SUSDE", "SUSDS", "BUIDL"]);
  const WRAP = /^(W|ST|CB|WE|R|M|J|B|EZ|SW|OS)?(BTC|ETH|SOL|BNB|AVAX)$|^(STETH|WSTETH|RETH|WEETH|EETH|METH|CBETH|LSETH|JITOSOL|MSOL|BNSOL|SOLVBTC|LBTC|TBTC|CBBTC|WBTC|BTCB)$/;
  const CORE = new Set(["BTC", "ETH", "SOL", "BNB", "AVAX"]);
  const isStable = r => STABLE.has(r.sym) || (r.last > 0.97 && r.last < 1.03 && Math.abs(r.pct7d ?? 99) < 1 && Math.abs(r.pct30d ?? 99) < 2);
  const isWrapped = r => !CORE.has(r.sym) && (WRAP.test(r.sym) || /^(wrapped|staked|bridged|liquid staked)\b/i.test(r.name || ""));
  const tradable = r => !isStable(r) && !isWrapped(r);

  // Share of the top N (no stablecoins / wrapped tokens) that beat BTC over 30 days: ≥ 75 = altcoin season, ≤ 25 = bitcoin season.
  function altSeason(rows, n = 50) {
    const btc = rows.find(r => r.sym === "BTC");
    if (!btc || !Number.isFinite(btc.pct30d)) return null;
    const pool = rows.filter(r => r.sym !== "BTC" && tradable(r) && Number.isFinite(r.pct30d)).sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9)).slice(0, n);
    if (pool.length < 10) return null;
    const beat = pool.filter(r => r.pct30d > btc.pct30d);
    return { score: Math.round(beat.length / pool.length * 100), beat: beat.length, n: pool.length, btc: btc.pct30d, phase: beat.length / pool.length >= 0.75 ? "alt" : beat.length / pool.length <= 0.25 ? "btc" : "mixed" };
  }

  // Top movers by key among liquid, non-stable coins.
  function movers(rows, key, n = 8, asc = false, minVol = 1e6) {
    return rows.filter(r => tradable(r) && Number.isFinite(r[key]) && (r.qvol || 0) >= minVol).sort((a, b) => asc ? a[key] - b[key] : b[key] - a[key]).slice(0, n);
  }

  // CoinGecko market_cap_percentage map → [{ k, pct }] top n + "others".
  function dominance(share, n = 7) {
    const list = Object.entries(share || {}).map(([k, pct]) => ({ k: k.toUpperCase(), pct })).filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct);
    const top = list.slice(0, n), rest = 100 - top.reduce((t, x) => t + x.pct, 0);
    return rest > 0.05 ? [...top, { k: "", pct: rest }] : top;
  }

  // Heatmap colour: −10 % … 0 … +10 % → red … grey … green.
  function heat(pct, cap = 10) {
    const p = Math.max(-cap, Math.min(cap, Number.isFinite(pct) ? pct : 0)) / cap, base = [71, 85, 105], to = p >= 0 ? [22, 163, 74] : [220, 38, 38], k = Math.abs(p) ** 0.7;
    return `rgb(${base.map((b, i) => Math.round(b + (to[i] - b) * k)).join(",")})`;
  }

  return { isStable, isWrapped, tradable, altSeason, movers, dominance, heat };
})();
