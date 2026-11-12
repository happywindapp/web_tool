// Tab Tử vi: đọc ô nhập (tên, giới tính, ngày/giờ sinh, năm xem), kiểm lỗi, dựng 2 pane; snapshot/open cho link chia sẻ.
const HoroApp = (() => {
  let deps, ctx = null;
  const MAX_NAME = 80;

  // "7:30", "07h30", "7h", "19.05" → { hour, minute }; "" → null; otherwise { error }.
  function parseTime(text) {
    const s = String(text || "").trim();
    if (!s) return null;
    const m = /^(\d{1,2})\s*[:hg.]\s*(\d{1,2})?\s*(?:p|ph|phút)?$/i.exec(s) || /^(\d{1,2})$/.exec(s);
    if (!m || +m[1] > 23 || +(m[2] || 0) > 59) return { error: "Giờ sinh không hợp lệ: “{t}” (dạng 07:30, để trống nếu không rõ).", params: { t: s } };
    return { hour: +m[1], minute: +(m[2] || 0) };
  }

  function read() {
    const name = $("hName").value.trim().slice(0, MAX_NAME), male = $("hSex").value !== "f", year = +$("hYear").value;
    const b = DateText.parse($("hBirth").value);
    if (b.error) return { error: b.error, params: b.params, field: "hBirth" };
    if (b.jd > deps.today) return { error: "Ngày sinh không được sau hôm nay.", field: "hBirth" };
    const t = parseTime($("hTime").value);
    if (t && t.error) return { ...t, field: "hTime" };
    const s = LunarCal.jdToDate(b.jd), time = t ? String(t.hour).padStart(2, "0") + ":" + String(t.minute).padStart(2, "0") : "";
    return { name, male, year, birth: s, time, input: { name, male, d: s.d, m: s.m, y: s.y, hour: t?.hour, minute: t?.minute } };
  }

  function render() {
    if (!ctx) { HoroView.empty($("hProfile")); $("hFortune").innerHTML = ""; return; }
    HoroProfile.render($("hProfile"), ctx);
    HoroView.fortune($("hFortune"), ctx);
  }

  function run() {
    ["hBirth", "hTime"].forEach(id => $(id).classList.remove("bad"));
    const r = read();
    if (r.error) { ctx = null; render(); $(r.field).classList.add("bad"); deps.status(() => "✖ " + T(r.error, r.params), "bad"); return false; }
    const chart = BirthChart.compute(r.input);
    ctx = { ...r, chart, num: Numerology.compute(r.name, r.birth), today: deps.today };
    render();
    deps.status(() => T("Đã xem tử vi: {who} · tuổi {cc} · mệnh {na} · cung {kua}", { who: r.name || T("(chưa nhập tên)"),
      cc: T(CanChi.CAN[chart.pillars.year.can]) + " " + T(CanChi.CHI[chart.pillars.year.chi]), na: T(chart.napAm), kua: T(chart.kua.name) }));
    return true;
  }

  function fill(p) {
    $("hName").value = typeof p.name === "string" ? p.name.slice(0, MAX_NAME) : "";
    $("hSex").value = p.male === false ? "f" : "m";
    $("hBirth").value = typeof p.birth === "string" ? p.birth : "";
    $("hTime").value = typeof p.time === "string" ? p.time : "";
    if (Number.isInteger(p.year) && p.year >= LunarCal.MIN_YEAR && p.year <= LunarCal.MAX_YEAR) $("hYear").value = p.year;
  }

  // Payload is untrusted: only known string/boolean/integer fields are copied into the inputs.
  function open(p) { deps.tab("horo"); fill(p); const ok = run(); PhoneLayout.show(0); return ok; }

  function demo(key) {
    const p = HORO_DEMOS.data(key);
    if (!p) return false;
    if (!open(p)) return true;
    deps.note(() => T("Đã nạp mẫu: {name}", { name: T(HORO_DEMOS.name(key)) }));
    return true;
  }

  const snapshot = () => ({ tab: "horo", name: $("hName").value.trim(), male: $("hSex").value !== "f", birth: $("hBirth").value.trim(), time: $("hTime").value.trim(), year: +$("hYear").value });

  function fillSelects() {
    $("horoDemo").innerHTML = `<option value="">${Dom.esc(T("Thử mẫu…"))}</option>` + HORO_DEMOS.keys.map(k => `<option value="${k}">${Dom.esc(T(HORO_DEMOS.name(k)))}</option>`).join("");
    $("hSex").innerHTML = `<option value="m">${Dom.esc(T("Nam giới"))}</option><option value="f">${Dom.esc(T("Nữ giới"))}</option>`;
  }

  // d: { today, status(fn, cls), note(fn, cls), tab(id) }
  function init(d) {
    deps = d;
    const sex = $("hSex").value || "m";
    fillSelects();
    $("hSex").value = sex;
    if (!$("hYear").options.length) {
      $("hYear").innerHTML = Array.from({ length: LunarCal.MAX_YEAR - LunarCal.MIN_YEAR + 1 }, (_, i) => `<option>${LunarCal.MIN_YEAR + i}</option>`).join("");
      $("hYear").value = LunarCal.fromJd(d.today).y;
    }
    $("hGo").onclick = run;
    for (const id of ["hName", "hBirth", "hTime"]) $(id).onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); run(); } };
    $("hYear").onchange = () => { if (ctx) run(); };
    render();
    $("horoDemo").onchange = e => { const k = e.target.value; e.target.value = ""; if (k) demo(k); };
  }

  function relabel() { const sex = $("hSex").value; fillSelects(); $("hSex").value = sex; render(); }

  return { init, open, demo, snapshot, relabel };
})();
