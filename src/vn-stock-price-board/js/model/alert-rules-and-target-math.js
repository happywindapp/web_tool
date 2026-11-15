// Pure: price-alert rules (price ≥ / ≤, day change ≥ +x % / ≤ −x %), technical-signal rules (MA / RSI / MACD crosses, trade-plan zones) and own-target upside.
const AlertRule = (() => {
  const PRICE = ["above", "below", "pctUp", "pctDown"], SIGNAL = ["maUp", "maDown", "rsiUp", "rsiDown", "macdUp", "macdDown", "planBuy", "planStop"];
  const TYPES = [...PRICE, ...SIGNAL];
  const isSignal = t => SIGNAL.includes(t);
  const range = { maUp: [2, 250], maDown: [2, 250], rsiUp: [1, 99], rsiDown: [1, 99] };
  function valid(a) {
    if (!a || !TYPES.includes(a.type) || !Number.isFinite(+a.value) || typeof a.sym !== "string") return false;
    const r = range[a.type];
    return !r || (+a.value >= r[0] && +a.value <= r[1] && (!a.type.startsWith("ma") || Number.isInteger(+a.value)));
  }

  // Signals compare yesterday's close with the live price: s = SignalState.of(…) for the ticker (null until its daily bars are loaded).
  function signalHit(a, q, s) {
    if (!s) return false;
    const v = +a.value, p = q.last, [x0, x1] = a.type.startsWith("ma") ? s.ma(v) : a.type.startsWith("rsi") ? s.rsi : a.type.startsWith("macd") ? s.macd : [];
    if (a.type === "maUp") return s.prev <= x0 && p > x1;
    if (a.type === "maDown") return s.prev >= x0 && p < x1;
    if (a.type === "rsiUp") return x0 <= v && x1 > v;
    if (a.type === "rsiDown") return x0 >= v && x1 < v;
    if (a.type === "macdUp") return x0 <= 0 && x1 > 0;
    if (a.type === "macdDown") return x0 >= 0 && x1 < 0;
    if (a.type === "planBuy") return !!s.plan && p >= s.plan.lo && p <= s.plan.hi;
    return !!s.plan && p < s.plan.stop;
  }

  // q: board quote (last / pct). No trade yet → never fires.
  function hit(a, q, sig) {
    if (!valid(a) || !q || !q.last) return false;
    if (isSignal(a.type)) return signalHit(a, q, sig);
    const v = +a.value;
    if (a.type === "above") return q.last >= v;
    if (a.type === "below") return q.last <= v;
    if (a.type === "pctUp") return q.pct >= Math.abs(v);
    return q.pct <= -Math.abs(v);
  }

  // Alerts that fire now and have not fired on this Vietnam date yet → marks them fired (returns new objects, input untouched).
  function check(list, quotes, day, sigOf = () => null) {
    const hits = [], next = list.map(a => {
      const q = quotes.get(a.sym);
      if (a.fired === day || !hit(a, q, isSignal(a.type) && q ? sigOf(a.sym, q) : null)) return a;
      const b = { ...a, fired: day };
      hits.push(b);
      return b;
    });
    return { list: next, hits };
  }

  const upside = (target, price) => target > 0 && price > 0 ? (target / price - 1) * 100 : null;

  return { TYPES, PRICE, SIGNAL, isSignal, valid, hit, check, upside };
})();
