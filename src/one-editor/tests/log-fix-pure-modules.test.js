// Run: node --test src/one-editor/tests/log-fix-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, I18n: { num: n => String(n) }, Prefs: { get: (k, d) => d, set() {} } });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const DICT = "../fix-message-parser/js/dictionary/";
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/layout-presets.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-log-fix.js",
  DICT + "fix44-standard-dictionary-data.js", DICT + "venue-fix44-dialect-overlay-data.js", DICT + "fix50sp2-extra-field-names-data.js", DICT + "fix-dictionary.js",
  "js/log/log-fix-line-highlight.js", "js/log/fix-tag-hover.js", "js/log/line-filter-to-output.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { OutputOps, ShareState, DEMOS, LangDetect, FixDict, LogFixMarks, FixHover, LineFilter });", ctx);
const { OutputOps, ShareState, DEMOS, LangDetect, FixDict, LogFixMarks, FixHover, LineFilter } = ctx;
const LOG = ShareState.parse(DEMOS["log-filter"].payload()).views[0][0].text;

test("line filter: text / regex, case, exclude, context with gaps, regex errors", () => {
  const f = s => LineFilter.filter(LOG, { q: "", regex: false, cs: false, invert: false, ctx: 0, ...s });
  const r = f({ q: "ERROR|WARN", regex: true });
  eq([r.hits, r.total, r.rows.map(x => x.n)], [3, 10, [4, 6, 8]]);
  const c = f({ q: "ERROR", regex: true, ctx: 1 });
  eq(c.rows.map(x => x.gap ? "--" : x.n + (x.hit ? "*" : "")), ["5", "6*", "7", "8*", "9"], "context lines merge, no gap between touching groups");
  eq(f({ q: "heartbeat", ctx: 1 }).rows.map(x => x.gap ? "--" : x.n), [6, 7, 8]);
  eq(f({ q: "ORD-100", ctx: 0 }).rows.map(x => x.n), [3, 5, 6], "plain text, case-insensitive");
  eq(f({ q: "order ORD", cs: true }).hits, 3);
  eq(f({ q: "ORDER ORD", cs: true }).hits, 0);
  eq(f({ q: "INFO|DEBUG", regex: true, invert: true }).rows.map(x => x.n), [4, 6, 8], "exclude");
  eq(LineFilter.filter("a\nb\n\nc\n", { q: "", ctx: 0 }).rows.map(x => x.t), ["a", "b", "", "c"], "empty pattern keeps every line, no phantom last line");
  const g = LineFilter.filter("x\n1\n2\n3\n4\nx\n", { q: "x", ctx: 1 });
  eq(g.rows.map(x => x.gap ? "--" : x.n), [1, 2, "--", 5, 6]);
  assert.throws(() => f({ q: "(", regex: true }), /Regex/);
  const op = OutputOps.get("filter");
  assert.ok(op.pane && op.live && !op.restore);
});

test("log spans: levels, timestamps, UUIDs, IPs, strings, numbers in order", () => {
  const line = '2026-11-20 09:15:02.381 WARN session 6f1c2a9e-4b7d-4c1e-9a33-2b8f0d5e7a10 from 10.0.4.17:8443 build="2.4.1" qty=100';
  const sp = LogFixMarks.logSpans(line).map(([a, b, c]) => c + ":" + line.slice(a, b));
  eq(sp, ["lg-time:2026-11-20 09:15:02.381", "lg-warn:WARN", "lg-id:6f1c2a9e-4b7d-4c1e-9a33-2b8f0d5e7a10", "lg-ip:10.0.4.17:8443", 'lg-str:"2.4.1"', "lg-num:100"]);
  eq(LogFixMarks.logSpans("fatal error at 09:00:01").map(x => x[2]), ["lg-err", "lg-err", "lg-time"]);
  let last = -1;
  for (const [a, b] of LogFixMarks.logSpans(LOG.split("\n")[5])) { assert.ok(a >= last && b > a); last = b; }
});

test("FIX spans: tags by header / body / trailer, MsgType value, SOH or | separators", () => {
  const SOH = LogFixMarks.SOH, line = ["8=FIX.4.4", "35=D", "11=ORD-1", "54=1", "10=128", ""].join(SOH);
  const sp = LogFixMarks.fixSpans(line).map(([a, b, c]) => c + ":" + line.slice(a, b));
  eq(sp, ["fx-h:8", "fx-v:FIX.4.4", "fx-h:35", "fx-mt:D", "fx-b:11", "fx-v:ORD-1", "fx-b:54", "fx-v:1", "fx-t:10", "fx-v:128"]);
  eq(LogFixMarks.fixSpans("8=FIX.4.4|58=a b|10=001|").map(x => x[2]), ["fx-h", "fx-v", "fx-b", "fx-v", "fx-t", "fx-v"]);
  assert.equal(LangDetect.detect("", ShareState.parse(DEMOS["fix-hover"].payload()).views[0][0].text).id, "FIX");
  assert.equal(LangDetect.detect("", LOG).id, "Log");
});

test("FIX hover: names, types, groups and enum meanings from the FIX Parser dictionary", () => {
  const d = FixDict.get("fix44");
  const r = (tag, v) => Object.fromEntries(FixHover.describe(d, tag, v).rows);
  eq(r("35", "D"), { "Tên": "Msg Type (MsgType)", "Kiểu": "STRING", "Nhóm": "header", "Giá trị": "D → New Order Single" });
  eq(r("54", "2")["Giá trị"], "2 → Sell");
  eq(r("39", "8")["Giá trị"], "8 → Rejected");
  assert.equal(r("10", "128")["Nhóm"], "trailer");
  assert.equal(r("55", "ACME")["Giá trị"], "ACME", "no enum → just the value");
  assert.equal(r("99999", "x")["Tên"], "Không có trong từ điển FIX 4.4 / 5.0SP2");
  assert.equal(FixHover.describe(d, "11", "X").title, "FIX 11 · ClOrdID");
});
