// Advanced file search (Tìm file…, Alt+F7): name (quick filter syntax), file / folder, size from–to, modified (today / 7 / 30 days / range), containing text (plain or regex, text files ≤ 5 MB), subfolders, .git / node_modules — rows stream into the 🔎 tab.
const FileSearch = (() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let last = { name: "", kind: "", min: "", max: "", date: "", from: "", to: "", text: "", regex: false, matchCase: false, sub: true, skip: true };

  function field(label, input) { const l = el("label", "fs-field"); l.append(el("span", "", label), input); return l; }
  function input(name, value, hint) { const i = el("input"); Object.assign(i, { name, value, placeholder: hint, type: "text", spellcheck: false, autocomplete: "off" }); return i; }
  function select(name, value, opts) { const s = el("select"); s.name = name; s.append(...opts.map(([v, text]) => Object.assign(el("option", "", text), { value: v }))); s.value = value; return s; }
  function check(name, on, label) { const l = el("label", "fs-check"), i = el("input"); Object.assign(i, { type: "checkbox", name, checked: on }); l.append(i, el("span", "", label)); return l; }

  // The dialog is built per use (current UI language, last criteria); → criteria or null.
  function dialog(node) {
    const dlg = el("dialog", "name-ask fs-ask"), form = el("form"), err = el("p", "fs-err"), c = last;
    dlg.dataset.i18nSkip = "";
    form.method = "dialog";
    const range = el("div", "fs-pair");
    range.append(field(T("Từ ngày"), input("from", c.from, "dd/mm/yyyy")), field(T("Đến ngày"), input("to", c.to, "dd/mm/yyyy")));
    const size = el("div", "fs-pair");
    size.append(field(T("Cỡ từ"), input("min", c.min, T("vd 1 KB"))), field(T("Đến"), input("max", c.max, T("vd 5 MB"))));
    const date = select("date", c.date, [["", T("Bất kỳ")], ["today", T("Hôm nay")], ["7", T("7 ngày qua")], ["30", T("30 ngày qua")], ["range", T("Khoảng ngày…")]]);
    const checks = el("div", "fs-checks"), btns = el("div", "name-ask-btns"), cancel = el("button", "", T("Huỷ")), ok = el("button", "main", T("Tìm"));
    checks.append(check("regex", c.regex, T("Regex")), check("matchCase", c.matchCase, T("Phân biệt hoa / thường")), check("sub", c.sub, T("Gồm folder con")), check("skip", c.skip, T("Bỏ .git / node_modules")));
    Object.assign(cancel, { type: "button", onclick: () => dlg.close("") });
    Object.assign(ok, { type: "submit", value: "ok" });
    btns.append(cancel, ok);
    form.append(el("h3", "fs-title", T("Tìm file trong “{dir}”", { dir: node.name })),
      field(T("Tên"), input("name", c.name, T("*.log;*.txt — trống = mọi tên"))),
      field(T("Kiểu"), select("kind", c.kind, [["", T("File và folder")], ["file", T("Chỉ file")], ["dir", T("Chỉ folder")]])),
      size, field(T("Ngày sửa"), date), range, field(T("Có chứa chữ"), input("text", c.text, T("trống = không xét nội dung"))), checks, err, btns);
    const sync = () => { range.hidden = date.value !== "range"; };
    date.onchange = sync;
    sync();
    dlg.append(form);
    document.body.append(dlg);
    const read = () => {
      const f = Object.fromEntries(["name", "kind", "min", "max", "date", "from", "to", "text"].map(k => [k, form.elements[k].value.trim()]));
      for (const k of ["regex", "matchCase", "sub", "skip"]) f[k] = form.elements[k].checked;
      return f;
    };
    // Bad sizes / dates / regex keep the dialog open with the reason.
    form.addEventListener("submit", e => {
      const f = read(), bad = FileFind.problems(f);
      let msg = bad.includes("size") ? T("Cỡ không hợp lệ — vd 500, 2 KB, 1.5 MB.") : bad.includes("sizeOrder") ? T("“Cỡ từ” lớn hơn “Đến”.")
        : bad.includes("date") ? T("Ngày không hợp lệ — gõ dd/mm/yyyy.") : bad.includes("dateOrder") ? T("“Từ ngày” sau “Đến ngày”.") : "";
      if (!msg && f.text && f.regex) try { FindCore.compile(f.text, { regex: true }); } catch (x) { msg = T("Regex lỗi: {msg}", { msg: x.message }); }
      if (msg) { e.preventDefault(); err.textContent = msg; }
    });
    dlg.showModal();
    form.elements.name.focus();
    form.elements.name.select();
    return new Promise(done => dlg.addEventListener("close", () => { const f = dlg.returnValue === "ok" ? read() : null; dlg.remove(); done(f); }, { once: true }));
  }

  async function ask(node) {
    const f = await dialog(node);
    if (!f) return;
    last = f;
    ResultsTab.open("find", { path: node.path, ...f });
  }

  // Text files ≤ 5 MB only (the Find in files limits); binaries by name or NUL bytes are skipped and counted.
  async function contains(node, re, skipped) {
    if (FindCore.binaryName(node.name)) { skipped.bin++; return false; }
    const { file } = await node.read();
    if (file.size > FindCore.LIMITS.fileBytes) { skipped.big++; return false; }
    const r = await LocalFs.readText(file);
    if (r.binary) { skipped.bin++; return false; }
    re.lastIndex = 0;
    return re.test(r.text);
  }

  async function run(c, sink) {
    const root = await ScanWalk.folder(c.path), name = NameMatch.filter(c.name || ""), m = FileFind.meta(c), st = ScanWalk.stats(), skipped = { big: 0, bin: 0 };
    const re = c.text ? FindCore.compile(c.text, { regex: c.regex, matchCase: c.matchCase }) : null, out = [];
    let found = 0;
    const tick = ScanWalk.ticker(() => { if (out.length) sink.add(out.splice(0)); sink.progress(T("Đã duyệt {n} mục · {k} kết quả — Esc để dừng", { n: ScanWalk.num(st.seen), k: ScanWalk.num(found) })); });
    const test = async node => {
      tick();
      if ((name && !name(node.name)) || (re && node.dir)) return;
      try {
        const stat = !node.dir && (m.stat || re) ? await ScanWalk.stat(node) : null;
        if (!m.test({ dir: node.dir, ...stat }) || (re && !await contains(node, re, skipped))) return;
        found++;
        out.push(stat?.size != null ? { node, stat } : { node });
      } catch (e) { st.failed.push(node.path + ": " + e.message); }
    };
    await ScanWalk.each(ScanWalk.walk(root, { sub: c.sub !== false, skip: c.skip !== false, stop: sink.stopped, st }), 16, test);
    if (out.length) sink.add(out.splice(0));
    if (st.capped || st.cut) sink.incomplete();
    const skip = re && skipped.big + skipped.bin ? T("Bỏ qua {big} file > 5 MB và {bin} file nhị phân khi tìm chữ.", { big: skipped.big, bin: skipped.bin }) : "";
    sink.done([T("Tìm xong: {k} kết quả trong {n} mục đã duyệt.", { k: ScanWalk.num(found), n: ScanWalk.num(st.seen) }), ScanWalk.tail(st), skip].filter(Boolean).join(" "));
  }

  return { ask, run };
})();
