// Column sets of the four price tables (★ watchlist, top by market cap, Binance spot, perpetual futures) + sort + 7-day sparkline SVG.
// Column = { k, h (Vietnamese header), v(row) → sort value, f(row, ctx) → { t, c } }; rowCells() feeds both the table and the CSV export.
const BoardCols = (() => {
  const tone = Fmt.tone;
  const P = (k, h, extra = {}) => ({ k, h, v: r => r[k], f: r => ({ t: Fmt.pct(r[k]), c: tone(r[k]) }), ...extra });
  const M = (k, h, big = true, extra = {}) => ({ k, h, v: r => r[k], f: r => ({ t: big ? Fmt.moneyBig(r[k]) : Fmt.money(r[k]), c: "" }), ...extra });

  const C = {
    rank: { k: "rank", h: "#", v: r => r.rank ?? null, f: r => ({ t: r.rank ? String(r.rank) : "", c: "rk" }) },
    coin: { k: "coin", h: "Coin", v: r => r.sym, cls: "coin", f: r => ({ t: r.mult > 1 ? `${r.sym} ×${r.mult}` : r.sym, c: "" }) },
    last: { k: "last", h: "Giá", cls: "mt", v: r => r.last, f: r => ({ t: Fmt.money(r.last), c: tone(r.pct) }) },
    pct1h: P("pct1h", "1 giờ"), pct: P("pct", "24 giờ"), pct7d: P("pct7d", "7 ngày"), pct30d: P("pct30d", "30 ngày"),
    high: M("high", "Cao 24h", false), low: M("low", "Thấp 24h", false),
    qvol: M("qvol", "KL 24h"), mcap: M("mcap", "Vốn hoá"), fdv: M("fdv", "FDV"),
    vol: { k: "vol", h: "KL (coin)", v: r => r.vol, f: r => ({ t: Fmt.big(r.vol), c: "mu" }) },
    supply: { k: "supply", h: "Đã lưu hành", v: r => supplyPct(r), f: r => { const s = supplyPct(r); return { t: s == null ? "" : Fmt.en(s, 0) + "%", c: "mu" }; } },
    athPct: { k: "athPct", h: "Từ đỉnh ATH", v: r => r.athPct, f: r => ({ t: Fmt.pct(r.athPct, 1), c: r.athPct > -10 ? "up" : "mu" }) },
    spark: { k: "spark", h: "7 ngày", cls: "sp", v: () => null, f: r => ({ t: "", c: "", svg: spark(r.spark, r.pct7d) }) },
    qty: { k: "qty", h: "Số lượng", grp: "pos", v: r => r.hold && r.hold.qty, f: r => ({ t: r.hold && r.hold.qty ? Fmt.qty(r.hold.qty) : "", c: "" }) },
    cost: { k: "cost", h: "Giá vốn", grp: "pos", v: r => r.hold && r.hold.cost, f: r => ({ t: r.hold && r.hold.cost ? Fmt.money(r.hold.cost) : "", c: "mu" }) },
    value: { k: "value", h: "Giá trị", grp: "pos", v: r => r.pos && r.pos.value, f: r => ({ t: r.pos ? Fmt.moneyBig(r.pos.value) : "", c: "" }) },
    pnl: { k: "pnl", h: "Lãi/lỗ", grp: "pos", v: r => r.pos && r.pos.pnl, f: r => ({ t: r.pos && r.pos.pnl != null ? (r.pos.pnl >= 0 ? "+" : "-") + Fmt.moneyBig(Math.abs(r.pos.pnl)) : "", c: tone(r.pos && r.pos.pnl) }) },
    pnlPct: { k: "pnlPct", h: "% lãi/lỗ", grp: "pos", v: r => r.pos && r.pos.pnlPct, f: r => ({ t: r.pos ? Fmt.pct(r.pos.pnlPct) : "", c: tone(r.pos && r.pos.pnlPct) }) },
    mark: M("mark", "Giá mark", false),
    funding: { k: "funding", h: "Funding 8h", v: r => r.funding, f: r => ({ t: Fmt.pct(r.funding, 4), c: fundTone(r.funding) }) },
    fundingY: { k: "fundingY", h: "Funding/năm", v: r => r.funding, f: r => ({ t: r.funding == null ? "" : Fmt.pct(r.funding * 3 * 365, 1), c: fundTone(r.funding) }) },
    basis: { k: "basis", h: "Mark − index", v: r => r.basis, f: r => ({ t: Fmt.pct(r.basis, 3), c: tone(r.basis) }) },
    next: { k: "next", h: "Funding sau", v: r => r.next, f: (r, x) => ({ t: countdown(r.next - x.now), c: "mu" }) },
  };
  // Positive funding = longs pay shorts (crowded long); > 0.03 %/8h is hot.
  const fundTone = f => f == null ? "" : f > 0.03 ? "down" : f < 0 ? "up" : "ref";
  const countdown = ms => { if (!(ms > 0)) return ""; const m = Math.floor(ms / 60000); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const supplyPct = r => r.circ > 0 && (r.max || r.total) > 0 ? Math.min(100, r.circ / (r.max || r.total) * 100) : null;

  function spark(values, pct) {
    if (!Array.isArray(values) || values.length < 2) return "";
    const v = values.filter(Number.isFinite), lo = Math.min(...v), hi = Math.max(...v), w = 90, h = 22, k = v.length - 1;
    const pts = v.map((x, i) => `${(i / k * w).toFixed(1)},${(hi === lo ? h / 2 : h - 1 - (x - lo) / (hi - lo) * (h - 2)).toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline class="pl ${tone(pct ?? v[k] - v[0])}" points="${pts}"/></svg>`;
  }

  const SETS = {
    watch: ["rank", "coin", "last", "pct1h", "pct", "pct7d", "high", "low", "qvol", "mcap", "spark", "qty", "cost", "value", "pnl", "pnlPct"],
    top: ["rank", "coin", "last", "pct1h", "pct", "pct7d", "pct30d", "mcap", "fdv", "qvol", "supply", "athPct", "spark"],
    top100: ["rank", "coin", "last", "pct1h", "pct", "pct7d", "pct30d", "mcap", "fdv", "qvol", "supply", "athPct", "spark"],
    trending: ["rank", "coin", "last", "pct1h", "pct", "pct7d", "mcap", "qvol", "athPct", "spark"],
    network: ["rank", "coin", "last", "pct1h", "pct", "pct7d", "pct30d", "mcap", "qvol", "spark"],
    spot: ["coin", "last", "pct", "high", "low", "vol", "qvol", "mcap"],
    futures: ["coin", "last", "mark", "pct", "qvol", "funding", "fundingY", "basis", "next"],
  };
  // o = toolbar options: pos (holdings columns), spark (7-day mini chart).
  const visible = (tab, o) => (SETS[tab] || SETS.watch).map(k => C[k]).filter(c => (c.grp !== "pos" || o.pos) && (c.k !== "spark" || o.spark));

  const rowCells = (r, cols, x = { now: Date.now() }) => cols.map(c => c.f(r, x));

  // dir 1 = ascending, −1 = descending; empty values always last.
  function sort(rows, cols, key, dir) {
    const c = cols.find(x => x.k === key);
    if (!c || !dir) return rows;
    return rows.slice().sort((a, b) => {
      const va = c.v(a), vb = c.v(b), na = va == null || va === "" || Number.isNaN(va), nb = vb == null || vb === "" || Number.isNaN(vb);
      if (na || nb) return na === nb ? 0 : na ? 1 : -1;
      return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * dir;
    });
  }

  return { C, SETS, visible, rowCells, sort, spark, countdown, supplyPct };
})();
