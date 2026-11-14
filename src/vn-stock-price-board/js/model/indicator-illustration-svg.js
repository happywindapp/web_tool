// Pure: one indicator drawn on a fixed simulated series (rise → top → fall → range → breakout) as an SVG string, for the indicator guide.
const IndIllus = (() => {
  const N = 160, W = 560;
  const r1 = n => Math.round(n * 10) / 10, r2 = n => Math.round(n * 100) / 100;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const noise = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
  // Pairs of moving averages so the picture shows their crosses.
  const SETUP = { sma: [["sma", { n: 20 }], ["sma", { n: 50 }]], ema: [["ema", { n: 12 }], ["ema", { n: 26 }]], wma: [["wma", { n: 10 }], ["wma", { n: 30 }]] };
  const MA = ["maCrossUp", "maCrossDown"];
  const EVENTS = { sma: MA, ema: MA, wma: MA, bb: ["bbUp", "bbDown"], macd: ["macdUp", "macdDown"], rsi: ["rsiHigh", "rsiLow"] };

  // Deterministic bars; intraday = 4 sessions of 40 × 5-minute bars (VWAP resets per session).
  function sample(intraday = false) {
    const out = [], day0 = 1.7e9 - 1.7e9 % 86400;
    let c = 40;
    for (let i = 0; i < N; i++) {
      const drift = i < 55 ? 0.32 : i < 95 ? -0.38 : i < 128 ? 0.12 * Math.sin(i / 2.5) : 0.42;
      const o = c;
      c = Math.max(5, c + drift + noise(i) * 1.1);
      const time = intraday ? day0 + Math.floor(i / 40) * 86400 + 7200 + (i % 40) * 300 : day0 + i * 86400;
      const vol = 1e6 * (1 + noise(i + 300) * 0.6) * (i === 60 || i === 130 ? 3.2 : 1) * (drift > 0 ? 1.2 : 0.9);
      out.push({ time, open: r2(o), close: r2(c), high: r2(Math.max(o, c) + Math.abs(noise(i + 500)) * 0.8), low: r2(Math.min(o, c) - Math.abs(noise(i + 900)) * 0.8), volume: Math.round(vol) });
    }
    return out;
  }

  const finite = a => a.filter(Number.isFinite);
  function path(values, x, y) {
    let d = "", pen = false;
    values.forEach((v, i) => { if (!Number.isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i)} ${y(v)}`; pen = true; });
    return d;
  }
  function drawLine(l, x, y, y0, cw) {
    if (l.kind === "hist") return l.values.map((v, i) => Number.isFinite(v) ? `<rect x="${r1(x(i) - cw * 0.35)}" y="${Math.min(y(v), y0)}" width="${r1(cw * 0.7)}" height="${r1(Math.abs(y(v) - y0)) || 0.5}" fill="${l.colors[i]}"/>` : "").join("");
    if (l.kind === "dots") return l.values.map((v, i) => Number.isFinite(v) ? `<circle cx="${x(i)}" cy="${y(v)}" r="1.3" fill="${l.color}"/>` : "").join("");
    return `<path d="${path(l.values, x, y)}" fill="none" stroke="${l.color}" stroke-width="${l.width || 1.6}"${l.dash ? ' stroke-dasharray="4 3"' : ""}/>`;
  }
  const legend = (lines, top) => `<text x="6" y="${top + 12}" class="ig-ax">${lines.map(l => `<tspan fill="${l.colors ? "#22c55e" : l.color}">${esc(l.title)}</tspan>`).join("  ")}</text>`;
  const scale = (vals, top, h) => { const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo || 1) * 0.06; return v => r1(top + (hi + pad - v) / (hi - lo + 2 * pad || 1) * h); };

  // label(kind) → short text for a marked event (UI passes the translated name).
  function svg(id, { label = k => k } = {}) {
    const def = Indicators.DEFS[id];
    if (!def) return "";
    const bars = sample(!!def.intraday), own = def.pane === "own";
    const inds = Indicators.compute((SETUP[id] || [[id, {}]]).map(([k, p]) => ({ id: k, p: Indicators.params(k, p) })), bars);
    const lines = inds.flatMap(z => z.lines);
    const pH = own ? 150 : 220, oTop = pH + 8, oH = own ? 110 : 0, h = own ? oTop + oH : pH, plotW = W - 48, cw = plotW / N;
    const x = i => r1(4 + (i + 0.5) * cw);
    const yP = scale(finite(bars.flatMap(b => [b.high, b.low]).concat(own ? [] : lines.flatMap(l => l.values))), own ? 22 : 38, pH - (own ? 28 : 44));
    const candles = bars.map((b, i) => {
      const cls = b.close >= b.open ? "ig-up" : "ig-dn", top = Math.min(yP(b.open), yP(b.close));
      return `<line x1="${x(i)}" x2="${x(i)}" y1="${yP(b.high)}" y2="${yP(b.low)}" class="${cls}"/><rect x="${r1(x(i) - cw * 0.3)}" y="${top}" width="${r1(cw * 0.6)}" height="${r1(Math.abs(yP(b.open) - yP(b.close))) || 0.5}" class="${cls}"/>`;
    }).join("");
    const closes = bars.map(b => b.close), axis = (yv, v, cls = "ig-ax") => `<text x="${W - 4}" y="${yv + 3}" text-anchor="end" class="${cls}">${esc(r1(v))}</text>`;
    const sessions = def.intraday ? bars.map((b, i) => i && Math.floor(b.time / 86400) !== Math.floor(bars[i - 1].time / 86400) ? `<line x1="${r1(x(i) - cw / 2)}" x2="${r1(x(i) - cw / 2)}" y1="0" y2="${pH}" class="ig-lvl"/>` : "").join("") : "";
    let body = `<rect x="0" y="0" width="${W}" height="${pH}" class="ig-bg"/>${sessions}${candles}` + axis(yP(Math.max(...closes)), Math.max(...closes)) + axis(yP(Math.min(...closes)), Math.min(...closes));
    if (!own) body += lines.map(l => drawLine(l, x, yP, 0, cw)).join("") + legend(lines, 0);
    else {
      const lv = def.levels || [], yO = scale(finite(lines.flatMap(l => l.values)).concat(lv, lines.some(l => l.kind === "hist") ? [0] : []), oTop + 16, oH - 20);
      body += `<rect x="0" y="${oTop}" width="${W}" height="${oH}" class="ig-bg"/>`
        + lv.map(v => `<line x1="4" x2="${4 + plotW}" y1="${yO(v)}" y2="${yO(v)}" class="ig-lvl"/>${axis(yO(v), v)}`).join("")
        + lines.map(l => drawLine(l, x, yO, yO(0), cw)).join("") + legend(lines, oTop);
    }
    const kinds = EVENTS[id] || ["swingHigh", "swingLow"];
    let ev = ChartEvents.detect(bars, inds).filter(v => kinds.includes(v.kind));
    if (ev.length > 6) ev = Array.from({ length: 6 }, (_, k) => ev[Math.round(k * (ev.length - 1) / 5)]);
    body += ev.map(v => {
      const up = v.pos === "below", yv = r1(yP(v.price) + (up ? 4 : -4)), xv = x(v.i), tx = Math.min(W - 40, Math.max(24, xv));
      return `<g class="ig-ev ${v.tone}"><path d="M${xv} ${yv}l-4 ${up ? 7 : -7}h8z"/><text x="${tx}" y="${r1(yv + (up ? 17 : -10))}" text-anchor="middle">${esc(label(v.kind))}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${h}" class="ig-svg" role="img">${body}</svg>`;
  }

  return { svg, sample, N };
})();
