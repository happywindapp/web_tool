// Run: node --test src/one-editor/tests/transform-recipe-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");

const root = path.join(__dirname, "..");
const T = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s;
const ctx = vm.createContext({ T, I18n: { lang: "en", num: String }, Intl, TextEncoder, TextDecoder, URL, atob, btoa, crypto: globalThis.crypto, Blob, CompressionStream, DecompressionStream, performance, Docs: { text: d => d.text } });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/json-tolerant-parser.js", "js/notepadpp/line-and-text-operations.js",
  "js/devtools/uuid-epoch-base-tools.js", "js/devtools/string-escape-url-tools.js", "js/devtools/jwt-decode.js", "js/devtools/devtools-report-ops.js",
  "js/extras/transform-recipe-ops.js", "js/extras/transform-recipe-runner.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { RecipeOps, RecipeRun });", ctx);
const { RecipeOps, RecipeRun } = ctx;
const steps = list => RecipeRun.clean(list);

test("recipe: Base64 → gunzip → JSON format, per-step states", async () => {
  const b64 = zlib.gzipSync(Buffer.from('{"id":12345678901234567890,"ok":true}')).toString("base64");
  const r = await RecipeRun.run(b64 + "\n", steps([{ op: "b64dec" }, { op: "gunzip" }, { op: "json" }]));
  assert.equal(r.error, null);
  assert.equal(r.text, '{\n  "id": 12345678901234567890,\n  "ok": true\n}\n', "big number kept");
  assert.equal(r.states.map(s => s.state + ":" + s.kind).join(), "ok:bytes,ok:bytes,ok:text");
});

test("recipe: first failing step stops the rest, output = last good value; off steps skipped", async () => {
  const r = await RecipeRun.run("aGVsbG8=", steps([{ op: "b64dec" }, { op: "upper", on: false }, { op: "gunzip" }, { op: "lower" }]));
  assert.equal(r.error.i, 2);
  assert.match(r.error.message, /gzip/);
  assert.equal(r.states.map(s => s.state).join(), "ok,off,error,skip");
  assert.equal(r.text, "hello");
  const bin = await RecipeRun.run("AAEC/w==", steps([{ op: "b64dec" }]));
  assert.equal(bin.binary, true);
  assert.equal(bin.text, "00000000  00 01 02 ff\n");
});

test("recipe ops: hex, Base64URL, URL / HTML, regex replace + filter, hash, epoch, compress round trip", async () => {
  const run = async (t, list) => (await RecipeRun.run(t, steps(list))).text;
  assert.equal(await run("Hi!", [{ op: "hexenc", args: { sep: ":" } }]), "48:69:21");
  assert.equal(await run("0x48 0x69", [{ op: "hexdec" }]), "Hi");
  assert.equal(await run("ü?", [{ op: "b64url" }]), "w7w_");
  assert.equal(await run("a%20b&amp;", [{ op: "urldec" }, { op: "htmldec" }]), "a b&");
  assert.equal(await run("2026-11-20", [{ op: "replace", args: { find: "(\\d+)-(\\d+)-(\\d+)", repl: "$3/$2/$1\\n", flags: "g" } }]), "20/11/2026\n");
  assert.equal(await run("INFO a\nERROR b\nWARN c\n", [{ op: "filter", args: { find: "error|warn" } }]), "ERROR b\nWARN c\n");
  assert.equal(await run("INFO a\nERROR b\n", [{ op: "filter", args: { find: "error", invert: true } }]), "INFO a\n");
  assert.equal(await run("abc", [{ op: "hash", args: { alg: "SHA-256" } }]), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(await run("t=1763630400", [{ op: "epoch" }]), "t=2025-11-20T09:20:00Z");
  assert.equal(await run("round trip ✓", [{ op: "gzip" }, { op: "b64enc" }, { op: "b64dec" }, { op: "gunzip" }]), "round trip ✓");
  assert.equal(await run("x", [{ op: "deflate" }, { op: "inflate" }]), "x");
  assert.match((await RecipeRun.run("([", steps([{ op: "replace", args: { find: "([" } }]))).error.message, /Regex/);
});

test("recipe: untrusted steps cleaned, input limit, zip bomb cap", async () => {
  const c = RecipeRun.clean([{ op: "nope" }, { op: "hash", args: { alg: "MD5" } }, { op: "replace", args: { find: 5, repl: "x" } }, null, { op: "json", on: false }]);
  assert.deepEqual(JSON.parse(JSON.stringify(c)), [{ op: "hash", on: true, args: { alg: "SHA-256" } }, { op: "replace", on: true, args: { find: "", repl: "x", flags: "g" } }, { op: "json", on: false, args: {} }]);
  await assert.rejects(RecipeRun.run("x".repeat(10 * 1024 * 1024 + 1), []), /10 MB/);
  const bomb = zlib.gzipSync(Buffer.alloc(51 * 1024 * 1024)).toString("base64");
  const r = await RecipeRun.run(bomb, steps([{ op: "b64dec" }, { op: "gunzip" }]));
  assert.match(r.error.message, /50 MB/);
});
