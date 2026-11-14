// Pure whole-market math: breadth, top lists, sector performance, screener rows + presets, squarified treemap layout.
const Mkt = (() => {
  // Matched value / foreign net value in VND (volumes are 10-share lots, prices thousand VND).
  const px = q => q.avg || q.last || q.ref || 0;
  const value = q => q.totVol * 10 * px(q) * 1000;
  const foreignNet = q => (q.fBuy - q.fSell) * 10 * px(q) * 1000;

  function breadth(quotes) {
    const b = { ceil: 0, up: 0, same: 0, down: 0, floor: 0, none: 0, value: 0 };
    for (const q of quotes) {
      b.value += value(q);
      if (!q.last) { b.none++; continue; }
      const t = QuoteModel.tone(q.last, q);
      b[t === "ref" ? "same" : t || "none"]++;
    }
    return b;
  }

  // n tickers sorted by fn (desc), skipping those without trades.
  const top = (quotes, fn, n = 10, asc = false) => quotes.filter(q => q.last && Number.isFinite(fn(q))).sort((a, b) => asc ? fn(a) - fn(b) : fn(b) - fn(a)).slice(0, n);

  // Sector change weighted by market cap (equal weight when caps are unknown); sectorOf(sym) → code.
  function sectorPerf(quotes, sectorOf, mcapOf) {
    const m = new Map();
    for (const q of quotes) {
      const code = sectorOf(q.sym);
      if (!code || !q.last) continue;
      const w = mcapOf(q.sym) || 1, s = m.get(code) || m.set(code, { code, w: 0, sum: 0, up: 0, down: 0, value: 0, n: 0 }).get(code);
      s.w += w; s.sum += w * q.pct; s.n++; s.value += value(q);
      if (q.chg > 0) s.up++; else if (q.chg < 0) s.down++;
    }
    return [...m.values()].map(s => ({ ...s, pct: s.w ? s.sum / s.w : 0 })).sort((a, b) => b.pct - a.pct);
  }

  // Screener row from a quote + bulk ratios (mcap VND → bn, roe / dy fractions → %).
  const row = (q, r = {}, sector = "") => ({ sym: q.sym, ex: q.ex, sector, price: q.last || q.ref, pct: q.last ? q.pct : 0, value: value(q) / 1e9,
    mcap: Number.isFinite(r.mcap) ? r.mcap / 1e9 : null, pe: r.pe ?? null, pb: r.pb ?? null, roe: Number.isFinite(r.roe) ? r.roe * 100 : null, dy: Number.isFinite(r.dy) ? r.dy * 100 : null });

  // Criteria: blank = no limit. Ranges are inclusive; a ticker without the needed ratio fails that criterion.
  const FIELDS = ["mcapMin", "peMin", "peMax", "pbMax", "roeMin", "dyMin", "pctMin", "pctMax", "valueMin"];
  function screen(rows, c) {
    const n = k => c[k] === "" || c[k] == null || !Number.isFinite(+c[k]) ? null : +c[k];
    const ok = (v, min, max) => (min == null || (v != null && v >= min)) && (max == null || (v != null && v <= max));
    return rows.filter(r => (!c.ex || r.ex === c.ex) && (!c.sector || r.sector === c.sector)
      && ok(r.mcap, n("mcapMin"), null) && ok(r.pe, n("peMin"), n("peMax")) && ok(r.pb, null, n("pbMax")) && ok(r.roe, n("roeMin"), null)
      && ok(r.dy, n("dyMin"), null) && ok(r.pct, n("pctMin"), n("pctMax")) && ok(r.value, n("valueMin"), null));
  }
  const PRESETS = {
    value: { label: "Giá trị (P/E < 10, P/B < 1,5, ROE > 12%)", c: { peMin: 0.1, peMax: 10, pbMax: 1.5, roeMin: 12, mcapMin: 1000 } },
    quality: { label: "Chất lượng (ROE > 20%, vốn hoá > 10.000 tỷ)", c: { roeMin: 20, mcapMin: 10000 } },
    dividend: { label: "Cổ tức cao (tỷ suất > 5%)", c: { dyMin: 5, mcapMin: 1000 } },
    dip: { label: "Giảm mạnh hôm nay, nền tốt (≤ −3%, ROE > 15%)", c: { pctMax: -3, roeMin: 15, mcapMin: 1000 } },
    liquid: { label: "Thanh khoản cao (GTGD > 100 tỷ)", c: { valueMin: 100 } },
  };

  // Squarified treemap: items [{ key, w > 0 }] → [{ key, x, y, w, h }] filling the rectangle.
  function treemap(items, x, y, w, h) {
    const out = [], list = items.filter(i => i.w > 0).sort((a, b) => b.w - a.w), total = list.reduce((s, i) => s + i.w, 0);
    if (!total || w <= 0 || h <= 0) return out;
    const scale = w * h / total;
    let rest = list.map(i => ({ ...i, a: i.w * scale })), rx = x, ry = y, rw = w, rh = h;
    const worst = (row, side) => { const s = row.reduce((t, r) => t + r.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
    while (rest.length) {
      const side = Math.min(rw, rh), row = [rest[0]];
      let i = 1;
      while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) row.push(rest[i++]);
      rest = rest.slice(i);
      const s = row.reduce((t, r) => t + r.a, 0), horiz = rw >= rh, thick = s / (horiz ? rh : rw);
      let off = 0;
      for (const r of row) {
        const len = r.a / thick;
        out.push(horiz ? { key: r.key, x: rx, y: ry + off, w: thick, h: len } : { key: r.key, x: rx + off, y: ry, w: len, h: thick });
        off += len;
      }
      if (horiz) { rx += thick; rw -= thick; } else { ry += thick; rh -= thick; }
    }
    return out;
  }

  return { value, foreignNet, breadth, top, sectorPerf, row, screen, FIELDS, PRESETS, treemap };
})();
