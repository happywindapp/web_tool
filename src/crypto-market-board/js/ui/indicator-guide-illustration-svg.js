// Guide illustration: a fixed made-up price path (down → base → rally → top → drop) run through the real Indicators code,
// drawn as candles + the indicator (overlay or own pane) with numbered signal points. Deterministic, no network.
const GuideSvg = (() => {
  const W = 640, PH = 200, OH = 90, PAD = 6;
  let sample = null;

  // Seeded path so every viewer sees the same example.
  function bars() {
    if (sample) return sample;
    let seed = 7, p = 100;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
    const legs = [[45, -0.006], [30, 0.0005], [55, 0.007], [20, 0], [25, -0.009]];
    const out = [];
    let t = 0;
    for (const [n, drift] of legs) for (let i = 0; i < n; i++) {
      const o = p, c = p * (1 + drift + rnd() * 0.05), hi = Math.max(o, c) * (1 + Math.abs(rnd()) * 0.02), lo = Math.min(o, c) * (1 - Math.abs(rnd()) * 0.02);
      const breakout = (t > 75 && t < 82) || (t > 150 && t < 156);
      out.push({ time: 1700000000 + t * 86400, open: o, high: hi, low: lo, close: c, volume: 1000 * (1 + Math.abs(rnd())) * (breakout ? 3 : 1) });
      p = c; t++;
    }
    return (sample = out);
  }

  // Signal points per indicator kind → [{ i, up }] (latest 5).
  function signals(id, lines, b) {
    const c = b.map(x => x.close), v = (ln, i) => ln.values[i], out = [];
    const cross = (a, z, i) => a[i - 1] != null && z[i - 1] != null && a[i] != null && z[i] != null && (a[i - 1] - z[i - 1]) * (a[i] - z[i]) < 0;
    for (let i = 1; i < b.length; i++) {
      if (["sma", "ema", "wma"].includes(id) && cross(c, lines[0].values, i)) out.push({ i, up: c[i] > v(lines[0], i) });
      if ((id === "bb" || id === "dc") && v(lines[0], i - 1) != null) {
        const up = id === "dc" ? v(lines[0], i - 1) : v(lines[0], i), lo = id === "dc" ? v(lines[2], i - 1) : v(lines[2], i);
        if (c[i] > up && !(c[i - 1] > (id === "dc" ? v(lines[0], i - 2) : v(lines[0], i - 1)))) out.push({ i, up: true });
        if (c[i] < lo && !(c[i - 1] < (id === "dc" ? v(lines[2], i - 2) : v(lines[2], i - 1)))) out.push({ i, up: false });
      }
      if (id === "psar" && v(lines[0], i) != null && v(lines[0], i - 1) != null && (v(lines[0], i - 1) > c[i - 1]) !== (v(lines[0], i) > c[i])) out.push({ i, up: v(lines[0], i) < c[i] });
      if (["ichi", "stoch"].includes(id) && cross(lines[0].values, lines[1].values, i)) out.push({ i, up: v(lines[0], i) > v(lines[1], i) });
      if (id === "adx" && cross(lines[1].values, lines[2].values, i)) out.push({ i, up: v(lines[1], i) > v(lines[2], i) });
      if (id === "macd" && cross(lines[1].values, lines[2].values, i)) out.push({ i, up: v(lines[1], i) > v(lines[2], i) });
      if (["rsi", "cci", "wr", "mfi", "roc"].includes(id)) {
        const lv = Indicators.DEFS[id].levels || [0], a = v(lines[0], i - 1), z = v(lines[0], i);
        if (a != null && z != null) for (const L of lv) if ((a - L) * (z - L) < 0) out.push({ i, up: z > a, L, lo: Math.min(...lv), hi: Math.max(...lv) });
      }
    }
    return out.slice(-5);
  }

  const path = (vals, x, y) => vals.map((val, i) => val == null ? null : `${x(i).toFixed(1)},${y(val).toFixed(1)}`).reduce((acc, p) => { if (p == null) acc.push([]); else acc[acc.length - 1].push(p); return acc; }, [[]])
    .filter(s => s.length > 1).map(s => `<polyline fill="none" points="${s.join(" ")}"`);

  // → { svg, points: [{ n, up }] }
  function render(id) {
    const def = Indicators.DEFS[id], b = bars(), lines = def.calc(b, Indicators.params(id), "#2563eb"), own = def.pane === "own";
    const H = PH + (own ? OH + 8 : 0), n = b.length, x = i => PAD + i * (W - 2 * PAD) / (n - 1);
    const ov = own ? [] : lines.flatMap(l => l.values).filter(Number.isFinite);
    const lo = Math.min(...b.map(k => k.low), ...ov), hi = Math.max(...b.map(k => k.high), ...ov), y = val => PAD + (hi - val) / (hi - lo) * (PH - 2 * PAD);
    let s = b.map((k, i) => `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${y(k.high).toFixed(1)}" y2="${y(k.low).toFixed(1)}" class="gw ${k.close >= k.open ? "u" : "d"}"/>`
      + `<rect x="${(x(i) - 1.3).toFixed(1)}" y="${y(Math.max(k.open, k.close)).toFixed(1)}" width="2.6" height="${Math.max(0.6, Math.abs(y(k.open) - y(k.close))).toFixed(1)}" class="gb ${k.close >= k.open ? "u" : "d"}"/>`).join("");
    let oy = null;
    if (!own) for (const l of lines) s += l.kind === "dots" ? l.values.map((val, i) => val == null ? "" : `<circle cx="${x(i).toFixed(1)}" cy="${y(val).toFixed(1)}" r="1.4" fill="${l.color}"/>`).join("")
      : path(l.values, x, y).map(p => `${p} stroke="${l.color}" stroke-width="1.6"${l.dash ? ' stroke-dasharray="4 3"' : ""}/>`).join("");
    else {
      const top = PH + 8, vals = lines.flatMap(l => l.values).concat(def.levels || []).filter(Number.isFinite), a = Math.min(...vals), z = Math.max(...vals);
      oy = val => top + 4 + (z - val) / ((z - a) || 1) * (OH - 8);
      s += `<rect x="0" y="${top}" width="${W}" height="${OH}" class="gpane"/>`;
      for (const L of def.levels || []) s += `<line x1="0" x2="${W}" y1="${oy(L).toFixed(1)}" y2="${oy(L).toFixed(1)}" class="glv"/><text x="${W - 4}" y="${(oy(L) - 2).toFixed(1)}" text-anchor="end" class="gtx">${L}</text>`;
      for (const l of lines) s += l.kind === "hist" ? l.values.map((val, i) => val == null ? "" : `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${oy(0).toFixed(1)}" y2="${oy(val).toFixed(1)}" stroke="${l.colors[i]}" stroke-width="2"/>`).join("")
        : path(l.values, x, oy).map(p => `${p} stroke="${l.color}" stroke-width="1.5"/>`).join("");
    }
    const pts = signals(id, lines, b).map((p, k) => ({ ...p, n: k + 1 }));
    for (const p of pts) {
      const cy = Math.max(10, Math.min(PH - 10, p.up ? y(b[p.i].low) + 12 : y(b[p.i].high) - 12));
      s += `<line x1="${x(p.i).toFixed(1)}" x2="${x(p.i).toFixed(1)}" y1="0" y2="${H}" class="gmk"/><circle cx="${x(p.i).toFixed(1)}" cy="${cy.toFixed(1)}" r="8" class="gpt ${p.up ? "u" : "d"}"/>`
        + `<text x="${x(p.i).toFixed(1)}" y="${(cy + 3.5).toFixed(1)}" text-anchor="middle" class="gpn">${p.n}</text>`;
    }
    const legend = lines.filter(l => l.kind !== "hist").map(l => ({ title: l.title, color: l.color }));
    return { svg: `<svg viewBox="0 0 ${W} ${H}" class="gsvg" role="img">${s}</svg>`, points: pts, legend };
  }

  return { render };
})();
