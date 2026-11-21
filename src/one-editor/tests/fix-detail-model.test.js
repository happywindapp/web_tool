// Run: node --test src/one-editor/tests/fix-detail-model.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, I18n: { num: n => String(n), lang: "en" }, TextEncoder });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const FP = "../fix-message-parser/js/";
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/layout-presets.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-log-fix.js",
  FP + "dictionary/fix44-standard-dictionary-data.js", FP + "dictionary/venue-fix44-dialect-overlay-data.js", FP + "dictionary/fix50sp2-extra-field-names-data.js",
  FP + "dictionary/fix-dictionary.js", FP + "dictionary/fix44-orchestra-descriptions-data.js", FP + "dictionary/venue-fix-spec-notes-data.js", FP + "dictionary/tag-explanation-lookup.js",
  FP + "parser/fix-wire-codec.js", FP + "parser/fix-log-extractor.js", FP + "parser/fix-message-validator.js", FP + "model/venue-dialect-detection.js", FP + "model/order-chain-linker.js",
  FP + "model/fix-timestamp-time-zone-format.js", FP + "ui/tag-meaning-and-tooltip.js", FP + "ui/message-detail-pane.js", "js/log/fix-detail-model.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { ShareState, DEMOS, FixDetailModel, Detail });", ctx);
const { ShareState, DEMOS, FixDetailModel } = ctx;
const DEMO = ShareState.parse(DEMOS["fix-hover"].payload()).views[0][0].text;

test("fix detail: demo messages are valid, cursor line picks the message, JSON text carries meanings", () => {
  const r = FixDetailModel.build(DEMO, 3);
  assert.equal(r.msgs.length, 3);
  assert.equal(r.msgs.map(m => m.level).join(), "ok,ok,ok", "demo BodyLength / CheckSum must be right");
  assert.equal(r.sel, 2);
  assert.equal(FixDetailModel.build(DEMO, 0).sel, 0);
  assert.equal(r.dictLabel, "FIX 4.4");
  const json = JSON.parse(r.text);
  assert.equal(json.count, 3);
  assert.equal(JSON.stringify(json.messages[2]), '{"line":3,"msgType":"8","name":"ExecutionReport","level":"ok","issues":[]}');
  assert.equal(ctx.Detail.json(r.msgs[2], r.dict, "utc").fields.find(f => f.tag === "39").meaning, "Rejected");
  assert.match(r.notes[0], /^3 message · 0 lỗi · 0 cảnh báo/);
});

test("fix detail: wrong checksum is an error, venue tags switch the dictionary, non-FIX text throws", () => {
  const bad = DEMO.split("\n")[0].replace("10=246", "10=999");
  const m = FixDetailModel.build(bad).msgs[0];
  assert.equal(m.level, "error");
  assert.ok(m.issues.some(x => x.tag === "10"));
  const venue = FixDetailModel.build("8=FIX.4.4|9=40|35=8|49=EXCH|56=FIRM01|6464=1|39=0|10=000|");
  assert.equal(venue.dictLabel, "EXCH FIX 4.4");
  assert.throws(() => FixDetailModel.build("hello world"), /FIX/);
});
