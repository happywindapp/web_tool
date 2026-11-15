// Pure technical-signal alert rules: candle events on the last CLOSED bar, or price inside a CoinAdvice buy / sell zone. Fires once, then waits for re-arm.
const SignalAlertRule = (() => {
  const ZONES = { buyZone: ["Giá vào vùng mua (Khuyến nghị)", "buy"], sellZone: ["Giá vào vùng bán / chốt lời (Khuyến nghị)", "sell"] };
  const INTERVALS = ["1h", "4h", "1d"];
  const HORIZONS = { short: "Ngắn hạn", medium: "Trung hạn", long: "Dài hạn" };
  const isZone = a => Object.hasOwn(ZONES, a.signal);
  const valid = a => !!a && typeof a.sym === "string" && (isZone(a) ? Object.hasOwn(HORIZONS, a.horizon) : CoinSignals.KEYS.includes(a.signal) && INTERVALS.includes(a.interval));
  const bearish = a => ["sellZone", "deathCross", "crossDown200", "macdDown", "rsiExitOverbought", "breakdown20"].includes(a.signal);
  const barKey = a => `${a.sym}|${a.interval}`;
  const SPAN = { "1h": 3600, "4h": 14400, "1d": 86400 };

  // Lookups the poller must fetch for the armed alerts: candle groups (sym|interval) and zone coins.
  function needs(list) {
    const armed = list.filter(a => !a.fired), bars = new Map(), zones = new Set();
    for (const a of armed) if (isZone(a)) zones.add(a.sym); else bars.set(barKey(a), { sym: a.sym, interval: a.interval });
    return { bars, zones };
  }

  function zoneHit(a, advice, price) {
    const h = advice && advice.horizons.find(x => x.id === a.horizon), z = h && h[ZONES[a.signal][1]];
    return !!z && price > 0 && price >= z.lo && price <= z.hi;
  }

  // Only bars closing after the alert was (re-)armed (a.at, ms) fire. ctx: { tz (bar time shift, s), bars: Map "SYM|interval" → closed bars, advice: Map sym → CoinAdvice.build result, price: Map sym → last price } → hits [{ ...alert, price, bar }]
  function evaluate(list, ctx) {
    const hits = [];
    for (const a of list) {
      if (a.fired) continue;
      if (isZone(a)) { const p = ctx.price.get(a.sym); if (zoneHit(a, ctx.advice.get(a.sym), p)) hits.push({ ...a, price: p, bar: 0 }); continue; }
      const bars = ctx.bars.get(barKey(a));
      if (!bars || bars.length < 31) continue;
      const t = bars[bars.length - 1].time;
      if (t !== a.bar && (t - (ctx.tz || 0) + SPAN[a.interval]) * 1000 >= (a.at || 0) && CoinSignals.events(bars, 0, [a.signal]).length) hits.push({ ...a, price: bars[bars.length - 1].close, bar: t });
    }
    return hits;
  }

  return { ZONES, INTERVALS, HORIZONS, isZone, valid, bearish, needs, evaluate };
})();
