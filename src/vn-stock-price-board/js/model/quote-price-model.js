// Pure VPS datafeed → board model. Prices in thousand VND; volumes stay in the feed's unit (10 shares).
const QuoteModel = (() => {
  const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const cents = x => Math.round(x * 100);
  const EX = { STO: "HOSE", STX: "HNX", UPX: "UPCOM" };

  // "54.2|6850|d" → { p: 54.2, v: 6850 }; ATO/ATC orders keep their label as p.
  function level(s) {
    const [p = "", v = ""] = String(s ?? "").split("|");
    return { p: /^[A-Z]{2,4}$/.test(p) ? p : num(p), v: num(v) };
  }

  function quote(r) {
    const ref = num(r.r), last = num(r.lastPrice);
    const chg = last ? (cents(last) - cents(ref)) / 100 : 0;
    return {
      sym: String(r.sym || ""), ex: EX[r.marketId] || String(r.marketId || ""), type: String(r.sType || "S"),
      ceil: num(r.c), floor: num(r.f), ref,
      bids: [level(r.g1), level(r.g2), level(r.g3)], asks: [level(r.g4), level(r.g5), level(r.g6)],
      last, lastVol: num(r.lastVolume), chg, pct: last && ref ? chg / ref * 100 : 0,
      totVol: num(r.lot), open: num(r.openPrice), high: num(r.highPrice), low: num(r.lowPrice), avg: num(r.avePrice),
      fBuy: num(r.fBVol), fSell: num(r.fSVolume), room: num(r.fRoom),
      cw: r.sType === "W" ? { underlying: String(r.CWUnderlying || ""), issuer: String(r.CWIssuerName || ""), strike: num(r.CWExcersisePrice),
        ratio: String(r.CWExerciseRatio || ""), maturity: String(r.CWMaturityDate || ""), lastTrade: String(r.CWLastTradingDate || "") } : null,
    };
  }

  // Board colour of a price against the symbol's ceiling / floor / reference.
  function tone(p, q) {
    if (typeof p === "string") return "ref";
    if (!p || !q.ref) return "";
    const c = cents(p);
    if (q.ceil && c >= cents(q.ceil)) return "ceil";
    if (q.floor && c <= cents(q.floor)) return "floor";
    return c > cents(q.ref) ? "up" : c < cents(q.ref) ? "down" : "ref";
  }

  const INDEX_CODES = { "10": "VNINDEX", "11": "VN30", "02": "HNX", "03": "UPCOM" };
  // oIndex is the previous close; ot = "chg|pct%|value(million VND)|advancers|decliners|unchanged" (chg/pct unsigned, so recomputed).
  function index(r) {
    const ot = String(r.ot || "").split("|"), value = num(r.cIndex), ref = num(r.oIndex);
    const chg = value && ref ? (cents(value) - cents(ref)) / 100 : 0;
    return { code: String(r.mc), name: INDEX_CODES[r.mc] || String(r.mc), value, ref, chg, pct: ref ? chg / ref * 100 : 0,
      vol: num(r.vol), valueMil: num(ot[2]), up: num(ot[3]), down: num(ot[4]), same: num(ot[5]), time: String(r.time || "") };
  }

  const trade = r => ({ time: String(r.time || ""), price: num(r.lastPrice), vol: num(r.lastVol), side: r.side === "B" || r.side === "S" ? r.side : "" });

  // Active buy / sell volume (B = buyer hit the ask, S = seller hit the bid; "" = auction / unknown).
  function tradeSides(trades) {
    const s = { B: 0, S: 0, "": 0 };
    for (const t of trades) s[t.side] += t.vol;
    return s;
  }

  // Trading phase from the clock in Vietnam time (UTC+7), independent of the viewer's time zone. Holidays are not known.
  function phase(now = new Date()) {
    const vn = new Date(now.getTime() + 7 * 3600e3), day = vn.getUTCDay(), m = vn.getUTCHours() * 60 + vn.getUTCMinutes();
    if (day === 0 || day === 6) return "closed";
    if (m < 540) return "pre";
    if (m < 555) return "ato";
    if (m < 690) return "open";
    if (m < 780) return "break";
    if (m < 870) return "open";
    if (m < 885) return "atc";
    if (m < 900) return "plo";
    return "closed";
  }
  const isLive = p => p === "ato" || p === "open" || p === "atc" || p === "plo";
  const vnDate = (now = new Date()) => new Date(now.getTime() + 7 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");

  return { quote, level, tone, index, trade, tradeSides, phase, isLive, vnDate, INDEX_CODES };
})();
