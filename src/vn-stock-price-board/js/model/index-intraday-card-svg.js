// Pure SVG for an index card: the last two sessions of 1-minute bars (previous session grey, latest green / red against its reference),
// 5-minute volume bars and a time axis. Lunch break is cut out (09:00–11:30 + 13:00–15:00 = 270 minutes per session).
const IndexCardSvg = (() => {
  const W = 300, H = 76, PT = 4, PH = 42, VH = 12, SPAN = 270;
  const axis = m => Math.max(0, Math.min(SPAN, m <= 690 ? m - 540 : 150 + Math.max(0, m - 780)));
  const r1 = n => Math.round(n * 10) / 10;
  const vnDay = t => Math.floor((t + 25200) / 86400), vnMin = t => Math.floor((t + 25200) % 86400 / 60);
  const hm = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  // dchart minute bars (unix s) → [{ day, pts: [{ t, m, v, vol }] }] for the last n trading days.
  function sessions(bars, n = 2) {
    const by = new Map();
    for (const b of bars || []) {
      const m = vnMin(b.time), d = vnDay(b.time);
      if (m < 540 || m > 900 || !(b.close > 0)) continue;
      (by.get(d) || by.set(d, []).get(d)).push({ t: b.time, m, v: b.close, vol: b.volume || 0 });
    }
    return [...by.entries()].sort((a, b) => a[0] - b[0]).slice(-n).map(([day, pts]) => ({ day, pts }));
  }

  // ref: reference of the latest session; id: unique per card (clip-path ids). Returns { svg, pts } — pts carry x / y for the hover readout.
  function chart(ss, ref, id) {
    const all = ss.flatMap(s => s.pts);
    if (!all.length) return { svg: `<svg viewBox="0 0 ${W} ${H}" class="ixc"></svg>`, pts: [] };
    const hasRef = Number.isFinite(ref) && ref > 0, vals = all.map(p => p.v).concat(hasRef ? ref : []);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const sw = W / ss.length, x = (k, m) => r1(k * sw + axis(m) / SPAN * sw), y = v => r1(PT + (hi - v) / (hi - lo) * PH), last = ss.length - 1;
    const pts = ss.flatMap((s, k) => s.pts.map(p => ({ ...p, day: s.day, x: x(k, p.m), y: y(p.v) })));
    const path = k => pts.filter(p => p.day === ss[k].day).map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join("");
    const ry = hasRef ? y(ref) : null, vb = PT + PH + 3 + VH;
    const lines = ss.map((s, k) => k < last ? `<path d="${path(k)}" class="pl prev"/>`
      : hasRef ? `<path d="${path(k)}" class="pl up" clip-path="url(#${id}a)"/><path d="${path(k)}" class="pl down" clip-path="url(#${id}b)"/>` : `<path d="${path(k)}" class="pl ref"/>`).join("");
    const buckets = new Map();
    ss.forEach((s, k) => s.pts.forEach(p => { const key = k * 100 + Math.floor(axis(p.m) / 5); buckets.set(key, (buckets.get(key) || 0) + p.vol); }));
    const vmax = Math.max(1, ...buckets.values()), bw = r1(sw / (SPAN / 5) * 0.7);
    const vols = [...buckets].map(([key, v]) => { const k = Math.floor(key / 100), h = r1(v / vmax * VH); return `<rect x="${r1(k * sw + (key % 100) * 5 / SPAN * sw)}" y="${r1(vb - h)}" width="${bw}" height="${h}"/>`; }).join("");
    const lbl = (px, text, anchor = "middle") => `<text x="${px}" y="${H - 2}" text-anchor="${anchor}">${text}</text>`;
    const ticks = ss.map((s, k) => (k ? lbl(x(k, 540) + 2, new Date(s.day * 864e5).getUTCDate(), "start") + `<line x1="${x(k, 540)}" x2="${x(k, 540)}" y1="${PT}" y2="${vb}" class="sep"/>` : lbl(x(k, 570), "09:30"))
      + lbl(x(k, 690), "11:30") + (ss.length === 1 ? lbl(x(k, 780), "13:00") : "") + (k === last ? lbl(W - 1, "14:30", "end") : "")).join("");
    const clips = hasRef ? `<defs><clipPath id="${id}a"><rect x="0" y="0" width="${W}" height="${ry}"/></clipPath><clipPath id="${id}b"><rect x="0" y="${ry}" width="${W}" height="${H}"/></clipPath></defs>` : "";
    return { pts, svg: `<svg viewBox="0 0 ${W} ${H}" class="ixc">${clips}<g class="vb">${vols}</g>`
      + (hasRef ? `<line x1="0" x2="${W}" y1="${ry}" y2="${ry}" class="refline"/>` : "") + lines + `<g class="ax">${ticks}</g>`
      + `<g class="ixh" visibility="hidden"><line y1="${PT}" y2="${vb}"/><circle r="2.5"/></g></svg>` };
  }

  return { sessions, chart, vnDay, hm, W };
})();
