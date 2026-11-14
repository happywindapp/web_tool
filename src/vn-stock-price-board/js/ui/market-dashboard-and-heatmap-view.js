// "Thị trường" tab: breadth per exchange, heatmap (ICB industry → tickers, area = market cap, colour = % change), sector strength, top lists.
const MarketView = (() => {
  const EX = ["HOSE", "HNX", "UPCOM"], SIZES = [100, 200, 400];
  let heatEx = [...EX, "ALL"].includes(Prefs.get("heatEx")) ? Prefs.get("heatEx") : "HOSE", heatN = SIZES.includes(Prefs.get("heatN")) ? Prefs.get("heatN") : 200;
  const e = s => Dom.esc(s ?? "");
  const bn = v => Fmt.en(v / 1e9, 0);

  // −7 % … 0 … +7 % → red … grey … green; ceiling / floor keep the board colours.
  function color(q) {
    const t = q.last ? QuoteModel.tone(q.last, q) : "";
    if (t === "ceil") return "#a21caf";
    if (t === "floor") return "#0284c7";
    const p = Math.max(-7, Math.min(7, q.last ? q.pct : 0)) / 7, base = [71, 85, 105];
    const to = p >= 0 ? [22, 163, 74] : [220, 38, 38], k = Math.abs(p) ** 0.7;
    return `rgb(${base.map((b, i) => Math.round(b + (to[i] - b) * k)).join(",")})`;
  }

  function breadthHtml(quotes) {
    return `<div class="mk-breadth">` + EX.map(ex => {
      const b = Mkt.breadth(quotes.filter(q => q.ex === ex)), n = b.ceil + b.up + b.same + b.down + b.floor || 1;
      const seg = (k, cls) => b[k] ? `<i class="${cls}" style="width:${(b[k] / n * 100).toFixed(1)}%"></i>` : "";
      return `<div class="mk-card"><b>${ex}</b><div class="mk-bar">${seg("ceil", "ceil")}${seg("up", "up")}${seg("same", "ref")}${seg("down", "down")}${seg("floor", "floor")}</div>`
        + `<div class="mk-nums"><span class="ceil">${b.ceil}</span> <span class="up">▲${b.up}</span> <span class="ref">■${b.same}</span> <span class="down">▼${b.down}</span> <span class="floor">${b.floor}</span>`
        + ` · ${e(T("{v} tỷ", { v: bn(b.value) }))}</div></div>`;
    }).join("") + `</div>`;
  }

  function heatmapSvg(quotes, lang) {
    const sec = Market.sectors(), r = Market.ratios(), W = 1000, H = 560;
    const pool = quotes.filter(q => (heatEx === "ALL" || q.ex === heatEx) && q.ref);
    const weight = q => (r && r.get(q.sym)?.mcap) || Mkt.value(q);
    const chosen = pool.filter(q => weight(q) > 0).sort((a, b) => weight(b) - weight(a)).slice(0, heatN);
    if (!chosen.length) return `<p class="muted pad">${e(T("Chưa có dữ liệu để vẽ heatmap."))}</p>`;
    const groups = new Map();
    for (const q of chosen) { const code = sec?.of.get(q.sym)?.[1] || "other"; (groups.get(code) || groups.set(code, []).get(code)).push(q); }
    const boxes = Mkt.treemap([...groups].map(([key, list]) => ({ key, w: list.reduce((s, q) => s + weight(q), 0) })), 0, 0, W, H);
    let out = "";
    for (const b of boxes) {
      const list = groups.get(b.key), head = b.h > 30 && b.w > 60 ? 14 : 0;
      out += `<rect class="mk-sector" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`;
      if (head) out += `<text class="mk-sname" x="${b.x + 3}" y="${b.y + 11}">${e(b.key === "other" ? T("Khác") : Market.sectorName(b.key, lang))}</text>`;
      for (const c of Mkt.treemap(list.map(q => ({ key: q.sym, w: weight(q) })), b.x + 1, b.y + head + 1, b.w - 2, b.h - head - 2)) {
        const q = list.find(x => x.sym === c.key), big = c.w > 34 && c.h > 20;
        out += `<g data-sym="${e(q.sym)}"><title>${e(q.sym)} ${Fmt.pct(q, q.pct)}</title><rect x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" width="${Math.max(0, c.w - 1).toFixed(1)}" height="${Math.max(0, c.h - 1).toFixed(1)}" fill="${color(q)}"/>`
          + (big ? `<text x="${(c.x + c.w / 2).toFixed(1)}" y="${(c.y + c.h / 2).toFixed(1)}" text-anchor="middle" class="mk-sym" style="font-size:${Math.min(22, Math.max(9, Math.min(c.w / 4, c.h / 2.6))).toFixed(0)}px">${e(q.sym)}`
            + (c.h > 34 ? `<tspan x="${(c.x + c.w / 2).toFixed(1)}" dy="1.15em" class="mk-pct">${Fmt.pct(q, q.pct)}</tspan>` : "") + `</text>` : "") + `</g>`;
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="heatmap" role="img">${out}</svg>`;
  }

  function sectorsHtml(quotes, lang) {
    const sec = Market.sectors(), r = Market.ratios();
    if (!sec) return "";
    const perf = Mkt.sectorPerf(quotes, s => sec.of.get(s)?.[2], s => r?.get(s)?.mcap);
    const max = Math.max(1, ...perf.map(p => Math.abs(p.pct)));
    return `<div class="dsec"><b>${e(T("Sức mạnh ngành hôm nay (ICB cấp 2, theo vốn hoá)"))}</b></div><div class="mk-sectors">` + perf.map(p =>
      `<button class="mk-srow" data-tab="icb:${e(p.code)}" title="${e(T("Mở bảng giá ngành"))}"><span>${e(Market.sectorName(p.code, lang))}</span>`
      + `<i class="${p.pct >= 0 ? "upb" : "downb"}" style="width:${(Math.abs(p.pct) / max * 45).toFixed(1)}%"></i><b class="${p.pct > 0 ? "up" : p.pct < 0 ? "down" : "ref"}">${Fmt.signed(p.pct)}%</b>`
      + `<em>▲${p.up} ▼${p.down}</em></button>`).join("") + `</div>`;
  }

  function topTable(title, list, cell) {
    return `<div class="mk-top"><b>${e(title)}</b><table class="dtable num">${list.map(q => `<tr data-sym="${e(q.sym)}"><td><b>${e(q.sym)}</b></td>`
      + `<td class="${QuoteModel.tone(q.last, q)}">${Fmt.price(q.last)}</td><td>${cell(q)}</td></tr>`).join("")}</table></div>`;
  }

  function topsHtml(quotes) {
    const pct = q => `<span class="${QuoteModel.tone(q.last, q)}">${Fmt.pct(q, q.pct)}</span>`, val = q => Fmt.en(Mkt.value(q) / 1e9, 1), fn = q => Fmt.signed(Mkt.foreignNet(q) / 1e9, 1);
    const liquid = quotes.filter(q => Mkt.value(q) > 1e9);
    return `<div class="mk-tops">` + topTable(T("Tăng mạnh nhất"), Mkt.top(liquid, q => q.pct), pct) + topTable(T("Giảm mạnh nhất"), Mkt.top(liquid, q => q.pct, 10, true), pct)
      + topTable(T("GTGD lớn nhất (tỷ)"), Mkt.top(quotes, Mkt.value), val) + topTable(T("NN mua ròng (tỷ)"), Mkt.top(quotes, Mkt.foreignNet), fn)
      + topTable(T("NN bán ròng (tỷ)"), Mkt.top(quotes, Mkt.foreignNet, 10, true), fn) + `</div>`;
  }

  function html(quotes, lang) {
    const p = Market.progress(), seg = (k, list, cur) => `<span class="seg">${list.map(([v, l]) => `<button data-${k}="${v}"${String(v) === String(cur) ? ' class="on"' : ""}>${e(l)}</button>`).join("")}</span>`;
    return (p ? `<p class="mk-progress">${e(T("Đang tải vốn hoá toàn thị trường {d}/{n}…", { d: p.done, n: p.total }))}</p>` : "")
      + breadthHtml(quotes) + PicksView.html()
      + `<div class="dsec"><b>Heatmap</b>${seg("heatex", [...EX.map(x => [x, x]), ["ALL", T("Tất cả")]], heatEx)}${seg("heatn", SIZES.map(n => [n, "Top " + n]), heatN)}</div>`
      + heatmapSvg(quotes, lang) + `<p class="muted pad">${e(T("Ô = vốn hoá (khi chưa có vốn hoá: giá trị giao dịch), màu = % thay đổi; bấm ô để xem chi tiết mã."))}</p>`
      + sectorsHtml(quotes, lang) + topsHtml(quotes);
  }

  // Returns true when a heatmap option changed.
  function act(el) {
    if (el.dataset.heatex && [...EX, "ALL"].includes(el.dataset.heatex)) { heatEx = el.dataset.heatex; Prefs.set("heatEx", heatEx); return true; }
    if (SIZES.includes(+el.dataset.heatn)) { heatN = +el.dataset.heatn; Prefs.set("heatN", heatN); return true; }
    return false;
  }

  return { html, act };
})();
