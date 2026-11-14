// Personal tools: 🔔 price alerts dialog + firing, 📅 watchlist event calendar, notes / own target block in the "Định giá" tab.
const PersonalUI = (() => {
  const TYPES = [["above", "Giá ≥"], ["below", "Giá ≤"], ["pctUp", "Tăng ≥ (%)"], ["pctDown", "Giảm ≥ (%)"]];
  const CAL_MAX = 40;
  const e = s => Dom.esc(s ?? "");
  const dlg = () => $("toolDlg");
  const typeLabel = t => T((TYPES.find(x => x[0] === t) || ["", t])[1]);
  const dmy = s => /^\d{4}-\d{2}-\d{2}/.test(s || "") ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "";
  const canNotify = () => "Notification" in globalThis;
  const head = title => `<div class="dlg-head"><b>${e(title)}</b><button data-x="close" title="${e(T("Đóng (Esc)"))}">✕</button></div>`;

  function alertsHtml(sym) {
    const day = QuoteModel.vnDate(), list = Alerts.all();
    const perm = canNotify() && Notification.permission !== "granted"
      ? `<button data-x="perm">${e(T("Bật thông báo trình duyệt"))}</button>` : "";
    const fired = a => a.fired === day ? T("Đã báo hôm nay") : T("Đang chờ");
    const rows = list.map(a => `<tr><td><b>${e(a.sym)}</b></td><td>${e(typeLabel(a.type))} ${Fmt.en(a.value, 2)}</td>`
      + `<td class="${a.fired === day ? "up" : "muted"}">${e(fired(a))}</td><td><button data-x="del" data-id="${e(a.id)}" title="${e(T("Xoá"))}">✕</button></td></tr>`).join("");
    return head("🔔 " + T("Cảnh báo giá"))
      + `<div class="cbar"><input type="text" id="alSym" value="${e(sym)}" placeholder="${e(T("Mã"))}" spellcheck="false" autocomplete="off">`
      + `<select id="alType">${TYPES.map(([k, l]) => `<option value="${k}">${e(T(l))}</option>`).join("")}</select>`
      + `<input type="number" id="alVal" step="any" placeholder="${e(T("Giá trị"))}"><button class="main" data-x="add">${e(T("Thêm"))}</button>${perm}</div>`
      + `<p class="muted pad">${e(T("Giá tính bằng nghìn đồng. Chỉ báo khi trang này đang mở; mỗi cảnh báo báo tối đa 1 lần mỗi ngày; lưu trong trình duyệt này."))}</p>`
      + (rows ? `<table class="dtable"><tbody>${rows}</tbody></table>` : `<p class="muted pad">${e(T("Chưa có cảnh báo nào."))}</p>`);
  }

  function openAlerts(sym = "") {
    dlg().dataset.kind = "alerts";
    dlg().innerHTML = alertsHtml(sym);
    if (!dlg().open) dlg().showModal();
    $("alVal").focus();
  }

  // Re-render the open alerts dialog, keeping the half-filled form.
  function refreshAlerts() {
    const v = { s: $("alSym")?.value || "", t: $("alType")?.value, n: $("alVal")?.value || "" };
    openAlerts(v.s);
    if (v.t) $("alType").value = v.t;
    $("alVal").value = v.n;
  }

  // Unsaved note text / target of the ticker on screen (null when the block belongs to another ticker).
  const noteDraft = sym => { const box = document.querySelector(".notes[data-sym]"); return box && box.dataset.sym === sym ? { t: $("noteText").value, g: $("noteTarget").value } : null; };
  const restoreDraft = d => { if (d && $("noteText")) { $("noteText").value = d.t; $("noteTarget").value = d.g; } };

  async function openCalendar() {
    const syms = Watch.all().slice(0, CAL_MAX), my = (openCalendar.seq = (openCalendar.seq || 0) + 1);
    dlg().dataset.kind = "calendar";
    dlg().innerHTML = head("📅 " + T("Lịch sự kiện danh mục")) + `<p class="muted pad">${e(T("Đang tải sự kiện của {n} mã…", { n: syms.length }))}</p>`;
    if (!dlg().open) dlg().showModal();
    const today = new Date(Date.now() + 7 * 3600e3 - 3 * 86400e3).toISOString().slice(0, 10), rows = [];
    let next = 0;
    const worker = async () => {
      while (next < syms.length) {
        const s = syms[next++];
        try { for (const x of await Finfo.events(s, I18n.lang)) if ((x.effectiveDate || "") >= today) rows.push({ ...x, sym: s }); }
        catch (err) { console.warn("PersonalUI.openCalendar - get events fail", s, err); }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    if (my !== openCalendar.seq || dlg().dataset.kind !== "calendar") return;
    rows.sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
    dlg().innerHTML = head("📅 " + T("Lịch sự kiện danh mục"))
      + `<p class="muted pad">${e(T("Sự kiện có ngày GDKHQ / hiệu lực từ 3 ngày trước trở đi của các mã trong ★ Danh mục (tối đa {n} mã).", { n: CAL_MAX }))}</p>`
      + (rows.length ? `<table class="dtable"><thead><tr><th>${e(T("GDKHQ"))}</th><th>${e(T("Mã"))}</th><th>${e(T("Sự kiện"))}</th><th>${e(T("Thực hiện"))}</th></tr></thead><tbody>`
        + rows.map(x => `<tr data-sym="${e(x.sym)}"><td>${dmy(x.effectiveDate)}</td><td><b>${e(x.sym)}</b></td><td>${e(x.typeDesc)}${x.note ? `<div class="muted">${e(x.note)}</div>` : ""}</td><td>${dmy(x.actualDate)}</td></tr>`).join("")
        + `</tbody></table>` : `<p class="muted pad">${e(T("Không có sự kiện sắp tới."))}</p>`);
  }

  // Fired alerts → status line + browser notification when allowed.
  function onHits(hits, quotes) {
    for (const a of hits) {
      const q = quotes.get(a.sym), msg = T("🔔 {s}: {c} {v} — giá {p} ({pct})", { s: a.sym, c: typeLabel(a.type), v: Fmt.en(a.value, 2), p: Fmt.price(q.last), pct: Fmt.pct(q, q.pct) });
      Controls.say("warn", msg);
      if (canNotify() && Notification.permission === "granted") { try { new Notification(T("Cảnh báo giá"), { body: msg, tag: a.id }); } catch { /* some mobile browsers only allow service-worker notifications */ } }
    }
    if (hits.length && dlg().open && dlg().dataset.kind === "alerts") refreshAlerts();
  }

  function notesHtml(sym, price) {
    const n = Notes.get(sym), up = AlertRule.upside(n.target, price);
    return `<div class="dsec"><b>${e(T("Ghi chú & giá mục tiêu của bạn"))}</b></div><div class="notes pad" data-sym="${e(sym)}">`
      + `<label>${e(T("Giá mục tiêu (nghìn đồng)"))} <input type="number" step="any" id="noteTarget" value="${n.target ?? ""}"></label>`
      + (up != null ? ` <b class="${up > 0 ? "up" : "down"}">${Fmt.signed(up, 1)}%</b>` : "")
      + `<textarea id="noteText" rows="3" maxlength="2000" placeholder="${e(T("Luận điểm đầu tư, điều kiện mua/bán… (lưu trong trình duyệt này)"))}">${e(n.text)}</textarea>`
      + `<button data-act="saveNote">${e(T("Lưu ghi chú"))}</button></div>`;
  }

  function init() {
    $("alertsBtn").onclick = () => openAlerts(Board.state().sel);
    $("calBtn").onclick = openCalendar;
    dlg().addEventListener("click", ev => {
      const b = ev.target.closest("button[data-x]"), tr = ev.target.closest("tr[data-sym]");
      if (!b) { if (tr && dlg().dataset.kind === "calendar") { dlg().close(); Board.select(tr.dataset.sym, true); } return; }
      const x = b.dataset.x;
      if (x === "close") dlg().close();
      if (x === "perm") Notification.requestPermission().then(refreshAlerts);
      if (x === "del") { Alerts.remove(b.dataset.id); refreshAlerts(); }
      if (x === "add") {
        const sym = String($("alSym").value || "").trim().toUpperCase(), v = parseFloat($("alVal").value);
        if (!Alerts.add(sym, $("alType").value, v)) { Controls.say("bad", "Nhập mã đang niêm yết (không dùng chỉ số) và giá trị số cho cảnh báo."); return; }
        openAlerts(sym);
      }
    });
    const label = () => { const n = Alerts.all().length; $("alertsBtn").textContent = "🔔 " + T("Cảnh báo") + (n ? ` (${n})` : ""); };
    Alerts.onChange(label);
    I18n.onChange(label);
    label();
  }

  return { init, openAlerts, openCalendar, onHits, notesHtml, noteDraft, restoreDraft };
})();
