// Pure SVG strings for the valuation / financial charts: snowflake radar, ratio band line, grouped bars, net-flow bars. Colours via CSS classes.
const VSvg = (() => {
  const r1 = n => Math.round(n * 10) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const compact = n => Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + "k" : Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(1);

  // axes: [{ label, score 0–6 | null }] → 5-spoke radar; tone from the average score.
  function radar(axes, size = 220) {
    const c = size / 2, R = c - 34, n = axes.length, pt = (i, s) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [r1(c + Math.cos(a) * R * s / 6), r1(c + Math.sin(a) * R * s / 6)]; };
    const rings = [2, 4, 6].map(s => `<polygon class="ring" points="${axes.map((_, i) => pt(i, s).join(",")).join(" ")}"/>`).join("");
    const spokes = axes.map((_, i) => `<line class="ring" x1="${c}" y1="${c}" x2="${pt(i, 6)[0]}" y2="${pt(i, 6)[1]}"/>`).join("");
    const known = axes.filter(a => a.score != null), avg = known.length ? known.reduce((s, a) => s + a.score, 0) / known.length : 0;
    const tone = avg >= 4 ? "up" : avg >= 2.5 ? "ref" : "down";
    const shape = `<polygon class="snow ${tone}" points="${axes.map((a, i) => pt(i, Math.max(0.3, a.score ?? 0)).join(",")).join(" ")}"/>`;
    const labels = axes.map((a, i) => { const [x, y] = pt(i, 7.4); return `<text x="${x}" y="${y + 4}" text-anchor="middle" class="ax">${esc(a.label)} ${a.score ?? "–"}</text>`; }).join("");
    return `<svg viewBox="-30 0 ${size + 60} ${size}" class="radar" role="img">${rings}${spokes}${shape}${labels}</svg>`;
  }

  // points [{ date, value }] + band stats → line with mean and ±1σ guides.
  function band(points, st, meanLabel = "TB", w = 340, h = 150) {
    const v = points.filter(p => Number.isFinite(p.value) && p.value > 0);
    if (v.length < 2 || !st) return `<svg viewBox="0 0 ${w} ${h}" class="vchart"><text x="${w / 2}" y="${h / 2}" class="ax" text-anchor="middle">—</text></svg>`;
    const lo = Math.min(st.min, st.mean - st.sd), hi = Math.max(st.max, st.mean + st.sd), pad = { l: 4, r: 40, t: 8, b: 16 };
    const x = i => r1(pad.l + i / (v.length - 1) * (w - pad.l - pad.r)), y = n => r1(pad.t + (hi - n) / (hi - lo || 1) * (h - pad.t - pad.b));
    const guide = (n, cls, label) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(n)}" y2="${y(n)}" class="${cls}"/><text x="${w - pad.r + 3}" y="${y(n) + 3}" class="ax">${label} ${n.toFixed(1)}</text>`;
    const years = [...new Set(v.map(p => p.date.slice(0, 4)))].map(yr => { const i = v.findIndex(p => p.date.startsWith(yr)); return `<text x="${x(i)}" y="${h - 3}" class="ax">${esc(yr)}</text>`; }).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="vchart" role="img">${guide(st.mean + st.sd, "sd", "+1σ")}${guide(st.mean, "mean", esc(meanLabel))}${guide(st.mean - st.sd, "sd", "−1σ")}`
      + `<path class="pl ref" d="${v.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join("")}"/>${years}</svg>`;
  }

  // labels (oldest → newest) × series [{ cls, values }] as grouped bars; optional line [{ cls, values (%) }] on a right axis.
  function bars(labels, series, line = null, w = 340, h = 170) {
    const all = series.flatMap(s => s.values).filter(Number.isFinite);
    if (!labels.length || !all.length) return "";
    const pad = { l: 34, r: line ? 30 : 6, t: 8, b: 18 }, lo = Math.min(0, ...all), hi = Math.max(0, ...all), cw = (w - pad.l - pad.r) / labels.length;
    const y = n => r1(pad.t + (hi - n) / (hi - lo || 1) * (h - pad.t - pad.b)), bw = Math.max(2, cw * 0.8 / series.length);
    let out = `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(0)}" y2="${y(0)}" class="ring"/><text x="2" y="${y(hi) + 8}" class="ax">${compact(hi)}</text>`;
    if (lo < 0) out += `<text x="2" y="${y(lo)}" class="ax">${compact(lo)}</text>`;
    labels.forEach((lb, i) => {
      series.forEach((s, k) => { const n = s.values[i]; if (!Number.isFinite(n)) return; const x0 = r1(pad.l + i * cw + cw * 0.1 + k * bw), top = Math.min(y(n), y(0));
        out += `<rect class="${s.cls}${n < 0 ? " neg" : ""}" x="${x0}" y="${top}" width="${r1(bw - 1)}" height="${r1(Math.max(0.5, Math.abs(y(n) - y(0))))}"/>`; });
      out += `<text x="${r1(pad.l + i * cw + cw / 2)}" y="${h - 4}" class="ax" text-anchor="middle">${esc(lb)}</text>`;
    });
    if (line) {
      const lv = line.values.filter(Number.isFinite), l0 = Math.min(0, ...lv), l1 = Math.max(1, ...lv), ly = n => r1(pad.t + (l1 - n) / (l1 - l0 || 1) * (h - pad.t - pad.b));
      const d = line.values.map((n, i) => Number.isFinite(n) ? `${i && Number.isFinite(line.values[i - 1]) ? "L" : "M"}${r1(pad.l + i * cw + cw / 2)},${ly(n)}` : "").join("");
      out += `<path class="pl ${line.cls}" d="${d}"/><text x="${w - pad.r + 2}" y="${ly(l1) + 8}" class="ax">${compact(l1)}%</text>`;
    }
    return `<svg viewBox="0 0 ${w} ${h}" class="vchart" role="img">${out}</svg>`;
  }

  // Net flow bars (green buy / red sell) oldest → newest + cumulative line.
  function flows(values, w = 340, h = 130) {
    const v = values.filter(Number.isFinite);
    if (!v.length) return "";
    let s = 0;
    const cum = values.map(n => (s += n || 0)), m = Math.max(...v.map(Math.abs), 1), cm = Math.max(...cum.map(Math.abs), 1), mid = h / 2, bw = w / values.length;
    const rects = values.map((n, i) => Number.isFinite(n) && n ? `<rect class="${n > 0 ? "upb" : "downb"}" x="${r1(i * bw)}" y="${r1(n > 0 ? mid - n / m * (mid - 6) : mid)}" width="${r1(Math.max(1, bw - 1))}" height="${r1(Math.abs(n) / m * (mid - 6))}"/>` : "").join("");
    const d = cum.map((n, i) => `${i ? "L" : "M"}${r1(i * bw + bw / 2)},${r1(mid - n / cm * (mid - 6))}`).join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="vchart" role="img"><line x1="0" x2="${w}" y1="${mid}" y2="${mid}" class="ring"/>${rects}<path class="pl acc" d="${d}"/></svg>`;
  }

  return { radar, band, bars, flows };
})();
