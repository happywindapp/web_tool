// Operations that turn a tab's text into an output tab in the other view (OutputLink). live: re-run while the source is edited. Errors carry the 1-based source line.
const OutputOps = (() => {
  function parseJson(text) {
    try { return JSON.parse(text); } catch (e) {
      const pos = /position (\d+)/.exec(e.message), lc = /line (\d+) column (\d+)/.exec(e.message);
      const line = pos ? TextUtil.lineCol(text, +pos[1]).line : lc ? +lc[1] : 0;
      throw Object.assign(new Error(T("JSON lỗi: {msg}", { msg: e.message })), { line });
    }
  }

  const OPS = {
    "json-pretty": { label: "JSON đẹp", lang: "JSON", live: true, run: t => JSON.stringify(parseJson(t), null, 2) },
    "json-minify": { label: "JSON gọn 1 dòng", lang: "JSON", live: true, run: t => JSON.stringify(parseJson(t)) },
  };

  const get = id => typeof id === "string" && Object.hasOwn(OPS, id) ? OPS[id] : null;
  return { get, ids: Object.keys(OPS), parseJson };
})();
