// Run: node --test src/one-editor/tests/log-merge-fix-lifecycle-swift-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, I18n: { num: n => String(n) }, atob, TextDecoder });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext("var PowerDemos = {};\n" + [
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/paste-content-detect-pure.js",
  "../fix-message-parser/js/model/order-chain-linker.js", "js/log/log-merge-timeline-pure.js", "js/log/log-merge-op-and-worker.js", "js/log/fix-order-lifecycle-pure.js",
  "js/log/swift-mt-parse-pure.js", "js/log/swift-mt-outline-marks-hover.js", "js/log/log-domain-demos.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { LangDetect, PasteDetect, FixChain, LogMerge, logMergeWorkerHandlers, FixLifecycle, SwiftMt, SwiftMarks });", ctx);
const { LangDetect, PasteDetect, FixChain, LogMerge, logMergeWorkerHandlers, FixLifecycle, SwiftMt, SwiftMarks, PowerDemos } = ctx;
const demo = k => PowerDemos[k].payload();
const U = (y, mo, d, h, mi, s, ms = 0) => Date.UTC(y, mo - 1, d, h, mi, s, ms);

test("log merge: timestamp formats, custom format, offsets", () => {
  const at = (id, l, day0 = 0) => LogMerge.stamp(LogMerge.AUTO.find(p => p.id === id), l, day0);
  assert.equal(at("iso", "2026-11-20 09:30:01.123 INFO x"), U(2026, 11, 20, 9, 30, 1, 123));
  assert.equal(at("iso", "[2026-11-20T09:30:01,5+07:00] x"), U(2026, 11, 20, 2, 30, 1, 500), "zone honoured");
  assert.equal(at("dmy", "20/11/2026 09:30:01.300 INFO"), U(2026, 11, 20, 9, 30, 1, 300));
  assert.equal(at("epoch", "1795656601123 x"), 1795656601123);
  assert.equal(at("fix", "8=FIX.4.4|35=D|52=20261120-02:30:01.220|56=B"), U(2026, 11, 20, 2, 30, 1, 220));
  assert.equal(at("time", "02:30:03.850 INFO", U(2026, 11, 20, 0, 0, 0)), U(2026, 11, 20, 2, 30, 3, 850));
  assert.ok(isNaN(at("iso", "no time here")));
  const c = LogMerge.compile("dd.MM.yyyy HH:mm:ss.SSS");
  assert.equal(LogMerge.stamp(c, "x 20.11.2026 09:30:01.25 y", 0), U(2026, 11, 20, 9, 30, 1, 250));
  assert.throws(() => LogMerge.compile("yyyy-MM-dd"), /HH and mm/);
  eq(["+7h", "-150ms", "2s", "-90", "1.5m", "abc"].map(LogMerge.offset), [25200000, -150, 2000, -90000, 90000, null]);
  assert.equal(LogMerge.detect(["2026-11-20 02:30:00.105 INFO 8=FIX.4.4|52=20261120-02:30:00.000|"]).id, "iso", "a log prefix beats 52=");
});

test("log merge: untimed lines ride with the line before, lines before the first stamp ride with it", () => {
  const s = LogMerge.parseSource("banner\n10:00:00.000 a\n  at x\n10:00:01.000 b\n");
  eq([...s.head], [1, 0, 0, 1], "the banner and the first stamped line are one group");
  eq([s.ts[0] === s.ts[1], s.ts[2] === s.ts[1], s.fmt, s.hits, s.dateless], [true, true, "time", 2, true]);
});

test("log merge worker: demo — offsets, order, stack trace, time-only day, linked id filter, histogram", () => {
  const p = demo("log-merge"), H = logMergeWorkerHandlers(), offs = p.opts.sources.map(s => LogMerge.offset(s.off || "0"));
  const r = H.load({ sources: p.views[0].map((t, i) => ({ text: t.t, fmt: "", off: offs[i] })) });
  eq(r.sources.map(s => [s.fmt, s.hits]), [["iso", 7], ["dmy", 4], ["time", 4]]);
  const v = H.view({ filter: { q: "" }, unit: "s" });
  eq([v.rows, v.err, v.warn], [7 + 7 + 4, 2, 2]);
  const rows = H.rows({ start: 0, n: 100 }), seq = rows.map(x => "ABC"[x.s] + x.line);
  eq(seq.slice(0, 7), ["A1", "A2", "B1", "B2", "C1", "C2", "A3"], "oms -7h lands between gateway lines; risk -2.5 s ties the OMS request (source order breaks the tie)");
  const err = seq.indexOf("B3");
  eq(seq.slice(err, err + 4), ["B3", "B4", "B5", "B6"], "stack trace stays under its ERROR line");
  assert.equal(new Date(rows.find(x => x.s === 2).ts).toISOString(), "2026-11-20T02:30:01.350Z", "time-only log takes the date of the dated logs");
  assert.equal(H.text({ max: 2 }), "[A] " + p.views[0][0].t.split("\n")[0] + "\n[A] " + p.views[0][0].t.split("\n")[1] + "\n");
  const f = H.view({ filter: { q: "ORD-1001", link: true }, unit: "s" }), kept = H.rows({ start: 0, n: 100 }).map(x => x.text);
  assert.ok(kept.some(t => t.includes("risk check ok requestId=REQ-9001")), "ClOrdID → orderId → requestId pulls in the risk log");
  assert.ok(!kept.some(t => t.includes("ORD-1002")));
  const noLink = H.view({ filter: { q: "ORD-1001", link: false }, unit: "s" });
  assert.ok(noLink.rows < f.rows);
  eq([v.hist.size, v.hist.n.length, v.hist.n.reduce((a, b) => a + b, 0)], [1000, 121, 15]);
  eq([v.hist.n[4], v.hist.err[4], v.hist.warn[4]], [3, 2, 1], "02:30:04: risk WARN (-2.5 s) + 2 ERROR");
  H.view({ filter: { q: "" }, unit: "s" });
  assert.match(H.rows({ start: v.hist.row[4], n: 1 })[0].text, /risk limit near/, "a bar jumps to its first row");
  eq(H.view({ filter: { q: "" }, unit: "m" }).hist.size, 60000);
  assert.throws(() => logMergeWorkerHandlers().text({ max: 1 }), /no result/);
});

// Light FIX split for the pure module: { line, type, get, all } like FixCheck.analyse.
const fixMsgs = text => text.trim().split("\n").map((l, i) => {
  const f = l.split("|").filter(Boolean).map(x => x.split("=")), get = t => (f.find(x => x[0] === t) || [])[1];
  return { line: i + 1, type: get("35"), get, all: t => f.filter(x => x[0] === t).map(x => x[1]) };
});

test("FIX lifecycle: demo chain 11 → 41, one odd change, Markdown, Mermaid cut", () => {
  const msgs = fixMsgs(demo("fix-lifecycle").views[0][0].t), orders = FixLifecycle.build(msgs, FixChain.link(msgs).root);
  eq(orders.map(o => [o.key, o.symbol, o.status, o.rows.length, o.warns]), [["ORD-2001", "ACME", "0", 7, 1], ["ORD-2003", "GLOBX", "8", 2, 0]]);
  eq(orders[0].rows[6].warn, [{ code: "afterTerminal", from: "2", to: "0" }]);
  const md = FixLifecycle.markdown(orders, {}, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"], w => w.code, "T");
  assert.match(md, /^# T\n\n## ORD-2001 · ACME · 1 · 39=0\n/);
  assert.match(md, /\| 7 \| 20261120-02:31:41\.000 \| BROKER → CLIENT01 \| 8 \| 0 \| 0 \| ORD-2002 \|/);
  const mm = FixLifecycle.mermaid(orders, { msg: t => ({ D: "New Order Single", 8: "Execution Report" })[t] }, 3);
  eq([mm.shown, mm.total], [3, 9]);
  assert.match(mm.text, /^sequenceDiagram\n {2}participant P1 as CLIENT01\n {2}participant P2 as BROKER\n {2}P1->>P2: D New Order Single 11=ORD-2001 1000@21\.40\n {2}P2-->>P1: 8 Execution Report/);
  assert.match(FixLifecycle.mermaid(orders, {}).text, /Note over P1: ⚠ afterTerminal/);
});

test("FIX lifecycle: cum down, overfill, leaves mismatch, request after done", () => {
  const msgs = fixMsgs(["35=D|49=C|56=B|11=A|38=100", "35=8|49=B|56=C|11=A|39=1|150=F|32=60|14=60|151=50", "35=8|49=B|56=C|11=A|39=1|150=F|14=40|151=60",
    "35=8|49=B|56=C|11=A|39=2|150=F|32=80|14=120|151=0", "35=F|49=C|56=B|11=A2|41=A"].join("\n"));
  const codes = FixLifecycle.build(msgs, FixChain.link(msgs).root)[0].rows.map(r => r.warn.map(w => w.code).join(","));
  eq(codes, ["", "leaves", "cumDown,tradeNoQty", "overfill", "afterDone"]);
});

test("SWIFT MT: demo blocks, fields, sequences, errors", () => {
  const r = SwiftMt.parse(demo("swift-mt540").views[0][0].t);
  eq(r.messages.map(m => [m.line, m.header.mt, m.header.sender, m.header.receiver, m.fields.length]), [[1, "540", "FAKEVNVXAXXX", "DUMYVNVXXXXX", 24], [28, "540", "FAKEVNVXAXXX", "DUMYVNVXXXXX", 22]]);
  const f = r.messages[0].fields;
  eq([f[1].tag, f[1].qual, f[1].value, f[1].path, f[1].line], ["20C", "SEME", "DEMO-REF-0001", "GENL", 3]);
  eq(f.find(x => x.tag === "35B").value, "ISIN VN0000DEMO01\nDEMO BOND 2030", "continuation line kept");
  eq(f.find(x => x.qual === "DEAG").path, "SETDET/SETPRTY");
  eq(r.messages[0].errors, []);
  eq(r.messages[1].errors.map(e => [e.code, e.name || e.field]), [["unclosed16R", "FIAC"], ["noField", "97::SAFE"]]);
  const bad = SwiftMt.parse("{1:F01AAAAAAAAAXXX0000000000}{2:I548BBBBBBBBXXXXN}{4:\n:16R:GENL\n:20C::SEME//X\n:16S:LINK\n-}").messages[0];
  eq(bad.errors.map(e => e.code), ["mismatch16S", "unclosed16R", "noField", "noSeq", "noSeq"]);
  eq(SwiftMt.parse("{1:F01AAAAAAAAAXXX0000000000}{2:I598BBBBBBBBXXXXN}{4:\n:20:REF\n:12:001").messages[0].errors.map(e => e.code), ["noEnd4"]);
  eq(SwiftMt.parse("hello").errors.map(e => e.code), ["noBlock1"]);
});

test("SWIFT MT: language, smart paste, outline, line marks", () => {
  const text = demo("swift-mt540").views[0][0].t;
  eq([LangDetect.detect("settlement.fin").id, LangDetect.detect("x", text).id], ["SWIFT MT", "SWIFT MT"]);
  eq(PasteDetect.detect(text), { kind: "swift", label: "SWIFT MT (ISO 15022)", lang: "SWIFT MT", op: "swift-detail" });
  eq(SwiftMarks.outline(text).slice(0, 4).map(s => [s.label, s.depth, s.line]), [["MT540 FAKEVNVXAXXX", 0, 1], ["GENL", 1, 2], ["TRADDET", 1, 7], ["FIAC", 1, 14]]);
  eq(SwiftMarks.outline(text).find(s => s.label === "SETPRTY").depth, 2);
  eq(SwiftMarks.spans(":20C::SEME//DEMO-REF"), [[0, 5, "sw-tag"], [5, 12, "sw-q"], [12, 20, "fx-v"]]);
  eq(SwiftMarks.spans(":16R:GENL"), [[0, 5, "sw-seq"], [5, 9, "sw-seq"]]);
  eq(SwiftMarks.spans("-}{5:{CHK:1}}").map(x => x[2]), ["sw-blk", "sw-blk", "sw-blk", "sw-blk"]);
});

test("review fixes: midnight rollover, impossible dates, histogram cap, linked ids by name, owner check", () => {
  const a = LogMerge.parseSource("23:59:58 a0\n23:59:59 a1\n00:00:01 a2", { day0: U(2026, 11, 20, 0, 0, 0) });
  assert.equal(a.rolls, 1);
  assert.equal(a.ts[2], U(2026, 11, 21, 0, 0, 1));
  assert.ok(Number.isNaN(LogMerge.stamp(LogMerge.AUTO.find(p => p.id === "dmy"), "11/25/2026 10:00:00", 0)), "month 25 is no stamp");
  const y = LogMerge.parseSource("2026-01-01 00:00:00 a\n  \"validTo\": \"9999-12-31T23:59:59Z\"");
  const h = LogMerge.histogram(LogMerge.merge([y]), new Uint8Array(2).fill(1), "");
  assert.ok(h.n.length <= LogMerge.MAX_BUCKETS, "capped at " + h.n.length);
  const x = LogMerge.parseSource("10:00:00 11=100 new\n10:00:01 11=777|38=100\n10:00:02 41=100 cancel\n10:00:03 37=NONE");
  eq([...LogMerge.filter([x], LogMerge.merge([x]), { q: "11=100", link: true })], [1, 0, 1, 0]);
  const H = logMergeWorkerHandlers();
  H.load({ sources: [{ text: "10:00:00 a\n", fmt: "", off: 0 }] });
  H.view({ owner: "A", filter: null, unit: "auto" });
  assert.equal(H.rows({ owner: "A", start: 0, n: 5 }).length, 1);
  assert.throws(() => H.rows({ owner: "B", start: 0, n: 5 }), /no result/);
});

test("review fixes: SWIFT resyncs at the next {1: and flags malformed blocks / tags", () => {
  const ok = "{1:F01DEMOBANKAXXX0000000000}{2:I541DEMOCUSTXXXXN}{4:\n:16R:GENL\n:20C::SEME//A1\n:16S:GENL\n-}";
  assert.equal(SwiftMt.parse(ok.replace("\n-}", "-}") + "\n" + ok).messages.length, 2, "missing -} does not swallow the next message");
  assert.equal(SwiftMt.parse(ok.replace("{2:I541DEMOCUSTXXXXN}", "{3:{108:X}") + "\n" + ok).messages.length, 2, "open block does not drop the rest");
  eq(SwiftMt.parse(ok.replace("I541", "I 541").replace(":20C::SEME", ":20c::SEME")).messages[0].errors.map(e => e.code), ["badField", "badBlock2"]);
});
