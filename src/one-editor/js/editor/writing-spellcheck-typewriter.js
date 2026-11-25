// Writing aids: browser English spellcheck per tab (default by tab type in ⚙), typewriter scrolling, word count + reading time for prose tabs; installed after the editor is typeable.
const Writing = (() => {
  const PROSE = new Set(["Markdown", "Plain Text"]), WPM = 200;
  const docOf = view => { const g = Views.groups.find(x => x.view === view); return g && Docs.get(g.active); };
  const prose = d => !!d && (d.kind === "note" || PROSE.has(Docs.effectiveLang(d)));
  // Notes are usually Vietnamese, so they default off; Markdown / text on; code off.
  const typeKey = d => d.kind === "note" ? "spellNote" : PROSE.has(Docs.effectiveLang(d)) ? "spellText" : "spellCode";
  const DEF = { spellNote: false, spellText: true, spellCode: false };
  const typeDefault = k => Prefs.get(k, DEF[k]) === true;
  const spellOn = d => !!d && !d.big && !d.hex && (typeof d.spell === "boolean" ? d.spell : typeDefault(typeKey(d)));
  const typewriter = () => Prefs.get("typewriter", false) === true;

  // Pure: words of a text (letters / digits runs, so "trade-date" is 2) and minutes to read at 200 words a minute.
  const words = s => (s.match(/[\p{L}\p{N}_]+/gu) || []).length;
  const minutes = n => Math.max(1, Math.round(n / WPM));

  function build() {
    const V = CM.view.EditorView, out = [Sticky.extension()];
    out.push(V.contentAttributes.of(view => spellOn(docOf(view)) ? { spellcheck: "true", lang: "en" } : null));
    if (typewriter()) out.push(V.scrollMargins.of(view => { const h = Math.max(0, view.scrollDOM.clientHeight / 2 - view.defaultLineHeight); return { top: h, bottom: h }; }), V.theme({ ".cm-content": { paddingBottom: "45vh" } }));
    out.push(SmartPaste.field());
    return out;
  }
  const apply = () => CmSetup.setExtra("writing", build());

  function toggleSpell(d = Views.activeDoc()) {
    if (!d || Docs.isList(d)) { StatusBar.msg(T("Chưa có tab nào đang chọn."), "warn"); return; }
    d.spell = !spellOn(d);
    d.pending = true;
    HotExit.schedule();
    Views.applySettings();
    StatusBar.msg(d.spell ? T("Kiểm chính tả English: bật cho “{name}” — từ sai được gạch đỏ; Shift+chuột phải lên từ để xem gợi ý.", { name: d.name }) : T("Kiểm chính tả English: tắt cho “{name}”.", { name: d.name }), "good");
  }
  function setTypewriter(v) { Prefs.set("typewriter", !!v); apply(); }
  function setSticky(v) { Prefs.set("sticky", !!v); Views.applySettings(); }

  return { apply, toggleSpell, spellOn, setTypewriter, setSticky, typewriter, prose, words, minutes, typeDefault, DEF };
})();
