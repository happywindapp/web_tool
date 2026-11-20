// Run: node --test src/one-editor/tests/find-in-files-export.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({});
vm.runInContext(["js/core/find-in-files-core.js", "js/core/highlighted-html-builder.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n")
  + "\n;Object.assign(globalThis, { FindCore, HtmlExport });", ctx);
const { FindCore: F, HtmlExport: H } = ctx;
const BS = String.fromCharCode(92);

test("compile: literal escapes regex chars, word / case flags, bad regex throws, empty → null", () => {
  assert.equal(F.compile(""), null);
  const lit = F.compile("a.b(c)");
  assert.equal(lit.test("xa.b(c)y"), true);
  lit.lastIndex = 0;
  assert.equal(lit.test("aXb(c)"), false);
  assert.equal(F.compile("Foo").flags, "gim");
  assert.equal(F.compile("Foo", { matchCase: true }).flags, "gm");
  eq(F.matches("cat concat cat_x cat", F.compile("cat", { word: true })).count, 2);
  assert.throws(() => F.compile("(", { regex: true }));
  eq(F.matches("a1 b22", F.compile(BS + "d+", { regex: true })).count, 2);
  const vn = (q, t, regex) => F.matches(t, F.compile(q, { word: true, regex })).count;
  eq([vn("Vi", "Việt Nam"), vn("Việt", "Người Việt Nam"), vn("café", "a café b"), vn("-x", "a -x b"), vn("đi", "đi đâu"), vn("i", "đi")], [0, 1, 1, 1, 1, 0]);
  eq(vn("t" + BS + "w+", "test tx", true), 2);
});

test("matches: every match per line with 1-based line, col, line text; keep caps hits but not count", () => {
  const text = "alpha beta\nbeta beta\n\ngamma";
  const r = F.matches(text, F.compile("beta"));
  assert.equal(r.count, 3);
  eq(r.hits.map(h => [h.line, h.col, h.from, h.to, h.snip, h.at, h.cut]), [[1, 6, 6, 10, "alpha beta", 6, false], [2, 0, 11, 15, "beta beta", 0, false], [2, 5, 16, 20, "beta beta", 5, false]]);
  const long = "x".repeat(500) + "NEEDLE" + "y".repeat(500), h = F.matches(long, F.compile("needle")).hits[0];
  eq([h.snip.length, h.at, h.cut, h.snip.slice(h.at, h.at + 6), h.col], [166, 40, true, "NEEDLE", 500]);
  const dots = F.matches("a".repeat(F.LIMITS.countPerFile + 5), F.compile(".", { regex: true }), 3);
  eq([dots.count, dots.more, dots.hits.length], [F.LIMITS.countPerFile, true, 3]);
  const capped = F.matches(text, F.compile("beta"), 1);
  eq([capped.count, capped.hits.length], [3, 1]);
  const ml = F.matches("a\nb\n", F.compile("^", { regex: true }));
  eq(ml.hits.map(h => [h.line, h.from, h.to]), [[1, 0, 0], [2, 2, 2], [3, 4, 4]]);
  eq(F.matches("x", F.compile("y")), { count: 0, more: false, hits: [] });
});

test("edits: literal replacement is verbatim, regex expands groups, names, \\n and $$", () => {
  eq(F.edits("a+a", F.compile("a"), "$1", false), [{ from: 0, to: 1, insert: "$1" }, { from: 2, to: 3, insert: "$1" }]);
  const re = F.compile("(" + BS + "w+)@(?<host>" + BS + "w+)", { regex: true });
  eq(F.edits("bob@mail x", re, "$2:$1 <$<host>> $& $$ $9", true).map(e => e.insert), ["mail:bob <mail> bob@mail $ $9"]);
  eq(F.edits("k=v", F.compile("=", { regex: true }), BS + "n" + BS + "t" + BS + BS, true).map(e => e.insert), ["\n\t" + BS]);
  eq(F.edits("ab", F.compile("(a)", { regex: true }), "$10", true).map(e => e.insert), ["a0"]);
  eq(F.edits("x\ny", F.compile("^", { regex: true }), "// ", true).map(e => [e.from, e.to, e.insert]), [[0, 0, "// "], [2, 2, "// "]]);
});

test("skip rules: binary extensions, .git / node_modules unless included, limits", () => {
  for (const n of ["logo.PNG", "a.zip", "x.dll", "doc.pdf", "f.woff2", "db.sqlite"]) assert.equal(F.binaryName(n), true, n);
  for (const n of ["app.js", "README.md", "data.json", "notes", "a.png.txt"]) assert.equal(F.binaryName(n), false, n);
  assert.equal(F.skipDir("node_modules", false), true);
  assert.equal(F.skipDir(".git", false), true);
  assert.equal(F.skipDir("node_modules", true), false);
  assert.equal(F.skipDir("src", false), false);
  eq(F.LIMITS, { fileBytes: 5242880, files: 20000, shownHits: 2000, countPerFile: 100000 });
});

test("sliced: yields once the time budget is spent, stop() ends early, accepts async iterables", async () => {
  let clock = 0, yields = 0, progress = [];
  const done = await F.sliced([1, 2, 3, 4, 5], () => { clock += 5; }, { budget: 10, now: () => clock, yieldNow: async () => { yields++; }, progress: n => progress.push(n) });
  eq([done, yields, progress], [5, 2, [2, 4]]);
  const seen = [];
  let stopAt = 2;
  async function* gen() { for (let i = 1; i <= 10; i++) yield i; }
  const n = await F.sliced(gen(), x => { seen.push(x); }, { stop: () => seen.length >= stopAt, yieldNow: async () => {} });
  eq([n, seen], [2, [1, 2]]);
});

test("html export: escapes text, inline styles per range, plain gaps, wrapper colours", () => {
  const html = H.build("let a = '<b>' & 1;", [{ from: 0, to: 3, style: "color:#708" }, { from: 8, to: 13, style: "color:#a11" }], { fg: "#111", bg: "#fff" });
  assert.match(html, /^<pre style="[^"]*color:#111;background:#fff"><code>/);
  assert.ok(html.includes('<span style="color:#708">let</span> a = <span style="color:#a11">\'&lt;b&gt;\'</span> &amp; 1;</code></pre>'), html);
  assert.equal(H.specCss({ tag: {}, color: "#708", fontWeight: "bold", textDecoration: "underline" }), "color:#708;font-weight:bold;text-decoration:underline");
  assert.equal(H.specCss({ tag: {}, color: 'red;" onmouseover="x' }), "color:red onmouseover=x");
  assert.equal(H.build("", []).endsWith("<code></code></pre>"), true);
  assert.ok(H.build("ab", [{ from: 1, to: 9, style: "" }]).includes("<code>ab</code>"));
});
