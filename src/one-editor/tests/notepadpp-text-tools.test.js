// Phase 2b pure modules: encoding round trips, EOL detection, line / text operations, column numbers, hash, large-file chunks, demos.
// Run: node --test src/one-editor/tests/notepadpp-text-tools.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, File, Blob, Uint8Array, TextDecoder, TextEncoder, crypto, btoa, atob, Intl });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext(["../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/layout-presets.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/notepadpp/encoding-detect-convert.js", "js/notepadpp/line-and-text-operations.js",
  "js/providers/local-file-system-access-provider.js", "js/notepadpp/large-file-chunk-viewer.js", "js/core/demo-samples-notepadpp.js",
  "../data-workbench/js/diff/myers-sequence-diff.js", "js/workbench/compare-ignore-line-diff.js", "js/notepadpp/token-style-highlights.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { Encoding, LineOps, LocalFs, BigFile, DEMOS, ShareState, CompareIgnore, TokenStyles });", ctx);
const { Encoding: E, LineOps: L, LocalFs, BigFile, DEMOS, ShareState, CompareIgnore, TokenStyles } = ctx;

test("token styles: occurrences are case-sensitive, non-overlapping, whole word only when asked, capped", () => {
  const occ = (...a) => [...TokenStyles.occurrences(...a)];
  const log = "ORD-1002 ord-1002 ORD-10021 xORD-1002 ORD-1002";
  eq(occ(log, "ORD-1002"), [0, 18, 29, 38]);
  eq(occ(log, "ORD-1002", true), [0, 38]);
  eq(occ("aaaa", "aa"), [0, 2]);
  eq(occ("Việt việt Việtnam", "Việt", true), [0]);
  eq(occ("a_b ab a", "a", true), [7]);
  eq(occ("x x x x", "x", false, 2), [0, 2]);
  eq(occ("abc", ""), []);
});
const hex = b => Buffer.from(b).toString("hex"), bytes = h => Uint8Array.from(Buffer.from(h, "hex"));

test("encoding: BOM / UTF-8 / 1258 / 1252 detection and byte-exact round trips", () => {
  const cp1258 = bytes("5469eaec6e67205669eaf2740d0a");
  eq(E.detect(cp1258), { enc: "windows-1258", bom: false, guessed: true });
  assert.equal(hex(E.encode(E.decode(cp1258, "windows-1258").text, "windows-1258")), "5469eaec6e67205669eaf2740d0a");
  assert.equal(hex(E.encode("Ti" + String.fromCharCode(0x1ebf) + "ng Vi" + String.fromCharCode(0x1ec7) + "t\r\n", "windows-1258")), "5469eaec6e67205669eaf2740d0a");
  eq(E.detect(bytes("636166e9")), { enc: "windows-1252", bom: false, guessed: true });
  for (const [h, enc] of [["efbbbf41c3a9", "utf-8"], ["fffe4100e900", "utf-16le"], ["feff004100e9", "utf-16be"]]) {
    const b = bytes(h), d = E.detect(b), r = E.decode(b, d.enc);
    eq([d.enc, d.bom, r.text], [enc, true, "A" + String.fromCharCode(0xe9)]);
    assert.equal(hex(E.encode(r.text, enc, r.bom)), h, enc);
  }
  assert.throws(() => E.encode("ok\nx" + String.fromCharCode(0x2713), "windows-1258"), e => e.line === 2 && e.col === 2);
  assert.throws(() => E.encode("a", "shift_jis"), /shift_jis/);
});

test("EOL: CRLF / LF / CR / mixed; files read → LF model, saved back with the same EOL", async () => {
  eq(E.eolOf("a\r\nb\r\nc\nd"), { eol: "\r\n", mixed: true, counts: { crlf: 2, lf: 1, cr: 0 }, codes: "wwn" });
  eq([E.eolOf("a\rb\r").eol, E.eolOf("a\nb").eol, E.eolOf("x").mixed], ["\r", "\n", false]);
  const cr = await LocalFs.readText(new File(["a\rb\r"], "mac.txt"));
  eq([cr.text, cr.eol, cr.eolMixed], ["a\nb\n", "\r", false]);
  assert.equal(hex(LocalFs.encode(cr.text, cr)), "610d620d");
  const u16 = await LocalFs.readText(new File([bytes("fffe41000d000a00")], "w.txt"));
  eq([u16.enc, u16.binary, u16.text, u16.eol], ["utf-16le", false, "A\n", "\r\n"]);
  assert.equal(hex(LocalFs.encode(u16.text, u16)), "fffe41000d000a00");
});

test("line operations: sorts, dedupe, empty, reverse, join, split, trim, tabs ↔ spaces", () => {
  const l = ["b", "A", "a", "", "10 x", "2 x", "a"];
  eq(L.lines("sortNum", ["b", "10 x", "2 x", "a"]), ["2 x", "10 x", "a", "b"]);
  eq(L.lines("unique", l), ["b", "A", "a", "", "10 x", "2 x"]);
  eq(L.lines("uniqueCi", ["Acme", "ACME", "x"]), ["Acme", "x"]);
  eq(L.lines("removeEmpty", ["a", " ", "", "b"]), ["a", "b"]);
  eq(L.lines("reverse", ["1", "2"]), ["2", "1"]);
  eq(L.lines("join", ["a ", "  b", "", "c"]), ["a b c"]);
  eq(L.lines("split", ["a,b", "c"], ","), ["a", "b", "c"]);
  eq(L.lines("sortLen", ["ccc", "a", "bb"]), ["a", "bb", "ccc"]);
  const TAB = String.fromCharCode(9);
  eq(L.lines("tabsToSpaces", [TAB + "x", " " + TAB + "y"], 4), ["    x", "    y"]);
  eq(L.lines("spacesToTabs", ["      x", "    y"], 4), [TAB + "  x", TAB + "y"]);
  eq(L.lines("trimEnd", ["a  ", "b" + TAB]), ["a", "b"]);
});

test("text transforms: case styles, Base64 (UTF-8), URL, HTML entities", () => {
  const vi = "xin ch" + String.fromCharCode(0xe0) + "o";
  eq(["upper", "title", "camel", "pascal", "snake", "kebab"].map(id => L.text(id, "order ID value\nhello world")),
    ["ORDER ID VALUE\nHELLO WORLD", "Order Id Value\nHello World", "orderIdValue\nhelloWorld", "OrderIdValue\nHelloWorld", "order_id_value\nhello_world", "order-id-value\nhello-world"]);
  assert.equal(L.text("snake", "orderId fooBar"), "order_id_foo_bar");
  assert.equal(L.text("b64dec", L.text("b64enc", vi)), vi);
  assert.equal(L.text("b64enc", "hi"), "aGk=");
  assert.throws(() => L.text("b64dec", "!!!"), /Base64/);
  assert.equal(L.text("urlDec", L.text("urlEnc", "a b&c=" + vi)), "a b&c=" + vi);
  assert.equal(L.text("htmlEnc", `<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  assert.equal(L.text("htmlDec", "&lt;b&gt; &#65;&#x42; &amp;amp; &unknown;"), "<b> AB &amp; &unknown;");
});

test("column numbers and hash", async () => {
  eq(L.numbers(3, "1"), ["1", "2", "3"]);
  eq(L.numbers(3, "001, 5"), ["001", "006", "011"]);
  eq(L.numbers(2, "10;-10"), ["10", "0"]);
  assert.throws(() => L.numbers(2, "abc"), /1, 1/);
  assert.equal(await L.hash("abc", "SHA-256"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("large file chunks end on a line break; demos are valid", async () => {
  const file = new File(["x".repeat(3 * 1024 * 1024) + "\n" + "y".repeat(2 * 1024 * 1024) + "\nlast"], "big.log");
  const a = await BigFile.read(file, 0);
  assert.equal(a.end, 3 * 1024 * 1024 + 1);
  const b = await BigFile.read(file, a.end);
  assert.ok(b.text.endsWith("\nlast") && b.end === file.size);
  for (const key of ["sort-dedupe", "column-csv", "macro", "token-styles"]) assert.ok(ShareState.parse(DEMOS[key].payload()).views.flat().length, key);
  const d = await LocalFs.readText(DEMOS["windows-1258"].file());
  eq([d.enc, d.eol, d.text.split("\n").length], ["windows-1258", "\r\n", 5]);
  const m = await LocalFs.readText(DEMOS["crlf-mixed"].file());
  eq([m.eol, m.eolMixed], ["\r\n", true]);
});

test("UTF-16 without BOM is detected (LE / BE), not taken for binary, and saved byte-exact", async () => {
  eq(E.detect(bytes("410042000d000a00")), { enc: "utf-16le", bom: false, guessed: true });
  eq(E.detect(bytes("004100420043")), { enc: "utf-16be", bom: false, guessed: true });
  const r = await LocalFs.readText(new File([bytes("6800690021000d000a00")], "nobom.txt"));
  eq([r.enc, r.bom, r.binary, r.text], ["utf-16le", false, false, "hi!\n"]);
  assert.equal(hex(LocalFs.encode(r.text, r)), "6800690021000d000a00");
  eq(E.detect(bytes("00010203ff00")).enc === "utf-16le", false);
});

test("compare ignoring whitespace / case: only lines that still differ are changes", () => {
  const a = "alpha\n  Beta\ngamma\ndelta\n", b = "alpha\nbeta  \nGAMMA\nDELTA X\n";
  eq(CompareIgnore.changes(a, b, { ws: true, case: true }), [{ fromA: 19, toA: 25, fromB: 19, toB: 27 }]);
  eq(CompareIgnore.changes(a, b, { ws: true, case: false }).length, 1);
  eq(CompareIgnore.changes("a\nb\n", "a\nX\nb\n", { ws: true }), [{ fromA: 2, toA: 2, fromB: 2, toB: 4 }]);
  eq(CompareIgnore.changes("x y\n", "xy\n", { ws: true }), []);
});
