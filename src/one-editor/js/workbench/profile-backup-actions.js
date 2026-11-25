// Profile backup (R1): export settings + library + notes to one .json.gz (optional password: PBKDF2 + AES-GCM), import with a preview ⇒ merge or replace all, then reload so every module reads the new data.
const ProfileBackup = (() => {
  const P = "web_tool.one-editor.", DONE = "web_tool.one-editor:profileImported";
  const day = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const gz = (bytes, back) => new Response(new Blob([bytes]).stream().pipeThrough(back ? new DecompressionStream("gzip") : new CompressionStream("gzip")));
  const big = () => Object.assign(new Error("big"), { code: "big" });
  // Unzips with a byte cap, so a small gzip bomb cannot fill the memory.
  async function gunzip(bytes) {
    const r = gz(bytes, true).body.getReader(), parts = [];
    for (let n = 0; ;) {
      const { done, value } = await r.read();
      if (done) break;
      if ((n += value.length) > ProfileFile.MAX_BYTES) { r.cancel(); throw big(); }
      parts.push(value);
    }
    return new TextDecoder().decode(await new Blob(parts).arrayBuffer());
  }

  // Small modal: text lines, checkboxes [[key, label, checked]], buttons [[value, label, main?]] → { value, checks } ("" when closed).
  function ask(title, lines, checks, buttons) {
    const dlg = document.createElement("dialog"), form = document.createElement("form"), p = (t, cls) => Object.assign(document.createElement("p"), { textContent: t, className: cls || "" });
    dlg.className = "qp pw-dlg profile-dlg";
    form.method = "dialog";
    form.append(p(title, "profile-title"), ...lines.map(l => p(l, "muted")));
    const boxes = checks.map(([k, label, on]) => { const l = document.createElement("label"), c = Object.assign(document.createElement("input"), { type: "checkbox", checked: !!on }); c.dataset.k = k; l.append(c, " " + label); form.append(l); return c; });
    const acts = document.createElement("div");
    acts.className = "pw-acts";
    acts.append(...buttons.map(([v, label, main]) => Object.assign(document.createElement("button"), { value: v, textContent: label, className: main ? "main" : "" })));
    form.append(acts);
    dlg.append(form);
    document.body.append(dlg);
    return new Promise(done => {
      dlg.onclose = () => { done({ value: dlg.returnValue, checks: Object.fromEntries(boxes.map(c => [c.dataset.k, c.checked])) }); dlg.remove(); };
      dlg.showModal();
    });
  }

  function readPrefs() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(P)) try { out[k.slice(P.length)] = JSON.parse(localStorage.getItem(k)); } catch { /* not JSON: not a One Editor setting */ }
      }
    } catch (e) { console.warn("One Editor profile: localStorage", e); }
    return out;
  }

  async function readMeta(keys) { const m = {}; for (const k of keys) m[k] = await NotesDb.getMeta(k); return m; }
  async function readHistory() {
    const out = [];
    for (const rec of await NotesDb.histList()) { const text = await NotesDb.histText(rec.id); if (typeof text === "string") out.push({ rec, text }); }
    return out;
  }

  // Current saved state, after the open notes are flushed.
  async function collect({ history = false } = {}) {
    if (!NotesDb.ok) throw new Error(T("Trình duyệt chặn IndexedDB — không có gì để sao lưu."));
    await HotExit.flush();
    return ProfileFile.build({ prefs: readPrefs(), meta: await readMeta([...ProfileFile.META_KEYS, "bookmarks"]), notes: await NotesDb.notesAll(), history: history ? await readHistory() : null });
  }

  // profile → gzip Blob; pw ⇒ the JSON is sealed (Crypt, editor extras bundle) inside a small envelope.
  async function encode(profile, pw = "") {
    let text = JSON.stringify(profile);
    if (pw) {
      await EditorExtras.load();
      const salt = Crypt.salt(), sealed = await Crypt.seal(text, await Crypt.key(pw, salt));
      text = JSON.stringify({ app: ProfileFile.APP, version: ProfileFile.VERSION, enc: { v: 1, salt: Crypt.b64u(salt), it: Crypt.ITER, ...sealed } });
    }
    return gz(new TextEncoder().encode(text)).blob();
  }

  // File / Blob → profile; askPw(title) → password or null (cancel ⇒ null result).
  async function decode(file, askPw) {
    if (file.size > ProfileFile.MAX_BYTES) throw big();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = bytes[0] === 0x1f && bytes[1] === 0x8b ? await gunzip(bytes) : new TextDecoder().decode(bytes);
    let env = null;
    try { env = JSON.parse(text); } catch { throw Object.assign(new Error("json"), { code: "json" }); }
    if (!env?.enc) return ProfileFile.parse(text);
    await EditorExtras.load();
    const e = env.enc;
    for (let title = T("Profile có mật khẩu — nhập mật khẩu để mở"); ;) {
      const pw = await askPw(title);
      if (!pw) return null;
      try { return ProfileFile.parse(await Crypt.unseal(e, await Crypt.key(pw, Crypt.unb64u(String(e.salt)), ProfileFile.rounds(e.it, Crypt.ITER)))); }
      catch (err) { if (typeof err.code === "string") throw err; title = T("Sai mật khẩu hoặc dữ liệu đã hỏng.") + " " + T("Thử lại:"); }
    }
  }

  async function exportDialog() {
    const r = await ask(T("Xuất profile One Editor"), [T("Gồm cài đặt, phím tắt, group, ghim, nhãn màu, snippet / macro / bộ thay / recipe và ghi chú. Folder / file đã mở không xuất được (trình duyệt không cho) — sau khi nhập cần mở lại folder."),
      T("File có thể chứa dữ liệu nhạy cảm trong ghi chú — nên đặt mật khẩu.")], [["history", T("Kèm lịch sử cục bộ (🕘 Timeline)"), false], ["pw", T("Đặt mật khẩu"), false]], [["ok", T("⬇ Xuất"), true], ["cancel", T("Huỷ")]]);
    if (r.value !== "ok") return;
    let pw = "";
    if (r.checks.pw) { await EditorExtras.load(); pw = await Crypt.ask({ title: T("Mật khẩu cho file profile"), confirm: true }); if (!pw) return; }
    try {
      const { profile, skipped } = await collect({ history: r.checks.history });
      Dom.download(await encode(profile, pw), `one-editor-profile-${day()}.json.gz`, "application/gzip");
      Prefs.set("backupLast", Date.now());
      const c = ProfileFile.counts(profile);
      StatusBar.msg(T("⬇ Đã xuất profile: {s} cài đặt · {n} ghi chú · {l} mục thư viện.", { s: I18n.num(c.prefs), n: I18n.num(c.notes), l: I18n.num(c.snippets + c.macros + c.replaceSets + c.recipes) })
        + (skipped ? " " + T("{n} mục folder / file không xuất được — mở lại folder sau khi nhập.", { n: I18n.num(skipped) }) : ""), "good");
    } catch (e) { StatusBar.msg(T("Không xuất được profile: {msg}", { msg: e.message }), "bad"); }
  }

  const BAD = { big: "File lớn hơn 200 MB — không nhập.", json: "File không phải JSON / gzip hợp lệ.", format: "File không phải profile One Editor (version 1)." };
  function pickAndImport() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".gz,.json,application/gzip,application/json" });
    input.onchange = () => { if (input.files[0]) importFile(input.files[0]); };
    input.click();
  }

  async function importFile(file) {
    let inc;
    try { inc = await decode(file, title => EditorExtras.load().then(() => Crypt.ask({ title }))); }
    catch (e) { StatusBar.msg(BAD[e.code] ? T(BAD[e.code]) : T("Không đọc được file: {msg}", { msg: e.message }), "bad"); return; }
    if (!inc) { StatusBar.msg(T("Đã huỷ nhập profile."), "warn"); return; }
    const c = ProfileFile.counts(inc), list = [["prefs", "cài đặt"], ["keybindings", "phím tắt riêng"], ["groups", "group"], ["pinned", "mục ghim"], ["tags", "nhãn màu"], ["snippets", "snippet"], ["macros", "macro"], ["replaceSets", "bộ thay"], ["recipes", "recipe"], ["notes", "ghi chú"], ["history", "bản lịch sử"]]
      .filter(([k]) => c[k]).map(([k, label]) => I18n.num(c[k]) + " " + T(label)).join(" · ");
    const r = await ask(T("Nhập profile “{name}”", { name: file.name }), [list || T("File không có mục nào."), ...(inc.created ? [T("Xuất lúc {t}", { t: inc.created.replace("T", " ").slice(0, 16) })] : []),
      T("Gộp: thêm vào dữ liệu hiện có. Thay toàn bộ: các loại có trong file thay hẳn bản hiện tại (ghi chú hiện có bị xoá). Trang tải lại sau khi nhập."), T("Đóng các tab One Editor khác trước khi nhập — chúng có thể ghi đè dữ liệu vừa nhập.")], [],
      [["merge", T("Gộp"), true], ["all", T("Thay toàn bộ…")], ["cancel", T("Huỷ")]]);
    if (r.value !== "merge" && r.value !== "all") return;
    try {
      await HotExit.flush();
      const cur = { meta: await readMeta(ProfileFile.META_KEYS), notes: await NotesDb.notesAll(), history: inc.history ? (await NotesDb.histList()).map(rec => ({ rec })) : [] };
      let mode = r.value;
      if (mode === "all" && !confirm(inc.has?.notes === false ? T("Thay toàn bộ: thư viện (snippet, macro, bộ thay, recipe) sẽ bị thay bằng nội dung file; ghi chú và cài đặt giữ nguyên. Tiếp tục?")
        : T("Thay toàn bộ: {n} ghi chú hiện có cùng cài đặt, thư viện, group sẽ bị thay bằng nội dung file. Không hoàn tác được. Tiếp tục?", { n: cur.notes.length }))) return;
      if (mode === "merge") {
        const n = ProfileFile.clashes(cur, inc);
        mode = n > 0 && confirm(T("{n} mục trùng tên / id với dữ liệu hiện có.\nOK = thay bằng bản trong file · Huỷ = giữ cả hai (thêm số vào tên).", { n })) ? "replace" : "keep";
      }
      await apply(cur, inc, mode);
    } catch (e) { HotExit.resume(); StatusBar.msg(T("Nhập profile bị ngắt: {msg} — tải lại trang (F5) trước khi sửa tiếp.", { msg: e.message }), "bad"); return; }
    reload(c);
  }

  // Writes the plan; Settings come last so a failed write leaves the old settings.
  async function apply(cur, inc, mode) {
    const plan = ProfileFile.plan(cur, inc, mode);
    HotExit.stop();
    for (const [k, v] of Object.entries(plan.meta)) if (!(await NotesDb.putMeta(k, v))) throw new Error(T("trình duyệt chặn IndexedDB"));
    await NotesDb.save(plan.notes, plan.dropNotes, null);
    for (const h of plan.history) await NotesDb.histWrite(h.rec, h.text, []);
    const now = readPrefs();
    if (mode === "all" && inc.has?.prefs !== false) for (const k of Object.keys(now)) if (k !== "gdriveKey") localStorage.removeItem(P + k);
    // A value of another type than the one in use (hand-edited file) is skipped.
    const kind = v => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
    for (const [k, v] of Object.entries(inc.prefs)) if (!(k in now) || kind(now[k]) === kind(v)) localStorage.setItem(P + k, JSON.stringify(v));
  }

  function reload(c) {
    try { sessionStorage.setItem(DONE, JSON.stringify({ notes: c.notes, prefs: c.prefs })); } catch { /* the reload just has no message */ }
    location.replace(location.pathname);
  }

  return { exportDialog, pickAndImport, importFile, collect, encode, decode, apply };
})();
