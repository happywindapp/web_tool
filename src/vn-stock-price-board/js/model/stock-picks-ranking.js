// Pure buy / sell idea lists per horizon from per-ticker technical scores + valuation vs. sector medians. Rules are fixed and listed in the docs.
// Row: { sym, price, d (daily score), rsi, w (weekly score), above200 (bool|null), ret1y, pe, pb, roe (%), dy (%), secPe, value (bn traded) }.
const Picks = (() => {
  const TOP = 8;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ok = x => Number.isFinite(x);
  const cheap = r => ok(r.pe) && r.pe > 0 && ok(r.secPe) && r.pe < r.secPe * 0.85;
  const dear = r => !ok(r.pe) || r.pe <= 0 || (ok(r.secPe) && r.pe > r.secPe * 1.4);

  // Each rule: filter + score (higher = stronger idea) + reason keys shown to the user.
  const RULES = {
    buyShort: { test: r => ok(r.d) && ((r.d >= 15 && r.rsi < 70) || (r.rsi <= 32 && r.w > 0)),
      score: r => (r.rsi <= 32 && r.w > 0 ? 40 : r.d) + (r.w > 0 ? 10 : 0) + (cheap(r) ? 10 : 0) },
    buyMedium: { test: r => ok(r.w) && r.w >= 15 && r.d > -15, score: r => r.w + (r.above200 ? 15 : 0) + (cheap(r) ? 10 : 0) },
    buyLong: { test: r => ok(r.roe) && r.roe >= 15 && ok(r.pe) && r.pe > 0 && (!ok(r.secPe) || r.pe <= r.secPe * 1.1),
      score: r => r.roe + (ok(r.secPe) ? clamp((r.secPe / r.pe - 1) * 40, -20, 40) : 0) + (ok(r.dy) ? r.dy * 3 : 0) + (r.above200 ? 5 : 0) },
    sellShort: { test: r => ok(r.d) && (r.d <= -15 || r.rsi >= 75), score: r => -r.d + (r.rsi >= 75 ? 20 : 0) + (r.w < 0 ? 10 : 0) },
    sellMedium: { test: r => ok(r.w) && r.w <= -15 && r.d < 15, score: r => -r.w + (r.above200 === false ? 15 : 0) + (dear(r) ? 10 : 0) },
    sellLong: { test: r => r.above200 === false && (dear(r) || (ok(r.roe) && r.roe < 8)),
      score: r => (ok(r.pe) && r.pe > 0 && ok(r.secPe) ? clamp((r.pe / r.secPe - 1) * 40, 0, 60) : 40) + (ok(r.roe) ? Math.max(0, 10 - r.roe) * 2 : 10) + (r.ret1y < 0 ? 10 : 0) },
  };

  // Facts behind a pick, as { key, v } for the UI to word (and translate).
  function reasons(r, kind) {
    const out = [], add = (key, v) => out.push({ key, v });
    if (kind.endsWith("Short")) { add("day", r.d); if (ok(r.rsi)) add("rsi", r.rsi); if (ok(r.w)) add("week", r.w); }
    if (kind.endsWith("Medium")) { add("week", r.w); if (r.above200 !== null) add(r.above200 ? "above200" : "below200"); }
    if (kind.endsWith("Long")) { if (ok(r.pe)) add("pe", r.pe); if (ok(r.secPe)) add("secPe", r.secPe); if (ok(r.roe)) add("roe", r.roe); if (ok(r.dy) && r.dy > 0) add("dy", r.dy); if (r.above200 !== null) add(r.above200 ? "above200" : "below200"); }
    if (kind.startsWith("buy") && cheap(r)) add("cheap");
    if (kind.startsWith("sell") && ok(r.pe) && r.pe > 0 && dear(r)) add("dear");
    return out;
  }

  // A ticker appears at most once per side and horizon; liquidity floor keeps illiquid names out.
  function rank(rows, { minValue = 1 } = {}) {
    const liquid = rows.filter(r => !ok(r.value) || r.value >= minValue), out = {};
    for (const [kind, rule] of Object.entries(RULES)) {
      out[kind] = liquid.filter(r => { try { return rule.test(r); } catch { return false; } })
        .map(r => ({ sym: r.sym, price: r.price, score: Math.round(rule.score(r)), reasons: reasons(r, kind) }))
        .filter(x => Number.isFinite(x.score)).sort((a, b) => b.score - a.score || a.sym.localeCompare(b.sym)).slice(0, TOP);
    }
    return out;
  }

  // Median of positive P/E per sector code from whole-market ratios.
  function sectorPe(entries) {
    const by = new Map();
    for (const { sector, pe } of entries) if (sector && ok(pe) && pe > 0 && pe < 200) (by.get(sector) || by.set(sector, []).get(sector)).push(pe);
    const med = a => { const s = a.sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    return new Map([...by].filter(([, a]) => a.length >= 3).map(([k, a]) => [k, med(a)]));
  }

  return { RULES, rank, reasons, sectorPe, TOP };
})();
