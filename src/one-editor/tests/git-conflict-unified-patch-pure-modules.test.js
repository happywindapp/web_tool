// Run: node --test src/one-editor/tests/git-conflict-unified-patch-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const ctx = vm.createContext({ console });
vm.runInContext("var PowerDemos = {};\n" + ["js/core/git-conflict-markers-pure.js", "js/extras/unified-patch-pure.js", "js/editor/git-conflict-patch-demos.js"].map(src).join("\n;\n")
  + "\n;Object.assign(globalThis, { GitConflict, UnifiedPatch });", ctx);
const { GitConflict, UnifiedPatch, PowerDemos } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));

const MERGE = "a\n<<<<<<< HEAD\nours 1\nours 2\n=======\ntheirs\n>>>>>>> topic\nb\n<<<<<<< HEAD\nx\n||||||| base\ny\n=======\nz\n>>>>>>> topic\nc\n";

test("conflict: 2-way + diff3 blocks, labels, lines", () => {
  const L = GitConflict.find(MERGE);
  assert.equal(L.length, 2);
  assert.deepEqual(plain(L.map(b => [b.line, b.endLine, b.a, b.b, !!b.base])), [[2, 7, "HEAD", "topic", false], [9, 15, "HEAD", "topic", true]]);
  assert.equal(MERGE.slice(L[0].from, L[0].to), "<<<<<<< HEAD\nours 1\nours 2\n=======\ntheirs\n>>>>>>> topic\n");
  assert.equal(GitConflict.pick(MERGE, L[1], "base"), "y\n");
});

test("conflict: accept current / incoming / both", () => {
  assert.equal(GitConflict.resolveAll(MERGE, "current"), "a\nours 1\nours 2\nb\nx\nc\n");
  assert.equal(GitConflict.resolveAll(MERGE, "incoming"), "a\ntheirs\nb\nz\nc\n");
  assert.equal(GitConflict.resolveAll(MERGE, "both"), "a\nours 1\nours 2\ntheirs\nb\nx\nz\nc\n");
});

test("conflict: CRLF, end of file without line break, empty sides", () => {
  const crlf = MERGE.replace(/\n/g, "\r\n");
  assert.equal(GitConflict.find(crlf).length, 2);
  assert.equal(GitConflict.resolveAll(crlf, "incoming"), "a\r\ntheirs\r\nb\r\nz\r\nc\r\n");
  assert.equal(GitConflict.resolveAll("<<<<<<< HEAD\n=======\nnew\n>>>>>>> x", "current"), "");
  assert.equal(GitConflict.resolveAll("<<<<<<< HEAD\n=======\nnew\n>>>>>>> x", "incoming"), "new\n");
});

test("conflict: setext '=======' / unpaired / indented markers are not conflicts", () => {
  assert.equal(GitConflict.find("Title\n=======\n\ntext\n").length, 0);
  assert.equal(GitConflict.find("<<<<<<< HEAD\nonly start\n=======\n").length, 0);
  assert.equal(GitConflict.find("  <<<<<<< HEAD\na\n=======\nb\n  >>>>>>> x\n").length, 0);
  assert.equal(GitConflict.find("<<<<<<<< too many\na\n=======\nb\n>>>>>>> x\n").length, 0);
  assert.equal(GitConflict.find("x\n>>>>>>> end first\n<<<<<<< HEAD\n").length, 0);
  assert.equal(GitConflict.find(PowerDemos["git-conflict"].payload().views[1][0].t).length, 0);
  assert.equal(GitConflict.find(PowerDemos["git-conflict"].payload().views[0][0].t).length, 2);
});

const A = "l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8\nl9\nl10\nl11\nl12\nl13\nl14\nl15\n";
const B = A.replace("l2\n", "L2\n").replace("l13\n", "l13\nnew\n");

test("patch: create → parse → apply round trip, 2 hunks, a/ b/", () => {
  const p = UnifiedPatch.create(A, B, "src/x.txt");
  assert.match(p, /^diff --git a\/src\/x\.txt b\/src\/x\.txt\n--- a\/src\/x\.txt\n\+\+\+ b\/src\/x\.txt\n@@ -1,5 \+1,5 @@\n/);
  const f = UnifiedPatch.parse(p).files;
  assert.equal(f.length, 1);
  assert.deepEqual(plain([f[0].name, f[0].hunks.length, f[0].add, f[0].del]), ["src/x.txt", 2, 2, 1]);
  const r = UnifiedPatch.apply(A, f[0]);
  assert.equal(r.text, B);
  assert.equal(r.ok, 2);
  assert.equal(UnifiedPatch.create(A, A, "x"), "");
});

test("patch: round trips over random edits (Myers blocks)", () => {
  let seed = 7;
  const rnd = n => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
  for (let k = 0; k < 200; k++) {
    const a = Array.from({ length: rnd(30) }, () => "w" + rnd(6));
    const b = a.slice();
    for (let e = rnd(6); e >= 0; e--) { const i = rnd(b.length + 1); if (rnd(2)) b.splice(i, 1); else b.splice(i, 0, "n" + rnd(4)); }
    const ta = a.join("\n") + (rnd(3) ? "\n" : ""), tb = b.join("\n") + (rnd(3) ? "\n" : "");
    const p = UnifiedPatch.create(ta, tb, "f");
    if (ta === tb) { assert.equal(p, ""); continue; }
    const f = UnifiedPatch.parse(p).files[0];
    assert.equal(UnifiedPatch.apply(ta, f).text, tb, `case ${k}\n${p}`);
  }
});

test("patch: no newline at end of file, CRLF target, new / deleted file", () => {
  const p = UnifiedPatch.create("a\nb", "a\nb\n", "f");
  assert.match(p, /-b\n\\ No newline at end of file\n\+b\n/);
  assert.equal(UnifiedPatch.apply("a\nb", UnifiedPatch.parse(p).files[0]).text, "a\nb\n");
  const back = UnifiedPatch.create("a\nb\n", "a\nb", "f");
  assert.equal(UnifiedPatch.apply("a\nb\n", UnifiedPatch.parse(back).files[0]).text, "a\nb");
  const crlf = A.replace(/\n/g, "\r\n");
  assert.equal(UnifiedPatch.apply(crlf, UnifiedPatch.parse(UnifiedPatch.create(A, B, "x")).files[0]).text, B.replace(/\n/g, "\r\n"));
  const nf = UnifiedPatch.parse(UnifiedPatch.create("", "one\ntwo\n", "new.txt")).files[0];
  assert.deepEqual(plain([nf.a, nf.b, UnifiedPatch.newText(nf)]), ["", "b/new.txt", "one\ntwo\n"]);
  const del = UnifiedPatch.parse(UnifiedPatch.create("one\n", "", "old.txt")).files[0];
  assert.deepEqual(plain([del.a, del.b, UnifiedPatch.apply("one\n", del).text]), ["a/old.txt", "", ""]);
});

test("patch: fuzz ±3 lines, a hunk past the fuzz fails, the others still apply", () => {
  const f = UnifiedPatch.parse(UnifiedPatch.create(A, B, "x")).files[0];
  const shifted = A.replace("l8\n", "l8\nextra 1\nextra 2\nextra 3\n");
  const r = UnifiedPatch.apply(shifted, f);
  assert.deepEqual(plain(r.results.map(x => [x.ok, x.off])), [[true, 0], [true, 3]]);
  assert.equal(r.text, B.replace("l8\n", "l8\nextra 1\nextra 2\nextra 3\n"));
  const far = A.replace("l8\n", "l8\n1\n2\n3\n4\n");
  const r2 = UnifiedPatch.apply(far, f);
  assert.deepEqual(plain(r2.results.map(x => x.ok)), [true, false]);
  assert.equal(r2.ok, 1);
  assert.equal(r2.text, far.replace("l2\n", "L2\n"));
  const broken = A.replace("l12\n", "changed\n");
  assert.equal(UnifiedPatch.apply(broken, f).results[1].ok, false);
});

test("patch: git diff with many files, mail header, rename / binary entries, short hunk", () => {
  const text = "From abc Mon Sep 17 00:00:00 2001\nSubject: [PATCH] x\n---\n a | 2 +-\n\n" + UnifiedPatch.create("1\n2\n", "1\n3\n", "a.txt")
    + "diff --git a/old.png b/new.png\nsimilarity index 100%\nrename from old.png\nrename to new.png\ndiff --git a/img.bin b/img.bin\nBinary files a/img.bin and b/img.bin differ\n"
    + "--- a/c.txt\n+++ b/c.txt\n@@ -1,3 +1,3 @@\n x\n-y\n";
  const files = UnifiedPatch.parse(text).files;
  assert.deepEqual(plain(files.map(f => [f.name, f.hunks.length, !!f.meta, !!f.binary])), [["a.txt", 1, false, false], ["new.png", 0, true, false], ["img.bin", 0, true, true], ["c.txt", 1, false, false]]);
  assert.equal(files[3].hunks[0].short, true);
  assert.equal(UnifiedPatch.apply("x\ny\nz\n", files[3]).ok, 0);
  // An empty context line written without its leading space still counts.
  const loose = UnifiedPatch.parse("--- a/f\n+++ b/f\n@@ -1,3 +1,3 @@\n a\n\n-b\n+B\n").files[0];
  assert.equal(UnifiedPatch.apply("a\n\nb\n", loose).text, "a\n\nB\n");
});

test("patch: minimal change keeps the text outside the edit", () => {
  assert.deepEqual(plain(UnifiedPatch.change("abcdef", "abXYef")), { from: 2, to: 4, insert: "XY" });
  assert.deepEqual(plain(UnifiedPatch.change("aaa", "aaaa")), { from: 3, to: 3, insert: "a" });
});

test("demo patch-apply: 2 files, hunk 2 of order-service.js lands 3 lines lower", () => {
  const p = PowerDemos["patch-apply"].payload(), files = UnifiedPatch.parse(p.views[0][0].t).files;
  assert.deepEqual(plain(files.map(f => [f.name, f.hunks.length])), [["src/order-service.js", 2], ["config/app.yaml", 1]]);
  const r = UnifiedPatch.apply(p.views[1][0].t, files[0]);
  assert.deepEqual(plain(r.results.map(x => [x.ok, x.off])), [[true, 0], [true, 3]]);
  assert.match(r.text, /audit\.write/);
  assert.equal(UnifiedPatch.apply(p.views[1][1].t, files[1]).ok, 1);
});
