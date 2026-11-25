// Run: node --test src/one-editor/tests/writing-paste-backup-pure-modules.test.js — phase 14a: PasteDetect, ProfileFile (build / parse / plan), Sticky chains, Writing word stats.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({ atob, btoa, TextDecoder });
vm.runInContext(["js/core/paste-content-detect-pure.js", "js/core/my-library-import-export-pure.js", "js/core/profile-backup-pure.js", "js/editor/sticky-scroll-header.js", "js/editor/writing-spellcheck-typewriter.js"]
  .map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;Object.assign(globalThis, { PasteDetect, ProfileFile, Sticky, Writing });", ctx);
const { PasteDetect: D, ProfileFile: F, Sticky, Writing } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const kind = s => D.detect(s)?.kind ?? null;
const b64u = s => Buffer.from(s).toString("base64url");

test("PasteDetect: each kind and its ▶ op", () => {
  const jwt = b64u('{"alg":"HS256"}') + "." + b64u('{"sub":"x"}') + ".sig";
  assert.equal(D.detect(jwt).op, "jwt");
  assert.equal(kind("-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----"), "pem");
  assert.match(D.detect("-----BEGIN PRIVATE KEY-----\nMII").label, /khoá riêng/);
  assert.equal(kind("curl -X POST https://api.example.com/v1/orders -d '{}'"), "curl");
  assert.equal(D.detect("8=FIX.4.4\u00019=12\u000135=D\u000110=000\u0001").op, "fix-detail");
  assert.equal(kind("8=FIX.4.4|9=12|35=8|10=000|"), "fix");
  assert.equal(kind("{1:F01DEMOBANKAXXX0000000000}{2:I540DEMOVNVXXXXXN}{4:\n:16R:GENL\n-}"), "swift");
  assert.equal(D.detect("openapi: 3.0.3\ninfo:\n  title: Demo").lang, "YAML");
  assert.equal(D.detect('{"openapi":"3.1.0","info":{}}').lang, "JSON");
  assert.equal(kind("https://example.com/api/v1/orders?status=open&symbol=ACME&limit=50"), "url");
  assert.equal(kind("https://example.com/?a=1"), null, "short URL: nothing to explain");
  assert.equal(kind("*/5 9-15 * * MON-FRI"), "cron");
  assert.equal(kind("0 0 12 * * ?"), "cron");
  assert.equal(D.detect("1764061200").info, "2025-11-25T09:00:00.000Z");
  assert.equal(kind("1764061200000"), "epoch");
  assert.equal(D.detect(JSON.stringify({ rows: Array.from({ length: 10 }, (x, i) => ({ id: i, sym: "ACME" })) })).op, "json-pretty");
  assert.equal(D.detect("<orders>" + "<o id=\"1\" sym=\"ACME\"/>".repeat(8) + "</orders>").lang, "XML");
  assert.deepEqual(plain(D.detect(Buffer.from("Settlement batch DEMO-42 closed: 128 trades.").toString("base64")).steps), [{ op: "b64dec" }]);
  const gz = require("node:zlib").gzipSync("hello hello hello hello").toString("base64");
  assert.deepEqual(plain(D.detect(gz).steps), [{ op: "b64dec" }, { op: "gunzip" }]);
});

test("PasteDetect: prose, code and short text are not flagged", () => {
  for (const s of ["Hello world, this is a note.", "const x = 1;\nconsole.log(x);", "abc", "", "# Title\n\nSome text", "ThisIsJustAnIdentifierName", "2026-11-25 09:00"]) assert.equal(kind(s), null, s);
  assert.equal(D.detect(null), null);
});

const STATE = {
  prefs: { font: 14, keys: "vscode", gdriveKey: "AIza-secret" },
  meta: { groups: [{ id: "g1", name: "Desk", items: [{ kind: "note", id: "n1" }, { kind: "dir", name: "src", handle: {} }, { kind: "cloud", name: "Shared", link: "https://drive.google.com/x" }] }],
    pinned: [{ kind: "note", id: "n1" }, { kind: "file", name: "a.txt", handle: {} }], tags: { "root/a.txt": "red", "root/b": "pink" }, bookmarks: [{ name: "x", handle: {} }],
    snippets: [{ prefix: "log", body: "console.log($1)", lang: "JavaScript" }], macros: { dup: [{ c: "copyLineDown" }] }, replaceSets: [{ name: "tabs", rules: [] }], recipes: [{ name: "b64", steps: [{ op: "b64dec" }] }], keybindings: { save: "Ctrl+Alt+s" } },
  notes: [{ id: "n1", kind: "note", name: "todo.md", lang: "Markdown", text: "# todo\n", updated: 5, marks: [2], handle: null },
    { id: "n2", kind: "note", name: "secret", text: "", sealed: { salt: "c2FsdA", iv: "aXY", ct: "Y3Q", it: 600000 } }],
};

test("ProfileFile.build: handles and secrets stay behind, counts", () => {
  const { profile, skipped } = F.build(STATE);
  assert.equal(skipped, 3, "1 folder in a group + 1 pinned file + 1 closed-file bookmark");
  assert.equal(profile.prefs.gdriveKey, undefined);
  assert.equal(profile.meta.groups[0].items.length, 2);
  assert.deepEqual(plain(profile.meta.tags), { "root/a.txt": "red" });
  const c = F.counts(F.parse(JSON.stringify(profile)));
  assert.deepEqual(plain(c), { prefs: 2, keybindings: 1, groups: 1, pinned: 1, tags: 1, snippets: 1, macros: 1, replaceSets: 1, recipes: 1, notes: 2, history: 0 });
});

test("ProfileFile.parse: round trip, sealed note kept, bad files refused, library file accepted", () => {
  const p = F.parse(JSON.stringify(F.build({ ...STATE, history: [{ rec: { id: "h1", key: "n1", name: "todo.md", t: 1, size: 7, sum: "x" }, text: "# todo\n" }] }).profile));
  assert.equal(p.notes[1].sealed.ct, "Y3Q");
  assert.equal(p.notes[0].text, "# todo\n");
  assert.equal(p.history.length, 1);
  assert.equal(p.meta.macros.dup[0].c, "copyLineDown");
  for (const [text, code] of [["{", "json"], ['{"app":"other","version":1,"meta":{}}', "format"], ['{"app":"one-editor-profile","version":2,"meta":{}}', "format"]]) assert.throws(() => F.parse(text), e => e.code === code);
  const lib = F.parse(JSON.stringify({ version: 1, app: "one-editor-library", snippets: [{ prefix: "x", body: "y" }], macros: { m: [{ t: "a" }] }, replaceSets: [], recipes: [] }));
  assert.equal(lib.fromLibrary, true);
  assert.equal(lib.meta.snippets[0].prefix, "x");
  assert.deepEqual(plain(lib.meta.macros), { m: [{ t: "a" }] });
});

test("ProfileFile.parse: prototype keys and junk items dropped", () => {
  const p = F.parse('{"app":"one-editor-profile","version":1,"prefs":{"__proto__":1,"font":12},"meta":{"groups":[{"id":"g","name":"G","items":[{"kind":"evil"},{"kind":"note","id":"n"}]},{"id":5}],"tags":{"__proto__":"red","a":"red"}},"notes":[{"id":"n","text":1},{"id":"n2","text":"ok","kind":"file"}]}');
  assert.deepEqual(plain(p.prefs), { font: 12 });
  assert.deepEqual(plain(p.meta.groups), [{ id: "g", name: "G", items: [{ kind: "note", id: "n" }] }]);
  assert.deepEqual(plain(p.meta.tags), { a: "red" });
  assert.deepEqual(plain(p.notes.map(n => [n.id, n.kind])), [["n2", "note"]], "a profile note is always a note");
});

test("ProfileFile.plan: merge keep renames notes and remaps pins, replace swaps, all drops the rest", () => {
  const inc = F.parse(JSON.stringify(F.build(STATE).profile));
  const cur = { meta: { snippets: [{ prefix: "log", body: "old", lang: "JavaScript" }], macros: {}, replaceSets: [], recipes: [], groups: [{ id: "g1", name: "Desk", items: [] }], pinned: [], tags: { "root/a.txt": "blue" }, keybindings: {} },
    notes: [{ id: "n1", name: "todo.md", text: "mine" }, { id: "n9", name: "other", text: "x" }] };
  assert.equal(F.clashes(cur, inc), 2, "snippet log + note n1 (changed); same-id groups are joined, not counted");
  let k = 0;
  const keep = F.plan(cur, inc, "keep", id => id + "-new" + ++k);
  assert.deepEqual(plain(keep.notes.map(n => [n.id, n.name])), [["n1-new1", "todo.md (2)"], ["n2", "secret"]]);
  assert.deepEqual(plain(keep.meta.pinned), [{ kind: "note", id: "n1-new1" }]);
  assert.equal(keep.meta.groups.length, 1, "same id ⇒ one group");
  assert.deepEqual(plain(keep.meta.groups[0].items.map(p => p.id || p.link)), ["n1-new1", "https://drive.google.com/x"]);
  assert.equal(keep.meta.snippets.length, 2);
  assert.equal(keep.meta.tags["root/a.txt"], "blue", "keep: the current colour stays");
  assert.deepEqual(plain(keep.dropNotes), []);
  const rep = F.plan(cur, inc, "replace");
  assert.deepEqual(plain(rep.notes.map(n => n.id)), ["n1", "n2"]);
  assert.equal(rep.meta.snippets.length, 1);
  assert.equal(rep.meta.snippets[0].body, "console.log($1)");
  assert.equal(rep.meta.tags["root/a.txt"], "red");
  const all = F.plan(cur, inc, "all");
  assert.deepEqual(plain(all.dropNotes), ["n9"]);
  assert.equal(all.meta.groups[0].items.length, 2);
});

test("ProfileFile.plan: kinds missing from the file stay, folders in a group survive, own backup is not doubled", () => {
  const lib = F.parse(JSON.stringify({ version: 1, app: "one-editor-library", snippets: [{ prefix: "x", body: "y" }], macros: {}, replaceSets: [], recipes: [] }));
  const cur = { meta: { groups: [{ id: "g1", name: "Desk", items: [{ kind: "dir", name: "src", handle: {} }] }] }, notes: [{ id: "n1", name: "a", text: "t" }] };
  assert.deepEqual(plain(F.plan(cur, lib, "all").dropNotes), [], "library file: notes stay");
  const prof = F.parse(JSON.stringify({ app: "one-editor-profile", version: 1, meta: { groups: [{ id: "g1", name: "Desk 2", items: [{ kind: "note", id: "n1" }] }] } }));
  assert.equal(prof.has.notes, false);
  assert.deepEqual(plain(F.plan(cur, prof, "all").dropNotes), [], "profile without notes: notes stay");
  const rep = F.plan(cur, prof, "replace");
  assert.deepEqual(plain(rep.meta.groups[0].items.map(p => p.kind)), ["dir", "note"], "the folder handle kept here stays");
  assert.equal(rep.meta.groups[0].name, "Desk 2");
  const own = F.parse(JSON.stringify(F.build({ notes: cur.notes }).profile));
  assert.equal(F.clashes(cur, own), 0);
  assert.deepEqual(plain(F.plan(cur, own, "keep").notes), [], "an identical note is not imported twice");
  assert.equal(F.rounds(1e10, 1), 2000000);
  assert.equal(F.rounds("x", 7), 7);
});

test("PasteDetect: phone / account numbers and 3-letter words are not epoch / cron", () => {
  for (const s of ["0912345678", "9999999999", "Buy 100 AAA for the", "10 20 30 40 50"]) assert.equal(kind(s), null, s);
  assert.equal(kind("0 9 * * MON-FRI"), "cron");
});

test("Sticky: indentation and heading chains", () => {
  const lines = ["class A {", "  run() {", "    if (x) {", "", "      go();", "    }", "  }", "}"], at = n => lines[n - 1];
  assert.deepEqual(plain(Sticky.byIndent(at, 5)), [1, 2, 3]);
  assert.deepEqual(plain(Sticky.byIndent(at, 1)), []);
  assert.deepEqual(plain(Sticky.byIndent(at, 4)), [], "blank top line: nothing");
  const heads = [{ line: 1, level: 1 }, { line: 3, level: 2 }, { line: 10, level: 3 }, { line: 20, level: 2 }];
  assert.deepEqual(plain(Sticky.byHeading(heads, 15)), [1, 3, 10]);
  assert.deepEqual(plain(Sticky.byHeading(heads, 25)), [1, 20]);
  assert.deepEqual(plain(Sticky.byHeading(heads, 1)), []);
});

test("Writing: words and reading time", () => {
  assert.equal(Writing.words("Hello, trade-date 2026 — xin chào"), 6);
  assert.equal(Writing.words(""), 0);
  assert.equal(Writing.minutes(0), 1);
  assert.equal(Writing.minutes(450), 2);
  assert.equal(Writing.minutes(1000), 5);
});
