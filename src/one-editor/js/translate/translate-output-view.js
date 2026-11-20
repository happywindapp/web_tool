// Translate tab body (inside the PreviewPane frame): language bar, translation, read aloud, look-up cards (PvDictCards). Text nodes only — API data never becomes HTML; a web page's Markdown goes through MdRender's whitelist.
const PvTranslate = {
  create(p) {
    const mk = (tag, cls, props) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, props);
    const btn = fn => mk("button", "", { type: "button", onclick: fn });
    const v = { el: mk("div", "pv-tr"), last: null, srcId: "" };
    const fromSel = mk("select", "tr-lang"), toSel = mk("select", "tr-lang"), swap = btn(() => swapLangs()), go = btn(() => rerun()), liveBox = mk("input", "", { type: "checkbox" }), liveText = mk("span"), live = mk("label", "chk");
    live.append(liveBox, liveText);
    const biBox = mk("input", "", { type: "checkbox", checked: Prefs.get("tr.bi", true) !== false }), biText = mk("span"), biLabel = mk("label", "chk");
    biLabel.append(biBox, biText);
    biBox.onchange = () => { Prefs.set("tr.bi", biBox.checked); if (v.last) v.show(v.last); };
    v.tools = [fromSel, swap, toSel, go, live, biLabel];
    const sayFrom = btn(() => say(true)), sayTo = btn(() => say(false)), hush = btn(() => Speech.stop()), rate = mk("select"), copy = btn(copyOut), noVoice = mk("span", "tr-muted"), acts = mk("div", "tr-acts");
    const open = u => window.open(u, "_blank", "noopener,noreferrer"), orig = btn(() => open(v.last.web.url)), google = btn(() => open(WebPage.googleUrl(v.last.web.url, langs().to)));
    acts.append(sayFrom, sayTo, hush, rate, copy, orig, google, noVoice);
    const out = mk("div", "tr-out", { tabIndex: 0 }), dict = PvDictCards.create(mk, btn);
    // In-page #links of a web page scroll to the heading; the page's own hash holds One Editor's share link.
    out.addEventListener("click", e => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      e.preventDefault();
      let slug = a.getAttribute("href").slice(1);
      try { slug = decodeURIComponent(slug); } catch { /* keep the raw fragment */ }
      [...out.querySelectorAll("[data-slug]")].find(h => h.dataset.slug === slug.toLowerCase())?.scrollIntoView({ block: "start" });
    });
    v.el.append(acts, out, dict.el);
    v.lookup = dict.lookup;
    const name = c => Translate.name(c), st = () => Translate.of(v.srcId), src = () => Docs.get(v.srcId);

    function rerun() {
      if (src()) OutputLink.run(src(), "translate");
      else StatusBar.msg(T("Tab nguồn của bản dịch này đã đóng."), "warn");
    }
    function swapLangs() {
      const s = st(), d = v.last || {}, f = d.from || (s.from !== "auto" ? s.from : ""), t = d.to || (s.to !== "auto" ? s.to : "");
      if (!f || !t) return rerun();
      Object.assign(s, { from: t, to: f });
      Prefs.set("tr.to", f);
      rerun();
    }
    fromSel.onchange = () => { st().from = fromSel.value; rerun(); };
    toSel.onchange = () => { st().to = toSel.value; Prefs.set("tr.to", toSel.value); rerun(); };
    liveBox.onchange = () => {
      const s = st();
      s.live = liveBox.checked;
      Prefs.set("tr.live", s.live);
      if (s.live && s.provider !== "device") StatusBar.msg(T("“Dịch khi gõ” chỉ chạy với bộ dịch trên máy — lần dịch này không dùng bộ dịch trên máy nên vẫn phải bấm ▶ Dịch."), "warn");
    };
    rate.onchange = () => Prefs.set("tr.rate", +rate.value);

    const langs = () => { const d = v.last || {}, s = st(); return { from: d.from || (s.from !== "auto" ? s.from : ""), to: d.to || (d.text?.trim() ? TrLang.guess(d.text) : "") }; };
    // A web page reads its text (not the URL in the source tab, nor link targets); the bilingual view never mixes both languages.
    function say(isSource) {
      const lang = isSource ? langs().from : langs().to, d = v.last || {};
      let text = "";
      if (isSource && d.web) text = d.src ? TrBilingual.plain(d.src) : "";
      else if (isSource) {
        const s = src(), state = s && Docs.root(s).state, sel = state && state.selection.main;
        text = sel && !sel.empty ? state.sliceDoc(sel.from, sel.to) : s ? Docs.text(Docs.root(s)) : "";
      } else {
        const sel = getSelection();
        text = sel && !sel.isCollapsed && out.contains(sel.anchorNode) ? sel.toString() : d.web ? TrBilingual.plain(d.text || "") : d.text || "";
      }
      if (!Speech.speak(text, lang, +rate.value || 1)) StatusBar.msg(T("Không đọc được — không có giọng đọc {lang} trên máy này, hoặc chưa có chữ.", { lang: name(lang || "en") }), "warn");
    }
    async function copyOut() {
      const ok = await Dom.copy(v.last?.text || "");
      StatusBar.msg(ok ? T("✔ Đã chép bản dịch.") : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
    }

    const opts = (sel, autoText, value) => {
      sel.replaceChildren(mk("option", "", { value: "auto", textContent: autoText }), ...TrLang.LANGS.map(c => mk("option", "", { value: c, textContent: name(c) })));
      sel.value = value;
    };
    v.labels = () => {
      if (!v.srcId) return;
      const d = v.last || {}, s = st(), l = langs();
      opts(fromSel, T("Tự nhận diện") + (s.from === "auto" && d.from ? " · " + name(d.from) : ""), s.from);
      opts(toSel, T("Tự chọn (Việt ↔ Anh)") + (s.to === "auto" && d.to ? " · " + name(d.to) : ""), s.to);
      Object.assign(fromSel, { title: T("Ngôn ngữ nguồn") });
      Object.assign(toSel, { title: T("Ngôn ngữ đích") });
      Object.assign(swap, { textContent: "⇆", title: T("Đổi chiều dịch (nguồn ↔ đích)") });
      Object.assign(go, { textContent: T("▶ Dịch"), title: T("Dịch lại tab nguồn với ngôn ngữ đang chọn") });
      liveText.textContent = T("Dịch khi gõ");
      live.title = T("Tự dịch lại khi sửa tab nguồn — chỉ với bộ dịch trên máy, không bao giờ gửi MyMemory khi đang gõ");
      liveBox.checked = s.live;
      liveBox.disabled = !OnDevice.has();
      biText.textContent = T("Song ngữ");
      biLabel.title = T("Hiện từng đoạn gốc, ngay dưới là bản dịch (🌐) — tắt thì chỉ hiện bản dịch");
      p.type.textContent = d.restored ? T("🌐 Bản dịch đã lưu — bấm ▶ Dịch để dịch lại") : !d.from ? T("🌐 Dịch")
        : d.pending ? T("🌐 {from} → {to}", { from: name(d.from), to: name(d.to) })
        : T("🌐 {from} → {to} · {via}", { from: name(d.from), to: name(d.to), via: d.provider === "device" ? T("trên máy") : "MyMemory" });
      p.type.title = d.provider === "mymemory" ? T("Văn bản đã được gửi tới api.mymemory.translated.net") : d.provider === "device" ? T("Dịch bằng Translator API của trình duyệt — không gửi văn bản đi đâu") : "";
      if (d.web) {
        let host = "";
        try { host = new URL(d.web.url).host; } catch { /* label without host */ }
        p.type.textContent = p.type.textContent.replace("🌐", "🌐 " + host + " ·");
        p.type.title = [d.web.title, d.web.url, T("Nội dung trang lấy qua Jina Reader (r.jina.ai) — chỉ gửi địa chỉ trang."), p.type.title].filter(Boolean).join("\n");
      }
      Object.assign(sayFrom, { textContent: T("🔊 Đọc nguồn"), title: T("Đọc to tab nguồn (vùng chọn nếu có) — giọng đọc của máy, không gửi đi đâu"), hidden: !Speech.has(l.from) });
      Object.assign(sayTo, { textContent: T("🔊 Đọc bản dịch"), title: T("Đọc to bản dịch (đoạn bôi đen nếu có)"), hidden: !Speech.has(l.to) });
      Object.assign(hush, { textContent: T("■ Dừng"), title: T("Dừng đọc"), hidden: sayFrom.hidden && sayTo.hidden });
      const r = +rate.value || Prefs.get("tr.rate", 1);
      rate.replaceChildren(...[0.75, 1, 1.25, 1.5].map(x => mk("option", "", { value: x, textContent: x + "×" })));
      Object.assign(rate, { value: [0.75, 1, 1.25, 1.5].includes(r) ? r : 1, title: T("Tốc độ đọc"), hidden: hush.hidden });
      const missing = [l.from, l.to].filter(c => c && !Speech.has(c)).map(name);
      noVoice.textContent = !Speech.ok() ? T("Trình duyệt không hỗ trợ đọc to.") : missing.length ? T("Không có giọng đọc {langs} trên máy này.", { langs: missing.join(", ") }) : "";
      Object.assign(copy, { textContent: T("⧉ Chép bản dịch"), title: d.web ? T("Chép bản dịch (Markdown) vào clipboard") : T("Chép bản dịch vào clipboard") });
      Object.assign(orig, { textContent: T("↗ Trang gốc"), title: d.web ? d.web.url : "", hidden: !d.web });
      Object.assign(google, { textContent: T("↗ Google Dịch"), title: T("Mở trang bằng Google Dịch ở tab mới — giữ giao diện gốc (Google không cho nhúng vào view)"), hidden: !d.web });
      dict.labels();
    };
    v.show = d => {
      v.last = d;
      v.srcId = d.srcId || v.srcId;
      // Source for the bilingual view: the run's text; after F5 a plain-text tab pairs with its source tab (a web page has no saved source ⇒ translation only).
      const web = !!d.web && !d.empty && !!d.text, s = src(), srcText = d.src ?? (d.web || !s ? "" : Docs.text(Docs.root(s)));
      const rows = biBox.checked && !d.empty && d.text && srcText ? (web ? TrBilingual.blocks(srcText, d.text) : TrBilingual.lines(srcText, d.text)) : null;
      out.classList.toggle("pv-md", web);
      out.classList.toggle("tr-bil", !!rows);
      if (rows) out.replaceChildren(...rows);
      else if (web) out.replaceChildren(...MdRender.parse(d.text).map(n => PvMarkdown.build(n)));
      else out.textContent = d.empty ? "" : d.text;
      out.lang = d.to || "";
      out.hidden = !!d.pending && !d.text;
      dict.show(d);
      v.labels();
      return !d.empty && !!d.text;
    };
    Speech.onVoices(() => { if (v.el.isConnected && v.last) v.labels(); });
    return v;
  },
};
