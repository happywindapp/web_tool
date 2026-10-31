// The only tab that talks to the network: embed.diagrams.net loads in an iframe after the user clicks Connect, so opening a share link never sends a diagram out by itself.
const DrawioEmbed = (() => {
  const ORIGIN = "https://embed.diagrams.net", CONNECT_TIMEOUT = 30000;
  const SANDBOX = "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals";
  let frame = null, live = false, timer = 0, handlers = {}, pending = null, shown = null;

  const post = msg => frame?.contentWindow?.postMessage(JSON.stringify(msg), ORIGIN);
  const send = xml => { shown = xml; post({ action: "load", xml, autosave: 1 }); };
  const changed = (xml, explicit) => { shown = xml; handlers.onChange(xml, explicit); };

  function onMessage(e) {
    if (!frame || e.source !== frame.contentWindow || e.origin !== ORIGIN || typeof e.data !== "string") return;
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.event === "init") { live = true; clearTimeout(timer); send(pending ?? ""); pending = null; handlers.onReady(); }
    else if (m.event === "autosave" && typeof m.xml === "string") changed(m.xml, false);
    else if (m.event === "save" && typeof m.xml === "string") changed(m.xml, true);
    else if (m.event === "export" && typeof m.data === "string") handlers.onExport(m.data, m.format);
  }

  function connect(xml, box, lang) {
    pending = xml;
    frame?.remove();
    frame = document.createElement("iframe");
    frame.title = "draw.io";
    frame.setAttribute("sandbox", SANDBOX);
    frame.src = `${ORIGIN}/?embed=1&proto=json&spin=1&noExitBtn=1&saveAndExit=0&libraries=1&lang=${lang}`;
    box.replaceChildren(frame);
    clearTimeout(timer);
    timer = setTimeout(() => { if (!live) { frame?.remove(); frame = null; handlers.onFail(); } }, CONNECT_TIMEOUT);
  }

  // Reloading identical XML would wipe the editor's undo stack.
  function load(xml) { if (!live) pending = xml; else if (xml !== shown) send(xml); }
  const exportAs = format => post({ action: "export", format, spinKey: "export", ...(format === "png" ? { scale: 2 } : {}) });

  function validate(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml"), bad = doc.querySelector("parsererror");
    if (!bad) return /^(?:mxfile|mxGraphModel)$/.test(doc.documentElement.nodeName) ? null : { message: T("File draw.io phải có thẻ gốc <mxfile> hoặc <mxGraphModel>.") };
    const text = bad.textContent || "", m = text.match(/line (\d+)/i) || text.match(/(\d+):\d+/);
    return { message: text.trim().split("\n").slice(0, 2).join("\n"), line: m ? +m[1] : 0 };
  }

  const init = h => { handlers = h; window.addEventListener("message", onMessage); };
  return { init, connect, load, exportAs, validate, get live() { return live; } };
})();

const DrawioEngine = {
  id: "drawio", label: "draw.io", lib: "draw.io", ext: ".drawio", accept: ".drawio,.xml", external: true, defaultConfig: "{}",
  comment: "<!--.*?-->", keywords: new Set(),
  placeholder: "",
  get samples() { return DRAWIO_SAMPLES; },
  firstSample: "flow",
  controls: [],
  ready: () => Promise.resolve(),
  render(code) {
    const bad = DrawioEmbed.validate(code);
    if (bad) throw new DiagramError(bad.message, { line: bad.line || 0, syntax: true });
    DrawioEmbed.load(code);
    return { external: true, type: "draw.io" };
  },
};
