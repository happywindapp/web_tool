// Highlighting: the language-data bundle (~1.2 MB) loads on first need, then each language's support on demand; ids without a highlighter stay plain text.
const LangLoader = (() => {
  let bundle = null;

  async function support(id) {
    const name = LangDetect.highlighter(id);
    if (!name) return null;
    bundle ??= VendorPaths.load("cmLanguages").catch(e => { bundle = null; throw e; });
    await bundle;
    const desc = CM.language.LanguageDescription.matchLanguageName(CM.languages, name, false);
    return desc ? desc.support || await desc.load() : null;
  }

  async function apply(doc) {
    const id = Docs.effectiveLang(doc);
    if (doc.langApplied === id) return;
    try {
      const s = await support(id);
      if (Docs.effectiveLang(doc) !== id || !Docs.get(doc.id) || !doc.state) return;
      doc.langApplied = id;
      Views.applyEffect(doc, CmSetup.langEffect([s || [], EditorExtras.emmetFor(id)]));
    } catch (e) {
      StatusBar.msg(T("Không nạp được gói tô màu ngôn ngữ ({file}).", { file: e.message }), "bad");
    }
  }

  return { apply, support };
})();
