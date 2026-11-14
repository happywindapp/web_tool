// Pure buy / sell idea lists per horizon for crypto (short 1–2 weeks, medium 1–3 months, long 6–12 months), rules fixed and shown in the UI.
// Row: { sym, price, rank, d (daily TechOutlook score), rsi, w (weekly score), above200, mayer (price / 200-day MA), athPct, ret1y, fdvR (FDV / cap), turnover (% vol / cap), up5 }
const CoinPicks = (() => {
  const TOP = 6;
  const ok = x => Number.isFinite(x);
  const min = Math.min;

  const RULES = {
    buyShort: { test: r => ok(r.d) && ((r.d >= 15 && r.rsi < 70) || (r.rsi <= 32 && r.w > 0)), score: r => (r.rsi <= 32 && r.w > 0 ? 40 : r.d) + (r.w > 0 ? 10 : 0) + (r.turnover >= 5 ? 5 : 0) },
    buyMedium: { test: r => ok(r.w) && r.w >= 15 && r.d > -15, score: r => r.w + (r.above200 ? 15 : 0) + (ok(r.mayer) && r.mayer < 1.3 ? 10 : 0) - (r.mayer > 2 ? 15 : 0) },
    // "Good price": deep below the all-time high, near / under the 200-day MA, trend not collapsing, little dilution left.
    buyLong: { test: r => r.rank <= 100 && ok(r.athPct) && r.athPct <= -40 && ok(r.mayer) && r.mayer <= 1.2 && (!ok(r.w) || r.w > -30) && !(r.fdvR >= 2),
      score: r => min(60, -r.athPct * 0.6) + (1.2 - r.mayer) * 40 + (r.rank <= 20 ? 15 : r.rank <= 50 ? 8 : 0) + (r.w > 0 ? 10 : 0) },
    sellShort: { test: r => ok(r.d) && ((r.d <= -15 && !(r.rsi <= 32 && r.w > 0)) || r.rsi >= 75), score: r => -r.d + (r.rsi >= 75 ? 20 : 0) + (r.w < 0 ? 10 : 0) },
    sellMedium: { test: r => ok(r.w) && r.w <= -15 && r.d < 15, score: r => -r.w + (r.above200 === false ? 15 : 0) },
    // "Price is high": far above the 200-day MA, at / near the all-time high, or heavy future dilution while trending down.
    sellLong: { test: r => (ok(r.mayer) && r.mayer >= 1.8) || (ok(r.athPct) && r.athPct > -15 && r.mayer >= 1.3) || (r.fdvR >= 3 && r.above200 === false),
      score: r => (ok(r.mayer) ? (r.mayer - 1) * 40 : 0) + (r.athPct > -15 ? 15 : 0) + (r.fdvR >= 3 ? 15 : 0) + (r.ret1y > 150 ? 10 : 0) },
  };

  // Facts behind a pick as { key, v } (the UI words and translates them).
  function reasons(r, kind) {
    const out = [], add = (key, v) => out.push({ key, v });
    if (kind.endsWith("Short")) { add("day", r.d); if (ok(r.rsi)) add("rsi", Math.round(r.rsi)); if (ok(r.w)) add("week", r.w); if (ok(r.up5)) add("odds", Math.round(r.up5)); }
    if (kind.endsWith("Medium")) { add("week", r.w); if (r.above200 != null) add(r.above200 ? "above200" : "below200"); if (ok(r.mayer)) add("mayer", +r.mayer.toFixed(2)); }
    if (kind.endsWith("Long")) { if (ok(r.athPct)) add("ath", Math.round(r.athPct)); if (ok(r.mayer)) add("mayer", +r.mayer.toFixed(2)); if (ok(r.fdvR) && r.fdvR >= 1.5) add("fdv", +r.fdvR.toFixed(1)); if (ok(r.ret1y)) add("ret1y", Math.round(r.ret1y)); add("rank", r.rank); }
    return out;
  }

  // A coin appears at most once per side and horizon.
  function rank(rows) {
    const out = {};
    for (const [kind, rule] of Object.entries(RULES)) {
      out[kind] = rows.filter(r => { try { return rule.test(r); } catch { return false; } })
        .map(r => ({ sym: r.sym, price: r.price, score: Math.round(rule.score(r)), reasons: reasons(r, kind) }))
        .filter(x => ok(x.score)).sort((a, b) => b.score - a.score || a.sym.localeCompare(b.sym)).slice(0, TOP);
    }
    return out;
  }

  return { RULES, rank, reasons, TOP };
})();
