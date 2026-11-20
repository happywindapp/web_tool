// Share link (#pako:… hash, ADR #9), ?data=, ?demo=: tabs open as temp tabs next to the current work, so loading never replaces what the user is editing.
const ShareLoader = (() => {
  // done(n) → the "opened" message, shown before the op runs so a run error stays visible.
  function load(obj, done) {
    const p = ShareState.parse(obj);
    if (typeof obj.wrap === "boolean") Actions.setWrap(p.wrap);
    if (p.layout && (Layouts.get(p.layout).n > Views.count || obj.layout)) Actions.setLayout(p.layout);
    const first = p.views.map(() => null), made = [];
    p.views.forEach((list, gi) => list.forEach((t, k) => {
      const doc = Docs.create({ kind: "temp", name: t.name || T("Tab {n}", { n: k + 1 }), lang: t.lang, text: t.text });
      Views.add(doc, gi);
      first[gi] ??= doc;
      made.push(doc);
    }));
    first.forEach(d => d && Views.activate(Views.where(d.id), d.id, false));
    const src = first.find(Boolean);
    Views.focus(Views.where(src.id));
    StatusBar.msg(done(p.views.flat().length), "good");
    if (p.held) {
      if (p.opts) Object.assign(PowerTools.state(src.id, p.held), { link: p.opts });
      RunOp.pick(src, p.held);
      Toolbar.sync();
      StatusBar.msg(T("Link có regex — chưa tự chạy; bấm ▶ Chạy để chạy “{op}”.", { op: T(OutputOps.get(p.held).label) }), "warn");
    }
    if (p.run) {
      // Tabs marked as previewed each get their preview back; an older link without marks previews its first previewable tab.
      const marked = p.run === "preview" ? made.filter((d, k) => p.views.flat()[k].preview) : [];
      const runOn = marked.length ? marked : [p.run === "preview" ? made.find(d => PreviewPane.kindOf(d)) || src : src];
      runOn.forEach(d => RunOp.pick(d, p.run));
      Toolbar.sync();
      if (p.opts) runOn.forEach(d => Object.assign(PowerTools.state(d.id, p.run), { link: p.opts }));
      (async () => { for (const d of runOn) await OutputLink.run(d, p.run); })().catch(e => StatusBar.msg(e.message, "bad"));
    }
    if (p.compare === "json") Compare.jsonTree(); else if (p.compare) Compare.start(Views.where(src.id));
  }

  const fromLink = n => T("Đã mở {n} tab từ link (tab tạm — sửa thì được giữ thành ghi chú).", { n });

  async function fromUrl() {
    const q = new URLSearchParams(location.search), hash = location.hash.slice(1), demo = q.get("demo");
    if (!hash && !q.has("data") && !demo) return;
    try {
      if (demo && Object.hasOwn(DEMOS, demo)) loadDemo(demo);
      else if (hash.startsWith("enc:")) {
        // Password link: nothing is decoded before the password is typed; a wrong one says only that.
        history.replaceState(null, "", location.pathname);
        await EditorExtras.load();
        for (let title = T("Link này có mật khẩu — nhập mật khẩu để mở"); ;) {
          const pw = await Crypt.ask({ title });
          if (!pw) { StatusBar.msg(T("Đã huỷ mở link có mật khẩu."), "warn"); break; }
          try { load(await Crypt.decodeLink(hash, pw), fromLink); break; } catch (e) { title = e.message + " " + T("Thử lại:"); }
        }
      } else if (hash) {
        const obj = await ShareCodec.decode(decodeURIComponent(hash));
        if (!obj) throw new Error(T("Link không đúng định dạng của One Editor."));
        load(obj, fromLink);
      } else if (q.has("data")) {
        const raw = q.get("data"), obj = await ShareCodec.decode(raw);
        load(obj || { v: 1, views: [[{ n: "", t: raw }], []] }, fromLink);
      }
    } catch (e) {
      StatusBar.msg(T("Link hỏng: {msg}", { msg: e.message }), "bad");
    }
    history.replaceState(null, "", location.pathname);
  }

  function loadDemo(key) {
    if (!Object.hasOwn(DEMOS, key)) return;
    if (DEMOS[key].file) { FileOpen.openMany([{ file: DEMOS[key].file(), handle: null }]); return; }
    // Phase 9 demos live in the lazily loaded bundle.
    if (DEMOS[key].lazy) { PowerTools.use(() => { const d = PowerDemos[key]; load(d.payload(), () => T("Đã nạp mẫu “{name}”.", { name: T(DEMOS[key].label) })); d.after?.(); }); return; }
    load(DEMOS[key].payload(), () => T("Đã nạp mẫu “{name}”.", { name: T(DEMOS[key].label) }));
    if (DEMOS[key].after) DEMOS[key].after();
  }

  // pw: encrypt the payload into a "#enc:" link (Crypt, extras bundle).
  async function share(pw = "") {
    // A preview tab has no text: its source tab is marked and the link runs "preview" on it again.
    const docs = Views.groups.slice(0, Views.count).map(g => g.tabs.map(Docs.get).filter(d => d && d.kind !== "clone"));
    const shown = new Set(docs.flat().filter(PreviewPane.isPreview).map(d => d.link.src));
    const views = docs.map(list => list.filter(d => !PreviewPane.isPreview(d)).map(d => ({ name: d.name, lang: d.lang, text: Docs.text(d), preview: shown.has(d.id) })));
    if (!views.some(v => v.length)) { StatusBar.msg(T("Chưa có tab nào để chia sẻ."), "warn"); return; }
    const run = shown.size ? "preview" : "";
    const payload = ShareState.build(views, CmSetup.settings.wrap, Views.layout, Compare.active, run);
    const url = location.href.split(/[?#]/)[0] + "#" + (pw ? await Crypt.encodeLink(payload, pw) : await ShareCodec.encode(payload));
    const copied = await Dom.copy(url);
    if (!copied) prompt(T("Chép link này:"), url);
    const notes = [T("🔗 Đã chép link ({n} ký tự) — dữ liệu nằm sau dấu #, không gửi lên máy chủ.", { n: I18n.num(url.length) })];
    if (pw) notes.push(T("🔒 Link đã mã hoá — gửi mật khẩu qua kênh khác."));
    if (location.protocol === "file:") notes.push(T("Link file:// chỉ mở được trên máy này."));
    if (url.length > 60000) notes.push(T("Link dài — vài ứng dụng chat có thể cắt mất."));
    StatusBar.msg(notes.join(" "), copied ? "good" : "warn");
  }

  return { fromUrl, loadDemo, share };
})();
