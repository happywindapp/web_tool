// "Thị trường" tab: dominance, Altcoin Season, Fear & Greed 30 days, buy / sell ideas per horizon, heatmap (area = market cap, colour = % change), sectors with drill-down,
// trending searches, top gainers / losers / volume. Live prices re-render at most every 10 s.
const MarketView = (() => {
  const SIZES = [50, 100, 200];
  let host = null, cats = null, trend = null, sector = null, sectorRows = null, lastPaint = 0, timer = 0, seq = 0;
  let heatN = SIZES.includes(Prefs.get("mk.n")) ? Prefs.get("mk.n") : 100, heatK = ["pct", "pct7d"].includes(Prefs.get("mk.k")) ? Prefs.get("mk.k") : "pct";
  const e = s => Dom.esc(s ?? "");
  const COLORS = ["#f7931a", "#627eea", "#26a17b", "#f3ba2f", "#2775ca", "#9945ff", "#23292f", "#94a3b8"];
  const seg = (k, list, cur) => `<span class="seg">${list.map(([v, l]) => `<button data-${k}="${v}"${String(v) === String(cur) ? ' class="on"' : ""}>${e(l)}</button>`).join("")}</span>`;
  const rows = () => [...new Set(Coins.list().map(g => g.sym))].map(Coins.row);

  function top(all) {
    const g = Strip.global(), fg = Strip.fearGreed(), alt = MarketMath.altSeason(all), out = [];
    if (g) {
      const dom = MarketMath.dominance(g.share);
      out.push(`<div class="card wide"><span>${e(T("Thị phần vốn hoá"))}</span><div class="mk-bar">${dom.map((d, i) => `<i style="width:${d.pct.toFixed(2)}%;background:${COLORS[i]}" title="${e(d.k || T("Khác"))} ${Fmt.en(d.pct, 1)}%"></i>`).join("")}</div>`
        + `<em>${dom.slice(0, 5).map((d, i) => `<span style="color:${COLORS[i]}">■</span> ${e(d.k || T("Khác"))} ${Fmt.en(d.pct, 1)}%`).join(" · ")}</em></div>`);
    }
    if (alt) out.push(`<div class="card" title="${e(T("Tỷ lệ coin trong top {n} (bỏ stablecoin, token bọc) tăng tốt hơn BTC trong 30 ngày. ≥ 75: mùa altcoin, ≤ 25: mùa Bitcoin.", { n: alt.n }))}"><span>${e(T("Altcoin Season (30 ngày)"))}</span>`
      + `<b>${alt.score}/100</b><em class="${alt.phase === "alt" ? "up" : alt.phase === "btc" ? "btc" : "muted"}">${e(alt.phase === "alt" ? T("Mùa altcoin") : alt.phase === "btc" ? T("Mùa Bitcoin") : T("Trung tính"))} · ${e(T("{b}/{n} coin thắng BTC", { b: alt.beat, n: alt.n }))}</em></div>`);
    if (fg && fg.length) {
      const list = fg.slice(0, 30).reverse();
      out.push(`<div class="card"><span>${e(T("Sợ hãi & Tham lam · 30 ngày"))}</span><b>${fg[0].v} · ${e(T(fg[0].label))}</b><div class="fg-hist">${list.map(x => `<i style="height:${Math.max(4, x.v)}%;background:${MarketMath.heat((x.v - 50) / 5)}" title="${e(Fmt.date(x.t))}: ${x.v}"></i>`).join("")}</div></div>`);
    }
    return `<div class="cards">${out.join("")}</div>`;
  }

  function heatmap(all) {
    const W = 1000, H = 520, pool = all.filter(r => r.mcap > 0 && !MarketMath.isStable(r) && !MarketMath.isWrapped(r)).sort((a, b) => b.mcap - a.mcap).slice(0, heatN);
    if (!pool.length) return `<p class="pad muted">${e(T("Đang tải dữ liệu vốn hoá…"))}</p>`;
    const boxes = Mkt.treemap(pool.map(r => ({ key: r.sym, w: r.mcap })), 0, 0, W, H), by = new Map(pool.map(r => [r.sym, r]));
    const g = Strip.global(), total = g && g.mcap || all.reduce((t, r) => t + (r.mcap || 0), 0), share = r => total ? r.mcap / total * 100 : null;
    const cells = boxes.map(b => {
      const r = by.get(b.key), big = b.w > 34 && b.h > 20, pct = r[heatK], fs = Math.min(26, Math.max(9, Math.min(b.w / 4, b.h / 2.6))).toFixed(0), sh = share(r);
      const shTxt = sh == null ? "" : T("{p}% thị phần", { p: Fmt.en(sh, sh >= 1 ? 1 : 2) }), cx = (b.x + b.w / 2).toFixed(1);
      return `<g data-coin="${e(r.sym)}"><title>${e(r.sym)} ${e(r.name)} ${e(Fmt.pct(pct))} · ${e(Fmt.moneyBig(r.mcap))} · ${e(T("chiếm {p}% vốn hoá toàn thị trường", { p: sh == null ? "–" : Fmt.en(sh, 2) }))}</title><rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${Math.max(0, b.w - 1).toFixed(1)}" height="${Math.max(0, b.h - 1).toFixed(1)}" fill="${MarketMath.heat(pct, heatK === "pct" ? 10 : 25)}"/>`
        + (big ? `<text x="${(b.x + b.w / 2).toFixed(1)}" y="${(b.y + b.h / 2).toFixed(1)}" text-anchor="middle" class="mk-sym" style="font-size:${fs}px">${e(r.sym)}${b.h > 34 ? `<tspan x="${cx}" dy="1.15em" class="mk-pct">${e(Fmt.pct(pct, 1))}</tspan>` : ""}${shTxt && b.h > 58 && b.w > 64 ? `<tspan x="${cx}" dy="1.15em" class="mk-share">${e(shTxt)}</tspan>` : ""}</text>` : "") + `</g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="heatmap" role="img">${cells}</svg>`;
  }

  function sectors() {
    if (!cats) return `<p class="pad muted">${e(T("Đang tải nhóm ngành…"))}</p>`;
    const list = cats.slice().sort((a, b) => b.mcap - a.mcap).slice(0, 30), max = Math.max(1, ...list.map(c => Math.abs(c.pct || 0)));
    return `<div class="mk-sectors">${list.map(c => `<button class="mk-srow${sector === c.id ? " on" : ""}" data-sector="${e(c.id)}" title="${e(T("Xem các coin trong nhóm"))}"><span>${e(c.name)}</span>`
      + `<i class="${c.pct >= 0 ? "upb" : "downb"}" style="width:${(Math.abs(c.pct || 0) / max * 45).toFixed(1)}%"></i><b class="${Fmt.tone(c.pct)}">${e(Fmt.pct(c.pct, 1))}</b><em>${e(Fmt.moneyBig(c.mcap))}</em></button>`).join("")}</div>`
      + (sector ? `<div class="mk-drill">${sectorRows ? sectorRows.slice(0, 40).map(r => `<button class="rchip" data-coin="${e(r.sym)}">${e(r.sym)} <span class="${Fmt.tone(r.pct)}">${e(Fmt.pct(r.pct, 1))}</span></button>`).join("") : `<span class="muted">${e(T("Đang tải…"))}</span>`}</div>` : "");
  }

  function lists(all) {
    const tbl = (title, list, cell) => `<div class="mk-top"><b>${e(title)}</b><table class="dtable">${list.map(r => `<tr data-coin="${e(r.sym)}"><td><b>${e(r.sym)}</b></td><td>${e(Fmt.money(r.last ?? r.price))}</td><td>${cell(r)}</td></tr>`).join("")}</table></div>`;
    const pct = k => r => `<span class="${Fmt.tone(r[k])}">${e(Fmt.pct(r[k], 1))}</span>`;
    return `<div class="mk-tops">${tbl(T("Tăng mạnh 24h"), MarketMath.movers(all, "pct"), pct("pct"))}${tbl(T("Giảm mạnh 24h"), MarketMath.movers(all, "pct", 8, true), pct("pct"))}`
      + tbl(T("Tăng mạnh 7 ngày"), MarketMath.movers(all, "pct7d"), pct("pct7d")) + tbl(T("KL 24h lớn nhất"), MarketMath.movers(all, "qvol"), r => e(Fmt.moneyBig(r.qvol)))
      + (trend ? tbl(T("Đang được tìm nhiều (CoinGecko)"), trend.slice(0, 10).map(t => ({ ...Coins.row(t.sym), ...(Coins.row(t.sym).last ? {} : { last: t.price, pct: t.pct }), sym: t.sym })), pct("pct")) : "") + `</div>`;
  }

  function paint() {
    if (!host) return;
    lastPaint = Date.now();
    const all = rows();
    host.innerHTML = top(all) + PicksView.html() + `<div class="dsec"><b>Heatmap</b>${seg("hk", [["pct", "24h"], ["pct7d", T("7 ngày")]], heatK)}${seg("hn", SIZES.map(n => [n, "Top " + n]), heatN)}</div>`
      + heatmap(all) + `<p class="sc-note">${e(T("Ô = vốn hoá, màu = % thay đổi, dòng dưới = % thị phần vốn hoá toàn thị trường (rê chuột / giữ để xem với ô nhỏ); bỏ stablecoin và token bọc. Bấm ô để xem chi tiết coin."))}</p>`
      + `<div class="dsec"><b>${e(T("Nhóm ngành (CoinGecko) — % vốn hoá 24h"))}</b></div>${sectors()}` + lists(all);
  }

  async function loadSector(id) {
    sector = id; sectorRows = null; paint();
    const my = ++seq;
    try { const r = await Gecko.markets(1, id); if (my === seq) { sectorRows = r; paint(); } }
    catch (err) { if (my === seq) { sector = null; paint(); PersonalUI.toast(err.rateLimited ? T("CoinGecko giới hạn tần suất — thử lại sau ~{n}s.", { n: err.retryIn || 60 }) : T("Không tải được danh sách coin của nhóm."), "down"); } }
  }

  function onClick(ev) {
    const b = ev.target.closest("[data-hk],[data-hn],[data-sector],[data-ph]");
    if (!b) return;
    if (b.dataset.ph) { if (PicksView.act(b)) paint(); return; }
    if (b.dataset.hk) { heatK = b.dataset.hk === "pct7d" ? "pct7d" : "pct"; Prefs.set("mk.k", heatK); }
    if (b.dataset.hn && SIZES.includes(+b.dataset.hn)) { heatN = +b.dataset.hn; Prefs.set("mk.n", heatN); }
    if (b.dataset.sector) { if (sector === b.dataset.sector) { sector = null; paint(); } else loadSector(b.dataset.sector); return; }
    paint();
  }

  async function mount(el) {
    host = el; el.addEventListener("click", onClick); paint();
    PicksView.load(() => { if (host === el) paint(); });
    const [c, t] = await Promise.allSettled([Gecko.categories(), Gecko.trending()]);
    if (c.status === "fulfilled") cats = c.value; else console.warn("MarketView.mount - get categories fail", c.reason && c.reason.message);
    if (t.status === "fulfilled") trend = t.value; else console.warn("MarketView.mount - get trending fail", t.reason && t.reason.message);
    if (host === el) paint();
  }
  function unmount() { if (host) host.removeEventListener("click", onClick); host = null; clearTimeout(timer); seq++; }
  function onTicks() { if (host && !timer) timer = setTimeout(() => { timer = 0; paint(); }, Math.max(0, 10000 - (Date.now() - lastPaint))); }

  return { id: "market", label: "Thị trường", wide: true, mount, unmount, relabel: paint, onTicks };
})();
