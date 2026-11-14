// Pure: price-alert rules (price ≥ / ≤, day change ≥ +x % / ≤ −x %) and own-target upside.
const AlertRule = (() => {
  const TYPES = ["above", "below", "pctUp", "pctDown"];
  const valid = a => !!a && TYPES.includes(a.type) && Number.isFinite(+a.value) && typeof a.sym === "string";

  // q: board quote (last / pct). No trade yet → never fires.
  function hit(a, q) {
    if (!valid(a) || !q || !q.last) return false;
    const v = +a.value;
    if (a.type === "above") return q.last >= v;
    if (a.type === "below") return q.last <= v;
    if (a.type === "pctUp") return q.pct >= Math.abs(v);
    return q.pct <= -Math.abs(v);
  }

  // Alerts that fire now and have not fired on this Vietnam date yet → marks them fired (returns new objects, input untouched).
  function check(list, quotes, day) {
    const hits = [], next = list.map(a => {
      if (a.fired === day || !hit(a, quotes.get(a.sym))) return a;
      const b = { ...a, fired: day };
      hits.push(b);
      return b;
    });
    return { list: next, hits };
  }

  const upside = (target, price) => target > 0 && price > 0 ? (target / price - 1) * 100 : null;

  return { TYPES, valid, hit, check, upside };
})();
