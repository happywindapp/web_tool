// Explorer "Cắt file…" (by lines — never inside a line — or by KB / MB → name.ext.001…) and "Gộp file…" (natural order, reorder, optional newline between files; a ".001" gathers its parts): streamed 8 MB at a time, progress + Stop in the dialog, the new files are one undo step (Ctrl+Z ⇒ recycle bin).
const SplitJoin = (() => {
  const CHUNK = 8 << 20, { mk, button } = PowerUi;
  const fmt = n => I18n.num(n) + " B";
  const size = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : n >= 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B");
  const prefs = () => Prefs.get("splitJoin", {});
  const savePrefs = v => Prefs.set("splitJoin", { ...prefs(), ...v });

  // Dialog frame: title, body, progress line, Cancel / ■ Stop + the main button; go(ui) runs the job, close when it resolves true.
  function dialog(title, body, okLabel, go) {
    const dlg = mk("dialog", "sj-dlg"), form = mk("form", "", null, { method: "dialog" }), bar = mk("progress", "sj-bar", null, { max: 1, value: 0 }), note = mk("div", "sj-note");
    const cancel = button(T("Huỷ"), () => (ui.busy ? (ui.stopped = true) : dlg.close())), ok = Object.assign(button(okLabel, null), { type: "submit", className: "main" });
    const ui = { busy: false, stopped: false, bar, note, dlg,
      progress(done, total, text) { bar.hidden = false; bar.value = total ? done / total : 0; note.className = "sj-note"; note.textContent = text; } };
    bar.hidden = true;
    dlg.dataset.i18nSkip = "";
    const row = mk("div", "name-ask-btns");
    row.append(cancel, ok);
    form.append(mk("h3", "sj-title", title), ...body, bar, note, row);
    dlg.append(form);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (ui.busy) return;
      Object.assign(ui, { busy: true, stopped: false });
      ok.disabled = true;
      cancel.textContent = T("■ Dừng");
      let done = false;
      try { done = await go(ui); }
      catch (err) { note.className = "sj-note " + (err.stopped ? "warn" : "bad"); note.textContent = err.message; StatusBar.msg(err.message, err.stopped ? "warn" : "bad"); }
      Object.assign(ui, { busy: false });
      ok.disabled = false;
      cancel.textContent = T("Đóng");
      if (done) dlg.close();
    });
    dlg.addEventListener("cancel", e => { if (ui.busy) { e.preventDefault(); ui.stopped = true; } });
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    return ui;
  }
  const stoppedError = () => Object.assign(new Error(T("Đã dừng — đã xoá các file đang ghi dở.")), { stopped: true });

  // Files written so far; on a stop / error they are removed again (a half part is worse than none).
  function writer(dir) {
    const made = [];
    let w = null;
    return {
      made,
      async open(name) {
        if (await LocalFs.exists(dir, name)) throw new Error(T("Đã có “{name}” trong folder — đổi tên / xoá trước rồi chạy lại.", { name }));
        const h = await dir.getFileHandle(name, { create: true });
        made.push(h);
        w = await h.createWritable();
      },
      write: data => w.write(data),
      async close() { if (w) { const x = w; w = null; await x.close(); } },
      async drop() { if (w) await w.abort().catch(() => {}); w = null; for (const h of made) await dir.removeEntry(h.name).catch(() => {}); },
    };
  }

  async function finish(node, out, label, msg) {
    ExplorerDisk.reload(node.parent);
    ExplorerUndo.created(label, out.made.map(h => ({ handle: h, parent: node.parent.handle, path: node.parent.path })));
    StatusBar.msg(msg + " " + T("Ctrl+Z trong Explorer ⇒ chuyển vào thùng rác."), "good");
    return true;
  }

  function split(node) {
    const p = prefs(), byLines = mk("input", "", null, { type: "radio", name: "sj-mode", checked: p.mode !== "size" }), bySize = mk("input", "", null, { type: "radio", name: "sj-mode", checked: p.mode === "size" });
    const lines = mk("input", "sj-num", null, { type: "number", min: 1, step: 1, value: p.lines || 1000 }), amount = mk("input", "sj-num", null, { type: "text", inputMode: "decimal", value: p.amount || "10" });
    const unit = mk("select");
    unit.append(new Option("KB", "KB"), new Option("MB", "MB"));
    unit.value = p.unit === "KB" ? "KB" : "MB";
    const plan = mk("div", "sj-plan");
    let fileSize = null;
    const r1 = mk("label", "sj-opt"), r2 = mk("label", "sj-opt");
    r1.append(byLines, T("Theo số dòng:") + " ", lines, " " + T("dòng / phần (không cắt giữa dòng)"));
    r2.append(bySize, T("Theo dung lượng:") + " ", amount, unit, " " + T("/ phần"));
    function preview() {
      if (fileSize == null) return;
      if (byLines.checked) { plan.textContent = T("→ {a}, {b}… (số phần biết sau khi đọc file)", { a: FileSplit.partName(node.name, 0, 1), b: FileSplit.partName(node.name, 1, 2) }); return; }
      const b = FileSplit.bytesOf(amount.value, unit.value), n = FileSplit.count(fileSize, b);
      plan.textContent = !b ? T("Nhập dung lượng mỗi phần (> 0).") : n > FileSplit.MAX_PARTS ? T("Quá {max} phần — tăng dung lượng mỗi phần.", { max: I18n.num(FileSplit.MAX_PARTS) })
        : T("→ {n} phần: {a} … {b}", { n: I18n.num(n), a: FileSplit.partName(node.name, 0, n), b: FileSplit.partName(node.name, n - 1, n) });
    }
    for (const x of [byLines, bySize, lines, amount, unit]) x.addEventListener("input", preview);
    node.read().then(({ file }) => { fileSize = file.size; preview(); }, () => {});
    dialog(T("Cắt file “{name}”", { name: node.name }), [r1, r2, plan], T("Cắt ra các phần"), async ui => {
      const { file } = await node.read(), dir = node.parent.handle, mode = byLines.checked ? "lines" : "size";
      const nLines = Math.floor(+lines.value), bytes = FileSplit.bytesOf(amount.value, unit.value);
      if (mode === "lines" ? !(nLines >= 1) : !bytes || FileSplit.count(file.size, bytes) > FileSplit.MAX_PARTS) { plan.textContent = T("Số không hợp lệ."); return false; }
      savePrefs({ mode, lines: nLines, amount: amount.value, unit: unit.value });
      await LocalFs.writable(dir);
      const out = writer(dir);
      let part = 0, last = 0;
      const tick = (done, force) => { if (force || Date.now() - last > 120) { last = Date.now(); ui.progress(done, file.size, T("Đang cắt: phần {k} · {done} / {total}", { k: part, done: size(done), total: size(file.size) })); } };
      try {
        if (mode === "size") {
          const plan = FileSplit.bySize(file.size, bytes);
          for (const [i, r] of plan.entries()) {
            await out.open(FileSplit.partName(node.name, i, plan.length)); part = i + 1;
            for (let s = r.start; s < r.end; s += CHUNK) { if (ui.stopped) throw stoppedError(); await out.write(file.slice(s, Math.min(r.end, s + CHUNK))); tick(Math.min(r.end, s + CHUNK)); }
            await out.close();
          }
        } else {
          // Width of the numbers is unknown up front: 3 digits, like Total Commander (> 999 parts ⇒ more digits from there on).
          const cut = FileSplit.lineCutter(nLines);
          let start = 0;
          await out.open(FileSplit.partName(node.name, 0, 1)); part = 1;
          for (let s = 0; s < file.size; s += CHUNK) {
            if (ui.stopped) throw stoppedError();
            const end = Math.min(file.size, s + CHUNK);
            for (const c of cut.feed(new Uint8Array(await file.slice(s, end).arrayBuffer()))) {
              if (c >= file.size) continue;
              await out.write(file.slice(start, c)); await out.close();
              start = c;
              if (part >= FileSplit.MAX_PARTS) throw new Error(T("Quá {max} phần — tăng số dòng mỗi phần.", { max: I18n.num(FileSplit.MAX_PARTS) }));
              await out.open(FileSplit.partName(node.name, part, part + 1)); part++;
            }
            if (end > start) { await out.write(file.slice(start, end)); start = end; }
            tick(end);
          }
          await out.close();
        }
      } catch (e) { await out.drop(); throw e; }
      tick(file.size, true);
      return finish(node, out, T("Cắt “{name}” thành {n} phần", { name: node.name, n: out.made.length }), T("✔ Đã cắt “{name}” thành {n} phần ({a} … {b}).", { name: node.name, n: out.made.length, a: out.made[0].name, b: out.made.at(-1).name }));
    });
  }

  async function join(picked) {
    let nodes = picked.filter(n => !n.dir), target = "";
    if (nodes.length === 1) {
      const kids = (await Explorer.loadKids(nodes[0].parent)).filter(k => !k.dir), set = FileSplit.partSet(nodes[0].name, kids.map(k => k.name));
      if (!set || set.parts.length < 2) { StatusBar.msg(T("Không thấy các phần tiếp theo (.002, .003…) cạnh “{name}”.", { name: nodes[0].name }), "warn"); return; }
      nodes = set.parts.map(n => kids.find(k => k.name === n));
      target = set.target;
    } else nodes = FileSplit.natural(nodes.map(n => n.name)).map(name => nodes.find(n => n.name === name));
    const list = mk("ol", "sj-list"), nl = mk("input", "", null, { type: "checkbox", checked: false }), name = mk("input", "sj-name", null, { type: "text", spellcheck: false, value: target || FileSplit.joinName(nodes.map(n => n.name)) });
    function paint() {
      list.replaceChildren(...nodes.map((n, i) => {
        const li = mk("li"), up = button("↑", () => { [nodes[i - 1], nodes[i]] = [nodes[i], nodes[i - 1]]; paint(); }, T("Lên")), down = button("↓", () => { [nodes[i + 1], nodes[i]] = [nodes[i], nodes[i + 1]]; paint(); }, T("Xuống"));
        up.disabled = i === 0; down.disabled = i === nodes.length - 1;
        li.append(mk("span", "sj-file", n.name), up, down);
        return li;
      }));
    }
    paint();
    const opt = mk("label", "sj-opt"), out0 = mk("label", "sj-opt");
    opt.append(nl, " " + T("Chèn xuống dòng giữa các file (khi file trước không kết thúc bằng xuống dòng)"));
    out0.append(T("Tên file gộp:") + " ", name);
    dialog(T("Gộp {n} file", { n: nodes.length }), [list, opt, out0], T("Gộp lại"), async ui => {
      const dir = nodes[0].parent.handle, files = await Promise.all(nodes.map(n => n.read().then(r => r.file))), total = files.reduce((s, f) => s + f.size, 0);
      const clean = ShareState.cleanName(name.value);
      if (!clean || clean === "." || clean === "..") { ui.note.textContent = T("Tên file không hợp lệ."); return false; }
      await LocalFs.writable(dir);
      const want = await ExplorerOps.freeName(dir, clean, false), out = writer(dir);
      let done = 0, last = 0;
      try {
        await out.open(want);
        for (const [i, f] of files.entries()) {
          for (let s = 0; s < f.size; s += CHUNK) {
            if (ui.stopped) throw stoppedError();
            await out.write(f.slice(s, Math.min(f.size, s + CHUNK)));
            done += Math.min(f.size, s + CHUNK) - s;
            if (Date.now() - last > 120) { last = Date.now(); ui.progress(done, total, T("Đang gộp: file {k}/{n} · {done} / {total}", { k: i + 1, n: files.length, done: size(done), total: size(total) })); }
          }
          if (nl.checked && i < files.length - 1 && f.size && new Uint8Array(await f.slice(f.size - 1).arrayBuffer())[0] !== 10) await out.write("\n");
        }
        await out.close();
      } catch (e) { await out.drop(); throw e; }
      ui.progress(total, total, fmt(total));
      return finish(nodes[0], out, T("Gộp thành “{name}”", { name: want }), T("✔ Đã gộp {n} file thành “{name}” ({size}).", { n: files.length, name: want, size: size(total) }));
    });
  }

  return { split, join };
})();
