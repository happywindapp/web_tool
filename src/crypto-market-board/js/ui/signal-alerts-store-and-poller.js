// Technical-signal alerts: browser store (Prefs "sigAlerts") + a poller that checks them every 5 min while the page is open (also hidden).
const SignalAlerts = (() => {
  const MAX = 50, KEY = "sigAlerts";
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = arr => Array.isArray(arr) ? arr.filter(a => a && SignalAlertRule.valid(a) && CoinParse.isSymbol(a.sym)).slice(0, MAX).map(a => ({
    id: /^[a-z0-9]{4,20}$/.test(a.id || "") ? a.id : id(), sym: a.sym, signal: a.signal, interval: SignalAlertRule.isZone(a) ? "" : a.interval, horizon: SignalAlertRule.isZone(a) ? a.horizon : "",
    fired: Number.isFinite(+a.fired) && +a.fired > 0 ? +a.fired : 0, bar: Number.isFinite(+a.bar) ? +a.bar : 0 })) : [];
  let list = clean(Prefs.get(KEY, []));
  const fns = [];
  const changed = () => { Prefs.set(KEY, list); fns.forEach(f => f()); };
  const reload = () => { list = clean(Prefs.get(KEY, [])); };
  addEventListener("storage", e => { if (e.key === Prefs.P + KEY) { reload(); fns.forEach(f => f()); } });

  function add(sym, signal, interval, horizon) {
    reload();
    const a = { id: id(), sym, signal, interval, horizon, fired: 0, bar: 0 };
    if (!SignalAlertRule.valid(a) || !CoinParse.isSymbol(sym) || list.length >= MAX) return false;
    list = clean([...list, a]); changed();
    return true;
  }
  const remove = aid => { reload(); list = list.filter(a => a.id !== aid); changed(); };
  const rearm = aid => { reload(); list = list.map(a => a.id === aid ? { ...a, fired: 0 } : a); changed(); };
  // Stamps hits that are still armed in the stored list (another tab may have fired them first) → the hits this tab owns.
  function claim(hits, now = Date.now()) {
    reload();
    const own = hits.filter(h => list.some(a => a.id === h.id && !a.fired));
    if (own.length) { list = list.map(a => { const h = own.find(x => x.id === a.id); return h ? { ...a, fired: now, bar: h.bar || a.bar } : a; }); changed(); }
    return own;
  }
  return { add, remove, rearm, claim, all: () => list.slice(), onChange: f => fns.push(f) };
})();

const SignalPoll = (() => {
  let busy = false;

  async function gather(need) {
    const ctx = { bars: new Map(), advice: new Map(), price: new Map() };
    await Promise.all([...need.bars].map(async ([k, { sym, interval }]) => {
      const pair = Coins.pair(sym);
      if (!pair) return;
      try { ctx.bars.set(k, CoinSignals.closed(await Spot.klines(pair, interval, 300), interval, Spot.TZ)); }
      catch (e) { console.warn("SignalPoll.gather - klines fail", pair, interval, e.message); }
    }));
    await Promise.all([...need.zones].map(async sym => {
      const pair = Coins.pair(sym);
      if (!pair) return;
      ctx.price.set(sym, Coins.row(sym).last);
      try { ctx.advice.set(sym, await AdviceView.load(sym, pair)); }
      catch (e) { console.warn("SignalPoll.gather - advice fail", sym, e.message); }
    }));
    return ctx;
  }

  async function run() {
    if (busy) return [];
    busy = true;
    try {
      const list = SignalAlerts.all(), need = SignalAlertRule.needs(list);
      if (!need.bars.size && !need.zones.size) return [];
      const hits = SignalAlerts.claim(SignalAlertRule.evaluate(list, await gather(need)));
      if (hits.length) PersonalUI.onSignalHits(hits);
      return hits;
    } catch (e) { console.warn("SignalPoll.run - check signal alerts fail", e.message); return []; }
    finally { busy = false; }
  }

  function start() { setInterval(run, 300e3); setTimeout(run, 8000); }
  return { run, start };
})();
