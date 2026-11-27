// Run: node --test src/one-editor/tests/text-list-encoder-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const FILES = ["js/extras/wrap-join-lines-pure.js", "js/extras/extract-urls-emails-ips-pure.js", "js/extras/slug-and-html-to-text-pure.js", "js/extras/number-to-words-vi-en-pure.js",
  "js/extras/word-frequency-pure.js", "js/core/token-estimate-pure.js", "js/devtools/base-n-hmac-uuid7-cidr-chmod-pure.js"];
const ctx = vm.createContext({ console, Intl, TextEncoder, crypto: globalThis.crypto, btoa, atob });
vm.runInContext(FILES.map(src).join("\n;\n") + "\n;Object.assign(globalThis, { WrapLines, ExtractText, Slug, HtmlText, NumWords, WordFreq, TokenEst, EncPlus });", ctx);
const { WrapLines, ExtractText, Slug, HtmlText, NumWords, WordFreq, TokenEst, EncPlus } = ctx;
const u8 = s => new TextEncoder().encode(s);
const str = u => Buffer.from(u).toString("utf8");

test("wrap: SQL IN preset batches 1,200 ids into 2 lists, quotes double ' and keeps numbers bare", () => {
  const ids = Array.from({ length: 1200 }, (x, i) => "ORD-" + (100001 + i));
  const r = WrapLines.run(ids.join("\n") + "\n", { ...WrapLines.DEF, ...WrapLines.PRESETS["sql-in"] });
  assert.equal(r.items, 1200);
  assert.equal(r.batches, 2);
  const [a, b] = r.text.split("\nOR ");
  assert.ok(a.startsWith("id IN ('ORD-100001', ") && a.endsWith("'ORD-101000')"));
  assert.equal(b.split(", ").length, 200);
  assert.equal(WrapLines.run("O'Brien", WrapLines.PRESETS["sql-in"]).text, "id IN ('O''Brien')");
  assert.equal(WrapLines.run("1\n2\n 3 \n\n", WrapLines.PRESETS["sql-in"]).text, "id IN (1, 2, 3)");
  assert.equal(WrapLines.run("a\"b\nc\\d", WrapLines.PRESETS["json-array"]).text, JSON.stringify(["a\"b", "c\\d"]).replace(/,/g, ", "));
  assert.equal(WrapLines.run("x\nx\ny", { quote: "none", join: "|", head: "", tail: "", unique: true }).text, "x|y");
  assert.equal(WrapLines.clean({ batch: -5, quote: "evil", join: 3 }).batch, 0);
  assert.equal(WrapLines.clean({ quote: "evil" }).quote, "single");
});

test("extract: URLs trim sentence punctuation, IPv4 checks octets, IPv6 rejects times / MACs", () => {
  const log = "See https://example.com/a?b=1). Mail ops@demo-corp.example, ops@demo-corp.example!\nhost 10.0.0.256 bad, 192.168.1.20 ok, ver 1.2.3.4.5\n" +
    "at 09:15:06.450 from 2001:db8::1 and fe80::1%eth0, mac 00:1a:2b:3c:4d:5e, ::ffff:192.0.2.1 (www.example.org/x)";
  const r = ExtractText.run(log, { kinds: ["url", "email", "ipv4", "ipv6"], unique: true, count: true });
  const g = Object.fromEntries(r.groups.map(x => [x.kind, x.items.map(i => i.value)]));
  assert.deepEqual([...g.url], ["https://example.com/a?b=1", "www.example.org/x"]);
  assert.deepEqual([...g.email], ["ops@demo-corp.example"]);
  assert.equal(r.groups[1].items[0].n, 2);
  assert.deepEqual([...g.ipv4], ["192.168.1.20", "192.0.2.1"]);
  assert.deepEqual([...g.ipv6], ["2001:db8::1", "fe80::1", "::ffff:192.0.2.1"]);
  assert.ok(ExtractText.isV6("2001:0db8:0000:0000:0000:ff00:0042:8329") && !ExtractText.isV6("1:2:3:4:5:6:7:8:9") && !ExtractText.isV6("1::2::3"));
  assert.match(r.text, /^# URL · 2\n/);
});

test("slug + HTML → text", () => {
  assert.equal(Slug.make("Đặt lệnh mua — Cổ phiếu HSC (2026)!"), "dat-lenh-mua-co-phieu-hsc-2026");
  assert.equal(Slug.make("Đường Ăn", true), "Duong-An");
  const node = (name, kids) => ({ nodeType: 1, nodeName: name, childNodes: kids, get textContent() { return kids.map(k => k.textContent ?? k.data).join(""); } });
  const txt = data => ({ nodeType: 3, data });
  const doc = node("BODY", [node("H1", [txt("Title")]), node("P", [txt("Hello   "), node("B", [txt("world")]), txt(" !")]), node("SCRIPT", [txt("alert(1)")]),
    node("UL", [node("LI", [txt("one")]), node("LI", [txt("two")])]), node("TABLE", [node("TR", [node("TH", [txt("a")]), node("TH", [txt("b")])]), node("TR", [node("TD", [txt("1")]), node("TD", [txt(" 2 ")])])]),
    node("PRE", [txt("  x = 1\n  y = 2")])]);
  const spaced = node("BODY", [txt("\n  "), node("H1", [txt("T")]), txt("\n"), node("P", [txt("p")]), txt("\n  "), node("UL", [txt("\n"), node("LI", [txt("x")]), txt("\n")]), txt("\n")]);
  assert.equal(HtmlText.convert(spaced), "T\n\np\n\n- x\n");
  assert.equal(HtmlText.convert(doc),"Title\n\nHello world !\n\n- one\n- two\n\na\tb\n1\t2\n\n  x = 1\n  y = 2\n");
});

test("numbers → Vietnamese words: mốt, lăm, linh, tư, mười, tỷ tỷ, phẩy, đồng", () => {
  const vi = (s, o) => NumWords.words(s, { cap: false, ...o });
  assert.equal(vi("0"), "không");
  assert.equal(vi("15"), "mười lăm");
  assert.equal(vi("21"), "hai mươi mốt");
  assert.equal(vi("24"), "hai mươi tư");
  assert.equal(vi("105"), "một trăm linh năm");
  assert.equal(vi("1.000.005"), "một triệu không trăm linh năm");
  assert.equal(vi("1.250.000", { dong: true, cap: true }), "Một triệu hai trăm năm mươi nghìn đồng");
  assert.equal(vi("2.000.000.000.000"), "hai nghìn tỷ");
  assert.equal(vi("1000000000000000000"), "một tỷ tỷ");
  assert.equal(vi("12,05"), "mười hai phẩy không năm");
  assert.equal(vi("-3,5"), "âm ba phẩy năm");
  assert.equal(vi("1.250"), "một nghìn hai trăm năm mươi");
  assert.equal(NumWords.words("1.250", { lang: "en", cap: false }), "one point two five zero");
  assert.equal(NumWords.words("1,234,567.89", { lang: "en", cap: false }), "one million two hundred thirty-four thousand five hundred sixty-seven point eight nine");
  assert.equal(NumWords.words("1".repeat(22)), null);
  const r = NumWords.replaceAll("Total 1.500.000 on 2026", { lang: "vi", cap: false });
  assert.equal(r.text, "Total một triệu năm trăm nghìn on hai nghìn không trăm hai mươi sáu");
  assert.equal(r.n, 2);
});

test("word frequency + token estimate", () => {
  const r = WordFreq.run("The order and the ORDER — order's fill; fill.", { stop: true, top: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(r.words.map(w => [w.word, w.n]))), [["fill", 2], ["order", 2]]);
  assert.equal(r.distinct, 3);
  assert.match(r.text, /^\| # \| Word \| Count \| % \|\n/);
  assert.equal(TokenEst.count("abcd".repeat(100)), 100);
  assert.equal(TokenEst.count("日本語"), 3);
  assert.ok(TokenEst.count("Tiếng Việt có dấu") > TokenEst.count("Tieng Viet co dau"));
});

test("encoders: Base32 / Base58 / Ascii85 / Z85 round-trips + known vectors", () => {
  assert.equal(EncPlus.b32enc(u8("foobar")), "MZXW6YTBOI======");
  assert.equal(str(EncPlus.b32dec("mzxw6ytboi")), "foobar");
  assert.equal(EncPlus.b58enc(u8("Hello World!")), "2NEpo7TZRRrLZSi2U");
  assert.deepEqual([...EncPlus.b58dec("11" + EncPlus.b58enc(Uint8Array.of(1, 2)))], [0, 0, 1, 2]);
  assert.equal(EncPlus.a85enc(u8("Man is d")), "9jqo^BlbD-");
  assert.equal(EncPlus.a85enc(new Uint8Array(4)), "z");
  assert.equal(EncPlus.a85enc(Uint8Array.of(0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b), true), "HelloWorld");
  for (let n = 0; n < 40; n++) {
    const b = crypto.randomBytes(n);
    assert.deepEqual([...EncPlus.b32dec(EncPlus.b32enc(b))], [...b]);
    assert.deepEqual([...EncPlus.b58dec(EncPlus.b58enc(b))], [...b]);
    assert.deepEqual([...EncPlus.a85dec("<~" + EncPlus.a85enc(b) + "~>")], [...b]);
    if (n % 4 === 0) assert.deepEqual([...EncPlus.a85dec(EncPlus.a85enc(b, true), true)], [...b]);
  }
  assert.throws(() => EncPlus.b58dec("0OIl"), /Base58/);
  assert.throws(() => EncPlus.a85enc(u8("abc"), true), /Z85/);
});

test("HMAC matches node:crypto; UUID v7 / ULID carry their time", async () => {
  for (const alg of ["SHA-1", "SHA-256", "SHA-512"]) {
    const ref = crypto.createHmac(alg.replace("-", "").toLowerCase(), "demo-secret").update("order=ORD-1001&qty=100").digest("hex");
    assert.equal(await EncPlus.hmac(u8("order=ORD-1001&qty=100"), "demo-secret", { alg }), ref);
  }
  const hexKey = Buffer.from("k3y").toString("hex");
  assert.equal(await EncPlus.hmac(u8("x"), hexKey, { keyFmt: "hex", out: "base64" }), crypto.createHmac("sha256", "k3y").update("x").digest("base64"));
  await assert.rejects(() => EncPlus.hmac(u8("x"), ""), /HMAC/);
  const ms = Date.UTC(2026, 10, 27, 3, 4, 5, 678), id = EncPlus.uuid7(ms), u = EncPlus.ulid(ms);
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepEqual({ ...EncPlus.idTime(id) }, { kind: "UUID v7", ms });
  assert.equal(u.length, 26);
  assert.deepEqual({ ...EncPlus.idTime(u) }, { kind: "ULID", ms });
  assert.equal(EncPlus.idTime("not an id"), null);
});

test("CIDR v4 / v6 and chmod", () => {
  const a = EncPlus.cidr("10.0.1.5/22");
  assert.deepEqual([a.network, a.broadcast, a.mask, a.wildcard, a.first, a.last, a.hosts], ["10.0.0.0", "10.0.3.255", "255.255.252.0", "0.0.3.255", "10.0.0.1", "10.0.3.254", 1022n]);
  const p = EncPlus.cidr("192.168.1.7/31");
  assert.deepEqual([p.first, p.last, p.hosts], ["192.168.1.6", "192.168.1.7", 2n]);
  assert.equal(EncPlus.cidr("0.0.0.0/0").hosts, 4294967294n);
  const b = EncPlus.cidr("2001:db8:abcd:12::1/48");
  assert.deepEqual([b.network, b.last, b.hosts], ["2001:db8:abcd::", "2001:db8:abcd:ffff:ffff:ffff:ffff:ffff", 1n << 80n]);
  assert.equal(EncPlus.v6s(EncPlus.v6("::ffff:192.0.2.1")), "::ffff:c000:201");
  assert.throws(() => EncPlus.cidr("10.0.0.0/33"), /33/);
  assert.throws(() => EncPlus.cidr("300.0.0.0/8"), /300/);
  assert.match(EncPlus.cidrText("10.0.0.0/24"), /10\.0\.0\.1 – 10\.0\.0\.254 \(254\)/);
  assert.deepEqual({ ...EncPlus.chmod("755") }, { octal: "755", symbolic: "rwxr-xr-x" });
  assert.deepEqual({ ...EncPlus.chmod("4750") }, { octal: "4750", symbolic: "rwsr-x---" });
  assert.deepEqual({ ...EncPlus.chmod("-rwxr-x--T") }, { octal: "1750", symbolic: "rwxr-x--T" });
  assert.deepEqual({ ...EncPlus.chmod("rw-r--r--") }, { octal: "644", symbolic: "rw-r--r--" });
  assert.throws(() => EncPlus.chmod("rwz"), /rwx/);
});
