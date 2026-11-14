// Pure watchlist file format: export JSON (tickers + their notes / alerts) and import from that JSON, plain text or CSV.
const WatchFile = (() => {
  const APP = "vn-stock-price-board", VERSION = 1, MAX = 300;

  // { watch, notes: { sym: { text, target } }, alerts: [...] } → pretty JSON; notes / alerts limited to the exported tickers.
  function build({ watch, notes = {}, alerts = [], now = new Date() }) {
    const set = new Set(watch);
    return JSON.stringify({ app: APP, version: VERSION, exported: now.toISOString(), watch,
      notes: Object.fromEntries(Object.entries(notes).filter(([s]) => set.has(s))),
      alerts: alerts.filter(a => set.has(a.sym)).map(({ sym, type, value }) => ({ sym, type, value })) }, null, 2);
  }

  // CSV / TSV (comma, semicolon or tab on several lines) → first cell of each line; otherwise every token.
  function textTokens(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const tabular = lines.length > 1 && lines.filter(l => /[,;\t]/.test(l)).length >= lines.length / 2;
    return tabular ? lines.map(l => l.split(/[,;\t]/)[0].replace(/^"|"$/g, "").trim()) : [text];
  }

  // → { symbols, bad, notes, alerts, json } ; throws only when nothing usable is inside.
  function parse(text) {
    const src = String(text ?? "").replace(/^﻿/, "").trim();
    if (!src) throw new Error("empty");
    let obj = null;
    if (/^[{[]/.test(src)) { try { obj = JSON.parse(src); } catch { obj = null; } }
    if (obj) {
      const list = Array.isArray(obj) ? obj : Array.isArray(obj.watch) ? obj.watch : [];
      const r = WatchParse.parse(list.filter(s => typeof s === "string").join(" "));
      const notes = obj.notes && typeof obj.notes === "object" && !Array.isArray(obj.notes) ? obj.notes : {};
      const alerts = Array.isArray(obj.alerts) ? obj.alerts.filter(a => a && typeof a === "object") : [];
      return { symbols: r.symbols.slice(0, MAX), bad: r.bad, notes, alerts, json: true };
    }
    const tokens = textTokens(src), r = WatchParse.parse(tokens.join(" "));
    return { symbols: r.symbols.slice(0, MAX), bad: r.bad.slice(0, 20), notes: {}, alerts: [], json: false };
  }

  return { build, parse, APP };
})();
