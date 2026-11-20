// OutputOps "translate": on-device first; otherwise MyMemory only after the user agrees (remembered until the page closes). Settings live per source tab.
const Translate = (() => {
  const DEVICE_MAX = 200000, CACHE_MAX = 3000;
  const settings = new Map(), cache = new Map();
  let consent = false;
  const err = (msg, extra) => Object.assign(new Error(msg), extra);
  const name = c => TrLang.label(c, I18n.lang);

  function of(srcId) {
    if (!settings.has(srcId)) settings.set(srcId, { from: "auto", to: TrLang.LANGS.includes(Prefs.get("tr.to", "")) ? Prefs.get("tr.to", "") : "auto", live: Prefs.get("tr.live", false) === true, provider: "", lastFrom: "", lastTo: "" });
    return settings.get(srcId);
  }
  // Live re-runs only when the last run was on-device (MyMemory is never called while typing).
  const liveOn = out => { const s = out?.link && settings.get(out.link.src); return !!s && s.live && s.provider === "device"; };

  // hint: the page's <html lang> for a web page, used before the text guess.
  async function sourceLang(text, s, hint) {
    if (s.from !== "auto") return { from: s.from, by: "user" };
    const d = await OnDevice.detect(text);
    return d ? { from: d, by: "device" } : TrLang.LANGS.includes(hint) ? { from: hint, by: "page" } : { from: TrLang.guess(text), by: "guess" };
  }

  const remember = (k, v) => { cache.delete(k); cache.set(k, v); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); };
  // Translates the units not cached yet one by one (each cached as soon as it is done), then joins from a run-local map (the LRU may drop early units of a long text).
  async function units(provider, segs, from, to, ctx, one) {
    const list = TrChunk.units(segs), key = u => provider + "|" + from + "|" + to + "|" + u, got = new Map();
    for (const u of list) if (cache.has(key(u))) got.set(u, cache.get(key(u)));
    const todo = [...new Set(list.filter(u => !got.has(u)))];
    for (const [i, u] of todo.entries()) {
      if (ctx.current && !ctx.current()) throw err(T("Đã dừng — có lần dịch mới hơn."), { stale: true });
      if (todo.length > 1 && !ctx.quiet) StatusBar.msg(T("Đang dịch {done} / {total} đoạn…", { done: i + 1, total: todo.length }));
      const v = await one(u);
      got.set(u, v);
      remember(key(u), v);
    }
    const post = ctx.post || (v => v);
    return TrChunk.join(segs, list.map(u => post(got.get(u))));
  }

  function deviceError(e) {
    if (e.stale) return e;
    if (e.name === "NotAllowedError") return err(T("Cần tải gói dịch về máy (1 lần) — bấm ▶ Dịch để bắt đầu."), { warn: true });
    if (e.name === "QuotaExceededError") return err(T("Văn bản quá dài cho bộ dịch trên máy — chia nhỏ rồi dịch."));
    return err(T("Bộ dịch trên máy lỗi: {msg}", { msg: e.message || e.name }));
  }

  async function onDevice(text, from, to, ctx) {
    if (!ctx.split && text.length > DEVICE_MAX) throw err(T("Văn bản dài quá {n} ký tự — chia nhỏ rồi dịch.", { n: I18n.num(DEVICE_MAX) }));
    const t = await OnDevice.prepare(from, to, pct => StatusBar.msg(T("Đang tải gói dịch {from} → {to} về máy… {pct}%", { from: name(from), to: name(to), pct })));
    return units("device", (ctx.split || TrChunk.plan)(text, OnDevice.MAX_BYTES, DEVICE_MAX), from, to, ctx, u => t.translate(u));
  }

  // askAgain: the on-device translator failed — the user expected no network, so a page-wide consent is not enough.
  async function myMemory(text, from, to, ctx, reason, askAgain) {
    const segs = (ctx.split || TrChunk.plan)(text, MyMemory.MAX_BYTES, MyMemory.MAX_CHARS - MyMemory.used()), sent = TrChunk.units(segs).join("").length;
    if (sent > MyMemory.MAX_CHARS) throw err(T("Văn bản dài {n} ký tự — MyMemory chỉ cho ~5.000 ký tự / ngày. Chia nhỏ, hoặc dùng Chrome / Edge có bộ dịch trên máy.", { n: I18n.num(sent) }));
    if ((!consent || askAgain) && !confirm(T("{reason}\n\nGửi {n} ký tự văn bản tới MyMemory (api.mymemory.translated.net) để dịch {from} → {to}?\n\n• Văn bản đi trong URL — đừng gửi dữ liệu nhạy cảm (mật khẩu, thông tin khách hàng…).\n• Quota miễn phí ~5.000 ký tự / ngày (hôm nay đã gửi ~{used}).\n• Chỉ hỏi 1 lần cho tới khi đóng trang.",
      { reason, n: I18n.num(sent), from: name(from), to: name(to), used: I18n.num(MyMemory.used()) }))) throw err(T("Chưa dịch — chưa đồng ý gửi văn bản tới MyMemory, không có gì được gửi đi."), { warn: true });
    consent = true;
    return units("mymemory", segs, from, to, ctx, u => MyMemory.one(u, from, to));
  }

  // Short strings of the dictionary cards, with the provider of the last run (MyMemory only once the page agreed); pieces too long for MyMemory stay "".
  async function list(items, from, to, provider) {
    if (provider === "mymemory" && !consent) throw err(T("Chưa đồng ý gửi văn bản tới MyMemory — bấm ▶ Dịch trước."));
    const key = u => provider + "|" + from + "|" + to + "|" + u;
    const fresh = provider === "mymemory" ? items.filter(u => !cache.has(key(u)) && TrChunk.bytes(u) <= MyMemory.MAX_BYTES).join("").length : 0;
    if (fresh && MyMemory.used() + fresh > MyMemory.MAX_CHARS) throw err(T("MyMemory: không đủ quota hôm nay cho phần từ điển (cần ~{n}, đã gửi ~{used} / 5.000 ký tự).", { n: I18n.num(fresh), used: I18n.num(MyMemory.used()) }), { quota: true });
    const t = provider === "device" ? await OnDevice.prepare(from, to, () => {}) : null, out = [];
    for (const u of items) {
      const k = key(u);
      let v = cache.get(k);
      if (v === undefined) {
        if (!t && TrChunk.bytes(u) > MyMemory.MAX_BYTES) { out.push(""); continue; }
        v = t ? await t.translate(u) : await MyMemory.one(u, from, to);
        remember(k, v);
      }
      out.push(v);
    }
    return out;
  }

  // Highlighted ranges of the source tab or one of its clones, read with the text (before any await).
  function selected(id) {
    const doc = Docs.get(id);
    for (const d of doc ? Docs.family(doc) : []) {
      const rs = d.state ? d.state.selection.ranges.filter(r => !r.empty).map(r => ({ from: r.from, to: r.to })) : [];
      if (rs.length) return rs;
    }
    return [];
  }
  // Look-up terms from the highlight; no highlight ⇒ the whole tab when it is one short English term, except a live re-run keeps the last cards.
  function lookTerms(s, text, ranges, from, quiet) {
    if (quiet && !ranges.length && s.look) return s.look;
    return s.look = ranges.length ? TrTerms.fromRanges(text, ranges, from) : TrTerms.fromText(text, from);
  }

  const existing = srcId => Docs.list().find(d => d.kind === "output" && d.link?.src === srcId && d.link.op === "translate");

  async function run(text, ctx) {
    const url = WebPage.urlOf(text), s = of(ctx.id), ranges = url ? [] : selected(ctx.id);
    if (!text.trim()) return { text: "", view: { kind: "translate", empty: true, srcId: ctx.id } };
    // Source tab = one URL ⇒ its page (Markdown from Jina Reader) is translated; opened without a click (link / ?demo=) it waits for ▶ Dịch.
    let page = null;
    const cut = {};
    if (url) {
      if (ctx.quiet) throw err(T("“Dịch khi gõ” không tải trang web — bấm ▶ Dịch."), { warn: true });
      if (!WebPage.agreed() && !navigator.userActivation?.isActive) {
        const msg = T("Bấm ▶ Dịch để tải trang qua Jina Reader rồi dịch."), kept = existing(ctx.id) ? Docs.text(existing(ctx.id)) : "";
        return { text: kept, error: err(msg, { warn: true }), view: { kind: "translate", srcId: ctx.id, text: kept, web: { url }, pending: true, warnings: [msg] } };
      }
      StatusBar.msg(T("Đang tải trang qua Jina Reader…"));
      page = await WebPage.load(url);
      if (!/\p{L}/u.test(WebPage.plain(page.md))) throw err(T("Trang không có chữ để dịch."), { warn: true });
      text = page.md;
      // budget: chars the provider can take (on-device max / MyMemory quota left today); a longer page gets its first pieces translated.
      ctx = { ...ctx, post: WebPage.esc, split: (t, max, budget) => {
        if (budget <= 0) throw err(T("MyMemory: đã hết quota miễn phí hôm nay (~5.000 ký tự / ngày) — thử lại ngày mai hoặc dùng Chrome / Edge có bộ dịch trên máy."), { quota: true });
        return Object.assign(cut, WebPage.cap(WebPage.plan(t, max), budget)).segs;
      } };
    }
    const web = page && { url: page.url || url, title: page.title }, look = () => page ? null : lookTerms(s, text, ranges, from, ctx.quiet);
    const { from, by } = await sourceLang(page ? WebPage.plain(text) : text, s, page?.lang), to = s.to === "auto" ? TrLang.pairFor(from, "auto") : s.to;
    if (from === to) throw err(T("Ngôn ngữ nguồn và đích trùng nhau ({lang}) — chọn ngôn ngữ khác.", { lang: name(from) }), { warn: true });
    const status = await OnDevice.availability(from, to), ready = status === "available", canGet = status === "downloadable" || status === "downloading";
    if (ctx.quiet && !ready) throw err(T("“Dịch khi gõ” chỉ chạy khi bộ dịch trên máy đã sẵn sàng — bấm ▶ Dịch."), { warn: true });
    // Opened from a link / ?demo= (no click yet): the tab opens and waits for ▶ Dịch, since the language pack download needs a click.
    if (canGet && !navigator.userActivation?.isActive) {
      const msg = T("Cần tải gói dịch {from} → {to} về máy (1 lần) — bấm ▶ Dịch để bắt đầu.", { from: name(from), to: name(to) });
      const kept = existing(ctx.id) ? Docs.text(existing(ctx.id)) : "";
      return { text: kept, error: err(msg, { warn: true }), view: { kind: "translate", srcId: ctx.id, text: kept, from, to, by, web, pending: true, warnings: [msg], look: look() } };
    }
    let out = null, provider = "device", deviceFailed = false, reason = status === null ? T("Trình duyệt này không có bộ dịch trên máy (Translator API của Chrome / Edge).")
      : T("Bộ dịch trên máy không hỗ trợ cặp {from} → {to}.", { from: name(from), to: name(to) });
    if (ready || canGet) {
      try { out = await onDevice(text, from, to, ctx); }
      catch (e) { const m = deviceError(e); if (m.stale || ctx.quiet || m.warn) throw m; reason = m.message; deviceFailed = true; }
    }
    if (out === null) { out = await myMemory(text, from, to, ctx, reason, deviceFailed); provider = "mymemory"; }
    Object.assign(s, { provider, lastFrom: from, lastTo: to });
    const notes = provider === "device" ? [T("Dịch trên máy — văn bản không rời trình duyệt.")]
      : [T("Đã dịch bằng MyMemory (hôm nay đã gửi ~{used} / 5.000 ký tự).", { used: I18n.num(MyMemory.used()) })];
    if (web) notes.push(T("Nội dung trang lấy qua Jina Reader (r.jina.ai) — chỉ gửi địa chỉ trang."));
    const warnings = cut.done < cut.total ? [T("Trang dài — mới dịch {done} / {total} đoạn đầu (giới hạn của {via}); phần sau giữ nguyên văn. Cần cả trang: ↗ Google Dịch.", { done: I18n.num(cut.done), total: I18n.num(cut.total), via: provider === "device" ? T("bộ dịch trên máy") : "MyMemory" })] : [];
    notes.push(...warnings);
    return { text: out, notes, view: { kind: "translate", srcId: ctx.id, text: out, src: text, from, to, by, provider, web, warnings, look: look() } };
  }

  // After F5 the saved translation shows again without any request (a web page's translation is Markdown).
  const restored = doc => {
    const src = Docs.get(doc.link.src), url = src ? WebPage.urlOf(Docs.text(Docs.root(src))) : "";
    return { kind: "translate", srcId: doc.link.src, text: Docs.text(doc), restored: true, to: of(doc.link.src).lastTo || "", web: url ? { url } : undefined };
  };

  return { run, of, liveOn, restored, name, list };
})();
