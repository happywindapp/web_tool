// Daily bars of the tickers that have technical-signal alerts (VNDirect dchart), refreshed every 30 min in the background; state() adds the live price.
const SignalBars = (() => {
  const TTL = 30 * 60e3, cache = new Map(), busy = new Set();

  async function loadOne(sym) {
    busy.add(sym);
    try {
      const now = Math.floor(Date.now() / 1000), day = QuoteModel.vnDate();
      const done = SignalState.completed(await History.load(sym, "D", now - 2 * 366 * 86400, now), day);
      cache.set(sym, { at: Date.now(), day, done, plan: undefined });
    } catch (err) { console.warn("SignalBars.loadOne - get daily bars fail", sym, err); }
    finally { busy.delete(sym); }
  }

  // Fire-and-forget; a new Vietnam date or an old entry triggers a reload.
  function refresh(syms) {
    const day = QuoteModel.vnDate();
    for (const s of syms) { const c = cache.get(s); if (!busy.has(s) && (!c || c.day !== day || Date.now() - c.at > TTL)) loadOne(s); }
  }

  function state(sym, q) {
    const c = cache.get(sym);
    if (!c || c.day !== QuoteModel.vnDate()) return null;
    if (c.plan === undefined) c.plan = SignalState.plan(c.done, q.ex);
    return SignalState.of(c.done, c.plan, q.last);
  }

  return { refresh, state };
})();
