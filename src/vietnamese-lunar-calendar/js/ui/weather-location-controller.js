// Thời tiết tab Lịch: checkbox bật/tắt (mặc định bật), chọn tỉnh/thành hoặc 📍 vị trí trình duyệt, tải Open-Meteo rồi gọi onChange để vẽ lại.
const WeatherApp = (() => {
  const HERE = "here";
  const st = { on: true, id: "ho-chi-minh", here: null, place: "", data: null, error: "", loading: true, more: false };
  let o, seq = 0;
  const label = p => T(p.name) + (p.seat ? " (" + p.seat + ")" : "");
  const hereName = () => (st.here && st.here.name ? "📍 " + st.here.name : T("📍 Vị trí của tôi"));

  function current() {
    if (st.id === HERE && st.here) return { lat: st.here.lat, lon: st.here.lon, name: hereName() };
    const p = WeatherText.PROVINCES.find(x => x.id === st.id) || WeatherText.PROVINCES.find(x => x.id === "ho-chi-minh");
    return { lat: p.lat, lon: p.lon, name: label(p) };
  }

  function fill() {
    $("wxPlace").innerHTML = (st.here ? `<option value="${HERE}">${Dom.esc(hereName())}</option>` : "")
      + WeatherText.PROVINCES.map(p => `<option value="${p.id}">${Dom.esc(label(p))}</option>`).join("");
    $("wxPlace").value = st.id;
    if ($("wxPlace").value !== st.id) $("wxPlace").value = st.id = "ho-chi-minh";
    $("wxOpts").hidden = !st.on;
    st.place = current().name;
  }

  function load() {
    const my = ++seq;
    fill();
    if (!st.on) { st.data = null; return o.onChange(); }
    const at = current();
    st.loading = true; st.error = "";
    o.onChange();
    Weather.load(at.lat, at.lon)
      .then(d => { if (my === seq) st.data = d; })
      .catch(e => { if (my === seq) { st.data = null; st.error = e.message || String(e); } })
      .finally(() => { if (my === seq) { st.loading = false; o.onChange(); } });
  }

  function locate() {
    if (!navigator.geolocation) return o.note(() => T("✖ Trình duyệt không hỗ trợ định vị."), "bad");
    o.note(() => T("Đang lấy vị trí…"));
    navigator.geolocation.getCurrentPosition(pos => {
      const r = v => Math.round(v * 100) / 100;
      st.here = { lat: r(pos.coords.latitude), lon: r(pos.coords.longitude) }; st.id = HERE;
      o.store.set("wxHere", st.here); o.store.set("wxPlace", HERE);
      o.note(() => T("✔ Đã dùng vị trí của bạn (làm tròn ~1 km)."), "good");
      st.data = null; load();
      // Name only refines the label; weather does not wait for it.
      const at = st.here;
      Weather.placeName(at.lat, at.lon).then(name => { if (name && st.here === at) { at.name = name; o.store.set("wxHere", at); fill(); o.onChange(); } }).catch(() => {});
    }, e => o.note(() => T("✖ Không lấy được vị trí: {msg}", { msg: e.message || e.code }), "bad"), { timeout: 15000, maximumAge: 3600e3 });
  }

  // Stored value is untrusted: numbers for coordinates, short string for the name.
  const validHere = h => h && Number.isFinite(h.lat) && Number.isFinite(h.lon) ? { lat: h.lat, lon: h.lon, name: typeof h.name === "string" ? h.name.slice(0, 80) : null } : null;

  // opts: { store, note, onChange }
  function init(opts) {
    o = opts;
    st.on = o.store.get("wx", true); st.here = validHere(o.store.get("wxHere", null)); st.id = o.store.get("wxPlace", "ho-chi-minh");
    $("wx").checked = st.on;
    $("wx").onchange = () => set($("wx").checked);
    $("wxPlace").onchange = () => { st.id = $("wxPlace").value; o.store.set("wxPlace", st.id); st.data = null; load(); };
    $("wxHere").onclick = locate;
    $("detail").addEventListener("click", e => {
      if (e.target.closest("[data-wx-more]")) { st.more = !st.more; o.onChange(); }
      else if (e.target.closest("[data-wx-charts]")) WeatherCharts.open(current());
    });
    WeatherCharts.init();
    load();
  }

  function set(on) { st.on = !!on; $("wx").checked = st.on; o.store.set("wx", st.on); load(); }

  return { init, set, relabel: fill, on: () => st.on, days: () => (st.on && st.data ? st.data.days : null),
    section: (sel, today) => (st.on ? WeatherView.section(st, sel, today) : "") };
})();
