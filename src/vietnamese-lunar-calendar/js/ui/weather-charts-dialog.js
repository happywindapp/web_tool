// Hộp "📊 Biểu đồ thời tiết": chọn chế độ (mùa / năm / nhiều năm), năm, mùa, số năm; tải lịch sử Open-Meteo theo địa điểm rồi vẽ.
const WeatherCharts = (() => {
  const now = new Date(), first = WxChartsView.seasonOf(now.getMonth() + 1, now.getFullYear());
  const st = { mode: "season", y: now.getFullYear(), s: first.s, sy: first.y, span: 10, key: "", place: null, days: null, loaded: 0, loading: false, error: "" };
  let seq = 0, resizeTimer = 0;
  const esc = s => Dom.esc(s);

  function controls() {
    document.querySelectorAll("#wxcModes [data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === st.mode));
    const years = st.days ? [...new Set(st.days.map(d => d.y))].sort((a, b) => b - a) : [st.y];
    const y = st.mode === "season" ? st.sy : st.y;
    $("wxcYear").innerHTML = years.map(v => `<option value="${v}"${v === y ? " selected" : ""}>${v}</option>`).join("");
    $("wxcSeason").innerHTML = WxChartsView.SEASONS.map(([name], i) => `<option value="${i}"${i === st.s ? " selected" : ""}>${esc(T(name))}</option>`).join("");
    $("wxcSpan").innerHTML = [10, 30].map(n => `<option value="${n}"${n === st.span ? " selected" : ""}>${esc(T("{n} năm gần nhất", { n }))}</option>`).join("");
    $("wxcYear").hidden = st.mode === "multi"; $("wxcSeason").hidden = st.mode !== "season"; $("wxcSpan").hidden = st.mode !== "multi";
  }

  function draw() {
    controls();
    const body = $("wxcBody");
    if (st.loading) { body.innerHTML = `<p class="muted">${esc(T("Đang tải dữ liệu lịch sử…"))}</p>`; return; }
    if (!st.days) { body.innerHTML = `<p class="bad">${esc(T("✖ Không tải được thời tiết: {msg}", { msg: st.error }))}</p>`; return; }
    const r = st.mode === "season" ? WxChartsView.season(st.days, { y: st.sy, s: st.s }) : st.mode === "year" ? WxChartsView.year(st.days, { y: st.y }) : WxChartsView.multi(st.days, { span: st.span });
    body.innerHTML = r.html + `<p class="muted wxc-note">${esc(T("Nguồn: Open-Meteo Historical (ERA5, phân tích lại), tọa độ {lat}, {lon}; dữ liệu trễ ~5 ngày.", { lat: st.place.lat, lon: st.place.lon }))}</p>`;
    body.querySelectorAll("[data-chart]").forEach((el, i) => WxChart.render(el, r.specs[i]));
  }

  // Loads enough years for the mode; a longer load already in memory covers shorter ones.
  function ensure() {
    const need = st.mode === "multi" ? st.span : 10;
    if (st.days && st.loaded >= need) return draw();
    const my = ++seq, at = st.place;
    st.loading = true; st.error = "";
    draw();
    WeatherHistory.load(at.lat, at.lon, need)
      .then(days => { if (my === seq) { st.days = days; st.loaded = need; } })
      .catch(e => { if (my === seq) { st.days = null; st.error = e.message || String(e); } })
      .finally(() => { if (my === seq) { st.loading = false; draw(); } });
  }

  // place: { lat, lon, name } of the weather section.
  function open(place) {
    const key = place.lat + "," + place.lon;
    if (key !== st.key) Object.assign(st, { key, days: null, loaded: 0 });
    st.place = place;
    $("wxcTitle").textContent = T("📊 Biểu đồ thời tiết · {place}", { place: place.name });
    $("wxCharts").showModal();
    ensure();
  }

  function init() {
    $("wxcClose").onclick = () => $("wxCharts").close();
    $("wxCharts").addEventListener("click", e => { if (e.target === $("wxCharts")) $("wxCharts").close(); });
    $("wxcModes").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) { st.mode = b.dataset.mode; ensure(); } };
    $("wxcYear").onchange = () => { if (st.mode === "season") st.sy = +$("wxcYear").value; else st.y = +$("wxcYear").value; draw(); };
    $("wxcSeason").onchange = () => { st.s = +$("wxcSeason").value; draw(); };
    $("wxcSpan").onchange = () => { st.span = +$("wxcSpan").value; ensure(); };
    addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if ($("wxCharts").open && !st.loading) draw(); }, 150); });
    I18n.onChange(() => { if ($("wxCharts").open) { $("wxcTitle").textContent = T("📊 Biểu đồ thời tiết · {place}", { place: st.place.name }); if (!st.loading) draw(); } });
  }

  return { init, open };
})();
