// Run: node --test src/one-editor/tests/code-image-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/extras/code-snippet-to-image.js"), "utf8") + "\n;globalThis.CodeImage = CodeImage;", ctx);
const { CodeImage } = ctx;
const th = CodeImage.THEMES["one-dark"];

test("code image: theme colours from lezer classes, most specific first", () => {
  assert.equal(CodeImage.style(th, "tok-keyword")[0], "#c678dd");
  assert.equal(CodeImage.style(th, "tok-variableName tok-definition")[0], "#61afef", "definition beats variableName");
  assert.deepEqual([...CodeImage.style(th, "tok-comment")], ["#7f848e", 0, 1], "italic comment");
  assert.equal(CodeImage.style(th, "tok-punctuation"), null);
});

test("code image: SVG size, frame, numbers, escaping, transparent background", () => {
  const lines = [[{ t: "if", c: "#c678dd" }, { t: " (a < b && c > \"d\")" }], [{ t: "" }], [{ t: "  x();" }]];
  const r = CodeImage.svg(lines, { theme: th, bg: ["#000", "#fff"], frame: true, numbers: true, pad: 32, title: "a&b.js", first: 9, size: 14, charW: 8 });
  assert.match(r.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="\d+"/);
  assert.match(r.svg, /&lt; b &amp;&amp; c &gt; &quot;d&quot;/, "code text escaped");
  assert.match(r.svg, />a&amp;b\.js</, "title escaped");
  assert.equal((r.svg.match(/<circle/g) || []).length, 3, "window dots");
  assert.deepEqual([...r.svg.matchAll(/text-anchor="end"[^>]*>(\d+)</g)].map(m => m[1]), ["9", "10", "11"], "line numbers from the first line");
  assert.equal(r.w, 32 * 2 + Math.ceil(4 * 8 + 32 + 21 * 8), "width: gutter + inner padding + longest line (21 columns)");
  const plain = CodeImage.svg(lines, { theme: th, bg: null, frame: false, numbers: false, pad: 16, size: 14, charW: 8 });
  assert.doesNotMatch(plain.svg, /linearGradient|<circle|text-anchor="end"/);
  assert.ok(plain.w < r.w && plain.h < r.h);
  const wide = CodeImage.svg([[{ t: "日本日本日本日本日本日本" }]], { theme: th, bg: null, size: 14, charW: 8, pad: 0, width: s => [...s].length * 2 });
  assert.equal(wide.w, Math.ceil(32 + 24 * 8), "wide characters count double");
});

test("code image: C0 controls become control pictures (valid XML), gradient id per image, frame fits the title", () => {
  const r = CodeImage.svg([[{ t: "a" + String.fromCharCode(27) + "[31mred" + String.fromCharCode(12) }]], { theme: th, bg: ["#000", "#fff"], id: "ci42", frame: true, title: "a-very-long-file-name-for-the-title.ts", size: 14, charW: 8 });
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(r.svg), "no raw control character left");
  assert.match(r.svg, /a\u241b\[31mred\u240c/);
  assert.match(r.svg, /id="ci42"[\s\S]*url\(#ci42\)/);
  assert.ok(r.w >= 38 * 8, "window wide enough for the title");
});
