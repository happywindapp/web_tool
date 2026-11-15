// Báo thức / đếm ngược: bấm đồng hồ kim để đặt (báo thức theo ngày đang chọn + giờ AM/PM, hoặc đếm ngược), tới giờ thì hộp cảnh báo + bíp; lưu localStorage.
const Alarms = (() => {
  const MAX_NOTE = 200;
  let o, list = [], ringTimer = 0;
  const esc = s => Dom.esc(s);
  const pad = n => String(n).padStart(2, "0");
  const jdOf = ms => { const d = new Date(ms); return LunarCal.jdFromDate(d.getDate(), d.getMonth() + 1, d.getFullYear()); };
  const when = ms => { const d = new Date(ms), h = d.getHours(); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(h % 12 || 12) + ":" + pad(d.getMinutes()) + " " + (h < 12 ? "AM" : "PM"); };
  const save = () => { list.sort((a, b) => a.at - b.at); o.store.set("alarms", list); o.onChange(); renderList(); };

  // Countdown text: "1n 02:03:04" when a day or more is left.
  function left(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000)), d = Math.floor(t / 86400), r = t % 86400;
    return (d ? T("{n}n", { n: d }) + " " : "") + pad(Math.floor(r / 3600)) + ":" + pad(Math.floor(r / 60) % 60) + ":" + pad(r % 60);
  }

  function renderList() {
    $("alList").innerHTML = list.length ? list.map(a => `<li><span><b>${esc(when(a.at))}</b> ${esc(a.note || T("(không ghi chú)"))}</span><button type="button" data-al-del="${esc(a.id)}" title="${esc(T("Xóa báo thức"))}">✕</button></li>`).join("")
      : `<li class="muted">${esc(T("Chưa có báo thức nào."))}</li>`;
  }

  function open() {
    const s = LunarCal.jdToDate(o.sel());
    $("alDay").textContent = T("Ngày {d}", { d: pad(s.d) + "/" + pad(s.m) + "/" + s.y });
    $("alNote").value = ""; $("alErr").textContent = "";
    renderList();
    $("alDlg").showModal();
  }

  function add() {
    const countdown = $("alModeCd").checked, now = Date.now();
    let at;
    if (countdown) {
      const ms = ((+$("alCdH").value || 0) * 3600 + (+$("alCdM").value || 0) * 60 + (+$("alCdS").value || 0)) * 1000;
      if (ms <= 0) { $("alErr").textContent = T("Nhập thời gian đếm ngược lớn hơn 0."); return; }
      at = now + ms;
    } else {
      const s = LunarCal.jdToDate(o.sel()), h12 = +$("alH").value, pm = $("alAmPm").value === "PM";
      at = new Date(s.y, s.m - 1, s.d, (h12 % 12) + (pm ? 12 : 0), +$("alM").value).getTime();
      if (at <= now) { $("alErr").textContent = T("Giờ này đã qua — chọn giờ khác hoặc ngày khác trên lịch."); return; }
    }
    list.push({ id: now.toString(36) + Math.random().toString(36).slice(2, 5), at, note: $("alNote").value.trim().slice(0, MAX_NOTE) });
    $("alNote").value = ""; $("alErr").textContent = "";
    save();
  }

  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.3, 0.6].forEach(t => { const g = ac.createGain(), x = ac.createOscillator(); x.frequency.value = 880; g.gain.value = 0.2; x.connect(g); g.connect(ac.destination); x.start(ac.currentTime + t); x.stop(ac.currentTime + t + 0.18); });
    } catch { /* audio blocked */ }
  }

  function ring(due) {
    $("alFireText").innerHTML = due.map(a => `<p><b>⏰ ${esc(when(a.at))}</b><br>${esc(a.note || T("(không ghi chú)"))}</p>`).join("");
    if (!$("alFire").open) $("alFire").showModal();
    clearInterval(ringTimer);
    let n = 0;
    beep();
    ringTimer = setInterval(() => { if (++n >= 40 || !$("alFire").open) clearInterval(ringTimer); else beep(); }, 1500);
  }

  // Called every second: fires due alarms; returns the clock label (countdown to the nearest alarm) or null.
  function tick() {
    const now = Date.now(), due = list.filter(a => a.at <= now);
    if (due.length) { list = list.filter(a => a.at > now); save(); ring(due); }
    return list.length ? { text: "⏰ " + left(list[0].at - now), title: when(list[0].at) + (list[0].note ? " · " + list[0].note : "") } : null;
  }

  // opts: { store, sel: () => selected jd, onChange: re-render the month (⏰ marks) }
  function init(opts) {
    o = opts;
    const raw = o.store.get("alarms", []);
    list = Array.isArray(raw) ? raw.filter(a => a && typeof a.id === "string" && Number.isFinite(a.at)).map(a => ({ id: a.id, at: a.at, note: String(a.note || "").slice(0, MAX_NOTE) })) : [];
    list.sort((a, b) => a.at - b.at);
    const h = $("alH"), m = $("alM");
    h.innerHTML = Array.from({ length: 12 }, (_, i) => `<option>${i + 1}</option>`).join("");
    m.innerHTML = Array.from({ length: 60 }, (_, i) => `<option value="${i}">${pad(i)}</option>`).join("");
    const d = new Date(); h.value = String(d.getHours() % 12 || 12); m.value = String(d.getMinutes()); $("alAmPm").value = d.getHours() < 12 ? "AM" : "PM";
    $("detail").addEventListener("click", e => { if (e.target.closest(".aclock")) open(); });
    $("alAdd").onclick = add;
    $("alClose").onclick = () => $("alDlg").close();
    $("alList").addEventListener("click", e => { const b = e.target.closest("[data-al-del]"); if (b) { list = list.filter(a => a.id !== b.dataset.alDel); save(); } });
    document.querySelectorAll("[name=alMode]").forEach(r => { r.onchange = () => { $("alAlarmBox").hidden = $("alModeCd").checked; $("alCdBox").hidden = !$("alModeCd").checked; }; });
    $("alStop").onclick = () => { clearInterval(ringTimer); $("alFire").close(); };
  }

  return { init, tick, days: () => new Set(list.map(a => jdOf(a.at))) };
})();
