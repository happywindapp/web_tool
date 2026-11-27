// "checksum-verify" op: a .sha256 / .sha1 / .sha512 (sha256sum / BSD lines) → each file of the sum file's folder (Explorer) or, failing that, an open tab of that name hashed and marked OK / FAILED / MISSING.
const SumCheckOp = (() => {
  const OP = "checksum-verify";
  let job = null;
  const nameOf = p => p.split("/").pop();

  // The sum file's folder as a directory handle: its path below the Explorer root (handle.resolve).
  async function baseDir(doc) {
    const root = Explorer.root();
    if (!doc?.handle || !root?.handle || root.parent) return null;
    const parts = await root.handle.resolve(doc.handle).catch(() => null);
    if (!parts) return null;
    let dir = root.handle;
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
    return dir;
  }
  async function fileAt(dir, name) {
    const parts = name.split("/").filter(p => p && p !== ".");
    if (!parts.length || parts.includes("..")) return null;
    try {
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
      return await (await dir.getFileHandle(parts.at(-1))).getFile();
    } catch { return null; }
  }
  const tabOf = (name, srcId) => Docs.list().find(d => d.id !== srcId && d.kind !== "output" && !d.hex && !d.big && !Docs.isList(d) && d.name === nameOf(name)) || null;

  async function run(t, c) {
    const src = Docs.get(c.id), { entries, bad } = ShaSum.parse(t);
    if (!entries.length) throw Object.assign(new Error(T("Không thấy dòng checksum (\"<hash>  <tên file>\" hoặc \"SHA256 (tên) = <hash>\").")), { warn: true });
    const me = job = { stopped: false }, stopped = () => me.stopped;
    const dir = await baseDir(src).catch(() => null), rows = [];
    StatusBar.msg(T("Đang kiểm checksum — bấm để dừng."), "", stop, T("Bấm để dừng"));
    for (const [i, e] of entries.entries()) {
      if (stopped()) break;
      const file = dir ? await fileAt(dir, e.name) : null, tab = file ? null : tabOf(e.name, c.id);
      let actual = "", from = file ? "disk" : tab ? "tab" : "";
      try {
        if (file) actual = await FileSum.hashFile(file, e.alg, { stopped, progress: (a, b) => StatusBar.msg(T("Đang kiểm “{name}” {p}% ({i}/{n}) — bấm để dừng.", { name: e.name, p: Math.floor((a / b) * 100), i: i + 1, n: entries.length }), "", stop, T("Bấm để dừng")) });
        else if (tab) actual = await FileSum.hashText(Docs.text(tab), e.alg);
      } catch (err) { if (err.stopped) break; from = "err"; actual = err.message; }
      rows.push({ ...e, from, actual, st: !from ? "missing" : from === "err" ? "error" : actual === e.hash ? "ok" : "bad" });
    }
    if (job === me) job = null;
    if (me.stopped) throw Object.assign(new Error(T("Đã dừng.")), { stopped: true });
    const n = st => rows.filter(r => r.st === st).length, word = { ok: "OK", bad: "FAILED", missing: "MISSING", error: "ERROR" };
    const notes = [!dir ? T("Không biết folder của file này (mở folder chứa nó trong Explorer) — đã so với các tab cùng tên đang mở.") : "", bad.length ? T("{n} dòng không đọc được: {list}", { n: bad.length, list: bad.slice(0, 10).join(", ") }) : ""].filter(Boolean);
    const sum = T("{ok} OK · {bad} sai · {miss} thiếu", { ok: n("ok"), bad: n("bad") + n("error"), miss: n("missing") });
    const all = !(n("bad") + n("error") + n("missing"));
    return { text: rows.map(r => r.name + ": " + word[r.st]).join("\n") + "\n# " + sum + "\n", notes: [(all ? "✓ " : "✗ ") + sum, ...notes], tone: all ? "good" : "warn", view: { kind: "sumcheck", srcId: c.id, rows, disk: !!dir } };
  }
  function stop() { if (job) { job.stopped = true; FileSum.worker()?.stop(); } }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }]], run: OP }, n => T("🔗 Đã chép link checksum ({n} ký tự) — mở link là kiểm lại với các tab cùng tên.", { n }));
  }

  return { run, stop, share };
})();

const PvSumCheck = {
  create(p) {
    const { mk, button } = PowerUi;
    const stopB = button("", () => SumCheckOp.stop()), link = button("", () => v.last && SumCheckOp.share(v.last.srcId));
    const v = { el: mk("div", "pv-sumcheck"), tools: [stopB, link], last: null };
    const MARK = { ok: ["✓", "OK"], bad: ["✗", "Sai hash"], missing: ["?", "Không thấy file"], error: ["!", "Lỗi đọc"] };
    const FROM = { disk: "đĩa", tab: "tab đang mở" };

    function row(r) {
      const tr = mk("tr", "sc-" + r.st), [sym, word] = MARK[r.st];
      tr.append(mk("td", "sc-st", sym + " " + T(word)), mk("td", "sc-name", r.name), mk("td", "", r.alg), mk("td", "sc-hash", r.hash),
        mk("td", "sc-hash", r.st === "error" ? r.actual : r.actual || "—"), mk("td", "", r.from && FROM[r.from] ? T(FROM[r.from]) : ""));
      return tr;
    }
    function render() {
      const d = v.last, c = st => d.rows.filter(r => r.st === st).length;
      p.type.textContent = T("Checksum · {ok}/{n} OK", { ok: c("ok"), n: d.rows.length });
      const tb = mk("table", "sc-grid"), head = mk("tr");
      for (const h of ["Kết quả", "File", "Thuật toán", "Hash mong đợi", "Hash tính được", "Nguồn"]) head.append(mk("th", "", T(h)));
      tb.append(head);
      v.el.replaceChildren(tb);
      PowerUi.appendSliced(tb, d.rows, row, v, 300);
    }
    v.labels = () => { stopB.textContent = T("■ Dừng"); stopB.title = T("Dừng kiểm checksum"); link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: nội dung file checksum"); if (v.last) render(); };
    v.show = d => { v.last = d; render(); return true; };
    return v;
  },
};
