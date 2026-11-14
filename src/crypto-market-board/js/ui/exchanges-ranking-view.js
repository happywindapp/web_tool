// "Exchanges" tab (CoinMarketCap-style ranking): CoinGecko spot exchanges by trust score + DeFiLlama CEX transparency
// (on-chain reserves, net inflows 24h / 7d / 30d, derivatives OI). Sortable, searchable; exchange token links to the coin.
const ExchangesView = (() => {
  const COLS = [["rank", "#"], ["name", "Sàn giao dịch"], ["trust", "Tin cậy"], ["vol", "KL spot 24h"], ["reserves", "Tài sản dự trữ"], ["in24", "Dòng tiền ròng 24h"], ["in7", "7 ngày"], ["in30", "30 ngày"],
    ["oi", "OI phái sinh"], ["coin", "Token sàn"], ["year", "Thành lập"], ["country", "Quốc gia"]];
  const NUM = new Set(["rank", "trust", "vol", "reserves", "in24", "in7", "in30", "oi", "year"]);
  let host = null, rows = null, at = 0, err = null, sort = Prefs.get("ex.sort") || { k: "rank", d: 1 }, q = "", seq = 0;
  const e = s => Dom.esc(s ?? "");
  const safe = u => /^https:\/\/[^\s"<>]+$/i.test(u || "") ? u : "";

  // CoinGecko list (volume in BTC) joined with DeFiLlama /cexs by CoinGecko id; exchanges only in DeFiLlama are appended.
  async function load() {
    const [gx, cx] = await Promise.allSettled([Gecko.exchanges(), Http.json("https://api.llama.fi/cexs", { ttl: 600e3, timeout: 25000 })]);
    if (gx.status === "rejected" && cx.status === "rejected") throw gx.reason;
    const btc = Coins.row("BTC").last || 0, cexs = cx.status === "fulfilled" ? cx.value.cexs || [] : [], used = new Set();
    const byId = new Map(); for (const c of cexs) { if (c.cgId) byId.set(c.cgId, c); if (c.cgSpotId) byId.set(c.cgSpotId, c); }
    const flow = (r, c) => Object.assign(r, c ? { reserves: c.cleanAssetsTvl ?? c.currentTvl, in24: c.inflows_24h, in7: c.inflows_1w, in30: c.inflows_1m, oi: c.oi, coin: c.coinSymbol || "", llama: true } : {});
    const out = (gx.status === "fulfilled" ? gx.value : []).map(x => { const c = byId.get(x.id); if (c) used.add(c); return flow({ id: x.id, name: x.name, rank: x.trustRank, trust: x.trust, vol: x.volBtc && btc ? x.volBtc * btc : null, year: x.year, country: x.country, url: x.url }, c); });
    for (const c of cexs) if (!used.has(c) && (c.cleanAssetsTvl || 0) > 1e8) out.push(flow({ id: c.slug, name: c.name, rank: null, trust: null, vol: c.spotVolume || null, url: c.url }, c));
    return { list: out, partial: gx.status === "rejected" || cx.status === "rejected" };
  }

  function cell(r, k) {
    const m = v => v == null ? "–" : Fmt.moneyBig(v), f = v => v == null ? "–" : `<span class="${Fmt.tone(v)}">${v >= 0 ? "+" : "-"}${e(Fmt.moneyBig(Math.abs(v)))}</span>`;
    if (k === "name") return safe(r.url) ? `<a href="${e(r.url)}" target="_blank" rel="noopener noreferrer"><b>${e(r.name)}</b></a>` : `<b>${e(r.name)}</b>`;
    if (k === "trust") return r.trust == null ? "–" : `<span class="trust" style="background:${MarketMath.heat((r.trust - 5) * 2)}">${r.trust}/10</span>`;
    if (k === "in24" || k === "in7" || k === "in30") return f(r[k]);
    if (k === "coin") return r.coin && CoinParse.isSymbol(r.coin) ? `<button class="rchip" data-coin="${e(r.coin)}">${e(r.coin)}</button>` : "";
    if (k === "vol" || k === "reserves" || k === "oi") return e(m(r[k]));
    return e(r[k] ?? "–");
  }

  function paint() {
    if (!host) return;
    if (!rows) { host.innerHTML = err ? `<div class="errbox">${e(err.rateLimited ? T("CoinGecko giới hạn tần suất — thử lại sau ~{n}s.", { n: err.retryIn || 60 }) : T("Không tải được danh sách sàn."))} <button data-ex="retry">${e(T("Thử lại"))}</button></div>`
      : `<p class="pad muted">${e(T("Đang tải danh sách sàn…"))}</p>`; return; }
    const list = rows.list.filter(r => !q || r.name.toLowerCase().includes(q)).sort((a, b) => {
      const va = a[sort.k], vb = b[sort.k], na = va == null || va === "", nb = vb == null || vb === "";
      return na || nb ? (na === nb ? 0 : na ? 1 : -1) : (NUM.has(sort.k) ? va - vb : String(va).localeCompare(String(vb))) * sort.d;
    });
    const sum = k => rows.list.reduce((t, r) => t + (r[k] || 0), 0), card = (l, v, cls = "") => `<div class="card"><span>${e(l)}</span><b class="${cls}">${e(v)}</b></div>`;
    host.innerHTML = `<div class="cards">${card(T("Số sàn"), Fmt.en(rows.list.length))}${card(T("KL spot 24h (tổng)"), Fmt.moneyBig(sum("vol")))}${card(T("Tài sản dự trữ (tổng)"), Fmt.moneyBig(sum("reserves")))}`
      + card(T("Dòng tiền ròng vào sàn 24h"), (sum("in24") >= 0 ? "+" : "-") + Fmt.moneyBig(Math.abs(sum("in24"))), Fmt.tone(sum("in24"))) + card(T("Dòng tiền ròng 7 ngày"), (sum("in7") >= 0 ? "+" : "-") + Fmt.moneyBig(Math.abs(sum("in7"))), Fmt.tone(sum("in7"))) + `</div>`
      + `<div class="ex-bar"><input type="search" id="exQ" value="${e(q)}" placeholder="${e(T("Tìm sàn…"))}" autocomplete="off">${rows.partial ? `<span class="warn">${e(T("Thiếu một nguồn dữ liệu — một số cột để trống."))}</span> <button data-ex="retry">${e(T("Thử lại"))}</button>` : ""}</div>`
      + `<div class="ex-wrap"><table class="dtable ex"><thead><tr>${COLS.map(([k, l]) => `<th data-es="${k}"${k === "name" || k === "country" ? ' class="l"' : ""}>${e(T(l))}${sort.k === k ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>`
      + `<tbody>${list.map(r => `<tr>${COLS.map(([k]) => `<td${k === "country" ? ' class="l"' : ""}>${cell(r, k)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      + `<p class="sc-note">${e(T("Tin cậy: điểm trust score của CoinGecko (thanh khoản, quy mô, an ninh, kiểm toán). Tài sản dự trữ và dòng tiền: số dư các ví sàn tự công bố, DeFiLlama theo dõi on-chain (không gồm token của chính sàn); dòng tiền dương = nạp vào sàn nhiều hơn rút ra (thường được xem là áp lực bán tiềm năng), âm = tài sản rút về ví riêng."))}</p>`;
  }

  async function refresh() {
    const my = ++seq; rows = null; err = null; paint();
    try { const r = await load(); if (my === seq) { rows = r; at = Date.now(); } }
    catch (x) { console.warn("ExchangesView.refresh - load exchanges fail", x.message); if (my === seq) err = x; }
    paint();
  }

  function onClick(ev) {
    const th = ev.target.closest("th[data-es]");
    if (th) { const k = th.dataset.es; sort = sort.k === k ? { k, d: -sort.d } : { k, d: NUM.has(k) && k !== "rank" && k !== "year" ? -1 : 1 }; Prefs.set("ex.sort", sort); paint(); }
    if (ev.target.closest("[data-ex=retry]")) refresh();
  }
  const onInput = Dom.debounce(ev => { if (ev.target.id !== "exQ") return; q = ev.target.value.trim().toLowerCase(); paint(); const i = $("exQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);

  function mount(el) { host = el; el.addEventListener("click", onClick); el.addEventListener("input", onInput); if (rows && !rows.partial && Date.now() - at < 600e3) paint(); else refresh(); }
  function unmount() { if (host) { host.removeEventListener("click", onClick); host.removeEventListener("input", onInput); } host = null; seq++; }

  return { id: "exchanges", label: "Exchanges", wide: true, mount, unmount, relabel: paint };
})();
