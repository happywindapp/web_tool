// Changes made on disk by other apps: size + lastModified vs what the tab last read / wrote; a clean tab reloads, an edited tab gets ⚠ and a choice. Runs on 🔄, window focus and FileSystemObserver events.
const DiskSync = (() => {
  const MAX_AUTO = 50 * 1024 * 1024, TIP = "Xử lý file đổi trên đĩa";
  let busy = false, queued = null, treeWanted = false, obs = null;
  const stamp = f => ({ size: f.size, mod: f.lastModified });
  const same = (a, b) => a.size === b.size && a.mod === b.mod;
  const names = list => list.map(d => "“" + d.name + "”").join(", ");
  const tooBig = (doc, f) => !doc.hex && f.size > MAX_AUTO;
  const watched = d => d.kind === "file" && d.handle && !d.stale && !d.reloading && !d.saving && !d.big && !Tail.on(d.id);
  const readOf = (doc, f) => doc.hex ? HexDump.ofFile(f).then(text => ({ text })) : LocalFs.readText(f, doc.enc && doc.enc !== "utf-8" ? doc.enc : undefined);
  const show = doc => { const gi = Views.where(doc.id) >= 0 ? Views.where(doc.id) : Views.focused; Views.open(doc, gi); return gi; };

  async function mark(doc) {
    try { doc.disk = stamp(await doc.handle.getFile()); } catch { doc.disk = null; }
    if (doc.diskChanged) Docs.update(doc, { diskChanged: false }, "dirty");
  }

  // Through Views.replaceText: cursor mapping and clones keep working; one undo step of its own brings the old text back.
  // auto: typing during the read wins — false is returned and the caller flags the tab instead.
  async function reload(doc, f, auto = false) {
    const r = await readOf(doc, f);
    if (!Docs.get(doc.id) || (auto && doc.dirty)) return false;
    if (r.text !== Docs.text(doc)) Views.replaceText(doc, r.text, CM.commands.isolateHistory.of("full"));
    if (!doc.hex) {
      Object.assign(doc, { eol: r.eol, eolMixed: r.eolMixed, eolList: r.eolList, bom: r.bom });
      if (r.eolMixed && doc.state) Views.applyEffect(doc, MixedEol.effect(doc.state.doc, r.eolList));
    }
    Docs.update(doc, { file: f, disk: stamp(f), diskChanged: false, dirty: false }, "dirty");
    if (Tail.on(doc.id)) Tail.sync(doc);
    return true;
  }

  function flag(doc) {
    if (doc.diskChanged) return "conflict";
    Docs.update(doc, { diskChanged: true }, "dirty");
    return "fresh";
  }

  // → same | reloaded | conflict (already flagged) | fresh (newly flagged) | big | gone | skip (no permission…)
  async function check(doc) {
    let f;
    try { f = await doc.handle.getFile(); }
    catch (e) {
      if (e.name !== "NotFoundError") return "skip";
      Docs.update(doc, { handle: null, dirty: true, disk: null, diskChanged: false }, "dirty");
      return "gone";
    }
    if (doc.disk && same(doc.disk, stamp(f))) return "same";
    // No baseline (older session): a clean tab is compared by text, an edited one cannot be told apart.
    if (!doc.disk && doc.dirty) { doc.disk = stamp(f); return "same"; }
    if (doc.dirty) return flag(doc);
    if (tooBig(doc, f)) { doc.disk = stamp(f); return "big"; }
    const before = Docs.text(doc);
    if (!await reload(doc, f, true)) return Docs.get(doc.id) ? flag(doc) : "skip";
    return Docs.text(doc) === before ? "same" : "reloaded";
  }

  function report(o, quiet, treeErr) {
    const conflicts = quiet ? o.fresh : [...o.fresh, ...o.conflict];
    const grant = async () => { for (const d of o.perm) await FileOpen.reload(d, true); };
    if (conflicts.length) StatusBar.msg(T("⚠ {names} đã bị sửa bên ngoài trong khi tab có thay đổi chưa lưu — bấm để chọn: đọc lại / giữ bản của bạn / so sánh.", { names: names(conflicts) }), "warn", () => resolve(conflicts[0]), T(TIP));
    else if (o.gone.length) StatusBar.msg(T("{names} không còn trên đĩa (bị xoá / đổi tên) — tab vẫn giữ nội dung, dùng “Lưu thành…” nếu cần.", { names: names(o.gone) }), "warn");
    else if (o.perm.length) StatusBar.msg(T("{names} cần bạn cho phép đọc lại từ đĩa — bấm vào đây.", { names: names(o.perm) }), "warn", grant, T("Bấm để đọc lại file"));
    else if (o.big.length) StatusBar.msg(T("{names} đổi trên đĩa và lớn hơn 50 MB — mở lại file để xem theo đoạn.", { names: names(o.big) }), "warn");
    else if (treeErr && !quiet) StatusBar.msg(T("Không làm mới được folder: {msg}", { msg: treeErr.message }), "bad");
    else if (o.skip.length && !quiet) StatusBar.msg(T("Không kiểm được {names} (chưa được cấp quyền hoặc lỗi đọc).", { names: names(o.skip) }), "warn");
    else if (o.reloaded.length) StatusBar.msg(T("🔄 Đã đọc lại từ đĩa: {names}.", { names: names(o.reloaded) }), "good");
    else if (!quiet) StatusBar.msg(T("🔄 Đã làm mới — folder và các tab file khớp với đĩa."), "good");
  }

  // 🔄 (quiet = false): every file tab incl. ones not read again since F5 + the open folders. Focus: tabs only; observer: tabs + folders.
  async function checkAll(quiet = false, tree = !quiet) {
    if (busy) { queued = queued ? { quiet: queued.quiet && quiet, tree: queued.tree || tree } : { quiet, tree }; return; }
    busy = true;
    const out = { reloaded: [], conflict: [], fresh: [], gone: [], big: [], skip: [], perm: [] };
    let treeErr = null;
    try {
      if (!quiet) for (const d of Docs.list().filter(d => d.kind === "file" && d.handle && d.stale)) { await FileOpen.reload(d, true); if (d.stale && Docs.get(d.id)) out.perm.push(d); }
      for (const d of Docs.list().filter(watched)) { const s = await check(d).catch(() => "skip"); if (out[s]) out[s].push(d); }
      if (tree) await Explorer.refresh().catch(e => { treeErr = e; });
    } finally { busy = false; }
    report(out, quiet, treeErr);
    if (queued) { const q = queued; queued = null; checkAll(q.quiet, q.tree); }
  }

  async function withFile(doc, fn) {
    try { await fn(await doc.handle.getFile()); }
    catch (e) { StatusBar.msg(T("Không đọc được “{name}” từ đĩa: {msg}", { name: doc.name, msg: e.message }), "bad"); }
  }

  const take = doc => withFile(doc, async f => {
    if (tooBig(doc, f)) { StatusBar.msg(T("{names} đổi trên đĩa và lớn hơn 50 MB — mở lại file để xem theo đoạn.", { names: names([doc]) }), "warn"); return; }
    show(doc);
    if (await reload(doc, f)) StatusBar.msg(T("Đã đọc lại “{name}” từ đĩa — Ctrl+Z để lấy lại bản của bạn.", { name: doc.name }), "good");
  });
  const keep = doc => withFile(doc, async f => {
    Docs.update(doc, { disk: stamp(f), diskChanged: false }, "dirty");
    StatusBar.msg(T("Giữ bản của bạn — Lưu (Ctrl+S) sẽ ghi đè “{name}” trên đĩa.", { name: doc.name }), "good");
  });
  // The disk copy opens read-only in the other view, then Compare (copy blocks with the arrows, then save).
  const compare = doc => withFile(doc, async f => {
    if (tooBig(doc, f)) { StatusBar.msg(T("{names} đổi trên đĩa và lớn hơn 50 MB — mở lại file để xem theo đoạn.", { names: names([doc]) }), "warn"); return; }
    const r = await readOf(doc, f), gi = show(doc);
    if (Views.count < 2) Views.setLayout("2c");
    Views.open(Docs.create({ kind: "temp", name: doc.name + " ⇠ " + T("trên đĩa"), text: r.text, readOnly: true }), Views.other(gi));
    Views.focus(gi);
    Compare.start(gi);
  });

  function resolve(doc) {
    if (!Docs.get(doc.id) || !doc.handle) return;
    QuickPick.pick([
      { label: T("⟲ Đọc lại từ đĩa — bỏ thay đổi của tôi (Ctrl+Z vẫn lấy lại được)"), detail: "", run: () => take(doc) },
      { label: T("✎ Giữ bản của tôi — lần Lưu tới ghi đè bản trên đĩa"), detail: "", run: () => keep(doc) },
      { label: T("⇄ So sánh bản của tôi với bản trên đĩa (2 view)"), detail: "", run: () => compare(doc) },
    ], T("“{name}” — chọn cách xử lý với bản trên đĩa", { name: doc.name }));
  }

  // Tab menu / palette on one tab: edited ⇒ the choice; clean ⇒ check now.
  async function one(doc) {
    doc = Docs.root(doc);
    if (doc.kind !== "file" || !doc.handle || doc.big) { StatusBar.msg(T("Chỉ tab file mở bằng Mở file / Explorer (Chrome / Edge) mới đọc lại từ đĩa được."), "warn"); return; }
    if (doc.stale) { FileOpen.reload(doc, true); return; }
    if (doc.dirty || doc.diskChanged) { resolve(doc); return; }
    const s = await check(doc).catch(() => "skip");
    if (s === "same") StatusBar.msg(T("“{name}” khớp với bản trên đĩa.", { name: doc.name }), "good");
    else report({ reloaded: [], conflict: [], fresh: [], gone: [], big: [], skip: [], perm: [], [s]: [doc] }, false, null);
  }

  // Save guard: the file changed since the tab last read / wrote it ⇒ ask before overwriting.
  async function guard(doc) {
    let f;
    try { f = await doc.handle.getFile(); } catch { return true; }
    if (!doc.disk || same(doc.disk, stamp(f))) return true;
    if (confirm(T("“{name}” đã bị sửa bên ngoài sau lần mở / lưu gần nhất. Ghi đè bản trên đĩa bằng bản của bạn?", { name: doc.name }))) return true;
    StatusBar.msg(T("Chưa lưu “{name}” — bấm để chọn: đọc lại / giữ bản của bạn / so sánh.", { name: doc.name }), "warn", () => resolve(doc), T(TIP));
    return false;
  }

  // saving: the focus check that a permission prompt or confirm() triggers skips the tab mid-write.
  async function write(doc, data) {
    doc.saving = true;
    try { await LocalFs.writeHandle(doc.handle, data); await mark(doc); }
    finally { doc.saving = false; }
  }

  const soon = Dom.debounce(() => { const tree = treeWanted; treeWanted = false; checkAll(true, tree); }, 300);

  // FileSystemObserver (newer Chromium): any change under the folder or an open file runs the quiet check.
  async function watch() {
    if (typeof FileSystemObserver !== "function") return;
    try {
      obs?.disconnect();
      obs = new FileSystemObserver(() => { treeWanted = true; soon(); });
      const root = Explorer.root(), handles = Docs.list().filter(d => d.kind === "file" && d.handle).map(d => d.handle);
      if (root?.handle) handles.unshift(root.handle);
      await Promise.all(handles.map(h => obs.observe(h, h.kind === "directory" ? { recursive: true } : {}).catch(() => { /* not allowed: focus still checks */ })));
    } catch { obs = null; }
  }
  const rewatch = Dom.debounce(watch, 500);

  function init() {
    addEventListener("focus", () => soon());
    document.addEventListener("visibilitychange", () => { if (!document.hidden) soon(); });
    Docs.on(type => { if (type === "create" || type === "remove" || type === "meta") rewatch(); });
  }

  return { init, stamp, mark, guard, write, checkAll, one, resolve, rewatch };
})();
