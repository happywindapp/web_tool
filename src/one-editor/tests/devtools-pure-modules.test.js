// Run: node --test src/one-editor/tests/devtools-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, TextEncoder, TextDecoder, URL, Intl, atob, btoa, crypto: globalThis.crypto, Docs: { text: d => d.text } });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "../data-workbench/js/parsers/json-tolerant-parser.js", "js/editor/language-detect.js", "js/core/layout-presets.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-devtools.js",
  "js/devtools/uuid-epoch-base-tools.js", "js/devtools/string-escape-url-tools.js", "js/devtools/jwt-decode.js", "js/devtools/devtools-report-ops.js",
  "js/devtools/local-history-snapshots.js", "js/devtools/number-timestamp-hover.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { OutputOps, ShareState, DEMOS, DevNum, StrTools, Jwt, DevReport, LocalHistory, NumHover });", ctx);
const { OutputOps, ShareState, DEMOS, DevNum, StrTools, Jwt, DevReport, LocalHistory, NumHover } = ctx;

test("epoch: seconds / milliseconds in 2000–2099, ISO both ways (UTC, explicit zones)", () => {
  assert.equal(DevNum.epochMs("1763630400"), 1763630400000);
  assert.equal(DevNum.epochMs("1763630400123"), 1763630400123);
  assert.equal(DevNum.epochMs("1763630400.5"), 1763630400500);
  eq(["123456789", "9999999999", "12345678901", "abc"].map(s => DevNum.epochMs(s)), [null, null, null, null], "outside 2000–2099 / not 10 or 13 digits");
  assert.equal(DevNum.iso(1763630400000), "2025-11-20T09:20:00Z");
  assert.equal(DevNum.toggleEpoch("1763630400", true), "2025-11-20T09:20:00Z");
  assert.equal(DevNum.toggleEpoch(" 1763630400123 ", true), " 2025-11-20T09:20:00.123Z ", "surrounding spaces kept");
  assert.equal(DevNum.toggleEpoch("2025-11-20T09:20:00Z", true), "1763630400");
  assert.equal(DevNum.toggleEpoch("2025-11-20 16:20:00+07:00", true), "1763630400");
  assert.equal(DevNum.toggleEpoch("2025-11-20T09:20:00.123Z", true), "1763630400123", "milliseconds kept");
  assert.equal(DevNum.toggleEpoch("2025-11-20 09:20", true), "1763630400", "no zone = UTC");
  assert.equal(DevNum.parseDate("2025-13-01"), null);
  assert.throws(() => DevNum.toggleEpoch("hello", true), /epoch/);
  const local = DevNum.localIso(1763630400000);
  assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  assert.equal(DevNum.parseDate(local), 1763630400000, "local ISO round-trips through its offset");
  assert.equal(DevNum.toggleEpoch(DevNum.toggleEpoch("1763630400", false), false), "1763630400");
});

test("number bases: every integer converts, BigInt-safe; hover describes only numbers worth converting", () => {
  assert.equal(DevNum.convertBase("flags=31, mask=0b1011, id=0xff, neg=-5", "hex"), "flags=0x1F, mask=0xB, id=0xFF, neg=-0x5");
  assert.equal(DevNum.convertBase("0x1F 0b101 7", "dec"), "31 5 7");
  assert.equal(DevNum.convertBase("10", "bin"), "0b1010");
  assert.equal(DevNum.convertBase("0xFFFFFFFFFFFFFFFFFF", "dec"), "4722366482869645213695");
  assert.throws(() => DevNum.convertBase("abc", "hex"), /số nguyên/);
  assert.equal(DevNum.describe("7"), null, "single digit");
  assert.equal(DevNum.describe("3.14"), null, "plain float");
  eq(DevNum.describe("255").rows, [["hex", "0xFF"], ["bin", "0b11111111"]]);
  eq(DevNum.describe("0x10").rows.map(r => r[0]), ["dec", "bin"]);
  eq(DevNum.describe("1763630400", 1763630400000).rows.slice(0, 1), [["UTC", "2025-11-20T09:20:00Z"]]);
  assert.equal(DevNum.describe("1763630400123").title, "Epoch mili giây");
  eq(DevNum.describe("2025-11-20T09:20:00Z").rows.slice(0, 2), [["Epoch giây", "1763630400"], ["Epoch mili giây", "1763630400000"]]);
  assert.match(DevNum.uuid(), /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  const line = "a=2025-11-20T09:20:00Z b=0x1F c=abc123 d=1763630400";
  eq([5, 25, 33, 45].map(i => NumHover.tokenAt(line, i)?.[0] ?? null), ["2025-11-20T09:20:00Z", "0x1F", null, "1763630400"], "no number inside identifiers");
});

test("JSON escape / unescape and URL parsing", () => {
  assert.equal(StrTools.jsonEscape('a"b\n\tc\\'), 'a\\"b\\n\\tc\\\\');
  assert.equal(StrTools.jsonUnescape('{\\"a\\":\\"x\\\\ny\\"}'), '{"a":"x\\ny"}');
  assert.equal(StrTools.jsonUnescape('"line1\\nline2"'), "line1\nline2", "a quoted literal");
  assert.equal(StrTools.jsonUnescape('say "hi"\tok'), 'say "hi"\tok', "raw quotes / tabs are kept");
  assert.equal(StrTools.jsonUnescape(StrTools.jsonEscape("ạ \u{1F600} \\ \"")), "ạ \u{1F600} \\ \"");
  assert.throws(() => StrTools.jsonUnescape("bad \\x"), /escape/);
  const u = StrTools.parseUrl("https://u@ex.com:8443/a%20b?x=1&y=a+b&x=2&flag#top\nsecond line");
  eq(u, { url: { protocol: "https", host: "ex.com", port: "8443", path: "/a b", hash: "top", user: "u" }, params: [["x", "1"], ["y", "a b"], ["x", "2"], ["flag", ""]] });
  eq(StrTools.queryObject(u.params), { x: ["1", "2"], y: "a b", flag: "" });
  eq(StrTools.parseUrl("/search?q=%E1%BA%A1&bad=%E0%A4%A#h"), { url: { hash: "h" }, params: [["q", "ạ"], ["bad", "%E0%A4%A"]] }, "a bad escape stays raw");
  eq(StrTools.parseUrl("a=1&b=2").params, [["a", "1"], ["b", "2"]]);
  assert.throws(() => StrTools.parseUrl("just words"), /query string/);
});

test("JWT: decode header + payload from anywhere in the text, claims state, errors with the line", () => {
  const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const tok = b64u({ alg: "RS256", typ: "JWT" }) + "." + b64u({ sub: "u1", name: "Nguyễn", exp: 1763630400, nbf: 1763630400, iat: 1763620000 }) + ".c2ln";
  const r = Jwt.decode("line one\nAuthorization: Bearer " + tok + "\n");
  delete r.raw;
  eq(r, { header: { alg: "RS256", typ: "JWT" }, payload: { sub: "u1", name: "Nguyễn", exp: 1763630400, nbf: 1763630400, iat: 1763620000 }, signature: { alg: "RS256", bytes: 3, verified: false } });
  const before = Jwt.claims(r.payload, 1763630400000 - 1000), after = Jwt.claims(r.payload, 1763630400000 + 1000);
  eq(before.map(c => [c.k, c.state]), [["exp", "good"], ["nbf", "bad"], ["iat", ""]]);
  eq(after.map(c => [c.k, c.state]), [["exp", "bad"], ["nbf", "good"], ["iat", ""]]);
  assert.throws(() => Jwt.decode("no token here"), /JWT/);
  assert.throws(() => Jwt.decode("x\ny\neyJhbGciOi.@@@.sig"), /JWT/);
  try { Jwt.decode("x\ny\neyJub3Q.eyJ.x"); assert.fail(); } catch (e) { assert.equal(e.line, 3); assert.match(e.message, /header/); }
});

test("dev report ops: JSON text + pane model, rebuilt from the saved JSON; demos run without network", () => {
  for (const id of ["jwt", "url-parts"]) { const op = OutputOps.get(id); assert.ok(op && op.pane && op.restore && op.live, id); assert.equal(op.lang, "JSON"); }
  const payload = DEMOS.jwt.payload(), p = ShareState.parse(payload);
  assert.equal(p.run, "jwt");
  const out = DevReport.jwt(p.views[0][0].text);
  const saved = JSON.parse(out.text);
  eq(saved.header, { alg: "HS256", typ: "JWT", kid: "demo-key-1" });
  assert.equal(saved.payload.sub, "user-1042");
  const built = DevReport.build(out.view, 1763630400000);
  assert.match(built.title, /HS256/);
  eq(built.sections[0].rows.map(r => [r.c[0], r.s]), [["exp", "good"], ["nbf", "good"], ["iat", ""]]);
  eq(DevReport.build(DevReport.restore({ link: { op: "jwt" }, text: out.text, state: null }), 1763630400000).sections[0].rows.length, 3, "restore from saved text");
  const url = DevReport.url(ShareState.parse(DEMOS["url-query"].payload()).views[0][0].text);
  eq(JSON.parse(url.text).query, { q: "red shoes", size: ["42", "43"], sort: "price_asc", note: "50% off", utm_source: "newsletter" });
  const b = DevReport.build(url.view);
  assert.equal(b.title, "URL · 6 tham số");
  eq(b.sections[1].rows.map(r => r.c.slice(1)), [["q", "red shoes"], ["size", "42"], ["size", "43"], ["sort", "price_asc"], ["note", "50% off"], ["utm_source", "newsletter"]]);
  eq(DevReport.build(DevReport.restore({ link: { op: "url-parts" }, text: url.text })).sections[1].rows.length, 6, "repeated keys survive the JSON round-trip");
  eq(DevReport.restore({ link: { op: "jwt" }, text: "not json" }), { kind: "report", empty: true });
  assert.ok(ShareState.parse(DEMOS["dev-numbers"].payload()).views[0][0].text.includes("0x1F"));
});

test("local history plan: skip unchanged, ≤ N per file, total size cap drops oldest first", () => {
  const rec = (id, key, t, size, sum = id) => ({ id, key, t, size, sum });
  eq(LocalHistory.plan([rec("a", "k", 1, 10, "s")], rec("b", "k", 2, 10, "s")), { skip: true, drop: [] });
  eq(LocalHistory.plan([rec("a", "k", 1, 10, "s")], rec("b", "k", 2, 11, "s")), { skip: false, drop: [] }, "same sum, other size");
  const many = [1, 2, 3, 4].map(i => rec("r" + i, "k", i, 1));
  eq(LocalHistory.plan(many, rec("n", "k", 9, 1), 3).drop.sort(), ["r1", "r2"], "keeps the newest perKey - 1 + the new one");
  eq(LocalHistory.plan([rec("x", "other", 0, 60), rec("y", "k", 5, 30)], rec("n", "k", 9, 30), 50, 100).drop, ["x"], "oldest record of any file goes first");
  eq(LocalHistory.plan([], rec("n", "k", 9, 30), 50, 100), { skip: false, drop: [] });
  assert.notEqual(LocalHistory.sum("abc"), LocalHistory.sum("abd"));
  assert.equal(LocalHistory.sum("abc"), LocalHistory.sum("abc"));
});

test("review fixes: decimals, strict dates, any-year selection, versions untouched, URL + in path, __proto__ key, exact big JWT ints", () => {
  assert.equal(DevNum.epochMs("1763630400.12"), 1763630400120, "13 chars with a fraction are seconds");
  eq(["2026-02-31", "0050-01-01", "2026-01-01T10:00+07:99"].map(s => DevNum.parseDate(s)), [null, null, null]);
  assert.equal(DevNum.toggleEpoch("1999-12-31T00:00:00Z"), "946598400");
  assert.equal(DevNum.toggleEpoch("946598400"), "1999-12-31T00:00:00Z", "explicit selection of any year round-trips");
  assert.equal(DevNum.convertBase("v1.2.3 x=1.5 n=12", "hex"), "v1.2.3 x=1.5 n=0xC");
  eq(StrTools.parseUrl("https://x.com/c++/a+b?k=a+b#x+y").url, { protocol: "https", host: "x.com", port: "", path: "/c++/a+b", hash: "x+y" });
  assert.equal(JSON.stringify(StrTools.queryObject(StrTools.parseUrl("?__proto__=x&a=1").params)), '{"__proto__":"x","a":"1"}');
  const b64u = o => Buffer.from(o).toString("base64url");
  const out = DevReport.jwt(b64u('{"alg":"none"}') + "." + b64u('{"uid":1234567890123456789,"exp":1893456000}') + ".");
  assert.ok(out.text.includes('"uid": 1234567890123456789'), "result text keeps the exact id");
  assert.ok(DevReport.build(out.view).sections[2].code.includes("1234567890123456789"), "payload block keeps the exact id");
  assert.ok(DevReport.build(DevReport.restore({ link: { op: "jwt" }, text: out.text })).sections[2].code.includes("1234567890123456789"), "and after F5");
});
