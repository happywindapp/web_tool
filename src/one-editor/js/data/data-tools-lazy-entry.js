// Entry of the data tools (phase 8b + the 8a line filter): the tree / query / filter panes live in tools/one-editor-extras.js, loaded on first use; the query text of each source tab stays here.
const DataOps = (() => {
  const states = new Map();
  let ready = null;

  async function load() {
    ready ??= VendorPaths.load("extras").then(() => { PreviewPane.addView("tree", PvTree); PreviewPane.addView("query", PvQuery); PreviewPane.addView("filter", PvFilter); })
      .catch(e => { ready = null; throw new Error(T("Không nạp được công cụ dữ liệu ({file}) — cần file này nằm cạnh one-editor.html.", { file: e.message })); });
    return ready;
  }

  // Query per source tab; after F5 the last query is read back from the saved result tab.
  function state(srcId) {
    if (!states.has(srcId)) {
      const out = Docs.list().find(d => d.kind === "output" && d.link?.src === srcId && d.link.op === "query");
      let q = "";
      try { q = out ? JSON.parse(Docs.text(out)).query || "" : ""; } catch { /* hand-edited result: start from the default query */ }
      states.set(srcId, { q });
    }
    return states.get(srcId);
  }

  const tree = async (t, c) => { await load(); return DataToolsOps.tree(t, c); };
  const query = async (t, c) => { await load(); return DataToolsOps.query(t, c, state(c.id).q); };

  return { load, state, tree, query };
})();
