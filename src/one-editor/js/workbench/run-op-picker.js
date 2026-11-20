// ▶ Run's operation per tab: the one picked by hand for it, else a default fitting its language; a result tab shows the op that made it.
const RunOp = (() => {
  const picked = new Map();
  const BY_LANG = { JSON: "json-pretty", JavaScript: "run-code", HTML: "run-code", Log: "filter" };
  const keyOf = doc => doc.kind === "output" && doc.link ? doc.link.src : Docs.root(doc).id;

  function suggest(doc) {
    const lang = Docs.effectiveLang(doc);
    if (Object.hasOwn(BY_LANG, lang)) return BY_LANG[lang];
    return PreviewPane.kindOf(Docs.root(doc)) ? "preview" : "format";
  }

  function of(doc) {
    if (doc.kind === "output" && doc.link && OutputOps.get(doc.link.op)) return doc.link.op;
    return picked.get(keyOf(doc)) || suggest(doc);
  }

  const pick = (doc, op) => { if (doc && OutputOps.get(op)) picked.set(keyOf(doc), op); };

  return { of, pick, suggest };
})();
