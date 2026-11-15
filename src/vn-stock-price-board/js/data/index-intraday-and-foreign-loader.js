// Index card extras on their own slower clock: last sessions of 1-minute bars (VNDirect dchart) and the latest foreign net value (VNDirect finfo).
const IndexData = (() => {
  const st = {}, busy = new Set();
  const due = (at, ms) => !at || Date.now() - at >= ms;

  // names: VNINDEX / VN30 / HNX / UPCOM; done() runs after any part arrives so the strip can redraw.
  function refresh(names, done) {
    const live = QuoteModel.isLive(QuoteModel.phase()) || QuoteModel.phase() === "break", now = Math.floor(Date.now() / 1000), from = (Math.floor(now / 86400) - 8) * 86400;
    for (const n of names) {
      const s = st[n] ||= {};
      if (!busy.has(n) && due(s.at, live ? 60e3 : 600e3)) {
        busy.add(n); s.at = Date.now();
        History.load(n, "1", from, now).then(b => { s.ss = IndexCardSvg.sessions(b); done(); })
          .catch(err => console.warn("IndexData.refresh - get index minute bars fail", n, err)).finally(() => busy.delete(n));
      }
      if (due(s.fat, 30 * 60e3)) {
        s.fat = Date.now();
        Finfo.foreigns(n, 1).then(r => { const x = r && r[0]; s.fx = x && Number.isFinite(+x.netVal) ? { net: +x.netVal, date: String(x.tradingDate || "") } : null; done(); })
          .catch(err => console.warn("IndexData.refresh - get index foreign flow fail", n, err));
      }
    }
  }

  return { refresh, get: n => st[n] || {} };
})();
