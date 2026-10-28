// Unit tests for the DOM-free modules. Run: node --test src/fix-message-parser/tests/fix-parser-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = [
  "js/dictionary/fix44-standard-dictionary-data.js", "js/dictionary/venue-fix44-dialect-overlay-data.js", "js/dictionary/fix50sp2-extra-field-names-data.js",
  "js/dictionary/fix44-orchestra-descriptions-data.js", "js/dictionary/venue-fix-spec-notes-data.js",
  "js/dictionary/fix-dictionary.js", "js/dictionary/tag-explanation-lookup.js", "js/parser/fix-wire-codec.js", "js/parser/fix-log-extractor.js", "js/parser/fix-message-validator.js",
  "js/model/order-chain-linker.js", "js/model/fix-timestamp-time-zone-format.js", "js/model/sensitive-data-mask.js", "js/model/custom-dictionary-csv.js",
  "js/samples/venue-trade-report-and-quote-samples.js", "js/samples/fix44-order-and-broken-message-samples.js",
];
const code = FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { FixCustom, FixKnow, FixDict, FixCodec, FixLog, FixCheck, FixChain, FixTime, FixMask, VenueSamples, StdSamples };";
const ctx = vm.createContext({ TextEncoder, console });
vm.runInContext(code, ctx);
const { FixCustom, FixKnow, FixDict, FixCodec, FixLog, FixCheck, FixChain, FixTime, FixMask, VenueSamples, StdSamples } = ctx.M;

const parse = (text, dialect = "fix44") => FixLog.extract(text).items.map(it => FixCheck.analyse(it, FixDict.get(dialect)));
const keys = m => m.issues.map(i => i.key);
// Objects from the vm realm have another Object.prototype → compare through JSON.
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

test("codec: textbook message has correct BodyLength and CheckSum", () => {
  const wire = "8=FIX.4.2\x019=65\x0135=A\x0134=177\x0149=SERVER\x0152=20090107-18:15:16\x0156=CLIENT\x0198=0\x01108=30\x0110=062\x01";
  const v = FixCodec.verify(FixCodec.split(wire, FixCodec.SOH));
  assert.equal(v.bodyLength.actual, "65");
  assert.equal(v.checkSum.actual, "062");
  assert.equal(FixCodec.build([["35", "A"], ["34", 177], ["49", "SERVER"], ["52", "20090107-18:15:16"], ["56", "CLIENT"], ["98", 0], ["108", 30]], { begin: "FIX.4.2" }), wire);
});

test("extractor: delimiters, log prefix, several messages per line, non-FIX lines skipped", () => {
  const one = FixCodec.build([["35", "0"], ["34", 2], ["49", "A"], ["52", "20261028-01:00:00"], ["56", "B"]]);
  const text = [`2026-10-28 09:00 IN  ${one.split("\x01").join("|")}`, one + one, one.split("\x01").join("^A"), "just a log line"].join("\n");
  const r = FixLog.extract(text);
  assert.equal(r.items.length, 4);
  assert.equal(r.skipped, 1);
  assert.equal(r.items[0].prefix, "2026-10-28 09:00 IN");
  same(r.items.map(i => FixLog.label(i.delim)), ["|", "SOH", "SOH", "^A"]);
  assert.ok(parse(text).every(m => m.level === "ok"));
});

test("validator: broken sample reports each rule", () => {
  const msgs = parse(StdSamples.broken());
  const all = msgs.flatMap(keys);
  for (const k of ["CheckSum sai: khai báo {declared}, tính được {actual}", "BodyLength sai: khai báo {declared}, thực tế {actual}",
    "Tag 35 (MsgType) phải đứng thứ 3", "Thiếu tag bắt buộc {tag} ({name}) của {msg}", "Tag {tag}: giá trị “{value}” không đúng kiểu {type}",
    "Tag {tag} lặp lại ngoài repeating group", "Nhóm {tag} khai báo {n} phần tử nhưng có {m}", "Thiếu tag 10 (CheckSum) ở cuối — message bị cắt?",
    "Tag {tag} không có trong từ điển", "Không xác định được dấu phân cách giữa các tag",
    "Mẩu message không có header/trailer (thiếu 8=FIX…) — không kiểm BodyLength/CheckSum"])
    assert.ok(all.includes(k), k);
  assert.equal(msgs[0].level, "ok");
});

test("validator: repeating group entries get depth + entry index", () => {
  const m = parse(StdSamples.orderLifecycle()).find(x => x.type === "D");
  const party = m.fields.filter(f => f.tag === "448");
  same(party.map(f => [f.depth, f.entry, f.first]), [[1, 1, true], [1, 2, true]]);
  assert.equal(m.level, "ok");
});

test("venue samples: clean under the venue dialect, dialect renames tags, chains follow BCGD orders", () => {
  const msgs = parse(VenueSamples.lifecycle(), "venue");
  const bad = msgs.filter(m => m.level === "error" || m.level === "warn");
  assert.equal(bad.length, 0, JSON.stringify(bad.map(m => [m.type, keys(m), m.issues.map(i => i.params)])));
  const venue = FixDict.get("venue"), std = FixDict.get("fix44");
  assert.equal(FixDict.name(venue, "2"), "CoAccount");
  assert.equal(FixDict.name(std, "2"), "AdvId");
  assert.equal(FixDict.name(venue, "6464"), "SettlValue");
  const chain = FixChain.link(msgs);
  const idx = id => msgs.findIndex(m => m.get("11") === id);
  const amend = idx("BOND-20261028-0005"), place = idx("BOND-20261028-0002");
  assert.equal(chain.root[amend], chain.root[place]);
  assert.equal(chain.size(chain.root[place]), 4);
  const reject = msgs.findIndex(m => m.type === "3");
  assert.equal(chain.root[reject], chain.root[idx("BOND-20261028-0001")]);
  const flagged = text => parse(text, "venue").filter(m => m.level === "error" || m.level === "warn").map(m => [m.type, ...m.issues.filter(i => i.level !== "info").map(i => i.params.tag)]);
  same(flagged(VenueSamples.tradingDay()), []);
  same(flagged(VenueSamples.quotes()), []);
});

test("time: UTC, Vietnam and fraction kept", () => {
  assert.equal(FixTime.short("20261028-02:10:21.373", "utc"), "02:10:21.373");
  assert.equal(FixTime.full("20261028-20:00:00", "vn"), "2026-10-29 03:00:00 (UTC+7)");
  assert.equal(FixTime.convert("not a time", "vn"), null);
});

test("mask: accounts/passwords hidden with same length, valid messages re-signed", () => {
  const text = VenueSamples.lifecycle();
  const items = FixLog.extract(text).items;
  const r = FixMask.apply(text, items, "venue");
  assert.ok(r.count > 10);
  assert.ok(!r.text.includes("Secret#2026") && !r.text.includes("001C000101"));
  assert.ok(r.text.includes("554=***********") && /\|1=001CX+\d+\|/.test(r.text));
  assert.ok(parse(r.text, "venue").every(m => m.level !== "error"));
  // Order ids get one pseudonym per value, so chains still link after anonymizing.
  const all = FixMask.apply(text, items, "venue", Object.keys(FixMask.CATEGORIES));
  assert.ok(!all.text.includes("BOND-20261028-0002") && !all.text.includes("FIRM001"));
  const before = parse(text, "venue"), after = parse(all.text, "venue");
  same(FixChain.link(after).root, FixChain.link(before).root);
  assert.ok(after.every(m => m.level !== "error"));
});

test("custom dictionary CSV: names, value meanings, sensitive + link flags, layered over the dialect", () => {
  const c = FixCustom.parse(FixCustom.SAMPLE + "\nbad,row\n");
  assert.equal(c.errors.length, 1);
  assert.equal(c.fields.get("9877").enums.get("V"), "VWAP");
  same(FixCustom.tags(c, "sensitive"), ["9879"]);
  same(FixCustom.tags(c, "link"), ["9878"]);
  FixDict.setCustom(c);
  const d = FixDict.get("fix44");
  assert.equal(FixDict.name(d, "9876"), "DeskCode");
  assert.equal(FixDict.meaning(d, "9877", "T"), "TWAP");
  const msg = FixCodec.build([["35", "D"], ["34", 1], ["49", "A"], ["52", "20261028-01:00:00"], ["56", "B"], ["11", "C1"], ["9878", "P1"]])
    + FixCodec.build([["35", "D"], ["34", 2], ["49", "A"], ["52", "20261028-01:00:01"], ["56", "B"], ["11", "C2"], ["9878", "P1"]]);
  const ms = parse(msg);
  assert.ok(!ms[0].issues.some(x => x.params.tag === "9878"));
  assert.equal(FixChain.link(ms, FixCustom.tags(c, "link")).root[1], 0);
  FixDict.setCustom(null);
  assert.equal(FixDict.name(FixDict.get("fix44"), "9876"), "");
});

test("review regressions: missing 9, garbage token, merged group members, 8=FIX inside a value, header group", () => {
  const p = s => s.split("\x01").join("|");
  const no9 = parse("8=FIX.4.4|35=D|34=1|49=A|52=20261028-01:00:00|56=B|10=000|")[0];
  assert.equal(no9.delim, "|");
  assert.ok(no9.fields.length > 5);
  const good = FixCodec.build([["35", "0"], ["34", 2], ["49", "A"], ["52", "20261028-01:00:00"], ["56", "B"]]);
  const garbage = FixCodec.toWire(FixCodec.rebuild([...FixCodec.split(good, "\x01").slice(0, 3), { tag: null, value: "junk" }, ...FixCodec.split(good, "\x01").slice(3)]));
  assert.ok(!keys(parse(p(garbage))[0]).some(k => /BodyLength|CheckSum/.test(k)));
  const md = parse(p(FixCodec.build([["35", "X"], ["34", 1], ["49", "A"], ["52", "20261028-01:00:00"], ["56", "B"], ["268", 2], ["279", 0], ["269", 0], ["55", "ABC"], ["270", 10], ["279", 2], ["278", "ID2"]])))[0];
  assert.ok(!keys(md).includes("Nhóm {tag} khai báo {n} phần tử nhưng có {m}"), JSON.stringify(md.issues));
  const inner = FixCodec.build([["35", "B"], ["34", 3], ["49", "A"], ["52", "20261028-01:00:00"], ["56", "B"], ["148", "see 8=FIX.4.4 spec"]]);
  const r = parse(p(inner) + p(good));
  same(r.map(m => m.type), ["B", "0"]);
  assert.notEqual(r[0].level, "error");
  const hops = parse(p(FixCodec.build([["35", "0"], ["34", 4], ["49", "A"], ["627", 1], ["628", "HOP1"], ["52", "20261028-01:00:00"], ["56", "B"]])))[0];
  assert.ok(!keys(hops).includes("Tag header {tag} nằm sau phần thân"), JSON.stringify(hops.issues));
  assert.ok(!keys(parse(p(good).replace(/\|9=(\d+)/, "|9=0$1"))[0]).some(k => /BodyLength/.test(k)));
});

test("explanations: FIX synopsis, venue per-message notes, value lists and error codes from CBTS v1.15", () => {
  const msgs = parse(VenueSamples.lifecycle(), "venue");
  const s = msgs.find(m => m.type === "s"), match = msgs.find(m => m.type === "8" && m.get("150") === "3"), cancel = msgs.find(m => m.get("150") === "4");
  assert.match(FixKnow.fieldDoc("11"), /Unique identifier for Order/);
  assert.equal(FixKnow.venueNote(s, "1").lines[0], "TK bên bán");
  assert.equal(FixKnow.venueValue(s, "549", "3"), "bên đối ứng chấp nhận thoả thuận");
  assert.equal(FixKnow.venueValue(s, "6363", "2"), "Thanh toán cuối ngày");
  assert.equal(FixKnow.venueNote(match, "41").lines[0], "Số hiệu lệnh gốc bên bán");
  assert.match(FixKnow.venueValue(cancel, "39", "5"), /lệnh hủy thành công/);
  assert.equal(FixKnow.venueError("-32001"), "Thị trường chưa nhận lệnh!");
  assert.equal(FixKnow.venuePurpose(s).title, "NewOrderCross");
  assert.equal(FixKnow.venueNote(s, "6464").own, true);
});

test("venue name from the data fills {venue} in spec purposes / notes", () => {
  FixKnow.setVenue("EXCH");
  const p = FixKnow.venuePurpose({ type: "h", get: () => "" });
  assert.match(p.purpose, /EXCH gửi/);
  assert.doesNotMatch(JSON.stringify(p), /\{venue\}/);
  FixKnow.setVenue("{venue}");
});
