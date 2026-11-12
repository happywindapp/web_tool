// OHLC history from VNDirect dchart (public, CORS *): stocks + indices, daily since 2013, 1–60 min since ~2021 (sparse beyond a few months).
const History = (() => {
  const BASE = "https://dchart-api.vndirect.com.vn/dchart/history", cache = new Map(), TTL = 60e3;

  // res: "1" | "5" | "15" | "30" | "60" | "D" → [{ time (unix s, UTC), open, high, low, close, volume }] ascending.
  async function load(sym, res, from, to) {
    const key = `${sym}|${res}|${from}`, hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.bars;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(`${BASE}?resolution=${res}&symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}`, { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      const bars = [];
      if (d && d.s === "ok" && Array.isArray(d.t)) for (let i = 0; i < d.t.length; i++) {
        const b = { time: +d.t[i], open: +d.o[i], high: +d.h[i], low: +d.l[i], close: +d.c[i], volume: +d.v[i] || 0 };
        if (Number.isFinite(b.time) && [b.open, b.high, b.low, b.close].every(Number.isFinite) && (!bars.length || b.time > bars[bars.length - 1].time)) bars.push(b);
      }
      cache.set(key, { at: Date.now(), bars });
      return bars;
    } finally { clearTimeout(timer); }
  }

  return { load };
})();
