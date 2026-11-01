// Run: node --test src/diagram-editor/tests/c4-sample-builders.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "js");
const FILES = ["samples/mermaid-samples.js", "samples/plantuml-samples.js", "samples/drawio-samples.js", "samples/dbml-samples.js", "samples/d2-samples.js", "samples/structurizr-samples.js",
  "samples/c4/c4-model-digital-banking.js", "samples/c4/c4-model-securities-trading.js", "samples/c4/c4-model-online-shopping.js", "samples/c4/c4-level-views.js",
  "samples/c4/c4-to-mermaid-plantuml.js", "samples/c4/c4-to-d2.js", "samples/c4/c4-to-drawio.js", "samples/c4/c4-to-structurizr.js", "samples/c4/c4-sample-registry.js",
  "engines/structurizr-dsl-parser.js", "engines/structurizr-view-to-dot.js"];
const ctx = vm.createContext({ T: s => s });
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") +
  "\n;Object.assign(globalThis, { MERMAID_SAMPLES, PLANTUML_SAMPLES, DRAWIO_SAMPLES, DBML_SAMPLES, D2_SAMPLES, STRUCTURIZR_SAMPLES, C4Views, StructurizrParser, StructurizrViews, MODELS: [C4_MODEL_BANKING, C4_MODEL_SECURITIES, C4_MODEL_SHOPPING] });", ctx);
const { MERMAID_SAMPLES, PLANTUML_SAMPLES, DRAWIO_SAMPLES, DBML_SAMPLES, D2_SAMPLES, STRUCTURIZR_SAMPLES, C4Views, StructurizrParser, StructurizrViews, MODELS } = ctx;

const KEYS = MODELS.flatMap(m => C4Views.LEVELS.map(l => `c4-${m.key}-${l.key}`));

test("c4: 3 systems × 4 levels exist on every text tab", () => {
  assert.deepEqual([...MODELS.map(m => m.key)], ["bank", "securities", "shop"]);
  assert.equal(KEYS.length, 12);
  for (const samples of [MERMAID_SAMPLES, PLANTUML_SAMPLES, DRAWIO_SAMPLES, D2_SAMPLES]) for (const k of KEYS) assert.ok(samples[k]?.[1], k);
  for (const m of MODELS) {
    assert.ok(STRUCTURIZR_SAMPLES[`c4-${m.key}`]);
    assert.ok(DBML_SAMPLES[`c4-${m.key}-code`]);
  }
});

test("c4: identifiers are unique ignoring case and every relationship resolves", () => {
  for (const m of MODELS) {
    const ids = [m.systemId, m.codeFocus.id, ...[...m.people, ...m.externals, ...m.containers, ...m.components].map(e => e.id)];
    assert.equal(new Set(ids.map(i => i.toLowerCase())).size, ids.length, m.key);
    for (const r of [...m.rels.context, ...m.rels.container, ...m.rels.component]) for (const id of r.slice(0, 2)) assert.ok(ids.includes(id), `${m.key}: ${id}`);
    const names = m.classes.map(c => c.name);
    for (const r of m.rels.code) for (const n of r.slice(0, 2)) assert.ok(names.includes(n), `${m.key}: ${n}`);
  }
});

test("c4: no element is left without a relationship in its view", () => {
  for (const m of MODELS) for (const key of ["context", "container", "component"]) {
    const v = C4Views.view(m, key), used = new Set(v.rels.flatMap(r => [...r].slice(0, 2)));
    for (const e of [...v.inside, ...v.outside]) assert.ok(used.has(e.id), `${m.key}/${key}: ${e.id}`);
  }
  for (const m of MODELS) {
    const used = new Set(m.rels.code.flatMap(r => [...r].slice(0, 2)));
    for (const c of m.classes) assert.ok(used.has(c.name), `${m.key}/code: ${c.name}`);
  }
});

test("c4: Structurizr samples parse cleanly into four views with no stray nodes", () => {
  for (const m of MODELS) {
    const ws = StructurizrParser.parse(STRUCTURIZR_SAMPLES[`c4-${m.key}`][1]), views = StructurizrViews.list(ws);
    assert.deepEqual([...ws.errors], [], m.key);
    assert.deepEqual([...ws.warnings], [], m.key);
    assert.deepEqual([...views.map(v => v.id)], ["L1-context", "L2-container", "L3-component", "L4-code"]);
    const counts = views.map(v => StructurizrViews.dot(ws, v));
    assert.deepEqual([...counts.flatMap(c => [...c.warnings])], [], m.key);
    assert.equal(counts[3].count, m.classes.length);
    const l2 = C4Views.view(m, "container");
    assert.equal(counts[1].count, l2.inside.length + l2.outside.length, "the helper Code container stays out of L2");
  }
});

test("c4: draw.io samples have resolved edges and no overlapping siblings", () => {
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

test("c4: sample text stays free of quotes that would break the macro syntax", () => {
  for (const m of MODELS) {
    const elements = [...m.people, ...m.externals, ...m.containers, ...m.components].flatMap(e => [e.name, e.desc, e.tech ?? ""]);
    const rels = [...m.rels.context, ...m.rels.container, ...m.rels.component, ...m.rels.code].flatMap(r => [...r]);
    for (const text of [...elements, ...rels, ...m.classes.flatMap(c => [...c.members])]) assert.ok(!text.includes('"'), text);
  }
});
