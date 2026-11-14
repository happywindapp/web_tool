// "DeFi & Doanh thu" tab: DeFiLlama overview, chains, protocols, fees / revenue with P/F + P/S, DEX volume and stablecoins; every sub-tab loads lazily.
const DefiView = (() => {
  const e = Dom.esc, L = Llama, D = DefiMetrics, TTL = 10 * 60 * 1000;
  const TABS = [["overview", () => T("Tổng quan")], ["chains", () => "Chains"], ["protocols", () => T("Giao thức")], ["revenue", () => T("Doanh thu")], ["dex", () => "DEX"], ["stable", () => "Stablecoin"]];
  const RANGE = { "1y": 365, "3y": 1095, all: 0 }, PAL = ["#0e7490", "#0f766e", "#4338ca", "#7c3aed", "#be185d", "#b45309", "#15803d", "#1d4ed8"];
  let host = null, root = null, body = null, tab = "overview", run = 0, cache = {}, charts = [], drawers = [], cur = null;
  const flt = { q: "", cat: "", cex: false };
  const pref = (k, d) => Prefs.get("defi." + k, d), save = (k, v) => Prefs.set("defi." + k, v);
  const alive = id => id === run && !!body;
  const mcapOf = sym => typeof Coins !== "undefined" ? Coins.gecko(sym)?.mcap || null : null;
  const chg = (label, v) => v == null ? "" : `<span class="${Fmt.tone(v)}">${e(label)} ${e(Fmt.pct(v, 1))}</span>`;

  async function get(key, fn) {
    const c = cache[key];
    if (c && Date.now() - c.at < TTL) return c.d;
    const d = await fn();
    cache[key] = { at: Date.now(), d };
    return d;
  }
  const data = {
    chains: () => get("chains", async () => D.chainRows(await L.chains())),
    proto: () => get("proto", async () => D.protocolGroups(await L.protocols(), { cex: true }).map(g => ({ ...g, nch: g.chains.length }))),
    rev: () => get("rev", async () => { const [f, r, p] = await Promise.all([L.fees(), L.revenue(), L.protocols()]); return D.revenueRows(f.rows, r.rows, p, mcapOf); }),
    dex: () => get("dex", async () => D.dexRows((await L.dexs()).rows)),
    stable: () => get("stable", async () => D.stableRows(await L.stables())),
  };

  const errHtml = err => `<div class="errbox">${e(err && err.rateLimited ? T("Bị giới hạn tần suất, thử lại sau {s}s.", { s: err.retryIn || 60 }) : T("Không tải được dữ liệu DeFiLlama."))}<button data-act="retry">${e(T("Thử lại"))}</button></div>`;
  const card = (k, label) => `<div class="card" data-c="${k}"><span>${e(label)}</span><b>…</b><em></em></div>`;
  const setCard = (k, val, sub) => { const c = body && body.querySelector(`[data-c="${k}"]`); if (c) { c.querySelector("b").textContent = val; c.querySelector("em").innerHTML = sub || ""; } };
  const note = t => `<p class="sc-note">${e(t)}</p>`;

  function chartSection(el, title, series, fmt) {
    const rng = pref("range", "3y");
    el.innerHTML = `<div class="dsec"><b>${e(title)}</b><span class="seg">${Object.keys(RANGE).map(r => `<button data-range="${r}" class="${r === rng ? "on" : ""}">${r === "all" ? e(T("Tất cả")) : r.toUpperCase()}</button>`).join("")}</span></div>`
      + `<div class="cbox sc-box"><div class="clegend"></div><div class="chost"></div></div>`;
    const ch = SeriesChart.create(el.querySelector(".chost"), { legend: el.querySelector(".clegend"), fmt });
    charts.push(ch);
    drawers.push(() => { const days = RANGE[pref("range", "3y")]; ch.set(series, days ? { from: Math.floor(Date.now() / 1000) - days * 86400 } : {}); });
    drawers[drawers.length - 1]();
  }

  function treemap(chains) {
    if (typeof Mkt === "undefined") return "";
    const narrow = body.clientWidth < 640, top = chains.slice(0, narrow ? 24 : 40), W = 1000, H = narrow ? 900 : 340, by = new Map(top.map(c => [c.name, c]));
    const cells = Mkt.treemap(top.map(c => ({ key: c.name, w: c.tvl })), 0, 0, W, H).map((c, i) => {
      const r = by.get(c.key), fs = Math.max(narrow ? 22 : 11, Math.min(30, Math.sqrt(c.w * c.h) / 6)), big = c.w > (narrow ? 150 : 80) && c.h > fs * 2.6;
      return `<g><title>${e(c.key)} ${e(Fmt.moneyBig(r.tvl))} ${e(Fmt.en(r.share, 1))}%</title><rect x="${c.x.toFixed(1)}" y="${c.y.toFixed(1)}" width="${Math.max(0, c.w - 1).toFixed(1)}" height="${Math.max(0, c.h - 1).toFixed(1)}" fill="${PAL[i % PAL.length]}"/>`
        + (big ? `<text class="mk-sym" x="${(c.x + 6).toFixed(1)}" y="${(c.y + fs + 3).toFixed(1)}" font-size="${fs.toFixed(1)}">${e(c.key)}</text><text class="mk-sym mk-pct" x="${(c.x + 6).toFixed(1)}" y="${(c.y + fs * 2 + 5).toFixed(1)}" font-size="${(fs * (narrow ? 1 : .8)).toFixed(1)}">${e(Fmt.en(r.share, 1))}%</text>` : "") + "</g>";
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="heatmap" role="img">${cells.join("")}</svg>`;
  }
  function catBars(cats) {
    const top = cats.slice(0, 14), mx = top[0] ? top[0].tvl : 1;
    return `<div class="df-bars">${top.map(c => `<button class="df-bar" data-cat="${e(c.category)}"><span class="df-bn">${e(c.category)}</span><span class="df-bt"><i style="width:${Math.max(1, c.tvl / mx * 100).toFixed(1)}%"></i></span><b>${e(Fmt.moneyBig(c.tvl))}</b><em>${DefiTables.pc(c.c7)}</em></button>`).join("")}</div>`;
  }

  function overview(id) {
    body.innerHTML = `<div class="cards">${card("tvl", T("Tổng TVL DeFi"))}${card("fees", T("Phí 24h"))}${card("rev", T("Doanh thu 24h"))}${card("dex", T("Khối lượng DEX 24h"))}${card("stable", T("Vốn hóa stablecoin"))}</div>`
      + `<div data-s="tvl"></div><div class="dsec"><b>${e(T("Chain theo TVL"))}</b></div><div data-s="chains"></div><div class="dsec"><b>${e(T("Danh mục theo TVL (7d)"))}</b></div><div data-s="cats"></div>`
      + note(T("Nguồn: DeFiLlama (công khai). TVL là tổng giá trị tài sản đang khóa trong các giao thức DeFi. Nhấn một danh mục để lọc bảng Giao thức."));
    const slot = (name, p, fill) => p.then(d => { const el = alive(id) && body.querySelector(`[data-s="${name}"]`); if (el) fill(d, el); })
      .catch(err => { const el = alive(id) && body.querySelector(`[data-s="${name}"]`); if (el) el.innerHTML = errHtml(err); });
    slot("tvl", get("tvlh", () => L.tvlHistory()), (h, el) => {
      setCard("tvl", Fmt.moneyBig(h[h.length - 1].value), chg("24h", D.seriesChange(h, 1)) + " " + chg("7d", D.seriesChange(h, 7)));
      chartSection(el, T("TVL DeFi tổng"), [{ title: "TVL", data: h, color: "#0e7490", type: "area" }], v => Fmt.moneyBig(v));
    });
    slot("chains", data.chains(), (c, el) => { el.innerHTML = treemap(c); });
    slot("cats", data.proto(), (p, el) => { el.innerHTML = catBars(D.categoryRows(p.filter(g => g.category !== "CEX"))); });
    get("fees", () => L.fees()).then(f => alive(id) && setCard("fees", Fmt.moneyBig(f.total24h), chg("24h", f.change_1d))).catch(() => {});
    get("revT", () => Promise.all([L.revenue(), L.fees()])).then(([r, f]) => alive(id) && setCard("rev", Fmt.moneyBig(r.total24h), f.total24h > 0 ? T("{p}% của phí", { p: Fmt.en(r.total24h / f.total24h * 100, 0) }) : "")).catch(() => {});
    get("dexT", () => L.dexs()).then(x => alive(id) && setCard("dex", Fmt.moneyBig(x.total24h), chg("24h", x.change_1d) + " " + chg("7d", x.change_7d))).catch(() => {});
    get("stableT", async () => D.stableTotals(await L.stables())).then(t => alive(id) && setCard("stable", Fmt.moneyBig(t.cur), chg("7d", t.c7) + " " + chg("30d", t.c30))).catch(() => {});
  }

  // Generic list tab: sticky-name table, remembered sort, optional filters (search / category / CEX).
  function listTab(key, rows, o = {}) {
    const st = pref("sort." + key, o.sort), cats = o.cats ? [...new Set(rows.map(r => r.category))].sort() : [];
    if (o.cats && !cats.includes(flt.cat)) flt.cat = "";
    body.innerHTML = (o.top || "") + `<div class="df-ctl"><input type="search" data-f="q" value="${e(flt.q)}" placeholder="${e(T("Tìm theo tên hoặc mã…"))}">`
      + (o.cats ? `<select data-f="cat"><option value="">${e(T("Tất cả danh mục"))}</option>${cats.map(c => `<option${c === flt.cat ? " selected" : ""}>${e(c)}</option>`).join("")}</select>` : "")
      + (o.cex ? `<label><input type="checkbox" data-f="cex"${flt.cex ? " checked" : ""}> ${e(T("Hiện CEX"))}</label>` : "") + `<span class="muted" data-n></span></div><div data-tbl></div>` + note(o.note);
    const draw = () => {
      const q = flt.q.trim().toLowerCase();
      let r = rows.filter(x => (!q || x.name.toLowerCase().includes(q) || (x.symbol || "").toLowerCase().includes(q)) && (!o.cats || !flt.cat || x.category === flt.cat) && (o.cex === undefined || flt.cex || x.category !== "CEX"));
      const n = r.length;
      r = D.sortRows(r, st.k, st.dir).slice(0, o.limit || 200);
      body.querySelector("[data-tbl]").innerHTML = DefiTables.table(DefiTables.COLS[key](), r, st);
      body.querySelector("[data-n]").textContent = T("Hiển thị {n} / {m}", { n: r.length, m: n });
    };
    cur = { draw, st, key, cols: () => DefiTables.COLS[key]() };
    draw();
  }

  const LIST = {
    async chains(id) { const r = await data.chains(); if (alive(id)) listTab("chains", r, { sort: { k: "tvl", dir: -1 }, limit: 300, note: T("Thị phần = TVL của chain / tổng TVL các chain. Nhấn tên để mở token gốc của chain.") }); },
    async protocols(id) {
      const r = await data.proto();
      if (alive(id)) listTab("protocols", r, { sort: { k: "tvl", dir: -1 }, cats: 1, cex: 1, note: T("Các phiên bản của cùng một giao thức được gộp lại. MCap/TVL thấp nghĩa là vốn hóa token nhỏ so với tài sản đang khóa. Hiển thị tối đa 200 dòng, dùng ô tìm kiếm để thu hẹp.") });
    },
    async revenue(id) {
      const r = await data.rev();
      if (alive(id)) listTab("revenue", r, { sort: { k: "r30", dir: -1 }, top: note(T("Phí (fees) là toàn bộ phí người dùng trả; doanh thu (DT) là phần giao thức hoặc người nắm giữ token giữ lại sau khi chia cho nhà cung cấp thanh khoản và các bên khác. P/F = vốn hóa / phí năm hóa, P/S = vốn hóa / doanh thu năm hóa: càng thấp càng rẻ so với dòng tiền, nhưng chưa tính tăng trưởng hay rủi ro. Không phải khuyến nghị đầu tư.")), note: T("Năm hóa = tổng 1 năm gần nhất (thiếu thì lấy 30 ngày x 365/30). Vốn hóa lấy từ DeFiLlama, thiếu thì dùng CoinGecko theo mã token; dấu – là chưa có.") });
    },
    async dex(id) { const r = await data.dex(); if (alive(id)) listTab("dex", r, { sort: { k: "d1", dir: -1 }, note: T("Khối lượng giao dịch trên các sàn phi tập trung (DEX); các phiên bản của cùng một giao thức được gộp lại.") }); },
    async stable(id) {
      const [r, hist] = await Promise.all([data.stable(), get("stableH", () => L.stableHistory()).catch(() => null)]);
      if (!alive(id)) return;
      const t = D.stableTotals(r);
      listTab("stable", r, { sort: { k: "cur", dir: -1 }, note: T("Nguồn cung stablecoin theo DeFiLlama; % thay đổi so với 1 ngày, 7 ngày và 30 ngày trước.") });
      body.insertAdjacentHTML("afterbegin", `<div class="cards">${card("sup", T("Tổng nguồn cung"))}${card("w", T("Thay đổi 7 ngày"))}${card("m", T("Thay đổi 30 ngày"))}</div><div data-s="sh"></div>`);
      setCard("sup", Fmt.moneyBig(t.cur), ""); setCard("w", Fmt.pct(t.c7, 2), ""); setCard("m", Fmt.pct(t.c30, 2), "");
      if (hist && hist.length) chartSection(body.querySelector('[data-s="sh"]'), T("Tổng vốn hóa stablecoin"), [{ title: "Stablecoin", data: hist, color: "#15803d", type: "area" }], v => Fmt.moneyBig(v));
    },
  };

  async function show() {
    const id = ++run;
    charts.forEach(c => c.destroy()); charts = []; drawers = []; cur = null;
    body.innerHTML = `<p class="muted pad">${e(T("Đang tải…"))}</p>`;
    try { await (tab === "overview" ? overview(id) : LIST[tab](id)); } catch (err) { if (alive(id)) body.innerHTML = errHtml(err); }
  }

  function render() {
    root.innerHTML = `<div class="dsec df-tabs"><span class="seg">${TABS.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${e(l())}</button>`).join("")}</span></div><div data-body></div>`;
    body = root.querySelector("[data-body]");
    show();
  }

  function onClick(ev) {
    const t = ev.target.closest("[data-t],[data-sort],[data-act],[data-range],[data-cat]");
    if (!t) return;
    if (t.dataset.t) { tab = t.dataset.t; save("tab", tab); render(); }
    else if (t.dataset.act === "retry") { cache = {}; L.clear(); show(); }
    else if (t.dataset.cat !== undefined) { flt.cat = t.dataset.cat; tab = "protocols"; save("tab", tab); render(); }
    else if (t.dataset.range) { save("range", t.dataset.range); root.querySelectorAll("[data-range]").forEach(b => b.classList.toggle("on", b.dataset.range === t.dataset.range)); drawers.forEach(f => f()); }
    else if (t.dataset.sort && cur) {
      const k = t.dataset.sort, c = cur.cols().find(x => x.k === k), same = cur.st.k === k;
      cur.st.dir = same ? -cur.st.dir : c && (c.tx || c.left) ? 1 : -1; cur.st.k = k;
      save("sort." + cur.key, { k, dir: cur.st.dir }); cur.draw();
    }
  }
  const onInput = Dom.debounce(ev => {
    const f = ev.target.dataset.f;
    if (!f || !cur) return;
    flt[f] = f === "cex" ? ev.target.checked : ev.target.value;
    if (f === "cat" || f === "cex") save(f, flt[f]);
    cur.draw();
  }, 150);

  function mount(el) {
    host = el; host.innerHTML = "";
    root = document.createElement("div"); root.className = "df";
    host.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput); root.addEventListener("change", onInput);
    const t = pref("tab", "overview"); tab = TABS.some(x => x[0] === t) ? t : "overview";
    Object.assign(flt, { q: "", cat: pref("cat", ""), cex: !!pref("cex", false) });
    render();
  }
  function unmount() {
    run++; charts.forEach(c => c.destroy()); charts = []; drawers = [];
    if (root) root.remove();
    host = root = body = cur = null;
  }
  function relabel() { if (!root) return; for (const k in cache) cache[k].at = Date.now(); render(); }

  return { id: "defi", label: "DeFi & Doanh thu", wide: true, mount, unmount, relabel };
})();
