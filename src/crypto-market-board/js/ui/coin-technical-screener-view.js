// "Bộ lọc" tab: technical screener over the top coins (closed daily candles), preset or custom criteria, sortable results.
const ScreenerView = (() => {
  const SIZES = [50, 100, 200], TTL = 900e3, LOOK = 60;
  const NUM = [["rsiMin", "RSI từ"], ["rsiMax", "RSI đến"], ["pctMin", "24h từ (%)"], ["pctMax", "24h đến (%)"], ["p7Min", "7 ngày từ (%)"], ["p7Max", "7 ngày đến (%)"],
    ["athMax", "Cách ATH tối đa (%)"], ["mcapMin", "Vốn hoá tối thiểu (triệu $)"], ["volMin", "KL× tối thiểu"], ["scoreMin", "Điểm từ"], ["scoreMax", "Điểm đến"]];
  const COLS = [["coin", "Coin"], ["price", "Giá"], ["pct", "24h"], ["pct7d", "7 ngày"], ["rsi", "RSI"], ["score", "Điểm"], ["vs200", "vs MA200"], ["vol", "KL×"], ["sig", "Tín hiệu"]];
  const e = s => Dom.esc(s ?? "");
  let host = null, seq = 0, prog = null, err = false, res = null;
  let n = SIZES.includes(Prefs.get("scr.n")) ? Prefs.get("scr.n") : 100;
  let crit = ScreenerRules.clean(Prefs.get("scr.crit", null));
  let preset = Prefs.get("scr.preset", "");
  let sort = Prefs.get("scr.sort", null);
  if (!sort || !ScreenerRules.COLS.includes(sort.col)) sort = { col: "score", dir: "desc" };

  const save = () => { Prefs.set("scr.n", n); Prefs.set("scr.crit", crit); Prefs.set("scr.preset", preset); Prefs.set("scr.sort", sort); };
  const opt = (v, l, cur) => `<option value="${e(v)}"${String(v) === String(cur) ? " selected" : ""}>${e(l)}</option>`;
  const maSel = (k, l) => `<label>${e(T(l))}<select data-f="${k}">${opt("", T("Bất kỳ"), crit[k])}${opt("above", T("Giá trên"), crit[k])}${opt("below", T("Giá dưới"), crit[k])}</select></label>`;

  function formHtml() {
    return `<div class="dsec"><b>${e(T("Bộ lọc kỹ thuật"))}</b><span class="muted">${e(T("nến ngày đã đóng cửa · top coin có cặp USDT trên Binance"))}</span></div>`
      + `<div class="posform"><label>${e(T("Mẫu bộ lọc"))}<select data-f="preset">${opt("", T("Tuỳ chỉnh"), preset)}${Object.entries(ScreenerRules.PRESETS).map(([k, p]) => opt(k, T(p[0]), preset)).join("")}</select></label>`
      + `<label>${e(T("Số coin xét"))}<select data-f="n">${SIZES.map(s => opt(s, T("Top {n}", { n: s }), n)).join("")}</select></label>`
      + maSel("ma50", "So với MA50") + maSel("ma200", "So với MA200")
      + NUM.map(([k, l]) => `<label>${e(T(l))}<input type="number" step="any" data-f="${k}" value="${e(crit[k])}"></label>`).join("") + `</div>`
      + `<div class="cs-sigs"><span class="muted">${e(T("Tín hiệu xảy ra trong"))}</span><input type="number" min="0" max="${LOOK}" step="1" data-f="within" value="${crit.within}" class="cs-within"><span class="muted">${e(T("phiên gần nhất:"))}</span>`
      + CoinSignals.KEYS.map(k => `<label class="chk" title="${e(T(CoinSignals.META[k][1]))}"><input type="checkbox" data-sig="${k}"${crit.sig.includes(k) ? " checked" : ""}> ${e(T(CoinSignals.META[k][0]))}</label>`).join("") + `</div>`;
  }

  const chip = ev => `<span class="rchip" title="${e(T(CoinSignals.META[ev.key][1]))}">${e(T(CoinSignals.META[ev.key][0]))} · ${e(ev.barsAgo ? T("{n} phiên trước", { n: ev.barsAgo }) : T("phiên vừa đóng"))}</span>`;
  const cell = (v, d = 1) => v == null || !Number.isFinite(v) ? "" : Fmt.en(v, d);
  const tone = v => `<td class="r ${Fmt.tone(v)}">${e(Fmt.pct(v, 1))}</td>`;

  function rowHtml(it) {
    const r = it.row, s = it.snap, show = Math.max(10, crit.within);
    return `<tr data-coin="${e(r.sym)}"><td class="l"><b>${e(r.sym)}</b></td><td class="r">${e(Fmt.money(r.last || s.price))}</td>${tone(r.pct)}${tone(r.pct7d)}`
      + `<td class="r">${e(cell(s.rsi))}</td><td class="r ${Fmt.tone(s.score)}">${e(s.score == null ? "" : Fmt.signed(s.score, 0))}</td>${tone(s.vsMa200)}<td class="r">${e(cell(s.volRatio, 2))}</td>`
      + `<td class="l cs-chips">${it.events.filter(v => v.barsAgo <= show).map(chip).join("")}</td></tr>`;
  }

  function outHtml() {
    if (!res) return `<p class="pad muted">${e(err ? T("Không tải được danh sách coin (CoinGecko) hoặc nến ngày để lọc.") : prog ? T("Đang phân tích {d}/{n} coin…", { d: prog[0], n: prog[1] }) : T("Đang tải…"))}</p>`;
    const items = ScreenerRules.sort(res.items.map(it => ({ ...it, row: Coins.row(it.sym), within: Math.max(10, crit.within) })).filter(it => ScreenerRules.match(it, crit)), sort.col, sort.dir);
    const arrow = c => c === sort.col ? (sort.dir === "asc" ? " ▲" : " ▼") : "";
    return `<div class="dsec"><b>${e(T("Kết quả: {n} / {t} coin", { n: items.length, t: res.items.length }))}</b></div>`
      + (items.length ? `<div class="cs-wrap"><table class="dtable cs-t"><thead><tr>${COLS.map(([k, l]) => `<th data-s="${k}" class="${k === "coin" || k === "sig" ? "l" : "r"}">${e(T(l))}${arrow(k)}</th>`).join("")}</tr></thead><tbody>${items.map(rowHtml).join("")}</tbody></table></div>`
        : `<p class="pad muted">${e(T("Hiện không có coin nào đạt điều kiện."))}</p>`)
      + `<p class="sc-note">${e(T("Chỉ dùng nến ngày đã đóng (bỏ phiên đang chạy). Tín hiệu chọn nhiều ô = chỉ cần khớp 1 trong số đó. KL× = khối lượng phiên cuối / trung bình 20 phiên trước. Điểm = điểm kỹ thuật ngày (−100…+100). Chỉ là sàng lọc theo quy tắc, không phải lời khuyên đầu tư."))}</p>`;
  }

  const paintOut = () => { const o = host && host.querySelector(".cs-out"); if (o) o.innerHTML = outHtml(); };
  function paint() { if (host) host.innerHTML = `<div class="cs-form">${formHtml()}</div><div class="cs-out">${outHtml()}</div>`; }

  async function build(coins, my) {
    const bars = await DailyBars.many(coins.map(r => r.pair), (a, b) => { prog = [a, b]; if (my === seq && (a % 6 === 0 || a === b)) paintOut(); });
    const items = [];
    for (const r of coins) {
      const b = bars.get(r.pair) && CoinSignals.closed(bars.get(r.pair), "1d", Spot.TZ), snap = b && CoinSignals.snapshot(b);
      if (snap) items.push({ sym: r.sym, snap, events: CoinSignals.events(b, LOOK) });
      if (items.length % 20 === 0) await new Promise(f => setTimeout(f));
      if (my !== seq) return null;
    }
    return items;
  }

  async function load() {
    const my = ++seq;
    if (res && res.n === n && Date.now() - res.at < TTL) return;
    res = null; err = false; prog = null; paintOut();
    for (let w = 0; w < 40 && !Coins.geckoAt() && !Coins.geckoError(); w++) { await new Promise(f => setTimeout(f, 500)); if (my !== seq) return; }
    const coins = [...new Set(Coins.list().map(g => g.sym))].map(Coins.row).filter(r => r.pair && MarketMath.tradable(r)).sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9)).slice(0, n);
    try { const items = await build(coins, my); if (my !== seq) return; res = items && items.length ? { n, at: Date.now(), items } : null; err = !res; }
    catch (x) { if (my !== seq) return; console.warn("ScreenerView.load - analyse coins fail", x.message); err = true; }
    paintOut();
  }

  function readCrit() {
    const c = { ...crit, sig: [...host.querySelectorAll("[data-sig]")].filter(i => i.checked).map(i => i.dataset.sig) };
    host.querySelectorAll("input[data-f], select[data-f]").forEach(i => { if (!["preset", "n"].includes(i.dataset.f)) c[i.dataset.f] = i.value; });
    return ScreenerRules.clean(c);
  }

  function onChange(ev) {
    const t = ev.target, f = t.dataset && t.dataset.f;
    if (!f && !t.dataset.sig) return;
    if (ev.type === "input" && t.type !== "number") return;
    if (f === "preset") { preset = t.value; if (preset) crit = ScreenerRules.preset(preset); save(); paint(); return; }
    if (f === "n") { n = +t.value; save(); load(); return; }
    crit = readCrit(); preset = ""; save();
    const p = host.querySelector('[data-f="preset"]'); if (p) p.value = "";
    paintOut();
  }

  function onClick(ev) {
    const th = ev.target.closest("th[data-s]");
    if (!th) return;
    const c = th.dataset.s;
    sort = { col: c, dir: sort.col === c && sort.dir === "desc" ? "asc" : "desc" };
    save(); paintOut();
  }

  function mount(el) { host = el; ["change", "input", "click"].forEach(t => el.addEventListener(t, t === "click" ? onClick : onChange)); paint(); load(); }
  function unmount() { seq++; if (host) { ["change", "input", "click"].forEach(t => host.removeEventListener(t, t === "click" ? onClick : onChange)); } host = null; }
  return { id: "screener", label: "Bộ lọc", wide: true, mount, unmount, relabel: paint };
})();
