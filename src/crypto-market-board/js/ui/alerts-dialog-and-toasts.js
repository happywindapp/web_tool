// 🔔 price + technical-signal alerts dialog (add / re-arm / delete, browser notifications) + in-page toasts when an alert fires.
const PersonalUI = (() => {
  const e = s => Dom.esc(s ?? "");
  let forSym = "";

  function toast(text, cls = "") {
    const box = $("toasts"), el = document.createElement("div");
    el.className = "toast " + cls; el.textContent = text;
    box.prepend(el);
    setTimeout(() => el.remove(), 12000);
    el.onclick = () => el.remove();
  }

  const ruleText = a => `${a.sym} ${T(AlertRule.TYPES[a.type])} ${a.type.startsWith("pct") ? Fmt.en(a.value, 2) + "%" : Fmt.money(a.value)}`;

  function notify(text, cls, title) {
    toast(text, cls);
    try { if ("Notification" in window && Notification.permission === "granted") new Notification(T(title), { body: text }); } catch { /* not allowed here */ }
  }
  const refresh = () => { if ($("toolDlg").open && $("toolDlg").dataset.kind === "alerts") render(); };

  function onHits(hits) {
    for (const h of hits) notify(T("🔔 {r} — giá hiện tại {p} ({c})", { r: ruleText(h), p: Fmt.money(h.price), c: Fmt.pct(h.pct) }), h.type === "below" || h.type === "pctDown" ? "down" : "up", "Cảnh báo giá crypto");
    refresh();
  }

  function onSignalHits(hits) {
    for (const h of hits) notify(T("🔔 {r} — giá hiện tại {p}", { r: SignalAlertsUI.desc(h), p: Fmt.money(h.price) }), SignalAlertRule.bearish(h) ? "down" : "up", "Cảnh báo tín hiệu kỹ thuật");
    refresh();
  }

  function render() {
    const dlg = $("toolDlg"), list = Alerts.all(), r = forSym ? Coins.row(forSym) : null;
    const canNotify = "Notification" in window, perm = canNotify ? Notification.permission : "denied";
    dlg.dataset.kind = "alerts";
    dlg.innerHTML = `<div class="dlg-head"><b>🔔 ${e(T("Cảnh báo giá"))}</b><button data-a="close">✕</button></div><div class="dlg-body">`
      + `<div class="posform"><label>${e(T("Coin"))}<input type="text" id="alSym" value="${e(forSym)}" placeholder="BTC" spellcheck="false" autocomplete="off"></label>`
      + `<label>${e(T("Điều kiện"))}<select id="alType">${Object.entries(AlertRule.TYPES).map(([k, l]) => `<option value="${k}">${e(T(l))}</option>`).join("")}</select></label>`
      + `<label>${e(T("Ngưỡng (USD hoặc %)"))}<input type="number" id="alVal" min="0" step="any" placeholder="${e(r && r.last ? String(+r.last.toPrecision(5)) : "")}"></label>`
      + `<button class="main" data-a="add">${e(T("Thêm cảnh báo"))}</button></div>`
      + (r && r.last ? `<p class="muted">${e(T("Giá {s} hiện tại: {p} ({c} trong 24h)", { s: r.sym, p: Fmt.money(r.last), c: Fmt.pct(r.pct) }))}</p>` : "")
      + (canNotify && perm === "default" ? `<p><button data-a="perm">${e(T("Cho phép thông báo của trình duyệt"))}</button></p>` : "")
      + (list.length ? `<table class="dtable"><tbody>${list.map(a => `<tr><td>${e(ruleText(a))}</td><td class="${a.fired ? "muted" : "good"}">${e(a.fired ? T("Đã kích hoạt {t}", { t: new Date(a.fired).toLocaleString(I18n.lang) }) : T("Đang theo dõi"))}</td>`
        + `<td>${a.fired ? `<button data-a="rearm" data-id="${e(a.id)}">${e(T("Bật lại"))}</button>` : ""} <button data-a="del" data-id="${e(a.id)}">🗑</button></td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">${e(T("Chưa có cảnh báo nào."))}</p>`)
      + `<p class="muted">${e(T("Cảnh báo kiểm tra theo giá realtime khi trang đang mở (tab ẩn: mỗi 60 giây); mỗi cảnh báo báo 1 lần rồi chờ bật lại. Lưu trong trình duyệt này."))}</p>` + SignalAlertsUI.html(forSym) + `</div>`;
  }

  function openAlerts(sym = "") {
    forSym = CoinParse.isSymbol(sym) ? sym : "";
    render();
    if (!$("toolDlg").open) $("toolDlg").showModal();
  }

  function onClick(ev) {
    const b = ev.target.closest("[data-a]"), dlg = $("toolDlg");
    if (!b || dlg.dataset.kind !== "alerts") return;
    const a = b.dataset.a;
    if (a === "close") dlg.close();
    const sym = $("saSym") ? CoinParse.norm($("saSym").value) : "";
    if (SignalAlertsUI.click(a, b.dataset.id)) { if (CoinParse.isSymbol(sym)) forSym = sym; render(); return; }
    if (a === "perm") Notification.requestPermission().then(render, render);
    if (a === "rearm") { Alerts.rearm(b.dataset.id); render(); }
    if (a === "del") { Alerts.remove(b.dataset.id); render(); }
    if (a === "add") {
      const sym = CoinParse.norm($("alSym").value), ok = CoinParse.isSymbol(sym) && Alerts.add(sym, $("alType").value, $("alVal").value);
      if (!ok) { toast(T("Cảnh báo không hợp lệ: cần mã coin và ngưỡng > 0."), "down"); return; }
      forSym = sym; render();
    }
  }

  function init() {
    $("alertsBtn").onclick = () => openAlerts(Board.state().sel);
    $("toolDlg").addEventListener("click", onClick);
    $("toolDlg").addEventListener("change", ev => { if (ev.target.id === "saSig") SignalAlertsUI.syncSelects(); });
    SignalPoll.start();
    $("toolDlg").addEventListener("click", ev => { if (ev.target === $("toolDlg")) $("toolDlg").close(); });
  }

  return { init, onHits, onSignalHits, openAlerts, toast };
})();
