// Translate / read-aloud commands (phase 7). Read aloud works on any tab: the selection, or the whole tab.
function registerTranslateCommands(C, doc, hasDoc) {
  C("translate", "🌐 Dịch ở view kia (bản dịch, đọc to, từ điển)", ["Ctrl+k t", "Ctrl+k Ctrl+t"], () => OutputLink.run(doc(), "translate"), hasDoc);
  C("readAloud", "🔊 Đọc to vùng chọn / cả tab (giọng đọc của máy)", null, () => {
    const st = Views.activeView().state, sel = st.selection.main, text = sel.empty ? st.doc.toString() : st.sliceDoc(sel.from, sel.to), lang = TrLang.guess(text);
    if (!Speech.speak(text, lang, Prefs.get("tr.rate", 1))) StatusBar.msg(T("Không đọc được — không có giọng đọc {lang} trên máy này, hoặc chưa có chữ.", { lang: Translate.name(lang) }), "warn");
    else StatusBar.msg(T("🔊 Đang đọc ({lang}) — lệnh “Dừng đọc to” để dừng.", { lang: Translate.name(lang) }));
  }, () => hasDoc() && Speech.ok() && !PreviewPane.isPane(doc()));
  C("readStop", "■ Dừng đọc to", null, () => Speech.stop(), () => Speech.ok());
}
