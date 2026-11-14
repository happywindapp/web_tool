// "Bitcoin On-chain" tab: network status cards, cycle thermometer, indicator chart picker, latest blocks. Data via BtcData, maths via BtcCycle, charts via OnchainCharts.
const OnchainView = (() => {
  let host = null, chart = null, timer = 0, gen = 0, S = null;
  const q = s => host && host.querySelector(s);
  const MEANING = {
    mayer: ["Mayer Multiple", "Giá / MA200 ngày; dưới 0.8 là rẻ, trên 2.4 là quá nóng."], wma: ["Giá / 200WMA", "Giá / MA200 tuần; quanh 1× thường là vùng đáy dài hạn."],
    pi: ["Pi Cycle Top", "MA111 / 2×MA350; chạm 100% là tín hiệu đỉnh chu kỳ."], puell: ["Puell Multiple", "Doanh thu thợ đào / TB 365 ngày; dưới 0.5 rẻ, trên 4 nóng."],
    rainbow: ["Cầu vồng (Rainbow)", "Dải màu hồi quy log–log của giá theo thời gian."], fng: ["Fear & Greed", "Tâm lý thị trường; sợ hãi cao thường đi cùng vùng giá rẻ."],
    ribbon: ["Hash Ribbons", "Hashrate MA30 so với MA60; bên dưới nghĩa là thợ đào đang đầu hàng."],
  };
  const x2 = v => Fmt.en(v, 2) + "×";
  const rowValue = r => r.key === "pi" ? Fmt.en(r.value * 100, 0) + "%" : r.key === "rainbow" ? T(BtcCycle.BANDS[r.value]) : r.key === "fng" ? r.value + " · " + OnchainCharts.fgLabel(r.value)
    : r.key === "ribbon" ? (r.value ? T("Đầu hàng") : T("Bình thường")) : x2(r.value);
  const card = (label, value, sub, tone = "") => `<div class="card"><span>${Dom.esc(label)}</span><b class="${tone}">${Dom.esc(value)}</b><em class="muted">${Dom.esc(sub || "")}</em></div>`;
  const ago = sec => sec < 60 ? T("{n} giây trước", { n: Math.max(0, sec) }) : sec < 3600 ? T("{n} phút trước", { n: Math.floor(sec / 60) }) : T("{n} giờ trước", { n: Math.floor(sec / 3600) });
  const loading = () => `<p class="muted pad">${Dom.esc(T("Đang tải…"))}</p>`;
  const errbox = grp => `<div class="errbox">${Dom.esc(T("Không tải được dữ liệu. Thử lại sau ít phút."))}<button data-act="retry" data-grp="${grp}">${Dom.esc(T("Thử lại"))}</button></div>`;
  const gate = (grp, ok) => ok ? "" : S.err[grp] ? errbox(grp) : loading();

  function renderNet() {
    const n = S.net, A = S.A, el = q(".oc-net");
    if (!el) return;
    const g = gate("net", n), out = [];
    if (A) out.push(card(T("Giá BTC"), Fmt.money(Coins.row("BTC").last || A.now.price), T("Cách đỉnh {x}", { x: Fmt.pct(A.now.drawdown, 1) })));
    if (n) {
      const h = BtcCycle.halvingInfo(n.height), a = n.adj, f = n.fees;
      out.push(card(T("Chiều cao block"), Fmt.en(n.height), T("Block gần nhất")));
      out.push(card(T("Halving kế tiếp"), T("Còn {n} block", { n: Fmt.en(h.blocksLeft) }), T("Dự kiến {d} · tiến độ {p}%", { d: Fmt.date(h.etaMs), p: Fmt.en(h.progress, 1) })));
      out.push(card(T("Điều chỉnh độ khó"), Fmt.pct(a.difficultyChange, 2), T("Tiến độ {p}% · dự kiến {d}", { p: Fmt.en(a.progressPercent, 1), d: Fmt.date(a.estimatedRetargetDate) }), Fmt.tone(a.difficultyChange)));
      out.push(card(T("Phí nhanh nhất"), f.fastestFee + " sat/vB", T("30 phút: {a} · 1 giờ: {b} · tiết kiệm: {c}", { a: f.halfHourFee, b: f.hourFee, c: f.economyFee })));
      out.push(card("Hashrate", Fmt.en(n.hashNow / 1e18, 1) + " EH/s", T("Độ khó {d}T", { d: Fmt.en(n.diffNow / 1e12, 2) })));
    }
    if (S.hist && S.hist.supply.length) { const s = S.hist.supply[S.hist.supply.length - 1].v; out.push(card(T("Nguồn cung đã đào"), Fmt.en(s / 1e6, 3) + "M", T("{p}% của 21M", { p: Fmt.en(s / 21e6 * 100, 2) }))); }
    if (S.fg && S.fg.length) out.push(card("Fear & Greed", String(S.fg[0].v), OnchainCharts.fgLabel(S.fg[0].v)));
    el.innerHTML = (out.length ? `<div class="cards">${out.join("")}</div>` : "") + g;
  }

  function renderThermo() {
    const el = q(".oc-thermo");
    if (!el) return;
    if (!S.A) { el.innerHTML = gate("hist", false); return; }
    const th = S.A.thermo, zone = th.score == null ? "" : T(BtcCycle.ZONES[th.zone]);
    const rows = th.rows.map(r => `<tr><td>${Dom.esc(T(MEANING[r.key][0]))}</td><td class="r">${Dom.esc(rowValue(r))}</td><td><span class="badge oc-z${r.zone}">${Dom.esc(T(BtcCycle.ZONES[r.zone]))}</span></td><td class="muted">${Dom.esc(T(MEANING[r.key][1]))}</td></tr>`).join("");
    el.innerHTML = `<div class="oc-score"><div class="oc-meter"><i style="left:${th.score == null ? 0 : Math.round(th.score)}%"></i></div>
      <div class="oc-score-t">${Dom.esc(T("Điểm tổng hợp"))}: <b>${th.score == null ? "–" : Fmt.en(th.score, 0)}/100</b> <span class="badge oc-z${th.zone}">${Dom.esc(zone)}</span>
      <span class="muted">${Dom.esc(T("0 = đáy · 100 = đỉnh"))}</span></div></div>
      <div class="oc-scroll"><table class="dtable"><thead><tr><th>${Dom.esc(T("Chỉ báo"))}</th><th class="r">${Dom.esc(T("Giá trị"))}</th><th>${Dom.esc(T("Vùng chu kỳ"))}</th><th>${Dom.esc(T("Ý nghĩa"))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderPicker() {
    const el = q(".oc-picker");
    if (!el) return;
    const opts = OnchainCharts.list.map(c => `<option value="${c.id}"${c.id === S.id ? " selected" : ""}>${Dom.esc(T(c.label))}</option>`).join("");
    el.innerHTML = `<div class="seg oc-pick-seg">${OnchainCharts.list.map(c => `<button data-act="pick" data-id="${c.id}" class="${c.id === S.id ? "on" : ""}">${Dom.esc(T(c.label))}</button>`).join("")}</div><select class="oc-pick-sel" aria-label="${Dom.esc(T("Chọn biểu đồ"))}">${opts}</select>`;
  }

  function killChart() { if (chart) chart.destroy(); chart = null; }
  function renderChart() {
    const el = q(".oc-chart");
    killChart();
    if (!el) return;
    if (!S.A) { el.innerHTML = gate("hist", false); return; }
    try {
      const b = OnchainCharts.build(S.id, S.A, S);
      if (!b.series.length) { el.innerHTML = `<p class="muted pad">${Dom.esc(T("Chưa có dữ liệu cho biểu đồ này."))}</p><p class="sc-note">${Dom.esc(b.note)}</p>`; return; }
      el.innerHTML = `<div class="cbox sc-box tall"><div class="clegend"></div><div class="chost"></div></div><p class="sc-note">${Dom.esc(b.note)}</p>`;
      chart = SeriesChart.create(el.querySelector(".chost"), { legend: el.querySelector(".clegend"), axis: b.opt.axis || "date", fmt: b.opt.fmt });
      chart.set(b.series, { log: !!b.opt.log, from: b.opt.from || undefined });
      const ts = chart.chart().timeScale();
      ts.applyOptions({ minBarSpacing: 0.02 });
      if (b.opt.from) ts.setVisibleRange({ from: b.opt.from, to: Math.floor(Date.now() / 1000) + 86400 }); else ts.fitContent();
    } catch (e) { el.innerHTML = `<p class="muted pad">${Dom.esc(T("Không vẽ được biểu đồ."))}</p>`; }
  }

  function renderBlocks() {
    const el = q(".oc-blocks");
    if (!el) return;
    if (!S.net) { el.innerHTML = gate("net", false); return; }
    const now = Math.floor(Date.now() / 1000);
    const rows = S.net.blocks.map(b => `<tr><td>${Fmt.en(b.height)}</td><td>${Dom.esc(ago(now - b.t))}</td><td class="r">${Fmt.en(b.tx)}</td><td class="r">${Fmt.en(b.size / 1e6, 2)}</td><td>${Dom.esc(b.pool || "–")}</td></tr>`).join("");
    el.innerHTML = `<div class="oc-scroll"><table class="dtable"><thead><tr><th>${Dom.esc(T("Block"))}</th><th>${Dom.esc(T("Thời gian"))}</th><th class="r">${Dom.esc(T("Số giao dịch"))}</th><th class="r">${Dom.esc(T("Dung lượng (MB)"))}</th><th>Pool</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const sec = (title, cls, extra = "") => `<div class="dsec"><b>${Dom.esc(T(title))}</b>${extra}</div><div class="${cls}"></div>`;
  function renderAll() {
    if (!host) return;
    host.innerHTML = `<div class="oc-wrap">${sec("Trạng thái mạng Bitcoin", "oc-net")}${sec("Nhiệt kế chu kỳ", "oc-thermo")}${sec("Biểu đồ on-chain", "oc-picker")}<div class="oc-chart"></div>${sec("Các block mới nhất", "oc-blocks")}
      <p class="muted pad">${Dom.esc(T("Chỉ để tham khảo, không phải lời khuyên đầu tư."))}</p></div>`;
    renderNet(); renderThermo(); renderPicker(); renderChart(); renderBlocks();
  }

  function analyze() {
    if (!S.hist) return;
    S.A = BtcCycle.analyze({ ...S.hist, hash: S.net ? S.net.hash : [], fg: S.fg && S.fg.length ? S.fg[0].v : null });
  }
  async function loadNet() {
    const my = gen, first = !S.net;
    try { const net = await BtcData.network(); if (my !== gen) return; S.net = net; S.err.net = null; }
    catch (e) { if (my !== gen) return; if (!S.net) S.err.net = e; }
    renderNet(); renderBlocks();
    if (first && S.net && S.hist) { analyze(); renderThermo(); renderChart(); }
  }
  async function loadHist() {
    const my = gen;
    try { const [h, fg] = await Promise.all([BtcData.history(), BtcData.fearGreed().catch(() => [])]); if (my !== gen) return; S.hist = h; S.fg = fg; S.err.hist = null; analyze(); }
    catch (e) { if (my !== gen) return; S.err.hist = e; }
    renderNet(); renderThermo(); renderChart();
  }

  function onClick(e) {
    const b = e.target.closest("[data-act]");
    if (!b || !S) return;
    if (b.dataset.act === "retry") { const grp = b.dataset.grp; S.err[grp] = null; renderAll(); return grp === "net" ? loadNet() : loadHist(); }
    if (b.dataset.act === "pick") choose(b.dataset.id);
  }
  function choose(id) { S.id = OnchainCharts.byId(id).id; Prefs.set("onchain.chart", S.id); renderPicker(); renderChart(); }

  function mount(el) {
    host = el; gen++;
    S = { net: null, hist: null, fg: null, A: null, err: { net: null, hist: null }, id: OnchainCharts.byId(Prefs.get("onchain.chart", "rainbow")).id };
    host.onclick = onClick;
    host.onchange = e => { if (e.target.classList.contains("oc-pick-sel")) choose(e.target.value); };
    renderAll(); loadNet(); loadHist();
    timer = setInterval(loadNet, 60000);
  }
  function unmount() { gen++; clearInterval(timer); killChart(); if (host) { host.onclick = null; host.onchange = null; } host = null; S = null; }

  return { id: "onchain", label: "Bitcoin On-chain", wide: true, mount, unmount, relabel: renderAll };
})();
