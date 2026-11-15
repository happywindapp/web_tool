// Biểu đồ SVG tự vẽ cho thời tiết: dải (band), đường, cột; trục trái/phải, lưới, chú thích, đường dò + tooltip theo chuột/chạm.
const WxChart = (() => {
  const esc = s => Dom.esc(s);
  const num = v => I18n.num(Math.round(v * 10) / 10);

  function ticks(min, max, n = 5) {
    if (min === max) { min -= 1; max += 1; }
    const raw = (max - min) / n, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(k => k * p).find(s => s >= raw);
    const out = [];
    for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) out.push(+v.toFixed(6));
    return out;
  }

  // Contiguous runs of indices where ok(i) holds — lines and bands break on missing data.
  const runs = (n, ok) => { const r = []; let cur = null; for (let i = 0; i < n; i++) { if (ok(i)) (cur ||= []).push(i); else if (cur) { r.push(cur); cur = null; } } if (cur) r.push(cur); return r; };

  // spec: { labels[], xticks?: idx[], height?, unit: { left, right }, series: [{ type: band|line|bar, name, cls, v | lo+hi, axis?: left|right, dash? }], tip(i) → HTML }
  function render(box, spec) {
    const W = Math.max(280, Math.floor(box.clientWidth) || 600), H = spec.height || 220, n = spec.labels.length;
    const hasRight = spec.series.some(s => s.axis === "right");
    const M = { l: 42, r: hasRight ? 44 : 12, t: 22, b: 24 }, iw = W - M.l - M.r, ih = H - M.t - M.b, bw = iw / Math.max(n, 1);
    const x = i => M.l + (i + 0.5) * bw;
    const scale = axis => {
      const ss = spec.series.filter(s => (s.axis || "left") === axis), v = ss.flatMap(s => s.type === "band" ? [...s.lo, ...s.hi] : s.v).filter(Number.isFinite);
      if (!v.length) return null;
      const t = ticks(ss.some(s => s.type === "bar") ? Math.min(0, ...v) : Math.min(...v), Math.max(...v)), lo = t[0], hi = t[t.length - 1];
      return { t, y: val => M.t + ih - (val - lo) / (hi - lo) * ih };
    };
    const S = { left: scale("left"), right: scale("right") };
    let g = "";
    const base = S.left || S.right;
    for (const t of base.t) g += `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${base.y(t)}" y2="${base.y(t)}"/><text class="ax" x="${M.l - 6}" y="${base.y(t) + 4}" text-anchor="end">${esc(num(t))}</text>`;
    if (S.left && S.right) for (const t of S.right.t) g += `<text class="ax" x="${W - M.r + 6}" y="${S.right.y(t) + 4}">${esc(num(t))}</text>`;
    if (spec.unit) g += `<text class="ax unit" x="${M.l - 6}" y="11" text-anchor="end">${esc(spec.unit.left || "")}</text>`
      + (hasRight ? `<text class="ax unit" x="${W - M.r + 6}" y="11">${esc(spec.unit.right || "")}</text>` : "");
    const xt = spec.xticks || [...new Set(ticks(0, n - 1, Math.max(2, Math.floor(iw / 70))).map(Math.round))].filter(i => i >= 0 && i < n);
    for (const i of xt) g += `<text class="ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(spec.labels[i])}</text>`;
    for (const s of spec.series) {
      const sc = S[s.axis || "left"], y = sc.y;
      if (s.type === "bar") s.v.forEach((v, i) => { if (Number.isFinite(v)) { const y0 = y(Math.max(0, sc.t[0])), y1 = y(v); g += `<rect class="${s.cls}" x="${x(i) - bw * 0.35}" width="${Math.max(1, bw * 0.7)}" y="${Math.min(y0, y1)}" height="${Math.abs(y0 - y1)}"/>`; } });
      else if (s.type === "band") for (const r of runs(n, i => Number.isFinite(s.lo[i]) && Number.isFinite(s.hi[i])))
        g += `<path class="${s.cls}" d="M${r.map(i => x(i) + " " + y(s.hi[i])).join("L")}L${r.slice().reverse().map(i => x(i) + " " + y(s.lo[i])).join("L")}Z"/>`;
      else for (const r of runs(n, i => Number.isFinite(s.v[i])))
        g += r.length === 1 ? `<circle class="${s.cls} dot" cx="${x(r[0])}" cy="${y(s.v[r[0]])}" r="2.5"/>` : `<path class="${s.cls}${s.dash ? " dash" : ""}" fill="none" d="M${r.map(i => x(i) + " " + y(s.v[i])).join("L")}"/>`;
    }
    const legend = spec.series.filter(s => s.name).map(s => `<span><i class="sw ${s.cls}${s.type === "line" ? " ln" : ""}${s.dash ? " dash" : ""}"></i>${esc(s.name)}</span>`).join("");
    box.innerHTML = `<div class="wxc-legend">${legend}</div><svg class="wxc-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}`
      + `<line class="guide" y1="${M.t}" y2="${M.t + ih}" visibility="hidden"/><rect class="hit" x="${M.l}" y="${M.t}" width="${iw}" height="${ih}" fill="transparent"/></svg><div class="wxc-tip" hidden></div>`;
    const svg = box.querySelector("svg"), guide = svg.querySelector(".guide"), tip = box.querySelector(".wxc-tip");
    const move = e => {
      const r = svg.getBoundingClientRect(), i = Math.min(n - 1, Math.max(0, Math.floor((e.clientX - r.left - M.l) / bw)));
      guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("visibility", "visible");
      tip.innerHTML = spec.tip(i); tip.hidden = false;
      const left = x(i) + 12 + tip.offsetWidth > W ? x(i) - 12 - tip.offsetWidth : x(i) + 12;
      tip.style.left = Math.max(0, left) + "px"; tip.style.top = M.t + 24 + "px";
    };
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerdown", move);
    svg.addEventListener("pointerleave", () => { tip.hidden = true; guide.setAttribute("visibility", "hidden"); });
  }

  return { render, ticks };
})();
