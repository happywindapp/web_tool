// DBML and Structurizr have no drawing engine of their own: both generate DOT for the Graphviz build that ships with PlantUML.
const Graphviz = (() => {
  let viz = null;
  async function ready() {
    await VendorScripts.load("graphviz");
    viz ??= await Viz.instance();
  }
  function svg(dot) {
    const r = viz.render(dot, { format: "svg" });
    if (r.status !== "success") throw new DiagramError(r.errors.map(e => e.message).join("\n"));
    return r.output;
  }
  return { ready, svg };
})();
