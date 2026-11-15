// "Cảnh báo tín hiệu kỹ thuật" section of the 🔔 dialog: add form + list (status, re-arm, delete).
const SignalAlertsUI = (() => {
  const e = s => Dom.esc(s ?? "");
  const IV = { "1h": "1h", "4h": "4h", "1d": "1D" };
  const opt = (v, l) => `<option value="${e(v)}">${e(l)}</option>`;

  const desc = a => SignalAlertRule.isZone(a) ? `${a.sym} · ${T(SignalAlertRule.ZONES[a.signal][0])} · ${T(SignalAlertRule.HORIZONS[a.horizon])}`
    : `${a.sym} · ${T(CoinSignals.META[a.signal][0])} · ${IV[a.interval]}`;
  const tip = a => SignalAlertRule.isZone(a) ? T("Báo khi giá hiện tại nằm trong vùng của khung {h} ở tab Khuyến nghị.", { h: T(SignalAlertRule.HORIZONS[a.horizon]) }) : T(CoinSignals.META[a.signal][1]);

  function html(sym) {
    const list = SignalAlerts.all();
    return `<div class="dsec"><b>${e(T("Cảnh báo tín hiệu kỹ thuật"))}</b></div>`
      + `<div class="posform"><label>${e(T("Coin"))}<input type="text" id="saSym" value="${e(sym)}" placeholder="BTC" spellcheck="false" autocomplete="off"></label>`
      + `<label>${e(T("Tín hiệu"))}<select id="saSig"><optgroup label="${e(T("Tín hiệu nến"))}">${CoinSignals.KEYS.map(k => opt(k, T(CoinSignals.META[k][0]))).join("")}</optgroup>`
      + `<optgroup label="${e(T("Khuyến nghị"))}">${Object.entries(SignalAlertRule.ZONES).map(([k, z]) => opt(k, T(z[0]))).join("")}</optgroup></select></label>`
      + `<label>${e(T("Khung nến"))}<select id="saIv">${SignalAlertRule.INTERVALS.map(v => opt(v, IV[v])).join("")}</select></label>`
      + `<label>${e(T("Khung thời gian"))}<select id="saHz" disabled>${Object.entries(SignalAlertRule.HORIZONS).map(([k, l]) => opt(k, T(l))).join("")}</select></label>`
      + `<button class="main" data-a="sadd">${e(T("Thêm cảnh báo"))}</button></div>`
      + (list.length ? `<table class="dtable"><tbody>${list.map(a => `<tr title="${e(tip(a))}"><td>${e(desc(a))}</td><td class="${a.fired ? "muted" : "good"}">${e(a.fired ? T("Đã kích hoạt {t}", { t: new Date(a.fired).toLocaleString(I18n.lang) }) : T("Đang theo dõi"))}</td>`
        + `<td>${a.fired ? `<button data-a="srearm" data-id="${e(a.id)}">${e(T("Bật lại"))}</button>` : ""} <button data-a="sdel" data-id="${e(a.id)}">🗑</button></td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">${e(T("Chưa có cảnh báo tín hiệu nào."))}</p>`)
      + `<p class="muted">${e(T("Cảnh báo tín hiệu kiểm tra mỗi 5 phút khi trang đang mở (kể cả tab ẩn) và ngay sau khi thêm; tín hiệu nến chỉ tính khi nến đã đóng cửa, mỗi nến báo tối đa 1 lần. Khung nến không áp dụng cho cảnh báo vùng mua / bán."))}</p>`;
  }

  // Disable the select that does not apply to the chosen signal.
  function syncSelects() {
    const sig = $("saSig"); if (!sig) return;
    const zone = Object.hasOwn(SignalAlertRule.ZONES, sig.value);
    $("saIv").disabled = zone; $("saHz").disabled = !zone;
  }

  // → true when the click was handled here (caller re-renders).
  function click(a, id) {
    if (a === "srearm") SignalAlerts.rearm(id);
    else if (a === "sdel") SignalAlerts.remove(id);
    else if (a === "sadd") {
      const sym = CoinParse.norm($("saSym").value);
      if (!CoinParse.isSymbol(sym) || !SignalAlerts.add(sym, $("saSig").value, $("saIv").value, $("saHz").value)) { PersonalUI.toast(T("Cảnh báo không hợp lệ: cần mã coin hợp lệ."), "down"); return true; }
      setTimeout(SignalPoll.run, 0);
    } else return false;
    return true;
  }

  return { html, desc, tip, click, syncSelects };
})();
