function showHistory() {
  const h = VersionHistory.list(store), label = { restore: T("Khôi phục"), del: T("Xoá") }, esc = Highlight.esc;
  $("hList").innerHTML = h.length ? h.map(v => `<li data-t="${v.t}"><b>${esc(new Date(v.t).toLocaleString(I18n.lang))}</b> · ${T("{n} dòng", { n: v.code.split("\n").length })}
      <button data-act="restore">${label.restore}</button> <button data-act="del">${label.del}</button><code>${esc(v.code.split("\n").find(l => l.trim() && !/^(---|%%)/.test(l.trim())) || "")}</code></li>`).join("")
    : `<li class="muted">${T("Chưa có phiên bản nào (hoặc trình duyệt chặn lưu trữ).")}</li>`;
  if (!$("hist").open) $("hist").showModal();
}

function bindHistoryDialog() {
  $("btnHist").onclick = showHistory;
  $("hClose").onclick = () => $("hist").close();
  $("hSave").onclick = () => { flash(VersionHistory.add(store, $("src").value, $("cfg").value, true) ? T("Đã lưu phiên bản.") : T("Không lưu: bản này trùng bản mới nhất, rỗng hoặc trình duyệt chặn lưu trữ.")); showHistory(); };
  $("hClear").onclick = () => { if (confirm(T("Xoá toàn bộ lịch sử phiên bản?"))) { VersionHistory.clear(store); showHistory(); } };
  $("hList").onclick = e => {
    const b = e.target.closest("button"), t = +e.target.closest("li")?.dataset.t, v = VersionHistory.list(store).find(x => x.t === t);
    if (!b || !v) return;
    if (b.dataset.act === "del") { VersionHistory.remove(store, t); return showHistory(); }
    setState({ code: v.code, config: v.config }, "");
    $("hist").close(); flash(T("Đã khôi phục bản {at} (bản đang sửa trước đó đã được lưu vào lịch sử).", { at: new Date(v.t).toLocaleString(I18n.lang) }));
  };
}
