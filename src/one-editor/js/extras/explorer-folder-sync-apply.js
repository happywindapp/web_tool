// One-way folder sync from a finished compare (⇄ Đồng bộ ▾): preview (new copies · overwrites · ☐ delete what only the target has), every overwritten / deleted item copied into the recycle bin first, one undo step (new items ⇒ bin, overwritten / deleted ⇒ restored).
const DirSync = (() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const nameOf = p => String(p || "").split("/").pop();
  const relOf = s => { const it = s.row; return (it.dir ? it.dir + "/" : "") + (s.src || s.dst).name + ((s.src || s.dst).dir ? "/" : ""); };
  let busy = false;

  function section(title, steps, box) {
    const d = el("details", "sync-sec"), list = el("ul");
    d.open = steps.length <= 12;
    d.append(el("summary", "", title));
    list.append(...steps.slice(0, 200).map(s => el("li", "", relOf(s))));
    if (steps.length > 200) list.append(el("li", "sync-more", T("… và {n} mục nữa", { n: steps.length - 200 })));
    d.append(list);
    box.append(d);
    return d;
  }

  // → { del } or null when cancelled.
  function preview(ctl, dir, from, to) {
    const all = DirDiff.plan(ctl.items, dir, true), dlg = el("dialog", "name-ask sync-ask"), form = el("form"), lists = el("div", "sync-lists"), btns = el("div", "name-ask-btns");
    dlg.dataset.i18nSkip = "";
    form.method = "dialog";
    form.append(el("h3", "fs-title", T("Đồng bộ “{a}” → “{b}”", { a: nameOf(from), b: nameOf(to) })), el("p", "sync-path", from + " → " + to), lists);
    if (all.copy.length) section(T("Chép mới ({n})", { n: all.copy.length }), all.copy, lists);
    if (all.over.length) section(T("Ghi đè ({n})", { n: all.over.length }), all.over, lists);
    const del = el("input"), ok = el("button", "main", T("Đồng bộ")), cancel = el("button", "", T("Huỷ"));
    Object.assign(del, { type: "checkbox", name: "del" });
    if (all.del.length) {
      const l = el("label", "fs-check");
      l.append(del, el("span", "", T("Xoá {n} mục chỉ có ở “{b}” (vào thùng rác)", { n: all.del.length, b: nameOf(to) })));
      lists.append(l);
      section(T("Sẽ xoá nếu bật ô trên"), all.del, lists).open = false;
    }
    if (!all.copy.length && !all.over.length && !all.del.length) lists.append(el("p", "", T("Không có gì để đồng bộ — 2 folder đã giống nhau theo chiều này.")));
    form.append(el("p", "sync-note", T("File bị ghi đè / xoá được chép vào thùng rác trước. Ctrl+Z (ở Explorer / tab folder) hoàn tác cả lần đồng bộ.")), btns);
    const empty = () => !all.copy.length && !all.over.length && !(del.checked && all.del.length);
    ok.disabled = empty();
    del.onchange = () => { ok.disabled = empty(); };
    Object.assign(cancel, { type: "button", onclick: () => dlg.close("") });
    Object.assign(ok, { type: "submit", value: "ok" });
    btns.append(cancel, ok);
    dlg.append(form);
    document.body.append(dlg);
    dlg.showModal();
    (ok.disabled ? cancel : ok).focus();
    return new Promise(done => dlg.addEventListener("close", () => { const r = dlg.returnValue === "ok" ? { del: del.checked } : null; dlg.remove(); done(r); }, { once: true }));
  }

  async function write(src, h) {
    const w = await h.createWritable();
    await (await src.read()).file.stream().pipeTo(w);
  }

  // → { made: entries the undo sends to the bin, ids: bin records it restores, tags, bad, parents }.
  async function apply(p, onStep) {
    const parents = new Map(), made = [], ids = [], bad = [], gone = [], docs = [];
    const parent = dir => { if (!parents.has(dir.handle)) parents.set(dir.handle, { handle: dir.handle, path: dir.path }); return parents.get(dir.handle); };
    const out = [...p.over.map(s => s.dst), ...p.del.map(s => s.dst)];
    let kept = null, k = 0;
    if (out.length) {
      StatusBar.msg(T("Đang chép {n} mục sẽ bị ghi đè / xoá vào thùng rác…", { n: out.length }));
      try { kept = await TrashStore.put(out); }
      catch (e) { if (!confirm(T("Không giữ được các mục bị ghi đè / xoá trong thùng rác ({why}). Vẫn đồng bộ? Chúng sẽ không khôi phục được.", { why: e.message }))) return null; }
    }
    const binId = i => kept?.ids[i];
    const settle = async (i, ok) => { if (ok && binId(i)) ids.push(binId(i)); else if (!ok && binId(i)) await TrashStore.purge([binId(i)]).catch(() => {}); };
    const leave = async n => { if (!n.dir) docs.push(...await ExplorerDisk.openDocsOf(n.handle)); await LocalFs.remove(n); gone.push(n); parent(n.parent); };
    for (const [i, s] of p.over.entries()) {
      let left = false;
      try {
        // Without a bin copy the undo could not bring the old file back: it leaves the new one alone too.
        if (!s.src.dir && !s.dst.dir) { await write(s.src, s.dst.handle); if (binId(i)) made.push({ handle: s.dst.handle, parent: parent(s.dst.parent) }); }
        else { await leave(s.dst); left = true; made.push({ handle: await ExplorerOps.copyHandle(s.src.handle, s.dst.parent.handle, s.src.name), parent: parent(s.dst.parent) }); }
        await settle(i, true);
      } catch (e) { bad.push(relOf(s) + ": " + e.message); await settle(i, left); }
      onStep(++k);
    }
    for (const s of p.copy) {
      const dir = s.row.a === s.src ? s.row.pb : s.row.pa;
      try {
        if (await LocalFs.exists(dir.handle, s.src.name)) throw new Error(T("đã có ở đích"));
        made.push({ handle: await ExplorerOps.copyHandle(s.src.handle, dir.handle, s.src.name), parent: parent(dir) });
      } catch (e) { bad.push(relOf(s) + ": " + e.message); }
      onStep(++k);
    }
    for (const [j, s] of p.del.entries()) {
      const i = p.over.length + j;
      try { await leave(s.dst); await settle(i, true); } catch (e) { bad.push(relOf(s) + ": " + e.message); await settle(i, false); }
      onStep(++k);
    }
    // An open tab of a removed file keeps its text and becomes unsaved, as with Delete.
    docs.forEach(d => Docs.update(d, { handle: null, dirty: true, stale: false }, "dirty"));
    return { made, ids, bad, tags: Tags.removed(gone), parents: [...parents.values()] };
  }

  // Folders written to are read again before the compare runs again (a cached listing would show the old state).
  const reread = r => Promise.all(r.parents.map(x => ExplorerDisk.reloadHandle(x.handle)));

  async function run(ctl, dir) {
    const c = ctl.criteria, from = dir === "ab" ? c.a : c.b, to = dir === "ab" ? c.b : c.a;
    if (busy) { StatusBar.msg(T("Đang đồng bộ — chờ lần trước xong."), "warn"); return; }
    if (!ctl.complete) { StatusBar.msg(T("So sánh chưa xong (đã dừng, lỗi hoặc quá nhiều mục) — bấm ↻ chạy lại trước khi đồng bộ."), "warn"); return; }
    const [A, B] = await Promise.all([FolderPaths.resolve(c.a), FolderPaths.resolve(c.b)]);
    if (!ExplorerOps.writableNode(A) || !ExplorerOps.writableNode(B) || A.path !== c.a || B.path !== c.b) { StatusBar.msg(T("Đồng bộ chỉ làm được giữa 2 folder mở có quyền ghi (Chrome / Edge)."), "warn"); return; }
    const choice = await preview(ctl, dir, from, to);
    if (!choice) return;
    const p = DirDiff.plan(ctl.items, dir, choice.del), total = p.copy.length + p.over.length + p.del.length;
    busy = true;
    try {
      await LocalFs.writable((dir === "ab" ? B : A).handle);
      let done = 0;
      const tick = ScanWalk.ticker(() => StatusBar.msg(T("Đang đồng bộ {k} / {n}…", { k: done, n: total })));
      const r = await apply(p, k => { done = k; tick(); });
      if (!r) { StatusBar.msg(T("Chưa đồng bộ gì."), "warn"); return; }
      const label = T("Đồng bộ “{a}” → “{b}”", { a: nameOf(from), b: nameOf(to) });
      const step = r.made.length || r.ids.length ? ExplorerUndo.push(label, async () => {
        // Every step is tried (a new file already gone must not keep the old ones in the bin); the bin keeps this sync's copies while it fills.
        const back = r.made.map(m => ({ name: m.handle.name, dir: m.handle.kind === "directory", handle: m.handle, parent: m.parent }));
        const removed = !back.length || await ExplorerDisk.remove(back, { undoable: false, keep: r.ids });
        if (r.ids.length) await TrashStore.restoreIds(r.ids);
        Tags.restore(r.tags);
        await reread(r);
        ctl.rerun();
        if (!removed) throw ExplorerUndo.shown();
      }) : null;
      await reread(r);
      const msg = T("Đã đồng bộ “{a}” → “{b}”: chép mới {c} · ghi đè {o} · xoá {d}.", { a: nameOf(from), b: nameOf(to), c: p.copy.length, o: p.over.length, d: p.del.length });
      StatusBar.msg(msg + (r.bad.length ? " " + T("Lỗi: {list}", { list: r.bad.join(" · ") }) : "") + (step ? " " + T("Hoàn tác (Ctrl+Z)") : ""), r.bad.length ? "bad" : "good", step ? () => ExplorerUndo.undo(step) : null, step ? T("Bấm để hoàn tác") : "");
      ctl.rerun();
    } catch (e) { StatusBar.msg(T("Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad"); }
    finally { busy = false; }
  }

  function menu(ctl) {
    const c = ctl.criteria || {}, E = TabMenu.entry, head = el("div", "menu-head", T("Đồng bộ 1 chiều"));
    return [head, E(T("Trái → phải: “{a}” → “{b}”…", { a: nameOf(c.a), b: nameOf(c.b) }), "", () => run(ctl, "ab")), E(T("Phải → trái: “{b}” → “{a}”…", { a: nameOf(c.a), b: nameOf(c.b) }), "", () => run(ctl, "ba")),
      el("hr", "menu-sep"), FolderView.check(c.skip !== false, T("Bỏ .git / node_modules"), "", () => ctl.rerun({ ...c, skip: c.skip === false }))];
  }

  return { menu };
})();
