// Run: node --test src/one-editor/tests/file-checksum-split-join-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const ctx = vm.createContext({ console, Intl });
vm.runInContext(["js/extras/file-checksum-sha-pure.js", "js/extras/file-split-join-pure.js"].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { ShaSum, FileSplit });", ctx);
const { ShaSum, FileSplit } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const NODE = { "SHA-1": "sha1", "SHA-256": "sha256", "SHA-512": "sha512" };

function rand(n, seed) {
  const out = new Uint8Array(n);
  let x = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; out[i] = x & 255; }
  return out;
}
const ref = (alg, u8) => crypto.createHash(NODE[alg]).update(u8).digest("hex");

test("sha: known vectors", () => {
  const abc = new TextEncoder().encode("abc");
  for (const alg of ShaSum.ALGS) {
    const h = ShaSum.create(alg); h.update(abc);
    assert.equal(h.hex(), ref(alg, abc), alg);
    assert.equal(ShaSum.create(alg).hex(), ref(alg, new Uint8Array(0)), alg + " empty");
  }
});

test("sha: every length around the block edges matches node:crypto", () => {
  for (const alg of ShaSum.ALGS) for (let n = 0; n <= 300; n++) {
    const u8 = rand(n, n + 7), h = ShaSum.create(alg);
    h.update(u8);
    assert.equal(h.hex(), ref(alg, u8), alg + " len " + n);
  }
});

test("sha: random chunking gives the same hash (1 MB)", () => {
  const u8 = rand(1 << 20, 42);
  for (const alg of ShaSum.ALGS) {
    const h = ShaSum.create(alg);
    let x = 99;
    for (let i = 0; i < u8.length;) { x = (x * 1103515245 + 12345) >>> 0; const k = Math.min(u8.length - i, x % 70000); h.update(u8.subarray(i, i + k)); i += k; }
    assert.equal(h.hex(), ref(alg, u8), alg);
  }
});

test("sum file: GNU, binary star, BSD, escaped names, bad lines", () => {
  const a = "a".repeat(64), b = "B".repeat(40), c = "c".repeat(128);
  const r = ShaSum.parse("# comment\n" + a + "  dir/readme.txt\r\n" + b + " *bin/app.exe\n\nSHA512 (notes.md) = " + c + "\nnot a hash line\n\\" + a + "  odd\\\\name\\nx\n");
  assert.deepEqual(plain(r.entries.map(e => [e.line, e.alg, e.name])), [[2, "SHA-256", "dir/readme.txt"], [3, "SHA-1", "bin/app.exe"], [5, "SHA-512", "notes.md"], [7, "SHA-256", "odd\\name\nx"]]);
  assert.equal(r.entries[1].hash, "b".repeat(40));
  assert.deepEqual(plain(r.bad), [6]);
  const text = ShaSum.format([{ hash: a, name: "x.txt" }, { hash: a, name: "odd\\name\nx" }]);
  assert.equal(text, a + "  x.txt\n\\" + a + "  odd\\\\name\\nx\n");
  assert.deepEqual(plain(ShaSum.parse(text).entries.map(e => e.name)), ["x.txt", "odd\\name\nx"]);
});

test("sum file: alg from the name, pasted hashes cleaned", () => {
  assert.equal(ShaSum.algOfName("release.sha256"), "SHA-256");
  assert.equal(ShaSum.algOfName("SHA512SUMS"), "SHA-512");
  assert.equal(ShaSum.algOfName("x.sha1"), "SHA-1");
  assert.equal(ShaSum.algOfName("x.txt"), "");
  const h = "ab".repeat(32);
  assert.equal(ShaSum.cleanHash("  " + h.toUpperCase() + "  "), h);
  assert.equal(ShaSum.cleanHash(h + "  file.zip"), h);
  assert.equal(ShaSum.cleanHash(h.match(/.{2}/g).join(":")), h);
  assert.equal(ShaSum.cleanHash("abc"), "");
});

test("split: part names, size plan, count", () => {
  assert.equal(FileSplit.partName("a.log", 0, 5), "a.log.001");
  assert.equal(FileSplit.partName("a.log", 1233, 1500), "a.log.1234");
  assert.deepEqual(plain(FileSplit.bySize(10, 4)), [{ start: 0, end: 4 }, { start: 4, end: 8 }, { start: 8, end: 10 }]);
  assert.deepEqual(plain(FileSplit.bySize(0, 4)), [{ start: 0, end: 0 }]);
  assert.equal(FileSplit.count(10, 4), 3);
  assert.equal(FileSplit.bytesOf("1,5", "KB"), 1536);
  assert.ok(Number.isNaN(FileSplit.bytesOf("-1", "MB")));
});

test("split: line cuts fed in chunks never cut a line, join gives the bytes back", () => {
  const text = new TextEncoder().encode(Array.from({ length: 103 }, (_, i) => "line " + i + (i % 3 ? "\r\n" : "\n")).join("") + "tail without newline");
  for (const chunk of [1, 7, 64, 100000]) {
    const cut = FileSplit.lineCutter(10), cuts = [];
    for (let i = 0; i < text.length; i += chunk) cuts.push(...cut.feed(text.subarray(i, i + chunk)));
    const parts = FileSplit.partsFromCuts(cuts, text.length);
    assert.equal(parts.length, 11, "chunk " + chunk);
    for (const p of parts.slice(0, -1)) assert.equal(text[p.end - 1], 10);
    const dec = new TextDecoder();
    assert.equal(dec.decode(text.subarray(parts[0].start, parts[0].end)).split("\n").length - 1, 10);
    assert.equal(parts.map(p => dec.decode(text.subarray(p.start, p.end))).join(""), dec.decode(text));
  }
  const exact = new TextEncoder().encode("a\nb\n"), c2 = FileSplit.lineCutter(2);
  assert.deepEqual(plain(FileSplit.partsFromCuts(c2.feed(exact), exact.length)), [{ start: 0, end: 4 }]);
});

test("join: natural order, .001 sets, joined name", () => {
  assert.deepEqual(plain(FileSplit.natural(["p10.txt", "p2.txt", "P1.txt"])), ["P1.txt", "p2.txt", "p10.txt"]);
  const names = ["big.iso.001", "big.iso.002", "big.iso.003", "big.iso.005", "other.txt"];
  assert.deepEqual(plain(FileSplit.partSet("big.iso.001", names)), { target: "big.iso", parts: ["big.iso.001", "big.iso.002", "big.iso.003"] });
  assert.equal(FileSplit.partSet("big.iso.002", names), null);
  assert.equal(FileSplit.isFirstPart("x.0001"), true);
  assert.equal(FileSplit.joinName(["big.iso.001", "big.iso.002"]), "big.iso");
  assert.equal(FileSplit.joinName(["a.log", "b.log"]), "a-joined.log");
});
