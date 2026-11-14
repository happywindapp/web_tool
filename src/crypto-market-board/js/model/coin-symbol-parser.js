// Coin tickers typed / pasted / shared: "btc, ETH; sol" → ["BTC", "ETH", "SOL"]; quote suffixes (BTCUSDT, ETH/USDT, SOL-USD) are stripped.
const CoinParse = (() => {
  const RE = /^[A-Z0-9]{1,15}$/;
  const QUOTE = /(?:[/_-]?)(USDT|USDC|FDUSD|BUSD|USD)$/;
  const isSymbol = s => typeof s === "string" && RE.test(s) && /[A-Z]/.test(s);

  function norm(tok) {
    let s = String(tok).trim().toUpperCase().replace(/^\$/, "");
    if (s.length > 4 && QUOTE.test(s) && !/^(USDT|USDC|FDUSD|BUSD|USD)$/.test(s)) s = s.replace(QUOTE, "");
    return s;
  }

  // → { symbols: unique valid tickers in order, bad: rejected tokens }
  function parse(text) {
    const symbols = [], bad = [];
    for (const raw of String(text || "").split(/[\s,;|\t]+/)) {
      if (!raw) continue;
      const s = norm(raw);
      if (isSymbol(s)) { if (!symbols.includes(s)) symbols.push(s); } else bad.push(raw.slice(0, 20));
    }
    return { symbols, bad };
  }

  const clean = (list, max = 200) => Array.isArray(list) ? [...new Set(list.filter(isSymbol))].slice(0, max) : [];

  return { parse, clean, isSymbol, norm };
})();
