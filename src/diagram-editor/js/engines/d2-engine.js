const D2Engine = (() => {
  const keywords = new Set("direction shape label style near icon vars classes class layers scenarios steps constraint tooltip link width height grid-rows grid-columns grid-gap sql_table sequence_diagram".split(" "));
  const DARK = { 200: "#1e1e2e" };
  let d2 = null, queue = Promise.resolve();

  async function ready() {
    await VendorScripts.load("d2");
    d2 ??= new D2();
    await d2.ready;
  }

  // Compile errors arrive as a JSON array whose entries read "index:<line>:<col>: message".
  function errorOf(message) {
    let items;
    try { items = JSON.parse(message); } catch { return new DiagramError(message); }
    if (!Array.isArray(items)) return new DiagramError(message);
    const text = items.map(i => String(i.errmsg ?? "").replace(/^index:/, "")).join("\n");
    return new DiagramError(text || message, { line: +(/^(\d+):/.exec(text) || [])[1] || 0, syntax: true });
  }

  // The worker keeps a single pending promise, so overlapping calls must wait their turn.
  function render(code, cfg) {
    const job = queue.then(async () => {
      const themeID = Number(cfg.themeID) || 0;
      const opts = { layout: cfg.layout === "elk" ? "elk" : "dagre", sketch: cfg.sketch === true, themeID, noXMLTag: true };
      try {
        const res = await d2.compile(code, opts);
        return { svg: await d2.render(res.diagram, res.renderOptions), type: opts.layout, bg: DARK[themeID] || "#ffffff" };
      } catch (e) { throw errorOf(String(e?.message || e)); }
    });
    queue = job.catch(() => {});
    return job;
  }

  return {
    id: "d2", label: "D2", lib: "D2", ext: ".d2", accept: ".d2,.md,.txt", fence: "d2",
    defaultConfig: "{}", comment: "#.*$", keywords, errorOf,
    placeholder: "Gõ mã D2, ví dụ: web -> api: HTTPS",
    get samples() { return D2_SAMPLES; },
    firstSample: "architecture",
    controls: [
      { key: "layout", title: "Thuật toán bố cục", dflt: "dagre", options: [["dagre", "Bố cục: dagre"], ["elk", "Bố cục: ELK"]] },
      { key: "themeID", title: "Theme", dflt: "0", options: [["0", "Theme: Neutral"], ["1", "Theme: Neutral grey"], ["3", "Theme: Terrastruct"], ["4", "Theme: Cool classics"], ["8", "Theme: Colorblind clear"], ["100", "Theme: Vanilla nitro"], ["103", "Theme: Earth tones"], ["200", "Theme: Dark mauve"], ["300", "Theme: Terminal"]] },
      { key: "sketch", title: "Kiểu nét", dflt: false, options: [[false, "Nét chuẩn"], [true, "Vẽ tay"]] },
    ],
    ready, render,
  };
})();
if (typeof module !== "undefined") module.exports = { D2Engine };
