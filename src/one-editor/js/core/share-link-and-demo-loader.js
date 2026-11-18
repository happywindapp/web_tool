// Share link (#pako:… hash, ADR #9), ?data=, ?demo=: tabs open as temp tabs next to the current work, so loading never replaces what the user is editing.
const ShareLoader = (() => {
  // done(n) → the "opened" message, shown before the op runs so a run error stays visible.
  function load(obj, done) {
    const p = ShareState.parse(obj);
    if (typeof obj.wrap === "boolean") Actions.setWrap(p.wrap);
    const first = [null, null];
    p.views.forEach((list, gi) => list.forEach((t, k) => {
      const doc = Docs.create({ kind: "temp", name: t.name || T("Tab {n}", { n: k + 1 }), lang: t.lang, text: t.text });
      Views.add(doc, gi);
      first[gi] ??= doc;
    }));
    first.forEach((d, gi) => d && Views.activate(gi, d.id, false));
    const src = first[0] || first[1];
    Views.focus(Views.where(src.id));
    StatusBar.msg(done(p.views[0].length + p.views[1].length), "good");
    if (p.run) { $("opSel").value = p.run; OutputLink.run(src, p.run); }
  }

  const fromLink = n => T("Đã mở {n} tab từ link (tab tạm — sửa thì được giữ thành ghi chú).", { n });

  async function fromUrl() {
    const q = new URLSearchParams(location.search), hash = location.hash.slice(1), demo = q.get("demo");
    if (!hash && !q.has("data") && !demo) return;
    try {
      if (demo && Object.hasOwn(DEMOS, demo)) loadDemo(demo);
      else if (hash) {
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
    load(DEMOS[key].payload(), () => T("Đã nạp mẫu “{name}”.", { name: T(DEMOS[key].label) }));
  }

  async function share() {
    const views = Views.groups.map(g => g.tabs.map(Docs.get).filter(Boolean).map(d => ({ name: d.name, lang: d.lang, text: Docs.text(d) })));
    if (!views[0].length && !views[1].length) { StatusBar.msg(T("Chưa có tab nào để chia sẻ."), "warn"); return; }
    const url = location.href.split(/[?#]/)[0] + "#" + await ShareCodec.encode(ShareState.build(views, CmSetup.settings.wrap));
    const copied = await Dom.copy(url);
    if (!copied) prompt(T("Chép link này:"), url);
    const notes = [T("🔗 Đã chép link ({n} ký tự) — dữ liệu nằm sau dấu #, không gửi lên máy chủ.", { n: I18n.num(url.length) })];
    if (location.protocol === "file:") notes.push(T("Link file:// chỉ mở được trên máy này."));
    if (url.length > 60000) notes.push(T("Link dài — vài ứng dụng chat có thể cắt mất."));
    StatusBar.msg(notes.join(" "), copied ? "good" : "warn");
  }

  return { fromUrl, loadDemo, share };
})();
