// Coin lists behind the tables "Top 100", "Trending" (CoinGecko trending + movers among the top 250) and "Mạng lưới" (coins of one
// chain ecosystem, CoinGecko category) + the filter bar above each table (CoinMarketCap-style network / trending pickers).
const TabSources = (() => {
  const NETWORKS = [["ethereum-ecosystem", "Ethereum"], ["binance-smart-chain", "BNB Chain"], ["solana-ecosystem", "Solana"], ["base-ecosystem", "Base"], ["arbitrum-ecosystem", "Arbitrum"],
    ["polygon-ecosystem", "Polygon"], ["avalanche-ecosystem", "Avalanche"], ["tron-ecosystem", "Tron"], ["sui-ecosystem", "Sui"], ["ton-ecosystem", "TON"], ["optimism-ecosystem", "Optimism"],
    ["hyperliquid-ecosystem", "Hyperliquid"], ["aptos-ecosystem", "Aptos"], ["near-protocol-ecosystem", "NEAR"], ["cardano-ecosystem", "Cardano"], ["cosmos-ecosystem", "Cosmos"], ["bitcoin-ecosystem", "Bitcoin"]];
  const MODES = [["hot", "Đang hot"], ["gain", "Tăng mạnh 24h"], ["lose", "Giảm mạnh 24h"], ["move1h", "Biến động mạnh 1 giờ"], ["turnover", "KL / vốn hoá cao"]];
  const TABS = new Set(["top100", "trending", "network"]);
  let net = NETWORKS.some(n => n[0] === Prefs.get("net")) ? Prefs.get("net") : "ethereum-ecosystem";
  let mode = MODES.some(m => m[0] === Prefs.get("trend")) ? Prefs.get("trend") : "hot";
  let hot = [], netSyms = new Map(), err = null, loading = false, seq = 0;
  const e = s => Dom.esc(s ?? "");
  const uniq = list => [...new Set(list)];
  const top = () => uniq(Coins.list().map(g => g.sym)).map(Coins.row);

  function movers() {
    const rows = top();
    if (mode === "gain") return MarketMath.movers(rows, "pct", 50);
    if (mode === "lose") return MarketMath.movers(rows, "pct", 50, true);
    if (mode === "move1h") return MarketMath.movers(rows.map(r => ({ ...r, abs1h: Math.abs(r.pct1h) })), "abs1h", 50);
    return MarketMath.movers(rows.map(r => ({ ...r, turn: r.mcap ? r.qvol / r.mcap : null })), "turn", 50);
  }

  // Tickers of a table tab in display order.
  function syms(tab) {
    if (tab === "top100") return uniq(Coins.list().slice().sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9)).map(g => g.sym)).slice(0, 100);
    if (tab === "trending") return mode === "hot" ? hot : movers().map(r => r.sym);
    if (tab === "network") return netSyms.get(net) || [];
    return [];
  }

  function bar(tab) {
    const note = loading ? `<span class="muted">${e(T("Đang tải…"))}</span>` : err ? `<span class="warn">${e(err.rateLimited ? T("CoinGecko giới hạn tần suất — thử lại sau ~{n}s.", { n: err.retryIn || 60 }) : T("Không tải được danh sách từ CoinGecko."))}</span>` : "";
    if (tab === "trending") return `<span class="seg">${MODES.map(([k, l]) => `<button data-tm="${k}"${k === mode ? ' class="on"' : ""}>${e(T(l))}</button>`).join("")}</span>`
      + `<span class="muted">${e(mode === "hot" ? T("Coin được tìm nhiều nhất trên CoinGecko 24h qua") : T("Trong top 250 vốn hoá, bỏ stablecoin, KL ≥ $1M"))}</span>${note}`;
    if (tab === "network") return `<label class="chk">${e(T("Mạng lưới"))} <select id="netSel">${NETWORKS.map(([k, l]) => `<option value="${k}"${k === net ? " selected" : ""}>${e(l)}</option>`).join("")}</select></label>`
      + `<span class="muted">${e(T("Top 250 coin của hệ sinh thái theo vốn hoá (CoinGecko); token đa chuỗi có thể xuất hiện ở nhiều mạng"))}</span>${note}`;
    return "";
  }

  // Loads what the tab needs; onDone redraws the table.
  async function load(tab, onDone) {
    const my = ++seq;
    if (tab === "trending" && mode === "hot" && !hot.length || tab === "network" && !netSyms.has(net)) {
      loading = true; err = null; onDone();
      try {
        if (tab === "trending") { const t = await Gecko.trending(); Coins.addExtra(t); if (my === seq) hot = uniq(t.map(x => x.sym)); }
        else { const id = net, rows = await Gecko.markets(1, id); Coins.addExtra(rows); netSyms.set(id, uniq(rows.map(r => r.sym))); }
      } catch (x) { console.warn("TabSources.load - get list fail", tab, x.message); if (my === seq) err = x; }
      if (my === seq) loading = false;
    }
    onDone();
  }

  // Filter bar click / change → true when the list changed.
  function act(el) {
    if (el.dataset && el.dataset.tm && MODES.some(m => m[0] === el.dataset.tm)) { mode = el.dataset.tm; Prefs.set("trend", mode); return true; }
    if (el.id === "netSel" && NETWORKS.some(n => n[0] === el.value)) { net = el.value; Prefs.set("net", net); return true; }
    return false;
  }

  return { has: t => TABS.has(t), syms, bar, load, act, NETWORKS };
})();
