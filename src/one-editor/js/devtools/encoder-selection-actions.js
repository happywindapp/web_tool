// Palette side of the 15a encoders: encode / decode each selection (whole tab when none) in one undo step, insert UUID v7 / ULID, describe a CIDR / chmod / id in the status bar, HMAC through a recipe step.
const EncActions = (() => {
  const FN = {
    b32enc: t => EncPlus.b32enc(RecipeOps.bytes(t)), b32dec: t => RecipeOps.text(EncPlus.b32dec(t)),
    b58enc: t => EncPlus.b58enc(RecipeOps.bytes(t)), b58dec: t => RecipeOps.text(EncPlus.b58dec(t)),
    a85enc: t => EncPlus.a85enc(RecipeOps.bytes(t)), a85dec: t => RecipeOps.text(EncPlus.a85dec(t)),
    z85enc: t => EncPlus.a85enc(RecipeOps.bytes(t), true), z85dec: t => RecipeOps.text(EncPlus.a85dec(t, true)),
  };
  const editable = () => {
    const v = Views.activeDoc() && Views.activeView();
    if (!v) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return null; }
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return null; }
    return v;
  };

  function map(id) {
    const v = editable();
    if (!v) return;
    const st = v.state, ranges = st.selection.ranges.filter(r => !r.empty), targets = ranges.length ? ranges : [{ from: 0, to: st.doc.length }];
    let changes;
    try { changes = targets.map(r => ({ from: r.from, to: r.to, insert: FN[id](st.sliceDoc(r.from, r.to)) })); }
    catch (e) { StatusBar.msg(e.message, "bad"); return; }
    v.dispatch({ changes, userEvent: "input.transform" });
    StatusBar.msg(T("✔ Đã đổi {n} vùng — Ctrl+Z để hoàn tác.", { n: targets.length }), "good");
  }

  function insert(kind) {
    const v = editable();
    if (!v) return;
    v.dispatch(v.state.changeByRange(r => { const s = EncPlus[kind](); return { changes: { from: r.from, to: r.to, insert: s }, range: CM.state.EditorSelection.cursor(r.from + s.length) }; }), { userEvent: "input", scrollIntoView: true });
    v.focus();
  }

  // The selection, else the line under the cursor → one status line (click = copy).
  function describe(kind) {
    const v = Views.activeDoc() && Views.activeView();
    if (!v) return;
    const st = v.state, r = st.selection.main, s = (r.empty ? st.doc.lineAt(r.head).text : st.sliceDoc(r.from, r.to)).trim();
    if (!s) { StatusBar.msg(T("Đặt con trỏ vào dòng có giá trị, hoặc bôi đen nó."), "warn"); return; }
    let out;
    try {
      if (kind === "cidr") out = EncPlus.cidrText(s);
      else if (kind === "chmod") { const c = EncPlus.chmod(s); out = c.octal + " ⇄ " + c.symbolic; }
      else { const id = EncPlus.idTime(s); if (!id) throw new Error(T("Không phải UUID v7 hay ULID.")); out = id.kind + " · " + DevNum.iso(id.ms) + " · " + DevNum.localIso(id.ms); }
    } catch (e) { StatusBar.msg(e.message, "bad"); return; }
    StatusBar.msg(out + " — " + T("bấm để chép"), "good", () => Dom.copy(out), T("Chép"));
  }

  // The tab's recipe gets an HMAC step (kept when it has one); the key is typed on the pane and stays in memory only.
  function hmac(doc) {
    const src = doc();
    if (!src) return;
    const list = RecipeOp.steps(src.id).map(s => ({ ...s, args: { ...s.args } }));
    if (!list.some(s => s.op === "hmac")) list.push(RecipeRun.step("hmac"));
    PowerUi.saveOpts(src.id, "recipe", list, RecipeRun.clean(list));
    OutputLink.run(src, "recipe").then(ok => ok && StatusBar.msg(T("Nhập khoá HMAC trên pane Recipe — khoá chỉ nằm trong bộ nhớ, không lưu, không đi theo link."), "warn"));
  }

  return { map, insert, describe, hmac, FN };
})();
