// Pure price-alert rules: price ≥ / ≤ a level, 24h change ≥ +x % / ≤ −x %. An alert fires once, then waits until re-armed.
const AlertRule = (() => {
  const TYPES = { above: "Giá ≥", below: "Giá ≤", pctUp: "24h tăng ≥ %", pctDown: "24h giảm ≥ %" };
  const valid = a => !!a && Object.hasOwn(TYPES, a.type) && Number.isFinite(+a.value) && +a.value > 0 && (a.type.startsWith("pct") ? +a.value <= 1000 : true);

  function hit(a, r) {
    if (!r || !(r.last > 0)) return false;
    if (a.type === "above") return r.last >= a.value;
    if (a.type === "below") return r.last <= a.value;
    if (!Number.isFinite(r.pct)) return false;
    return a.type === "pctUp" ? r.pct >= a.value : r.pct <= -a.value;
  }

  // rows: Map sym → { last, pct } → { list (fired ones stamped), hits }
  function check(list, rows, now = Date.now()) {
    const hits = [];
    const out = list.map(a => {
      if (a.fired || !hit(a, rows.get(a.sym))) return a;
      const f = { ...a, fired: now };
      hits.push({ ...f, price: rows.get(a.sym).last, pct: rows.get(a.sym).pct });
      return f;
    });
    return { list: out, hits };
  }

  return { TYPES, valid, hit, check };
})();
