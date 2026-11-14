// Bitcoin address lookups (mempool.space REST, GET only) + realtime unconfirmed-tx stream (blockchain.info WebSocket).
const BtcChain = (() => {
  const API = "https://mempool.space/api", WS = "wss://ws.blockchain.info/inv";
  const get = (path, ttl = 60000) => Http.json(API + path, { ttl });
  const seg = a => encodeURIComponent(a);

  const address = a => get(`/address/${seg(a)}`);
  const txs = (a, lastTxid) => get(`/address/${seg(a)}/txs${lastTxid ? "/chain/" + seg(lastTxid) : ""}`);
  const tip = async () => { const h = await get("/blocks/tip/height", 30000); return Number.isFinite(+h) ? +h : 0; };
  const txUrl = id => BtcFlow.isTxid(id) ? `https://mempool.space/tx/${id}` : "";
  const addrUrl = a => BtcFlow.normalize(a) ? `https://mempool.space/address/${BtcFlow.normalize(a)}` : "";
  const price = () => { try { const r = Coins.row("BTC"); return r && r.last > 0 ? r.last : 0; } catch { return 0; } };

  // Sequential, ~300 ms apart; onEach(addr, info|null) per address; stop() → true aborts.
  async function balances(addrs, onEach, stop) {
    for (const a of addrs) {
      if (stop()) return;
      let info = null;
      try { info = await address(a); } catch (e) { console.warn("BtcChain.balances - address fail", a, e.message); }
      if (stop()) return;
      onEach(a, info);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // Unconfirmed-tx stream with backoff reconnect. h: { onTx(msg), onState("connecting"|"live"|"reconnecting"|"stopped") }; returns { stop }.
  function watch(h) {
    let ws = null, timer = 0, dog = 0, tries = 0, off = false, last = 0;
    const state = s => { if (!off || s === "stopped") h.onState(s); };
    function open() {
      state(tries ? "reconnecting" : "connecting");
      try { ws = new WebSocket(WS); } catch { return retry(); }
      const mine = ws;
      mine.onopen = () => { tries = 0; last = Date.now(); state("live"); mine.send(JSON.stringify({ op: "unconfirmed_sub" })); };
      mine.onmessage = ev => {
        last = Date.now();
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m && m.op === "utx" && m.x) h.onTx(m.x);
      };
      mine.onclose = () => { if (ws === mine && !off) retry(); };
      mine.onerror = () => { try { mine.close(); } catch { /* already closed */ } };
    }
    function retry() { ws = null; tries++; state("reconnecting"); timer = setTimeout(open, Math.min(30000, 1000 * 2 ** Math.min(tries, 5))); }
    dog = setInterval(() => { if (ws && ws.readyState === 1 && Date.now() - last > 45000) { try { ws.close(); } catch { /* ignore */ } } }, 10000);
    open();
    return { stop() { off = true; clearTimeout(timer); clearInterval(dog); if (ws) { ws.onclose = ws.onmessage = ws.onerror = null; try { ws.close(); } catch { /* ignore */ } ws = null; } state("stopped"); } };
  }

  return { address, txs, tip, txUrl, addrUrl, price, balances, watch };
})();
