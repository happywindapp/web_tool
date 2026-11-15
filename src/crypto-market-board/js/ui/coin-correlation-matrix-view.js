// "Tương quan" tab: heatmap of daily-return correlation between coins (★ watchlist or top N by market cap) + per-coin correlation with BTC, beta, annualised volatility.
const CorrView = (() => {
  const UNI = ["watch", "10", "20", "30"], PERIODS = [30, 90, 180, 365], MAX_WATCH = 25, POOL = 6, SORTS = ["sym", "corr", "beta", "vol"];
  const saved = Prefs.get("corr.sort");
  const st = { u: UNI.includes(Prefs.get("corr.u")) ? Prefs.get("corr.u") : "10", d: PERIODS.includes(Prefs.get("corr.d")) ? Prefs.get("corr.d") : 90,
    sort: saved && SORTS.includes(saved.k) ? { k: saved.k, desc: !!saved.desc } : { k: "corr", desc: true } };
  let host = null, data = null, prog = null, seq = 0, retry = 0;
  const e = s => Dom.esc(s ?? "");
  const num = (v, d = 2) => v == null ? "–" : Fmt.en(v, d);

  function universe() {
    if (!Coins.spotBases().length || (st.u !== "watch" && !Coins.list().length)) return null;
    if (st.u === "watch") {
      const all = Watch.all().filter(s => Coins.pair(s) && !MarketMath.isStable(Coins.row(s)));
      return { syms: all.slice(0, MAX_WATCH), cut: Math.max(0, all.length - MAX_WATCH), empty: !Watch.all().length };
    }
    const seen = new Set(), out = [];
    for (const g of Coins.list().slice().sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9))) {
      if (seen.has(g.sym)) continue;
      seen.add(g.sym);
      if (Coins.pair(g.sym) && MarketMath.tradable(Coins.row(g.sym))) out.push(g.sym);
      if (out.length >= +st.u) break;
    }
    return { syms: out, cut: 0 };
  }

  const daily = async pair => (await DailyBars.get(pair)).slice(0, -1).slice(-(st.d + 1));

  async function load() {
    const my = ++seq;
    clearTimeout(retry);
    const u = universe();
    if (!u) { const err = st.u !== "watch" && Coins.spotBases().length && Coins.geckoError(); data = err ? { err } : null; paint(); retry = setTimeout(() => { if (my === seq && host) load(); }, err ? 15000 : 1200); return; }
    if (u.syms.length < 2) { data = { u, res: null }; paint(); return; }
    const need = [...new Set([...u.syms, "BTC"])].filter(s => Coins.pair(s)), jobs = need.slice(), series = {}, failed = [];
    prog = { done: 0, total: need.length }; data = null; paint();
    await Promise.all(Array.from({ length: Math.min(POOL, need.length) }, async () => {
      while (jobs.length && my === seq) {
        const s = jobs.shift();
        try { series[s] = await daily(Coins.pair(s)); } catch (x) { console.warn("CorrView.load - get klines fail", s, x.message); failed.push(s); }
        if (my === seq) { prog.done++; const p = host && host.querySelector(".cr-prog"); if (p) p.textContent = T("Đang tải dữ liệu ngày {done}/{total}…", prog); }
      }
    }));
    if (my !== seq || !host) return;
    prog = null;
    const min = Math.max(20, st.d * 0.5), short = u.syms.filter(s => series[s] && series[s].length < min), ok = u.syms.filter(s => series[s] && !short.includes(s));
    const use = Object.fromEntries(Object.entries(series).filter(([s]) => !short.includes(s)));
    data = { u, failed: failed.filter(s => u.syms.includes(s)), short, at: Date.now(), res: ok.length >= 2 ? ReturnCorr.analyze(use, ok) : null };
    paint();
  }

  function cell(a, b, v, text) {
    if (v == null) return `<td class="cr-na" title="${e(a)} × ${e(b)}: –">·</td>`;
    const p = Math.round(Math.abs(v) * 100), s = Fmt.en(v, 2), short = text === 1 ? s : s.replace(/^(-?)0\./, "$1.");
    return `<td style="background:color-mix(in srgb, var(${v >= 0 ? "--cr-pos" : "--cr-neg"}) ${p}%, var(--panel))" title="${e(a)} × ${e(b)}: ${s}">${text ? e(short) : ""}</td>`;
  }

  function matrix(res) {
    const n = res.syms.length, text = n <= 12 ? 1 : n <= 20 ? 2 : 0;
    const head = res.syms.map(s => `<th class="cr-col" data-coin="${e(s)}" title="${e(s)}"><span>${e(s)}</span></th>`).join("");
    const rows = res.syms.map((a, i) => `<tr><th class="cr-row" data-coin="${e(a)}">${e(a)}</th>${res.syms.map((b, j) => cell(a, b, res.matrix[i][j], text)).join("")}</tr>`).join("");
    return `<div class="cr-mx"><table><thead><tr><th class="cr-row"></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
      + `<div class="cr-legend"><span>−1</span><i></i><span>+1</span></div><p class="sc-note cr-tap"></p>`;
  }

  const HEAD = [["sym", "Coin"], ["corr", "Tương quan với BTC"], ["beta", "Beta so với BTC"], ["vol", "Biến động năm"]];
  function list(res) {
    const val = (s, k) => k === "sym" ? s : res.stats[s][k], dir = st.sort.desc ? -1 : 1;
    const syms = res.syms.slice().sort((a, b) => { const x = val(a, st.sort.k), y = val(b, st.sort.k); return (x == null) - (y == null) || (x < y ? -1 : x > y ? 1 : 0) * dir; });
    const th = (k, l, r) => `<th${r ? ' class="r"' : ""}><button class="cr-sort${st.sort.k === k ? " on" : ""}" data-sort="${k}">${e(T(l))}${st.sort.k === k ? (st.sort.desc ? " ▼" : " ▲") : ""}</button></th>`;
    return `<table class="dtable num cr-list"><thead><tr>${HEAD.map(([k, l], i) => th(k, l, i)).join("")}</tr></thead><tbody>`
      + syms.map(s => { const x = res.stats[s]; return `<tr data-coin="${e(s)}"><td><b>${e(s)}</b></td><td>${num(x.corr)}</td><td>${num(x.beta)}</td><td>${x.vol == null ? "–" : num(x.vol * 100, 0) + "%"}</td></tr>`; }).join("") + `</tbody></table>`;
  }

  const INSIGHT = { high: "Tương quan trung bình {v}: các coin này thường đi cùng chiều — danh mục gần như biến động như một khối, ít đa dạng hoá.",
    mid: "Tương quan trung bình {v}: mức vừa — đa dạng hoá có tác dụng một phần.", low: "Tương quan trung bình {v}: thấp — các coin khá độc lập, danh mục được đa dạng hoá tốt." };

  function body() {
    if (prog) return `<p class="pad muted cr-prog">${e(T("Đang tải dữ liệu ngày {done}/{total}…", prog))}</p>`;
    if (!data) return `<p class="pad muted">${e(T("Đang tải dữ liệu vốn hoá…"))}</p>`;
    if (data.err) return `<p class="pad warn">${e(T("Không tải được danh sách vốn hoá (CoinGecko) — đang thử lại; có thể chọn ★ Danh mục."))}</p>`;
    if (data.u.empty) return `<p class="pad muted">${e(T("Danh mục ★ đang trống — thêm coin vào danh mục hoặc chọn Top 10 / 20 / 30."))}</p>`;
    if (!data.res) return `<p class="pad muted">${e(T("Cần ít nhất 2 coin có cặp USDT và đủ lịch sử để tính tương quan."))}${data.short && data.short.length ? " " + e(T("Bỏ qua (lịch sử ngắn hơn kỳ đã chọn): {l}.", { l: data.short.join(", ") })) : ""}</p>`;
    const r = data.res, lv = ReturnCorr.level(r.avg), notes = [];
    if (data.u.cut) notes.push(T("Danh mục có nhiều coin, chỉ lấy {m} coin đầu.", { m: MAX_WATCH }));
    if (data.short.length) notes.push(T("Bỏ qua (lịch sử ngắn hơn kỳ đã chọn): {l}.", { l: data.short.join(", ") }));
    if (data.failed.length) notes.push(T("Không tải được: {l}.", { l: data.failed.join(", ") }));
    return (lv ? `<p class="cr-insight ${lv}">${e(T(INSIGHT[lv], { v: num(r.avg) }))}</p>` : "") + `<div class="cr-wrap"><div class="cr-mxbox">${matrix(r)}</div><div class="cr-listbox">${list(r)}</div></div>`
      + `<p class="sc-note">${e(T("{n} ngày chung · {m} coin · cập nhật {t}", { n: r.n, m: r.syms.length, t: new Date(data.at).toLocaleTimeString("en-GB") }))}${notes.length ? " · " + e(notes.join(" ")) : ""}</p>`
      + `<p class="sc-note">${e(T("Tương quan (−1…+1) đo hai coin có cùng chiều biến động theo ngày hay không: +1 đi cùng, 0 không liên quan, −1 ngược chiều. Beta so với BTC: BTC đổi 1% thì coin này thường đổi bao nhiêu % (beta 1.5 = mạnh hơn BTC 1.5 lần). Biến động năm = độ lệch chuẩn lợi suất log theo ngày × √365. Tính trên giá đóng cửa ngày (00:00 UTC), chỉ các ngày có dữ liệu của mọi coin; quá khứ không đảm bảo tương lai."))}</p>`;
  }

  function paint() {
    if (!host) return;
    const opt = (v, cur, l) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${e(l)}</option>`;
    host.innerHTML = `<div class="cr-ctl"><label class="chk">${e(T("Nhóm coin"))} <select data-cr="u">${opt("watch", st.u, T("★ Danh mục"))}${UNI.slice(1).map(v => opt(v, st.u, T("Top {n} vốn hoá", { n: v }))).join("")}</select></label>`
      + `<label class="chk">${e(T("Kỳ"))} <select data-cr="d">${PERIODS.map(v => opt(v, st.d, T("{n} ngày", { n: v }))).join("")}</select></label></div>` + body();
  }

  function onChange(ev) {
    const el = ev.target.closest("[data-cr]");
    if (!el) return;
    if (el.dataset.cr === "u" && UNI.includes(el.value)) { st.u = el.value; Prefs.set("corr.u", st.u); }
    else if (el.dataset.cr === "d" && PERIODS.includes(+el.value)) { st.d = +el.value; Prefs.set("corr.d", st.d); }
    else return;
    load();
  }
  function onClick(ev) {
    const td = ev.target.closest(".cr-mx td[title]"), tap = td && host.querySelector(".cr-tap");
    if (tap) { tap.textContent = td.title; return; }
    const b = ev.target.closest("[data-sort]");
    if (!b || !SORTS.includes(b.dataset.sort)) return;
    st.sort = { k: b.dataset.sort, desc: st.sort.k === b.dataset.sort ? !st.sort.desc : b.dataset.sort !== "sym" };
    Prefs.set("corr.sort", st.sort);
    paint();
  }

  function mount(el) { host = el; el.addEventListener("change", onChange); el.addEventListener("click", onClick); load(); }
  function unmount() { if (host) { host.removeEventListener("change", onChange); host.removeEventListener("click", onClick); } host = null; seq++; clearTimeout(retry); prog = null; }

  return { id: "corr", label: "Tương quan", wide: true, mount, unmount, relabel: paint };
})();
