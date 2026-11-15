// Tab SIM phong thủy: đọc số SIM + giới tính, ngày/giờ sinh (tùy chọn), kiểm lỗi, chấm điểm, dựng 2 pane; snapshot/open cho link chia sẻ.
const SimApp = (() => {
  let deps, ctx = null;
  const MAX = 40, pad = n => String(n).padStart(2, "0");

  function read() {
    const num = SimNumber.parse($("sNum").value), male = $("sSex").value !== "f";
    if (num.error) return { ...num, field: "sNum" };
    if (!$("sBirth").value.trim()) return { num, male, chart: null };
    const b = DateText.parse($("sBirth").value, { lunar: $("sLunar").checked });
    if (b.error) return { error: b.error, params: b.params, field: "sBirth" };
    if (b.jd > deps.today) return { error: "Ngày sinh không được sau hôm nay.", field: "sBirth" };
    const t = HoroApp.parseTime($("sTime").value);
    if (t && t.error) return { ...t, field: "sTime" };
    const birth = LunarCal.jdToDate(b.jd);
    const chart = BirthChart.compute({ male, d: birth.d, m: birth.m, y: birth.y, hour: t?.hour, minute: t?.minute });
    return { num, male, birth, time: t ? pad(t.hour) + ":" + pad(t.minute) : "", chart, pillars: BaziUseful.solarPillars(chart, t) };
  }

  function render() {
    if (!ctx) { SimScoreView.empty($("sScore")); $("sDetail").innerHTML = ""; return; }
    SimScoreView.render($("sScore"), ctx);
    SimAnalysisView.render($("sDetail"), ctx);
  }

  function run() {
    ["sNum", "sBirth", "sTime"].forEach(id => $(id).classList.remove("bad"));
    const r = read();
    if (r.error) { ctx = null; render(); $(r.field).classList.add("bad"); deps.status(() => "✖ " + T(r.error, r.params), "bad"); return false; }
    const res = SimScore.evaluate({ ...r.num, chart: r.chart, pillars: r.pillars, year:LunarCal.jdToDate(deps.today).y });
    ctx = { ...r, res, carrier: SimNumber.carrier(r.num.text) };
    render();
    deps.status(() => T("Đã chấm SIM {sim}: {score}/10 · {verdict}", { sim: SimNumber.pretty(r.num.text), score: I18n.num(res.score), verdict: T(res.verdict) }));
    return true;
  }

  function fill(p) {
    const str = (v, n = MAX) => typeof v === "string" ? v.slice(0, n) : "";
    $("sNum").value = str(p.sim);
    $("sSex").value = p.male === false ? "f" : "m";
    $("sBirth").value = str(p.birth);
    $("sTime").value = str(p.time, 10);
    $(p.lunar === true ? "sLunar" : "sSolar").checked = true;
  }

  // Payload is untrusted: only known string/boolean fields are copied into the inputs.
  function open(p) { deps.tab("sim"); fill(p); const ok = run(); PhoneLayout.show(0); return ok; }

  // From another tab: b = { birth, lunar?, time?, male? } replaces the owner's birth; scores at once when a number is already typed.
  function useBirth(b) {
    deps.tab("sim");
    fill({ ...snapshot(), ...b });
    if ($("sNum").value.trim()) { run(); PhoneLayout.show(0); return; }
    $("sNum").focus();
    deps.status(() => T("Đã chép ngày sinh — nhập số SIM rồi bấm “Chấm điểm SIM”."));
  }

  function demo(key) {
    const p = SIM_DEMOS.data(key);
    if (!p) return false;
    if (open(p)) deps.note(() => T("Đã nạp mẫu: {name}", { name: T(SIM_DEMOS.name(key)) }));
    return true;
  }

  const snapshot = () => ({ tab: "sim", sim: $("sNum").value.trim(), male: $("sSex").value !== "f", birth: $("sBirth").value.trim(), lunar: $("sLunar").checked, time: $("sTime").value.trim() });

  // First visit: reuse the owner already typed in the Tử vi tab.
  function prefill() {
    if ($("sBirth").value.trim() || !$("hBirth").value.trim()) return;
    $("sBirth").value = $("hBirth").value; $("sTime").value = $("hTime").value; $("sSex").value = $("hSex").value;
    $($("hLunar").checked ? "sLunar" : "sSolar").checked = true;
  }

  function fillSelects() {
    $("simDemo").innerHTML = `<option value="">${Dom.esc(T("Thử mẫu…"))}</option>` + SIM_DEMOS.keys.map(k => `<option value="${k}">${Dom.esc(T(SIM_DEMOS.name(k)))}</option>`).join("");
    $("sSex").innerHTML = `<option value="m">${Dom.esc(T("Nam giới"))}</option><option value="f">${Dom.esc(T("Nữ giới"))}</option>`;
  }

  // d: { today, status(fn, cls), note(fn, cls), tab(id) }
  function init(d) {
    deps = d;
    fillSelects();
    $("sGo").onclick = run;
    BirthPickers.attach({ text: "sBirth", pick: "sBirthPick", lunar: "sLunar" }, d.today, () => { if ($("sNum").value.trim()) run(); });
    for (const id of ["sNum", "sBirth", "sTime"]) $(id).onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); run(); } };
    for (const id of ["sSolar", "sLunar"]) $(id).onchange = () => { if ($("sNum").value.trim() && $("sBirth").value.trim()) run(); };
    $("simDemo").onchange =e => { const k = e.target.value; e.target.value = ""; if (k) demo(k); };
    render();
  }

  function relabel() { const sex = $("sSex").value; fillSelects(); $("sSex").value = sex; render(); }

  return { init, open, demo, snapshot, prefill, relabel, useBirth };
})();
