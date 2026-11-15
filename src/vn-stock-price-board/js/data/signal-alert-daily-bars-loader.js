// Daily bars of the tickers that have technical-signal alerts (VNDirect dchart), loaded once per Vietnam date in the background; state() adds the live price.
const SignalBars = (() => {
  const RETRY = 5 * 60e3, cache = new Map(), busy = new Set();

  async function loadOne(sym, day) {
    busy.add(sym);
    try {
      const now = Math.floor(Date.now() / 1000);
      cache.set(sym, { day, at: Date.now(), done: SignalState.completed(await History.load(sym, "D", now - 2 * 366 * 86400, now), day), plan: undefined });
    } catch (err) {
      console.warn("SignalBars.loadOne - get daily bars fail", sym, err);
      cache.set(sym, { day, at: Date.now(), done: [], failed: true });
    } finally { busy.delete(sym); }
  }

  // Completed bars only change with the date; a failed load is retried every 5 min (refresh runs on every poll).
  function refresh(syms) {
    const day = QuoteModel.vnDate();
    for (const s of syms) { const c = cache.get(s); if (!busy.has(s) && (!c || c.day !== day || (c.failed && Date.now() - c.at > RETRY))) loadOne(s, day); }
  }

  function state(sym, q) {
    const c = cache.get(sym);
    if (!c || c.failed || c.day !== QuoteModel.vnDate()) return null;
    if (c.plan === undefined) c.plan = SignalState.plan(c.done, q.ex);
    return SignalState.of(c.done, c.plan, q.last);
  }

  return { refresh, state };
})();
