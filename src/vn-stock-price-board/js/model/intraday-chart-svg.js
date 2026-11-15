// Pure SVG strings: intraday price + volume chart from trades. Colours come from CSS classes.
const ChartSvg = (() => {
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? +m[1] * 60 + +m[2] : -1; };
  // Session axis 09:00–11:30 + 13:00–15:00 with the lunch break cut out (270 minutes).
  const SPAN = 270;
  const axis = m => Math.max(0, Math.min(SPAN, m <= 690 ? m - 540 : 150 + Math.max(0, m - 780)));
  const r1 = n => Math.round(n * 10) / 10;

  // Trades (ascending) → one bar per minute: last price + summed volume.
  function minuteBars(trades) {
    const bars = new Map();
    for (const t of trades) {
      const m = toMin(t.time);
      if (m < 0 || !t.price) continue;
      const b = bars.get(m) || { m, price: 0, vol: 0 };
      b.price = t.price; b.vol += t.vol;
      bars.set(m, b);
    }
    return [...bars.values()].sort((a, b) => a.m - b.m);
  }

  function intraday(trades, q, w = 600, h = 260) {
    const bars = minuteBars(trades);
    const pad = { l: 6, r: 50, t: 10, b: 20 }, cw = w - pad.l - pad.r, ph = (h - pad.t - pad.b) * 0.72, vh = (h - pad.t - pad.b) * 0.24;
    const prices = bars.map(b => b.price).concat(q.ref || []);
    let lo = Math.min(...prices), hi = Math.max(...prices);
    if (!bars.length || !Number.isFinite(lo)) return `<svg viewBox="0 0 ${w} ${h}" class="chart"><text x="${w / 2}" y="${h / 2}" class="ax" text-anchor="middle">—</text></svg>`;
    if (hi - lo < 1e-9) { hi += 0.5; lo -= 0.5; }
    const x = m => r1(pad.l + axis(m) / SPAN * cw), y = p => r1(pad.t + (hi - p) / (hi - lo) * ph);
    const vmax = Math.max(...bars.map(b => b.vol)) || 1, vb = pad.t + ph + 4 + vh;
    const last = bars[bars.length - 1].price, tone = last > q.ref ? "up" : last < q.ref ? "down" : "ref";
    const line = bars.map((b, i) => `${i ? "L" : "M"}${x(b.m)},${y(b.price)}`).join("");
    const vols = bars.map(b => { const bh = r1(b.vol / vmax * vh); return `<rect x="${x(b.m) - 0.6}" y="${r1(vb - bh)}" width="1.6" height="${bh}"/>`; }).join("");
    const ticks = [540, 600, 660, 780, 840, 900].map(m => `<text x="${x(m)}" y="${h - 5}" class="ax" text-anchor="middle">${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}</text>`).join("");
    const lbl = (p, cls) => `<text x="${w - pad.r + 4}" y="${y(p) + 4}" class="ax ${cls}">${p.toFixed(2)}</text>`;
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`
      + `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(q.ref)}" y2="${y(q.ref)}" class="refline"/>`
      + `<path d="${line}" class="pl ${tone}"/><g class="vb">${vols}</g>${ticks}`
      + lbl(hi, "") + (q.ref > lo && q.ref < hi ? lbl(q.ref, "ref") : "") + lbl(lo, "") + `</svg>`;
  }

  return { minuteBars, intraday, toMin };
})();
