// Run: node --test src/one-editor/tests/markdown-table-preview.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/layout-presets.js", "js/core/output-operations.js", "js/core/share-link-state.js",
  "js/core/demo-samples.js", "js/core/demo-samples-preview-docs.js", "js/preview/preview-kind-by-language.js",
  "js/preview/markdown-inline-parser.js", "js/preview/markdown-safe-renderer.js", "js/preview/quick-table-from-csv-json.js", "js/preview/preview-view-html-sandbox.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { LangDetect, ShareState, DEMOS, PreviewKind, MdRender, MdInline, QuickTable, PvHtml });", ctx);
const { LangDetect: L, ShareState, DEMOS, PreviewKind, MdRender, QuickTable, PvHtml } = ctx;
const md = t => MdRender.toHtml(MdRender.parse(t, { diagram: PreviewKind.fence }));
const ALLOWED = new Set([...Object.keys(MdRender.TAGS), "figure"]);
const onlyWhitelisted = html => { for (const m of html.matchAll(/<\/?([a-zA-Z][\w-]*)/g)) assert.ok(ALLOWED.has(m[1]), `tag <${m[1]}> in ${html}`); };

test("markdown: blocks and inline syntax", () => {
  assert.equal(md("# Title #\nSome *em*, **strong**, ***both***, ~~del~~ and `a<b`."),
    "<h1>Title</h1><p>Some <em>em</em>, <strong>strong</strong>, <em><strong>both</strong></em>, <del>del</del> and <code>a&lt;b</code>.</p>");
  assert.equal(md("Setext\n===\n\nline  \nbreak"), "<h1>Setext</h1><p>line<br>break</p>");
  assert.equal(md("- a\n- b\n  - c\n- [x] done\n- [ ] todo"),
    '<ul><li>a</li><li>b<ul><li>c</li></ul></li><li class="task"><input type="checkbox" disabled checked> done</li><li class="task"><input type="checkbox" disabled> todo</li></ul>');
  assert.equal(md("3. three\n4. four"), '<ol start="3"><li>three</li><li>four</li></ol>');
  assert.equal(md("1. one\n\n2. two"), "<ol><li><p>one</p></li><li><p>two</p></li></ol>");
  assert.equal(md("> quote\nlazy\n> > nested"), "<blockquote><p>quote\nlazy</p><blockquote><p>nested</p></blockquote></blockquote>");
  assert.equal(md("| a | b | c |\n|:--|--:|:-:|\n| 1 | 2 \\| x | 3 |"),
    '<table><thead><tr><th align="left">a</th><th align="right">b</th><th align="center">c</th></tr></thead><tbody><tr><td align="left">1</td><td align="right">2 | x</td><td align="center">3</td></tr></tbody></table>');
  assert.equal(md("    code\n\npara\n***\n_x_"), "<pre><code>code</code></pre><p>para</p><hr><p><em>x</em></p>");
  assert.equal(md("[ref][r] and [r]\n\n[r]: https://ref.example \"Ref\""), '<p><a href="https://ref.example" title="Ref">ref</a> and <a href="https://ref.example" title="Ref">r</a></p>');
  assert.equal(md("&amp; &copy; &#65; &bogus; snake_case_word <!-- hidden -->"), "<p>&amp; © A &amp;bogus; snake_case_word </p>");
});

test("markdown: fenced diagrams become diagram nodes, other fences stay code", () => {
  const nodes = MdRender.parse("text\n\n```mermaid\ngraph TD\nA-->B\n```\n\n```js\nlet a = 1;\n```\n\n~~~dot\ndigraph{a->b}\n~~~\n");
  assert.equal(nodes.length, 4);
  eq(MdRender.parse("```mermaid\ngraph TD\n```", { diagram: PreviewKind.fence })[0], { t: "diagram", engine: "mermaid", code: "graph TD", line: 1 });
  assert.equal(md("~~~dot\ndigraph{a->b}\n~~~"), '<figure data-engine="graphviz">digraph{a-&gt;b}</figure>');
  assert.equal(md("```js\nconst a = '<b>';\n```"), "<pre><code>const a = '&lt;b&gt;';</code></pre>");
});

test("markdown: raw HTML is text, unsafe URLs never become links or images", () => {
  const cases = [
    "<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "<iframe src=//x></iframe>", "<a href=javascript:alert(1)>x</a>",
    "[a](javascript:alert(1))", "[a](JaVa&#83;cript:alert(1))", "[a]( java\tscript:alert(1))", "[a](vbscript:x)", "[a](data:text/html,<script>x</script>)",
    "![a](javascript:alert(1))", "![a](data:text/html;base64,PHNjcmlwdD4=)", "<javascript:alert(1)>", "[a][r]\n\n[r]: javascript:alert(1)",
    "**<svg onload=alert(1)>**", "`<script>`", "[<img src=x>](https://ok.example)",
  ];
  for (const c of cases) {
    const html = md(c);
    onlyWhitelisted(html);
    assert.ok(!/href="(?!https?:|mailto:|#)/i.test(html) && !/src="(?!data:image\/)/i.test(html), `${c} → ${html}`);
  }
  assert.equal(md("[a](javascript:alert(1))"), "<p>a</p>");
  assert.equal(md("![pic](https://x.example/p.png) ![d](data:image/png;base64,AAA)"), '<p><a href="https://x.example/p.png">🖼 pic</a> <img src="data:image/png;base64,AAA" alt="d"></p>');
  assert.equal(md("<https://a.example> www.b.example/p. <me@c.example>"),
    '<p><a href="https://a.example">https://a.example</a> <a href="http://www.b.example/p">www.b.example/p</a>. <a href="mailto:me@c.example">me@c.example</a></p>');
});

test("markdown: random input only ever yields whitelisted tags", () => {
  const bits = ["<", ">", "[", "]", "(", ")", "!", "*", "_", "`", "~", "|", "-", "#", ">", "\n", " ", "a", "javascript:", "http://x", "&#106;", "\\", "<script>", "onerror=", '"', "1."];
  let seed = 7;
  const rnd = n => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
  for (let k = 0; k < 400; k++) {
    let s = "";
    for (let j = rnd(60); j > 0; j--) s += bits[rnd(bits.length)];
    const html = md(s);
    onlyWhitelisted(html);
    assert.ok(!/href="(?!https?:|mailto:|#)/i.test(html), s);
  }
});

test("markdown: every block keeps its source line, headings get unique slugs", () => {
  const nodes = MdRender.parse("# A\n\npara\n\n- x\n- y\n\n## A\n\n| h |\n|---|\n| v |\n");
  eq(nodes.map(n => [n.t, n.line]), [["h1", 1], ["p", 3], ["ul", 5], ["h2", 8], ["table", 10]]);
  eq(nodes[2].c.map(li => li.line), [5, 6]);
  eq([nodes[0].slug, nodes[3].slug], ["a", "a-1"]);
  assert.equal(MdRender.parse("## Việt Nam: giá!")[0].slug, "việt-nam-giá");
});

test("quick table: CSV rows padded, JSON shapes, row cap", () => {
  eq(QuickTable.fromRows([["id", "name"], ["1", "A", "extra"], ["2"]]), { cols: ["#", "id", "name", ""], rows: [["1", "1", "A", "extra"], ["2", "2", "", ""]], total: 2, totalCols: 3, shape: "rows" });
  eq(QuickTable.fromJson([{ a: 1, b: { x: 1 } }, { c: null }]), { cols: ["#", "a", "b", "c"], rows: [["0", "1", '{"x":1}', ""], ["1", "", "", "null"]], total: 2, totalCols: 3, shape: "objects" });
  eq(QuickTable.fromJson([1, "two"]), { cols: ["#", "value"], rows: [["0", "1"], ["1", "two"]], total: 2, totalCols: 1, shape: "values" });
  eq(QuickTable.fromJson({ k: [1, 2] }), { cols: ["key", "value"], rows: [["k", "[1,2]"]], total: 1, totalCols: 2, shape: "object" });
  const big = QuickTable.fromJson(Array.from({ length: QuickTable.MAX + 5 }, (_, i) => ({ i })));
  assert.equal(big.rows.length, QuickTable.MAX);
  assert.equal(big.total, QuickTable.MAX + 5);
  assert.equal(QuickTable.fromJson(["x".repeat(500)]).rows[0][1].length, 300);
});

test("preview kind: Markdown, HTML, tables, SVG and draw.io", () => {
  for (const [lang, kind] of [["Markdown", "markdown"], ["HTML", "html"], ["CSV", "table"], ["TSV", "table"], ["JSON", "table"]]) eq(PreviewKind.of(lang), { kind }, lang);
  eq(PreviewKind.of("XML", '<?xml version="1.0"?>\n<!-- x -->\n<svg xmlns="http://www.w3.org/2000/svg"/>'), { kind: "svg" });
  eq(PreviewKind.of("XML", "<mxfile><diagram/></mxfile>"), { kind: "drawio" });
  eq(PreviewKind.of("XML", "<mxGraphModel/>"), { kind: "drawio" });
  eq(PreviewKind.of("XML", "", "new.drawio"), { kind: "drawio" });
  eq(PreviewKind.of("XML", "", "icon.svg"), { kind: "svg" });
  assert.equal(PreviewKind.of("XML", "<config/>", "app.svg"), null);
  assert.equal(PreviewKind.of("XML", "<project/>"), null);
  eq(["mermaid", "puml", "dot", "js", "constructor"].map(PreviewKind.fence), ["mermaid", "plantuml", "graphviz", null, null]);
});

test("share link: previewed tabs are marked and only a literal true survives", () => {
  const obj = ShareState.build([[{ name: "a.md", lang: "", text: "# A", preview: true }, { name: "b.csv", lang: "", text: "x,1" }], []], false, "2c", false, "preview");
  const back = ShareState.parse(JSON.parse(JSON.stringify(obj)));
  eq(back.views[0].map(t => !!t.preview), [true, false]);
  assert.equal(ShareState.parse({ v: 1, views: [[{ n: "x", t: "y", p: "yes" }]] }).views[0][0].preview, undefined);
});

test("3b demos: payloads parse and every tab has a preview", () => {
  for (const k of ["markdown-mermaid", "html", "svg", "table", "drawio"]) {
    assert.ok(DEMOS[k], k);
    const p = ShareState.parse(DEMOS[k].payload());
    for (const t of p.views.flat()) assert.ok(PreviewKind.of(L.detect(t.name, t.text).id, t.text, t.name), k + " " + t.name);
  }
  assert.ok(!/<script/i.test(src("js/core/demo-samples-preview-docs.js")), "demo source must not contain a literal script tag");
});

test("markdown: nested emphasis follows CommonMark", () => {
  assert.equal(md("**bold *italic* bold**"), "<p><strong>bold <em>italic</em> bold</strong></p>");
  assert.equal(md("*it **b** it*"), "<p><em>it <strong>b</strong> it</em></p>");
  assert.equal(md("__a _b_ c__"), "<p><strong>a <em>b</em> c</strong></p>");
  assert.equal(md("*a **b***"), "<p><em>a <strong>b</strong></em></p>");
  assert.equal(md("_foo_bar_ foo*bar*baz a * b *"), "<p><em>foo_bar</em> foo<em>bar</em>baz a * b *</p>");
  assert.equal(md("**[x](https://a.example)** [*a*](https://b.example)"), '<p><strong><a href="https://a.example">x</a></strong> <a href="https://b.example"><em>a</em></a></p>');
});

test("markdown: pathological input stays linear and never overflows the stack", () => {
  const cases = { emph: "*a ".repeat(30000), under: "_a ".repeat(30000), brackets: "[".repeat(60000), ticks: "` ".repeat(30000), comment: "<!--" + " a".repeat(40000),
    atx: "# a" + " ".repeat(60000) + "b", fence: "```" + "a".repeat(60000) + "`", sep: "a|b\n-" + " ".repeat(60000) + "x", list: "- ".repeat(5000) + "x",
    quote: "> ".repeat(5000) + "x", nest: "*a ".repeat(3000) + "b" + "* ".repeat(3000), links: "[a](".repeat(20000) };
  for (const [k, s] of Object.entries(cases)) {
    const t0 = Date.now(), html = md(s), ms = Date.now() - t0;
    assert.ok(ms < 400, `${k}: ${ms} ms`);
    onlyWhitelisted(html);
  }
});

test("quick table: columns capped, headers cut", () => {
  const wide = QuickTable.fromRows([Array.from({ length: 500 }, (_, k) => "c" + k), ["1"]]);
  assert.equal(wide.cols.length, QuickTable.MAX_COLS + 1);
  assert.equal(wide.totalCols, 500);
  assert.equal(QuickTable.fromRows([["h".repeat(400)], ["x"]]).cols[1].length, 300);
  const keys = QuickTable.fromJson(Array.from({ length: 300 }, (_, k) => ({ ["k" + k]: k })));
  eq([keys.cols.length, keys.totalCols], [QuickTable.MAX_COLS + 1, 300]);
});

test("html preview: own CSP goes after the doctype, before any content", () => {
  assert.match(PvHtml.wrap("<!DOCTYPE html>\n<p>x</p>"), /^<!DOCTYPE html><meta http-equiv="Content-Security-Policy" content="default-src 'none';[^"]*">\n<p>x<\/p>$/);
  assert.ok(PvHtml.wrap("<p>x</p>").startsWith("<meta http-equiv=\"Content-Security-Policy\""));
  assert.ok(!/connect-src|frame-src|https?:/.test(PvHtml.CSP));
});
