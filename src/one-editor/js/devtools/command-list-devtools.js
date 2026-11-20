// Phase 8c dev text tools in the Palette: JWT / URL to the other view, JSON escape, UUID, epoch ⇄ date, number bases, hover conversions, local history.
const DevActions = (() => {
  const editable = () => {
    const v = Views.activeDoc() && Views.activeView();
    if (v && v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return null; }
    return v;
  };

  // A value at every cursor (each UUID is new); the selection is replaced.
  function insert(make) {
    const v = editable();
    if (!v) return;
    v.dispatch(v.state.changeByRange(r => { const s = make(); return { changes: { from: r.from, to: r.to, insert: s }, range: CM.state.EditorSelection.cursor(r.from + s.length) }; }), { userEvent: "input", scrollIntoView: true });
    v.focus();
  }

  // fn on each selection; an empty selection takes the number / date under the cursor.
  function map(fn) {
    const v = editable();
    if (!v) return;
    const st = v.state, targets = st.selection.ranges.map(r => {
      if (!r.empty) return r;
      const line = st.doc.lineAt(r.head), m = NumHover.tokenAt(line.text, r.head - line.from);
      return m ? { from: line.from + m.index, to: line.from + m.index + m[0].length } : null;
    }).filter(Boolean);
    if (!targets.length) { StatusBar.msg(T("Đặt con trỏ vào một số / ngày giờ, hoặc bôi đen phần cần đổi."), "warn"); return; }
    let changes;
    try { changes = targets.map(r => ({ from: r.from, to: r.to, insert: fn(st.sliceDoc(r.from, r.to)) })); }
    catch (e) { StatusBar.msg(e.message, "bad"); return; }
    v.dispatch({ changes, userEvent: "input.transform" });
    StatusBar.msg(T("✔ Đã đổi {n} chỗ — Ctrl+Z để hoàn tác.", { n: changes.length }), "good");
  }

  function setHover(on) {
    CmSetup.settings.numHover = !!on;
    Prefs.set("numhover", !!on);
    Views.applySettings();
    StatusBar.msg(on ? T("Tooltip quy đổi số / timestamp: bật.") : T("Tooltip quy đổi số / timestamp: tắt."));
  }

  return { insert, map, setHover };
})();

function registerDevtoolCommands(C, doc, hasDoc) {
  const A = DevActions, N = Math.floor;
  C("jwt", "JWT: giải mã ở view kia (không kiểm chữ ký)", null, () => OutputLink.run(doc(), "jwt"), hasDoc);
  C("urlParts", "URL: tách thành phần + bảng tham số query ở view kia", null, () => OutputLink.run(doc(), "url-parts"), hasDoc);
  C("text-jsonEsc", "Chuỗi: JSON escape (vùng chọn hoặc cả tab)", null, () => NppActions.text("jsonEsc"), hasDoc);
  C("text-jsonUnesc", "Chuỗi: JSON unescape (vùng chọn hoặc cả tab)", null, () => NppActions.text("jsonUnesc"), hasDoc);
  C("uuid", "Chèn UUID v4 (mỗi con trỏ 1 UUID)", null, () => A.insert(DevNum.uuid), hasDoc);
  C("epochNowS", "Chèn epoch hiện tại (giây)", null, () => A.insert(() => String(N(Date.now() / 1000))), hasDoc);
  C("epochNowMs", "Chèn epoch hiện tại (mili giây)", null, () => A.insert(() => String(Date.now())), hasDoc);
  C("isoNow", "Chèn ngày giờ hiện tại (ISO, UTC)", null, () => A.insert(() => DevNum.iso(Date.now())), hasDoc);
  C("epochUtc", "Epoch ⇄ ngày giờ ISO (UTC) ở con trỏ / vùng chọn", null, () => A.map(t => DevNum.toggleEpoch(t, true)), hasDoc);
  C("epochLocal", "Epoch ⇄ ngày giờ ISO (giờ máy) ở con trỏ / vùng chọn", null, () => A.map(t => DevNum.toggleEpoch(t, false)), hasDoc);
  for (const [b, label] of [["hex", "Số: đổi sang hex (0x…)"], ["dec", "Số: đổi sang thập phân"], ["bin", "Số: đổi sang nhị phân (0b…)"]])
    C("base-" + b, label, null, () => A.map(t => DevNum.convertBase(t, b)), hasDoc);
  C("numHover", "Bật / tắt tooltip quy đổi số / timestamp khi rê chuột", null, () => A.setHover(!CmSetup.settings.numHover));
  // Local history lives in the editor extras bundle (loaded after the editor is ready).
  const H = name => () => EditorExtras.use(() => LocalHistory[name]());
  C("history", "Lịch sử cục bộ: so sánh / khôi phục bản đã lưu…", null, H("pick"), hasDoc);
  C("historySnap", "Lịch sử cục bộ: chụp bản ngay", null, H("snapNow"), hasDoc);
  C("historyRestore", "Lịch sử cục bộ: khôi phục bản đang so sánh vào tab gốc", null, H("restore"), () => typeof LocalHistory !== "undefined" && !!LocalHistory.viewing());
  C("historyClear", "Lịch sử cục bộ: xoá lịch sử của tab", null, H("clear"), hasDoc);
}
