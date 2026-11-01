// Run: node --test src/diagram-editor/tests/dbml-full-schema-samples.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repo = path.join(__dirname, "..", "..", "..");
const read = f => fs.readFileSync(path.join(repo, f), "utf8");
const included = [...read("src/diagram-editor/diagram-editor.template.html").matchAll(/@include (js\/samples\/dbml\S*)/g)].map(m => `src/diagram-editor/${m[1]}`);
const files = included.filter(f => f.includes("/dbml/"));
const ctx = vm.createContext({ self: {}, console });
vm.runInContext(`${read("tools/vendor/dbml-parse-11.0.0.min.js")}\n;${included.map(read).join("\n;\n")}\n;Object.assign(globalThis, { DBML_SAMPLES, DbmlParse: typeof DbmlParse !== "undefined" ? DbmlParse : self.DbmlParse });`, ctx);
const { DBML_SAMPLES, DbmlParse } = ctx;

const FULL = Object.entries(DBML_SAMPLES).filter(([k]) => k.startsWith("db-"));
// Generic infrastructure tables: they point at any entity by type + id, so no FK.
const STANDALONE = new Set(["outbox_events", "audit_logs"]);

function compile(code) {
  const entry = DbmlParse.DEFAULT_ENTRY, layout = new DbmlParse.MemoryProjectLayout();
  layout.setSource(entry, code);
  const report = new DbmlParse.Compiler(layout).interpretFile(entry);
  return { errors: report.getErrors(), db: report.getValue() };
}

test("full schemas: one file per system, grouped in the dropdown above C4 and DDD", () => {
  assert.deepEqual(FULL.map(([k]) => k).sort(), ["db-banking", "db-crypto", "db-game", "db-logistics", "db-securities", "db-shopping"]);
  assert.equal(FULL.length, files.length);
  const keys = Object.keys(DBML_SAMPLES), firstGenerated = keys.findIndex(k => /^(c4|ddd)-/.test(k));
  assert.ok(firstGenerated > keys.indexOf(FULL.at(-1)[0]), keys.join());
  for (const [k, [label, code, group]] of FULL) assert.ok(label && code && group === "Database đầy đủ", k);
});

for (const [key, [, code]] of FULL) test(`${key}: compiles and hangs together`, () => {
  const { errors, db } = compile(code);
  assert.deepEqual([...errors].map(e => `${(e.nodeOrToken?.startPos?.line ?? -2) + 1}: ${e.diagnostic}`), []);
  assert.ok(db.tables.length >= 30, `${key}: only ${db.tables.length} tables`);

  const grouped = db.tableGroups.flatMap(g => g.tables.map(t => t.name));
  assert.deepEqual([...grouped].sort(), [...db.tables].map(t => t.name).sort(), "every table sits in exactly one group");

  const fieldType = (t, f) => db.tables.find(x => x.name === t).fields.find(x => x.name === f).type.type_name;
  for (const r of db.refs) {
    const [a, b] = r.endpoints;
    assert.equal(fieldType(a.tableName, a.fieldNames[0]), fieldType(b.tableName, b.fieldNames[0]), `${a.tableName}.${a.fieldNames[0]} vs ${b.tableName}.${b.fieldNames[0]}`);
  }

  const used = new Set(db.tables.flatMap(t => t.fields.map(f => f.type.type_name)));
  for (const e of db.enums) assert.ok(used.has(e.name), `unused enum ${e.name}`);
  for (const t of db.tables) for (const f of t.fields) {
    const e = db.enums.find(x => x.name === f.type.type_name);
    if (e && f.dbdefault) assert.ok(e.values.some(v => v.name === f.dbdefault.value), `${t.name}.${f.name} default ${f.dbdefault.value}`);
  }

  const linked = new Set(db.refs.flatMap(r => r.endpoints.map(e => e.tableName)));
  for (const t of db.tables) if (!STANDALONE.has(t.name)) assert.ok(linked.has(t.name), `orphan table ${t.name}`);
});
