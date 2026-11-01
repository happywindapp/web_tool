// Run: node --test src/diagram-editor/tests/ddd-sample-builders.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "js");
const c4 = ["c4-model-digital-banking", "c4-model-securities-trading", "c4-model-online-shopping", "c4-level-views", "c4-to-mermaid-plantuml", "c4-to-d2", "c4-to-drawio", "c4-to-structurizr", "c4-sample-registry"];
const ddd = ["ddd-model-digital-banking", "ddd-model-securities-trading", "ddd-model-online-shopping", "ddd-diagram-views", "ddd-to-mermaid-plantuml", "ddd-to-d2", "ddd-to-drawio", "ddd-to-structurizr", "ddd-sample-registry"];
const FILES = [...["mermaid", "plantuml", "drawio", "dbml", "d2", "structurizr"].map(n => `samples/${n}-samples.js`), ...c4.map(f => `samples/c4/${f}.js`), ...ddd.map(f => `samples/ddd/${f}.js`),
  "engines/structurizr-dsl-parser.js", "engines/structurizr-view-to-dot.js"];
const ctx = vm.createContext({ T: s => s });
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") +
  "\n;Object.assign(globalThis, { MERMAID_SAMPLES, PLANTUML_SAMPLES, DRAWIO_SAMPLES, DBML_SAMPLES, D2_SAMPLES, STRUCTURIZR_SAMPLES, DddViews, StructurizrParser, StructurizrViews, MODELS: [DDD_MODEL_BANKING, DDD_MODEL_SECURITIES, DDD_MODEL_SHOPPING] });", ctx);
const { MERMAID_SAMPLES, PLANTUML_SAMPLES, DRAWIO_SAMPLES, DBML_SAMPLES, D2_SAMPLES, STRUCTURIZR_SAMPLES, DddViews, StructurizrParser, StructurizrViews, MODELS } = ctx;

const KEYS = MODELS.flatMap(m => DddViews.VIEWS.map(v => `ddd-${m.key}-${v.key}`));
const GRAPHS = ["subdomains", "context-map", "event-flow", "hexagonal"];

test("ddd: 3 systems × 5 diagrams exist on every tab", () => {
  assert.equal(KEYS.length, 15);
  for (const samples of [MERMAID_SAMPLES, PLANTUML_SAMPLES, DRAWIO_SAMPLES, D2_SAMPLES]) for (const k of KEYS) assert.ok(samples[k]?.[1], k);
  for (const m of MODELS) {
    assert.ok(STRUCTURIZR_SAMPLES[`ddd-${m.key}`]);
    assert.ok(DBML_SAMPLES[`ddd-${m.key}-aggregates`]);
  }
});

test("ddd: every subdomain tier is populated and contexts map to one tier", () => {
  for (const m of MODELS) for (const g of DddViews.graph(m, "subdomains").groups) assert.ok(g.nodes.length, `${m.key}: ${g.id}`);
});

test("ddd: every edge endpoint resolves and node ids are unique ignoring case", () => {
  for (const m of MODELS) {
    for (const key of GRAPHS) {
      const v = DddViews.graph(m, key), ids = [...v.groups.flatMap(g => [...g.nodes]), ...v.nodes].map(n => n.id);
      assert.equal(new Set(ids.map(i => i.toLowerCase())).size, ids.length, `${m.key}/${key}`);
      for (const e of v.edges) for (const id of [...e].slice(0, 2)) assert.ok(ids.includes(id), `${m.key}/${key}: ${id}`);
    }
    const names = m.aggregates.flatMap(g => g.classes.map(c => c.name));
    assert.equal(new Set(names).size, names.length, m.key);
    for (const r of m.aggregateRels) for (const n of r.slice(0, 2)) assert.ok(names.includes(n), `${m.key}: ${n}`);
  }
});

test("ddd: no box is left unconnected except on the subdomain map", () => {
  for (const m of MODELS) for (const key of ["context-map", "event-flow", "hexagonal"]) {
    const v = DddViews.graph(m, key), used = new Set(v.edges.flatMap(e => [...e].slice(0, 2)));
    for (const n of [...v.groups.flatMap(g => [...g.nodes]), ...v.nodes]) assert.ok(used.has(n.id), `${m.key}/${key}: ${n.id}`);
  }
  for (const m of MODELS) {
    const used = new Set(m.aggregateRels.flatMap(r => r.slice(0, 2)));
    for (const c of m.aggregates.flatMap(g => g.classes)) assert.ok(used.has(c.name), `${m.key}: ${c.name}`);
  }
});

test("ddd: an aggregate references another aggregate root only", () => {
  for (const m of MODELS) {
    const owner = new Map(m.aggregates.flatMap(g => g.classes.map(c => [c.name, g])));
    for (const [from, to] of m.aggregateRels) {
      const a = owner.get(from), b = owner.get(to);
      if (a !== b && b.name !== "Domain events") assert.equal(b.classes.find(c => c.name === to).kind, "aggregate root", `${m.key}: ${from} -> ${to}`);
    }
  }
});

test("ddd: Structurizr samples parse cleanly into five views", () => {
  for (const m of MODELS) {
    const ws = StructurizrParser.parse(STRUCTURIZR_SAMPLES[`ddd-${m.key}`][1]), views = StructurizrViews.list(ws);
    assert.deepEqual([...ws.errors], [], m.key);
    assert.deepEqual([...ws.warnings], [], m.key);
    assert.deepEqual([...views.map(v => v.id)], [...DddViews.VIEWS.map(v => `ddd-${v.key}`)]);
    for (const v of views) assert.deepEqual([...StructurizrViews.dot(ws, v).warnings], [], v.id);
  }
});

test("ddd: draw.io samples have resolved edges and no overlapping siblings", () => {
  for (const k of KEYS) {
    const xml = DRAWIO_SAMPLES[k][1], ids = new Set([...xml.matchAll(/<mxCell id="([^"]+)"/g)].map(x => x[1]));
    for (const e of xml.matchAll(/source="([^"]+)" target="([^"]+)"/g)) assert.ok(ids.has(e[1]) && ids.has(e[2]), `${k}: ${e[0]}`);
    assert.equal(ids.size, [...xml.matchAll(/<mxCell id=/g)].length, `${k}: duplicate id`);
    const boxes = [...xml.matchAll(/vertex="1" parent="([^"]+)"><mxGeometry x="([\d.]+)" y="([\d.]+)" width="(\d+)" height="(\d+)"/g)].map(b => ({ p: b[1], x: +b[2], y: +b[3], w: +b[4], h: +b[5] }));
    for (const a of boxes) for (const b of boxes) {
      if (a === b || a.p !== b.p) continue;
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${k}: overlap`);
    }
  }
});

test("ddd: sample text stays free of quotes that would break generated syntax", () => {
  for (const m of MODELS) for (const key of GRAPHS) {
    const v = DddViews.graph(m, key), texts = [...v.groups.flatMap(g => [g.name, ...g.nodes.flatMap(n => [n.name, n.caption, n.desc])]), ...v.nodes.flatMap(n => [n.name, n.caption, n.desc]), ...v.edges.flatMap(e => [...e])];
    for (const t of texts) assert.ok(!String(t).includes('"'), t);
  }
});
