// Realtime Binance prices: one combined WebSocket with live SUBSCRIBE / UNSUBSCRIBE, REST snapshot for new pairs, REST polling when
// the viewer picks a slower rate, the socket keeps failing (blocked network) or the page is hidden (60 s, enough for price alerts).
const Live = (() => {
  const HOSTS = ["wss://stream.binance.com:9443/stream", "wss://data-stream.binance.vision/stream"];
  const ticks = new Map(), subs = new Map(), tickFns = [], statusFns = [];
  let wantAll = false, pairs = new Set(), rate = "live", ws = null, open = false, hi = 0, fails = 0, active = new Set(), msgId = 1;
  let mode = "off", lastAt = 0, pollTimer = 0, retryTimer = 0, flushTimer = 0, dirty = false, hiddenTimer = 0, sleeping = false;

  const setMode = m => { if (m !== mode) { mode = m; statusFns.forEach(f => f()); } };
  function changed() { dirty = true; lastAt = Date.now(); if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = 0; if (dirty) { dirty = false; tickFns.forEach(f => f()); } }, 700); }
  const put = t => { if (t.pair && t.pair.endsWith("USDT") && t.last > 0) ticks.set(t.pair, t); };

  function desired() {
    const s = new Set();
    if (rate === "live" && !sleeping) { if (wantAll) s.add("!miniTicker@arr"); else for (const p of pairs) s.add(p.toLowerCase() + "@miniTicker"); }
    if (rate !== "off" && !sleeping) for (const k of subs.keys()) s.add(k);
    return s;
  }

  function send(method, params) { for (let i = 0; i < params.length; i += 100) ws.send(JSON.stringify({ method, params: params.slice(i, i + 100), id: msgId++ })); }

  function sync() {
    const want = desired();
    if (!want.size) { if (ws) { ws.onclose = null; ws.close(); ws = null; open = false; active = new Set(); } }
    else if (!ws) connect();
    else if (open) {
      const add = [...want].filter(s => !active.has(s)), drop = [...active].filter(s => !want.has(s));
      if (drop.length) send("UNSUBSCRIBE", drop);
      if (add.length) send("SUBSCRIBE", add);
      active = want;
    }
    schedulePoll();
  }

  function connect() {
    clearTimeout(retryTimer);
    const want = [...desired()];
    if (!want.length) return;
    setMode(mode === "ws" ? "ws" : "connecting");
    try { ws = new WebSocket(HOSTS[hi] + "?streams=" + want.slice(0, 200).join("/")); }
    catch (e) { console.warn("Live.connect - open websocket fail", e); onFail(); return; }
    active = new Set(want.slice(0, 200));
    ws.onopen = () => { open = true; fails = 0; setMode("ws"); sync(); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (!m || !m.stream) return;
      const d = m.data;
      if (m.stream === "!miniTicker@arr") { for (const t of d) put(Spot.tick(t)); changed(); }
      else if (m.stream.endsWith("@miniTicker")) { put(Spot.tick(d)); changed(); }
      const fns = subs.get(m.stream);
      if (fns) fns.forEach(f => { try { f(d); } catch (e) { console.warn("Live - stream handler fail", m.stream, e); } });
    };
    ws.onclose = () => { ws = null; open = false; active = new Set(); onFail(); };
    ws.onerror = () => { /* onclose follows */ };
  }

  // Two quick failures per host → try the mirror; both down → REST polling, retry the socket every 60 s.
  function onFail() {
    fails++;
    if (fails % 2 === 0) hi = (hi + 1) % HOSTS.length;
    setMode(fails >= 4 ? "poll" : "connecting");
    schedulePoll();
    retryTimer = setTimeout(() => { if (!ws && desired().size) connect(); }, fails >= 4 ? 60000 : 2000 * fails);
  }

  // REST covers: slower rates, a dead socket, a hidden page.
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (rate === "off") { if (!ws) setMode("off"); return; }
    const viaWs = rate === "live" && !sleeping && mode === "ws";
    if (viaWs || (!wantAll && !pairs.size)) { if (!ws && !desired().size) setMode(rate === "live" ? "ws" : "poll"); return; }
    if (rate !== "live" || sleeping) setMode("poll");
    const ms = sleeping ? 60000 : rate === "live" ? 5000 : +rate * 1000;
    pollTimer = setTimeout(poll, ms);
  }
  async function poll() {
    try { (await Spot.tickers(wantAll && !sleeping ? null : [...pairs])).forEach(put); changed(); }
    catch (e) { console.warn("Live.poll - REST tickers fail", e.message); }
    schedulePoll();
  }

  // Snapshot first so new rows fill at once (the socket only pushes symbols that traded in the last second).
  async function want(all, list) {
    const next = new Set(list), fresh = [...next].filter(p => !ticks.has(p));
    const needAll = all && !wantAll;
    wantAll = !!all; pairs = next;
    sync();
    if (rate === "off" && !needAll && !fresh.length) return;
    try {
      if (needAll) (await Spot.tickers()).forEach(put);
      else if (fresh.length) (await Spot.tickers(fresh)).forEach(put);
      if (needAll || fresh.length) changed();
    } catch (e) { console.warn("Live.want - REST snapshot fail", e.message); }
  }

  // stream e.g. "btcusdt@kline_1h" → returns an unsubscribe function.
  function sub(stream, fn) {
    (subs.get(stream) || subs.set(stream, new Set()).get(stream)).add(fn);
    sync();
    return () => { const s = subs.get(stream); if (s) { s.delete(fn); if (!s.size) subs.delete(stream); } sync(); };
  }

  function setRate(r) { rate = ["live", "5", "15", "60", "off"].includes(r) ? r : "live"; if (rate !== "live") clearTimeout(retryTimer); sync(); if (rate !== "off" && rate !== "live") poll(); }

  document.addEventListener("visibilitychange", () => {
    clearTimeout(hiddenTimer);
    if (document.hidden) hiddenTimer = setTimeout(() => { sleeping = true; sync(); }, 30000);
    else if (sleeping) { sleeping = false; sync(); if (rate !== "off") poll(); }
  });

  return { want, sub, setRate, tick: p => ticks.get(p), onTicks: f => tickFns.push(f), onStatus: f => statusFns.push(f), status: () => ({ mode, at: lastAt }), refresh: poll };
})();
