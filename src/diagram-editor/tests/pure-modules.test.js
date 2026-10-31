// Run: node --test src/diagram-editor/tests/pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({ T: s => s, VendorScripts: {}, DiagramError: class extends Error { constructor(m, o = {}) { super(m); Object.assign(this, o); } } });
const load = (...files) => vm.runInContext(files.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") +
  "\n;Object.assign(globalThis, { StructurizrParser, StructurizrViews, DbmlToDot, PlantumlEngine, D2Engine, MermaidEngine, Highlight, STRUCTURIZR_SAMPLES });", ctx);
load("js/engines/structurizr-dsl-parser.js", "js/engines/structurizr-view-to-dot.js", "js/engines/dbml-schema-to-dot.js", "js/engines/plantuml-engine.js",
  "js/engines/d2-engine.js", "js/engines/mermaid-engine.js", "js/core/source-highlighter.js", "js/samples/structurizr-samples.js");
const { StructurizrParser: P, StructurizrViews: V, DbmlToDot, PlantumlEngine, D2Engine, MermaidEngine, Highlight, STRUCTURIZR_SAMPLES } = ctx;

const WS = `workspace "Demo" {
  model {
    u = person "User" // trailing comment
    s = softwareSystem "Shop" {
      web = container "Web" "UI" "React"
      api = container "API" "" "Go" {
        ctl = component "Controller"
      }
      web -> api "Calls" "HTTPS"
    }
    pay = softwareSystem "Pay" "" "External"
    u -> web "Uses"
    ctl -> pay "Charges"
  }
  views {
    systemContext s "ctx" {
      include *
      autoLayout lr
    }
    container s "cnt" {
      include *
    }
    component api "cmp" {
      include *
    }
    styles {
      element "External" {
        background #999999
      }
    }
  }
}`;
const element = (ws, name) => ws.elements.find(e => e.name === name);

test("structurizr: parses elements, nesting, tags and relationships", () => {
  const ws = P.parse(WS);
  assert.deepEqual([...ws.errors], []);
  assert.equal(ws.name, "Demo");
  assert.equal(element(ws, "Web").parent.name, "Shop");
  assert.equal(element(ws, "Web").technology, "React");
  assert.ok(element(ws, "Pay").tags.includes("External"));
  assert.equal(ws.relationships.length, 3);
  assert.equal(ws.styles.element.External.background, "#999999");
});

test("structurizr: a context view lifts relationships to visible ancestors", () => {
  const ws = P.parse(WS), ctxView = V.list(ws).find(v => v.key === "ctx"), out = V.dot(ws, ctxView);
  assert.equal(out.count, 3);
  assert.equal(ctxView.direction, "lr");
  assert.match(out.text, /rankdir=LR/);
  const [u, s, pay] = ["User", "Shop", "Pay"].map(n => element(ws, n).uid);
  assert.match(out.text, new RegExp(`${u} -> ${s} `));
  assert.match(out.text, new RegExp(`${s} -> ${pay} `));
  assert.match(out.text, /fillcolor="#999999"/);
});

test("structurizr: container view draws a boundary, component view keeps sibling containers", () => {
  const ws = P.parse(WS), views = V.list(ws);
  assert.match(V.dot(ws, views.find(v => v.key === "cnt")).text, /subgraph cluster_scope/);
  const cmp = V.dot(ws, views.find(v => v.key === "cmp"));
  assert.ok(cmp.text.includes(">Web<"), "sibling container Web is shown");
  assert.ok(cmp.text.includes(">Pay<"), "external system is shown");
});

test("structurizr: views are generated when the DSL declares none", () => {
  const ws = P.parse(STRUCTURIZR_SAMPLES.auto[1]), kinds = V.list(ws).map(v => v.kind);
  assert.deepEqual([...ws.errors], []);
  assert.deepEqual([...kinds], ["systemLandscape", "systemContext", "container", "systemContext"]);
});

test("structurizr: hierarchical identifiers resolve from the enclosing scope", () => {
  const ws = P.parse(`workspace {
  !identifiers hierarchical
  model {
    a = softwareSystem "A" {
      api = container "A API"
    }
    b = softwareSystem "B" {
      api = container "B API"
      caller = container "Caller"
      caller -> api "local"
      caller -> a.api "remote"
    }
  }
}`);
  assert.deepEqual([...ws.errors], []);
  assert.deepEqual([...ws.relationships.map(r => r.to.name)], ["B API", "A API"]);
});

test("structurizr: errors carry a line, unsupported blocks only warn", () => {
  const ws = P.parse(`workspace {
  model {
    user = person "User"
    user -> ghost "Uses"
    deploymentEnvironment "Live" {
      deploymentNode "x"
    }
  }
}`);
  assert.equal(ws.errors.length, 1);
  assert.equal(ws.errors[0].line, 4);
  assert.deepEqual({ ...ws.errors[0].args }, { id: "ghost" });
  assert.equal(ws.warnings.length, 1);
  assert.equal(P.parse("model {\n}").errors[0].line, 1);
  assert.equal(P.parse("workspace {\n  model {\n").errors.length, 2);
});

test("structurizr: include/exclude expressions and tags with == are honoured", () => {
  const ws = P.parse(`workspace {
  model {
    a = softwareSystem "A" "" "Keep"
    b = softwareSystem "B"
    c = softwareSystem "C"
  }
  views {
    systemLandscape "one" {
      include element.tag==Keep c
      exclude c
    }
  }
}`);
  const out = V.dot(ws, V.list(ws)[0]);
  assert.equal(out.count, 1);
  assert.ok(out.text.includes(">A<"));
});

test("structurizr: labels and colours cannot break out of DOT", () => {
  const ws = P.parse(`workspace {
  model {
    a = softwareSystem "<img src=x onerror=1>" "\\"];evil" "Bad"
  }
  views {
    systemLandscape "v" {
      include *
    }
    styles {
      element "Bad" {
        background "#fff\\"];evil"
      }
    }
  }
}`), { text } = V.dot(ws, V.list(ws)[0]);
  assert.ok(!text.includes("<img"));
  assert.ok(text.includes("&lt;img src=x onerror=1&gt;"));
  assert.ok(!text.includes('"];evil'));
});

const DB = {
  tables: [
    { name: "users", schemaName: null, headerColor: "#123456", fields: [{ name: "id", pk: true, type: { type_name: "int" } }, { name: "bio", type: { type_name: "text" } }] },
    { name: "posts", schemaName: null, fields: [{ name: "id", pk: true, type: { type_name: "int" } }, { name: "user_id", not_null: true, type: { type_name: "int" } }, { name: "state", type: { type_name: "st" } }] },
  ],
  refs: [{ endpoints: [{ tableName: "users", schemaName: null, fieldNames: ["id"], relation: "1" }, { tableName: "posts", schemaName: null, fieldNames: ["user_id"], relation: "*" }] }],
  enums: [{ name: "st", values: [{ name: "open" }] }],
  tableGroups: [{ name: "g", color: "#ff0000", tables: [{ name: "users", schemaName: null }] }],
};

test("dbml: FK edges run from the many side to the referenced column", () => {
  const dot = DbmlToDot.build(DB);
  assert.match(dot, /t1:r1 -> t0:l0 \[taillabel="\*", headlabel="1"\]/);
  assert.match(dot, /subgraph cluster_0/);
  assert.match(dot, /BGCOLOR="#123456"/);
  assert.match(dot, /t1:r2 -> e0/);
  assert.match(dot, /rankdir=LR/);
});

test("dbml: key-only mode hides plain columns but keeps the FK", () => {
  const dot = DbmlToDot.build(DB, { fields: "keys", rankdir: "TB" });
  assert.ok(!dot.includes(">bio<"));
  assert.ok(dot.includes(">user_id<"));
  assert.match(dot, /rankdir=TB/);
});

test("dbml: untrusted names and colours are escaped", () => {
  const dot = DbmlToDot.build({ tables: [{ name: "<b>x", schemaName: null, headerColor: 'red"];evil', fields: [] }], refs: [] });
  assert.ok(dot.includes("&lt;b&gt;x"));
  assert.ok(!dot.includes("evil"));
});

test("plantuml: reads the error back from the green-text SVG", () => {
  const svg = `<svg><text fill="#33FF02">PlantUML version</text><text fill="#33FF02">[From textarea (line 3) ]</text><text>@startuml</text><text>a -&gt; b</text><text>Syntax Error?</text></svg>`;
  const e = PlantumlEngine.errorOf(svg);
  assert.equal(e.line, 3);
  assert.match(e.message, /a -> b\nSyntax Error\?/);
  assert.equal(PlantumlEngine.errorOf('<svg><text fill="#33FF02">just a green label</text></svg>'), null);
});

test("d2: the JSON error list maps to a line and readable text", () => {
  const e = D2Engine.errorOf('[{"range":"index,1:1:6-1:5:10","errmsg":"index:2:2: connection missing destination"}]');
  assert.equal(e.line, 2);
  assert.equal(e.syntax, true);
  assert.equal(e.message, "2:2: connection missing destination");
  assert.equal(D2Engine.errorOf("worker crashed").message, "worker crashed");
});

test("mermaid: parser lines map past front-matter and comments", () => {
  const code = "---\ntitle: x\n---\n%% note\nflowchart LR\n  A --> B\n\n";
  assert.equal(MermaidEngine.editorLine(code, 2), 6);
  assert.equal(MermaidEngine.editorLine(code, 99), 6);
});

test("highlight: comments, strings and keywords follow the engine", () => {
  const html = Highlight.html('Table users { // hi\n  note: "x<y"\n}', { comment: "//.*$", keywords: new Set(["Table"]) });
  assert.ok(html.includes('<span class="k">Table</span>'));
  assert.ok(html.includes('<span class="c">// hi</span>'));
  assert.ok(html.includes('<span class="s">"x&lt;y"</span>'));
});
