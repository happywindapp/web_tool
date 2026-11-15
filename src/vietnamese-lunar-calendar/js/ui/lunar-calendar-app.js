// App wiring: tabs Lịch | Tử vi | SIM phong thủy, month navigation, date box (dương/âm), keyboard, share link #pako: / ?data= / ?demo=, theme, VI|EN.
(() => {
  const P = "web_tool.vietnamese-lunar-calendar.";
  const store = { get: (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { /* storage blocked */ } } };
  const now = new Date(), today = LunarCal.jdFromDate(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const MIN_JD = LunarCal.jdFromDate(1, 1, LunarCal.MIN_YEAR), MAX_JD = LunarCal.jdFromDate(31, 12, LunarCal.MAX_YEAR);
  const st = { sel: today, y: 0, m: 0, cc: store.get("cc", false), moon: store.get("moon", false) };
  let tab = "cal", lastNote = { fn: () => "", cls: "muted" };
  const TABS = ["cal", "horo", "sim"];
  const statusBy = { cal: { fn: () => "", cls: "" }, horo: { fn: () => "", cls: "" }, sim: { fn: () => "", cls: "" } };

  // Messages are closures so a language switch re-renders them in the new language.
  const note = (fn, cls = "muted") => { lastNote = { fn, cls }; const el = $("note"); el.textContent = fn(); el.className = cls; };
  const paint = () => { const s = statusBy[tab], el = $("status"); el.textContent = s.fn(); el.className = "status " + s.cls; };
  // Each tab keeps its own status line; owner ≠ visible tab only stores it.
  const status = (fn, cls = "", owner = "cal") => { statusBy[owner] = { fn, cls }; if (owner === tab) paint(); };

  function setTab(id) {
    tab = TABS.includes(id) ? id : "cal";
    store.set("tab", tab);
    document.body.classList.toggle("tab-horo", tab === "horo");
    document.body.classList.toggle("tab-sim", tab === "sim");
    document.querySelectorAll("#tabs [data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    for (const t of TABS) for (const part of ["Bar", "Switch", "Work"]) $(t + part).hidden = t !== tab;
    if (tab === "sim") SimApp.prefill();
    paint();
  }

  function fillSelects() {
    $("month").innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${Dom.esc(I18n.lang === "en" ? new Date(2000, i, 1).toLocaleString("en", { month: "short" }) : T("Tháng {m}", { m: i + 1 }))}</option>`).join("");
    if (!$("year").options.length) $("year").innerHTML = Array.from({ length: LunarCal.MAX_YEAR - LunarCal.MIN_YEAR + 1 }, (_, i) => `<option>${LunarCal.MIN_YEAR + i}</option>`).join("");
    $("demo").innerHTML = `<option value="">${Dom.esc(T("Thử mẫu…"))}</option>` + DEMOS.keys.map(k => `<option value="${k}">${Dom.esc(T(DEMOS.name(k)))}</option>`).join("");
  }

  function renderMonth(focus) {
    const r = MonthGrid.build({ y: st.y, m: st.m, sel: st.sel, today, cc: st.cc, moon: st.moon });
    $("grid").innerHTML = r.html;
    $("month").value = st.m; $("year").value = st.y;
    const lf = r.lunarFrom, lt = r.lunarTo, lab = l => l.d + "/" + l.m + (l.leap ? T("n") : "");
    $("lunarRange").textContent = T("Âm {a} – {b}", { a: lab(lf), b: lab(lt) + "/" + lt.y });
    $("events").innerHTML = r.events.map(e => `<li><button type="button" data-jd="${e.jd}" data-pane-go="1" class="${e.term ? "term" : e.off ? "off" : ""}"><b>${e.d}</b> ${Dom.esc(T(e.name))}${e.lunar ? ` <small>${Dom.esc(T("(âm)"))}</small>` : ""}</button></li>`).join("");
    $("prev").disabled = st.y === LunarCal.MIN_YEAR && st.m === 1;
    $("next").disabled = st.y === LunarCal.MAX_YEAR && st.m === 12;
    if (focus) $("grid").querySelector(".sel")?.focus({ preventScroll: true });
  }

  function select(jd, { focus = false } = {}) {
    st.sel = Math.min(MAX_JD, Math.max(MIN_JD, jd));
    const s = LunarCal.jdToDate(st.sel);
    st.y = s.y; st.m = s.m;
    $("q").classList.remove("bad");
    $("toHoro").disabled = $("toSim").disabled = st.sel > today;
    renderMonth(focus);
    DayDetail.render($("detail"), st.sel, today);
    status(() => DayDetail.summary(st.sel));
  }

  function shiftMonth(delta) {
    let m = st.m + delta, y = st.y;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    if (y < LunarCal.MIN_YEAR || y > LunarCal.MAX_YEAR) return;
    const s = LunarCal.jdToDate(st.sel), last = LunarCal.jdToDate(LunarCal.jdFromDate(1, m % 12 + 1, y + (m === 12 ? 1 : 0)) - 1).d;
    select(LunarCal.jdFromDate(Math.min(s.d, last), m, y));
  }

  // Parses the date box; errors go to the status bar and leave the current view untouched.
  function goText(text) {
    $("q").value = text;
    const r = DateText.parse(text);
    $("q").classList.toggle("bad", !!r.error);
    if (r.error) { status(() => "✖ " + T(r.error, r.params), "bad"); return false; }
    select(r.jd);
    return true;
  }

  function demo(key) {
    if (key.startsWith("horo-") && HoroApp.demo(key)) return;
    if (key.startsWith("sim-") && SimApp.demo(key)) return;
    const text = DEMOS.text(key);
    if (text === null) return note(() => T("✖ Không có mẫu “{key}”.", { key }), "bad");
    setTab("cal");
    goText(text);
    note(() => T("Đã nạp mẫu: {name}", { name: T(DEMOS.name(key)) }));
    PhoneLayout.show(1);
  }

  // Payload is untrusted: calendar reads only a date string + boolean; the Tử vi tab copies only its known fields.
  async function openLink(raw) {
    let p;
    try { p = await ShareCodec.decode(raw); } catch (e) { return note(() => T("✖ Link chia sẻ bị hỏng hoặc không đúng định dạng: {msg}", { msg: e.message }), "bad"); }
    if (p === null) p = { date: raw };
    if (p && p.tab === "horo") { if (HoroApp.open(p)) note(() => T("Đã mở lá số từ link.")); return; }
    if (p && p.tab === "sim") { if (SimApp.open(p)) note(() => T("Đã mở SIM từ link.")); return; }
    if (!p || typeof p.date !== "string") return note(() => T("✖ Link không chứa ngày của Lịch vạn niên."), "bad");
    setTab("cal");
    if (typeof p.cc === "boolean") { st.cc = p.cc; $("cc").checked = p.cc; renderMonth(); }
    if (typeof p.moon === "boolean") { st.moon = p.moon; $("moon").checked = p.moon; renderMonth(); }
    if (goText(p.date)) note(() => T("Đã mở ngày từ link."));
    PhoneLayout.show(1);
  }

  async function share() {
    const payload = tab === "horo" ? HoroApp.snapshot() : tab === "sim" ? SimApp.snapshot() : { date: DateText.iso(st.sel), cc: st.cc, moon: st.moon };
    if (tab === "horo" && !payload.birth) return note(() => T("Chưa có ngày sinh để chia sẻ."), "bad");
    if (tab === "sim" && !payload.sim) return note(() => T("Chưa có số SIM để chia sẻ."), "bad");
    let link;
    try { const u = new URL(location.href); u.search = ""; u.hash = await ShareCodec.encode(payload); link = u.href; }
    catch (e) { return note(() => T("✖ Không tạo được link: {msg}", { msg: e.message }), "bad"); }
    const local = () => location.protocol === "file:" ? " " + T("Đang mở bằng file:// nên link chỉ dùng được trên máy này.") : "";
    if (await Dom.copy(link)) note(() => T("✔ Đã chép link chia sẻ ({n} ký tự).", { n: I18n.num(link.length) }) + local(), "good");
    else prompt(T("Trình duyệt chặn sao chép — hãy tự chép link này:"), link);
  }

  function cleanUrl() {
    try { const u = new URL(location.href); u.searchParams.delete("demo"); u.searchParams.delete("data"); u.hash = ""; history.replaceState(null, "", u); } catch { /* file:// may refuse */ }
  }

  function onGridKey(e) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) select(st.sel + step, { focus: true });
    else if (e.key === "PageUp" || e.key === "PageDown") { shiftMonth(e.key === "PageUp" ? -1 : 1); $("grid").querySelector(".sel")?.focus(); }
    else if (e.key === "Home") select(today, { focus: true });
    else return;
    e.preventDefault();
  }

  I18n.init();
  ThemePicker.bind($("theme"), store);
  fillSelects();
  $("cc").checked = st.cc;
  $("moon").checked = st.moon;
  $("prev").onclick = () => shiftMonth(-1);
  $("next").onclick = () => shiftMonth(1);
  $("today").onclick = () => select(today);
  $("month").onchange = () => { st.m = +$("month").value; shiftMonth(0); };
  $("year").onchange = () => { st.y = +$("year").value; shiftMonth(0); };
  const go = () => { if (goText($("q").value)) PhoneLayout.show(1); };
  $("go").onclick = go;
  $("q").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); go(); } };
  $("cc").onchange = () => { st.cc = $("cc").checked; store.set("cc", st.cc); renderMonth(); };
  $("moon").onchange = () => { st.moon = $("moon").checked; store.set("moon", st.moon); renderMonth(); };
  // Cross-tab buttons carry only the birth (date, calendar, time, gender); name / SIM number already typed in the target tab stay.
  const selBirth = () => { const d = LunarCal.jdToDate(st.sel), p = n => String(n).padStart(2, "0"); return { birth: `${p(d.d)}/${p(d.m)}/${d.y}`, lunar: false }; };
  const ownerOf = s => ({ birth: s.birth, lunar: s.lunar, time: s.time, male: s.male });
  $("toHoro").onclick = () => HoroApp.useBirth(selBirth());
  $("toSim").onclick = () => SimApp.useBirth(selBirth());
  $("hToSim").onclick = () => SimApp.useBirth(ownerOf(HoroApp.snapshot()));
  $("sToHoro").onclick = () => HoroApp.useBirth(ownerOf(SimApp.snapshot()));
  $("demo").onchange = e => { const k = e.target.value; e.target.value = ""; if (k) demo(k); };
  $("share").onclick = share;
  for (const box of [$("grid"), $("events")]) box.addEventListener("click", e => { const b = e.target.closest("[data-jd]"); if (b) select(+b.dataset.jd, { focus: box === $("grid") }); });
  $("grid").addEventListener("keydown", onGridKey);
  $("tabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); };
  HoroApp.init({ today, status: (fn, cls) => status(fn, cls, "horo"), note, tab: setTab });
  SimApp.init({ today, status: (fn, cls) => status(fn, cls, "sim"), note, tab: setTab });
  I18n.onChange(() => {
    const saved = statusBy.cal;
    fillSelects(); select(st.sel); statusBy.cal = saved; HoroApp.relabel(); SimApp.relabel(); paint(); note(lastNote.fn, lastNote.cls);
  });

  const fromHash = () => { const h = location.hash.slice(1); try { return decodeURIComponent(h); } catch { return h; } };
  window.addEventListener("hashchange", () => { if (location.hash.length > 1) { const h = fromHash(); cleanUrl(); openLink(h); } });
  select(today);
  const q = new URLSearchParams(location.search);
  setTab(q.get("tab") || store.get("tab", "cal"));
  const name = q.get("demo"), raw = location.hash.length > 1 ? fromHash() : q.get("data");
  if (raw) openLink(raw); else if (name) demo(name);
  if (raw || name) cleanUrl();
})();
