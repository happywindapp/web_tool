// Pure watchlist file format: export JSON (tickers + their holdings / notes / alerts) and import from that JSON, plain text or CSV.
const WatchFile = (() => {
  const APP = "crypto-market-board", VERSION = 1, MAX = 200;

  function build({ watch, holdings = {}, alerts = [], now = new Date() }) {
    const set = new Set(watch);
    return JSON.stringify({ app: APP, version: VERSION, exported: now.toISOString(), watch,
      holdings: Object.fromEntries(Object.entries(holdings).filter(([s]) => set.has(s))),
      alerts: alerts.filter(a => set.has(a.sym)).map(({ sym, type, value }) => ({ sym, type, value })) }, null, 2);
  }

  // CSV / TSV on several lines → first cell of each line; otherwise every token.
  function textTokens(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const tabular = lines.length > 1 && lines.filter(l => /[,;\t]/.test(l)).length >= lines.length / 2;
    return tabular ? lines.map(l => l.split(/[,;\t]/)[0].replace(/^"|"$/g, "").trim()) : [text];
  }

  // → { symbols, bad, holdings, alerts, json }; throws only when the text is empty.
  function parse(text) {
    const src = String(text ?? "").replace(/^﻿/, "").trim();
    if (!src) throw new Error("empty");
    let obj = null;
    if (/^[{[]/.test(src)) { try { obj = JSON.parse(src); } catch { obj = null; } }
    if (obj) {
      const list = Array.isArray(obj) ? obj : Array.isArray(obj.watch) ? obj.watch : [];
      const r = CoinParse.parse(list.filter(s => typeof s === "string").join(" "));
      const holdings = obj.holdings && typeof obj.holdings === "object" && !Array.isArray(obj.holdings) ? obj.holdings : {};
      const alerts = Array.isArray(obj.alerts) ? obj.alerts.filter(a => a && typeof a === "object") : [];
      return { symbols: r.symbols.slice(0, MAX), bad: r.bad.slice(0, 20), holdings, alerts, json: true };
    }
    const r = CoinParse.parse(textTokens(src).join(" "));
    return { symbols: r.symbols.slice(0, MAX), bad: r.bad.slice(0, 20), holdings: {}, alerts: [], json: false };
  }

  return { build, parse, APP };
})();
