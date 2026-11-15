// Board number formats + column definitions; rowCells() is shared by the table view and the CSV export.
const Fmt = (() => {
  const en = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const price = p => typeof p === "string" ? p : p ? en(p, 2) : "";
  // unit "x10" keeps the feed's 10-share lots (like most boards); "share" shows real share counts.
  const vol = (v, unit) => v ? en(unit === "share" ? v * 10 : v) : "";
  const signed = (n, d = 2) => n > 0 ? "+" + en(n, d) : n < 0 ? "-" + en(-n, d) : en(0, d);
  const chg = (q, n) => q.last ? signed(n) : "";
  const pct = (q, n) => q.last ? signed(n) + "%" : "";
  const big = n => n >= 1e9 ? en(n / 1e9, 2) + "B" : n >= 1e6 ? en(n / 1e6, 2) + "M" : n >= 1e3 ? en(n / 1e3, 1) + "K" : n ? en(n) : "";
  return { en, price, vol, signed, chg, pct, big };
})();

const BoardCols = (() => {
  const tone = QuoteModel.tone;
  const P = (q, p) => ({ t: Fmt.price(p), c: tone(p, q) });
  // Futures volumes are contracts, never shown ×10.
  const un = (q, o) => q.fut ? "" : o.unit;
  const V = (q, v, p, o) => ({ t: Fmt.vol(v, un(q, o)), c: tone(p, q) });
  const book = (side, i, g) => [
    { k: `${side}${i + 1}p`, g, h: "Giá {n}", n: i + 1, cls: i ? "lv23" : "", f: q => P(q, q[side === "b" ? "bids" : "asks"][i].p) },
    { k: `${side}${i + 1}v`, g, h: "KL {n}", n: i + 1, cls: i ? "lv23" : "", f: (q, o) => { const l = q[side === "b" ? "bids" : "asks"][i]; return V(q, l.v, l.p, o); } },
  ];
  // g = header group; opt = toolbar option that shows the column; sort = sortable by this quote field.
  const COLS = [
    { k: "sym", h: "Mã", sort: "sym", f: q => ({ t: q.sym, c: tone(q.last || q.ref, q) }) },
    { k: "ceil", h: "Trần", cls: "cf", f: q => ({ t: Fmt.price(q.ceil), c: "ceil" }) },
    { k: "floor", h: "Sàn", cls: "cf", f: q => ({ t: Fmt.price(q.floor), c: "floor" }) },
    { k: "ref", h: "TC", f: q => ({ t: Fmt.price(q.ref), c: "ref" }) },
    ...book("b", 2, "Bên mua"), ...book("b", 1, "Bên mua"), ...book("b", 0, "Bên mua"),
    { k: "last", g: "Khớp lệnh", h: "Giá", sort: "last", cls: "mt", f: q => P(q, q.last) },
    { k: "lastVol", g: "Khớp lệnh", h: "KL", cls: "mt", f: (q, o) => V(q, q.lastVol, q.last, o) },
    { k: "chg", g: "Khớp lệnh", h: "+/-", sort: "chg", cls: "mt", f: q => ({ t: Fmt.chg(q, q.chg), c: tone(q.last, q) }) },
    { k: "pct", g: "Khớp lệnh", h: "%", sort: "pct", cls: "mt", f: q => ({ t: Fmt.pct(q, q.pct), c: tone(q.last, q) }) },
    ...book("a", 0, "Bên bán"), ...book("a", 1, "Bên bán"), ...book("a", 2, "Bên bán"),
    { k: "totVol", h: "Tổng KL", sort: "totVol", f: (q, o) => ({ t: Fmt.vol(q.totVol, un(q, o)), c: "" }) },
    { k: "high", g: "Giá", h: "Cao", opt: "hl", f: q => P(q, q.high) },
    { k: "low", g: "Giá", h: "Thấp", opt: "hl", f: q => P(q, q.low) },
    { k: "avg", g: "Giá", h: "TB", opt: "hl", f: q => P(q, q.avg) },
    { k: "fBuy", g: "ĐTNN", h: "Mua", sort: "fBuy", opt: "fr", f: (q, o) => ({ t: Fmt.vol(q.fBuy, un(q, o)), c: "" }) },
    { k: "fSell", g: "ĐTNN", h: "Bán", sort: "fSell", opt: "fr", f: (q, o) => ({ t: Fmt.vol(q.fSell, un(q, o)), c: "" }) },
    { k: "room", g: "ĐTNN", h: "Room", opt: "fr", f: q => ({ t: Fmt.big(q.room), c: "" }) },
    // Futures tab only (opt "fut"): open interest, basis vs VN30 (set by the poll), maturity.
    { k: "oi", g: "Phái sinh", h: "OI", opt: "fut", f: q => ({ t: q.fut ? Fmt.en(q.fut.oi) : "", c: "" }) },
    { k: "basis", g: "Phái sinh", h: "Basis", opt: "fut", f: q => { const b = q.fut ? q.fut.basis : NaN; return { t: Number.isFinite(b) ? Fmt.signed(b, 1) : "", c: b > 0 ? "up" : b < 0 ? "down" : "" }; } },
    { k: "mature", g: "Phái sinh", h: "Đáo hạn", opt: "fut", f: q => ({ t: q.fut ? q.fut.mature : "", c: "" }) },
    // Own target price (Notes.decorate sets q.target) and the distance to it from the current price.
    { k: "target", g: "Của bạn", h: "Mục tiêu", opt: "tg", f: q => ({ t: q.target ? Fmt.price(q.target) : "", c: "" }) },
    { k: "toTarget", g: "Của bạn", h: "Còn", opt: "tg", f: q => { const p = q.last || q.ref, u = q.target > 0 && p > 0 ? (q.target / p - 1) * 100 : null;
      return { t: u == null ? "" : Fmt.signed(u, 1) + "%", c: u > 0 ? "up" : u < 0 ? "down" : "" }; } },
  ];

  // compact drops price levels 2–3 and ceiling/floor (filtered here, not CSS, so group colspans stay right).
  const visible = o => COLS.filter(c => (!c.opt || o[c.opt]) && !(o.compact && (c.cls === "lv23" || c.cls === "cf")));
  const rowCells = (q, o) => visible(o).map(c => c.f(q, o));

  // dir 1 = ascending, -1 = descending; symbols tie-break so the order is stable between polls.
  function sortQuotes(list, key, dir) {
    if (!key) return list;
    return [...list].sort((a, b) => {
      const d = key === "sym" ? a.sym.localeCompare(b.sym) : (a[key] || 0) - (b[key] || 0);
      return d * dir || a.sym.localeCompare(b.sym);
    });
  }

  return { COLS, visible, rowCells, sortQuotes };
})();
