const PlantumlEngine = (() => {
  const keywords = new Set(("@startuml @enduml @startmindmap @endmindmap @startgantt @endgantt @startjson @endjson @startyaml @endyaml @startwbs @endwbs @startsalt @endsalt " +
    "actor participant boundary control entity database collections queue class interface abstract enum annotation object package namespace node folder frame cloud " +
    "component usecase rectangle state start stop if then else elseif endif while endwhile repeat fork end note left right top bottom of over as title header footer " +
    "legend caption skinparam autonumber activate deactivate alt opt loop par break group return hide show !include !theme !define").split(" "));

  const decode = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

  // Syntax errors arrive as a successful SVG listing the source in green, so the error is read back from that text.
  function errorOf(svg) {
    if (!svg.includes("#33FF02")) return null;
    const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => decode(m[1]).trim()).filter(Boolean);
    const at = texts.findIndex(t => /^\[From .*\(line \d+\)\s*\]$/.test(t));
    if (at < 0) return null;
    return { line: +texts[at].match(/\(line (\d+)\)/)[1], message: texts.slice(at).join("\n") };
  }

  async function ready() {
    globalThis.PLANTUML_STDLIB_BASE = VendorScripts.PLANTUML_DIR;
    await VendorScripts.load("graphviz");
    await VendorScripts.load("plantuml");
  }

  async function render(code, cfg) {
    const dark = cfg.dark === true;
    const svg = await new Promise((ok, no) => PlantUML.renderToString(code.split("\n"), ok, no, { dark }))
      .catch(e => { throw new DiagramError(String(e?.message || e)); });
    const bad = errorOf(svg);
    if (bad) throw new DiagramError(bad.message, { line: bad.line, syntax: true });
    return { svg, type: "PlantUML", bg: dark ? "#1e1e1e" : "#ffffff" };
  }

  return {
    id: "plantuml", label: "PlantUML", lib: "PlantUML", ext: ".puml", accept: ".puml,.plantuml,.pu,.iuml,.md,.txt", fence: "plantuml",
    defaultConfig: "{}", comment: "^\\s*'.*$", keywords, errorOf,
    placeholder: "Gõ mã PlantUML, ví dụ: @startuml\nAlice -> Bob : Hello\n@enduml",
    get samples() { return PLANTUML_SAMPLES; },
    firstSample: "sequence",
    controls: [{ key: "dark", title: "Nền sơ đồ", dflt: false, options: [[false, "Nền sáng"], [true, "Nền tối"]] }],
    ready, render,
  };
})();
if (typeof module !== "undefined") module.exports = { PlantumlEngine };
