// Checksum of files: ≤ 1 GB by crypto.subtle.digest, bigger in 8 MB slices inside a Blob Worker (progress, Stop); the 🔎 tab rows, pasted hash ✓/✗, sha256sum export; hashes cached by path + size + date.
function checksumWorkerHandlers() {
  return {
    async hash(d, progress) {
      const h = ShaSum.create(d.alg), f = d.file, step = 8 << 20;
      let last = 0;
      for (let p = 0; p < f.size; p += step) {
        h.update(new Uint8Array(await f.slice(p, p + step).arrayBuffer()));
        if (Date.now() - last > 150) { last = Date.now(); progress(Math.min(f.size, p + step)); }
      }
      return h.hex();
    },
  };
}

const FileSum = (() => {
  const cfg = { native: 1 << 30 };
  const cache = new Map();
  let worker = null;
  const w = () => worker ??= BlobWorker.create({ libs: [], code: () => "const ShaSum = (" + fileChecksumPureFactory + ")();\nconst HANDLERS = (" + checksumWorkerHandlers + ")();" });
  const stoppedError = () => Object.assign(new Error(T("Đã dừng.")), { stopped: true });
  const hexOf = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  const pct = (a, b) => (b ? Math.floor((a / b) * 100) : 100) + "%";

  // file → hex; opts: { key (cache), progress(done, total), stopped() }; a stop while the worker runs terminates it.
  async function hashFile(file, alg, opts = {}) {
    const key = opts.key ? opts.key + "|" + file.size + "|" + file.lastModified + "|" + alg : "";
    if (key && cache.has(key)) return cache.get(key);
    if (opts.stopped?.()) throw stoppedError();
    let hex;
    if (file.size <= cfg.native) hex = hexOf(await crypto.subtle.digest(alg, await file.arrayBuffer()));
    else {
      const wk = w();
      hex = await wk.call("hash", { file, alg }, { progress: done => { if (opts.stopped?.()) wk.stop(); else opts.progress?.(done, file.size); } });
    }
    if (opts.stopped?.()) throw stoppedError();
    if (key) { if (cache.size > 2000) cache.clear(); cache.set(key, hex); }
    return hex;
  }
  const hashText = (text, alg) => crypto.subtle.digest(alg, new TextEncoder().encode(text)).then(hexOf);

  // Criteria paths → file nodes (folders walked, .git / node_modules kept: a checksum covers everything).
  async function nodesOf(c, sink, st) {
    if (Array.isArray(c.nodes)) {
      const out = [];
      for (const n of c.nodes) if (!n.dir) out.push(n); else for await (const k of ScanWalk.walk(n, { skip: false, stop: sink.stopped, st })) if (!k.dir) out.push(k);
      return out;
    }
    const out = [];
    for (const p of c.files || []) {
      const k = p.lastIndexOf("/"), dir = await ScanWalk.folder(p.slice(0, k)), f = (await Explorer.loadKids(dir)).find(x => !x.dir && x.name === p.slice(k + 1));
      if (f) out.push(f); else st.failed.push(p);
    }
    for (const p of c.dirs || []) for await (const k of ScanWalk.walk(await ScanWalk.folder(p), { skip: false, stop: sink.stopped, st })) if (!k.dir) out.push(k);
    return out;
  }

  // The 🔎 provider: one row per file (status = hash, ✓ / ✗ against c.expect).
  async function run(c, sink) {
    const alg = ShaSum.ALGS.includes(c?.alg) ? c.alg : "SHA-256", st = ScanWalk.stats(), expect = ShaSum.cleanHash(c?.expect || "");
    const nodes = await nodesOf(c || {}, sink, st);
    let done = 0, ok = 0;
    for (const n of nodes) {
      if (sink.stopped()) break;
      const { file } = await n.read();
      const say = (a, b) => sink.progress(T("Đang tính {alg}: “{name}” {pct} · {i}/{n} file", { alg, name: n.name, pct: pct(a, b), i: done + 1, n: nodes.length }));
      say(0, file.size);
      let hex;
      try { hex = await hashFile(file, alg, { key: n.path, progress: say, stopped: sink.stopped }); }
      catch (e) { if (e.stopped || sink.stopped()) break; st.failed.push(n.path + ": " + e.message); continue; }
      const st2 = expect ? (hex === expect ? "ok" : "bad") : "";
      if (st2 === "ok") ok++;
      sink.add([{ node: n, key: n.path, group: alg, hash: hex, st: st2, status: (st2 ? (st2 === "ok" ? "✓ " : "✗ ") : "") + hex, statusTitle: alg + " " + hex, stat: { size: file.size, mod: file.lastModified } }]);
      done++;
    }
    if (sink.stopped()) { StatusBar.msg(T("Đã dừng — giữ {n} hash đã tính.", { n: done }), "warn"); return; }
    if (st.failed.length || st.capped) sink.incomplete();
    sink.done([T("{n} file · {alg}", { n: done, alg }), expect ? T("{ok} khớp hash đã dán.", { ok }) : "", ScanWalk.tail(st)].filter(Boolean).join(" "));
    if (expect) StatusBar.msg(ok ? T("✓ Hash khớp ({ok}/{n} file).", { ok, n: done }) : T("✗ Không file nào khớp hash đã dán."), ok ? "good" : "warn");
  }

  // Names of the rows relative to the folder they share (sha256sum style, "/" separators).
  function rowsOf(items) {
    const dirs = items.map(it => it.node.path.split("/").slice(0, -1));
    let k = 0;
    while (dirs.length && dirs.every(d => k < d.length && d[k] === dirs[0][k])) k++;
    return { k, base: dirs[0]?.slice(0, k).join("/") || "", rows: items.map((it, i) => ({ hash: it.hash, name: [...dirs[i].slice(k), it.node.name].join("/") })) };
  }

  async function exportSum(ctl) {
    const items = ctl.items.filter(it => it.hash), alg = ctl.criteria?.alg || "SHA-256";
    if (!items.length) { StatusBar.msg(T("Chưa có hash nào để xuất."), "warn"); return; }
    const { base, rows } = rowsOf(items), text = ShaSum.format(rows), ext = ShaSum.EXT[alg];
    const name0 = items.length === 1 ? items[0].node.name + ext : "checksums" + ext;
    const dir = base ? await FolderPaths.resolve(base) : null;
    if (!dir || dir.path !== base || !ExplorerOps.writableNode(dir)) { Dom.download(new Blob([text], { type: "text/plain" }), name0, "text/plain"); StatusBar.msg(T("Folder không ghi được — đã tải “{name}” xuống.", { name: name0 }), "good"); return; }
    try {
      await LocalFs.writable(dir.handle);
      const name = await ExplorerOps.freeName(dir.handle, name0, false), h = await dir.handle.getFileHandle(name, { create: true });
      await LocalFs.writeHandle(h, text);
      ExplorerDisk.reload(dir);
      ExplorerUndo.created(T("Xuất “{name}”", { name }), [{ handle: h, parent: dir.handle, path: dir.path }]);
      await FileOpen.openMany([{ file: await h.getFile(), handle: h }], Views.focused);
      StatusBar.msg(T("✔ Đã xuất “{name}” ({n} dòng) — ▶ Kiểm tra checksum để đối chiếu lại.", { name, n: rows.length }), "good");
    } catch (e) { StatusBar.msg(T("Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad"); }
  }

  async function paste(ctl) {
    const v = await AskText.ask(T("Dán hash để so (SHA-1 / SHA-256 / SHA-512, có thể kèm tên file):"), ctl.criteria?.expect || "", T("So"));
    if (v == null) return;
    const h = ShaSum.cleanHash(v);
    if (v.trim() && !h) { StatusBar.msg(T("Không nhận ra hash — cần 40 / 64 / 128 ký tự hex."), "warn"); return; }
    if (h && ShaSum.algOfLen(h.length) !== (ctl.criteria?.alg || "SHA-256")) StatusBar.msg(T("Hash dán là {a}, kết quả đang là {b} — chạy lại Checksum ▸ {a} để so đúng.", { a: ShaSum.algOfLen(h.length), b: ctl.criteria?.alg }), "warn");
    const c = { ...ctl.criteria, expect: h };
    if (ctl.criteria?.nodes) Object.defineProperty(c, "nodes", { value: ctl.criteria.nodes });
    ctl.rerun(c);
  }

  function menu(ctl) {
    const E = TabMenu.entry, items = ctl.items.filter(it => it.hash);
    return [E(T("Dán hash để so ✓/✗…"), "", () => paste(ctl)),
      E(T("Chép kết quả (dạng sha256sum)"), "", async () => { const ok = await Dom.copy(ShaSum.format(rowsOf(items).rows)); StatusBar.msg(ok ? T("✔ Đã chép {n} dòng.", { n: items.length }) : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad"); }),
      E(T("Xuất file {ext}", { ext: ShaSum.EXT[ctl.criteria?.alg || "SHA-256"] }), "", () => exportSum(ctl))];
  }

  return { cfg, hashFile, hashText, run, menu, rowsOf, worker: () => worker };
})();

// One-line text prompt (a <dialog>, never window.prompt): ask(label, value, okLabel) → the text, null when cancelled.
const AskText = (() => {
  let dlg = null;
  function build() {
    const { mk } = PowerUi;
    dlg = mk("dialog", "name-ask");
    dlg.dataset.i18nSkip = "";
    const form = mk("form", "", null, { method: "dialog" }), label = mk("label"), row = mk("div", "name-ask-btns");
    label.append(mk("span"), mk("input", "", null, { type: "text", spellcheck: false, autocomplete: "off" }));
    row.append(mk("button", "", "", { type: "button", onclick: () => dlg.close("") }), mk("button", "main", "", { type: "submit", value: "ok" }));
    form.append(label, row);
    dlg.append(form);
    document.body.append(dlg);
  }
  function ask(msg, value = "", ok = T("OK")) {
    if (!dlg) build();
    const input = dlg.querySelector("input"), [cancel, go] = dlg.querySelectorAll(".name-ask-btns > button");
    dlg.querySelector("label > span").textContent = msg;
    cancel.textContent = T("Huỷ");
    go.textContent = ok;
    input.value = value;
    dlg.returnValue = "";
    dlg.showModal();
    input.select();
    return new Promise(done => dlg.addEventListener("close", () => done(dlg.returnValue === "ok" ? input.value : null), { once: true }));
  }
  return { ask };
})();
