// Run: node --test src/one-editor/tests/curl-x509-protobuf-openapi-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { X509Certificate } = require("node:crypto");

const root = path.join(__dirname, "..");
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const ctx = vm.createContext({ atob, btoa, unescape, encodeURIComponent, decodeURIComponent, TextDecoder, DataView, console });
vm.runInContext("var PowerDemos = {};\n" + [
  "../data-workbench/third-party/js-yaml.min.js", "js/devtools/curl-parse-and-codegen-pure.js", "js/devtools/curl-request-codegen-pure.js", "js/devtools/x509-der-decode-pure.js",
  "js/devtools/protobuf-wire-decode-pure.js", "js/extras/openapi-doc-model-pure.js", "js/devtools/curl-x509-protobuf-openapi-demos.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { CurlConv, CurlGen, X509, ProtoWire, OpenApiDoc });", ctx);
const { CurlConv, CurlGen, X509, ProtoWire, OpenApiDoc, PowerDemos, jsyaml } = ctx;
const demoText = k => PowerDemos[k].payload().views[0][0].t;
const plain = v => JSON.parse(JSON.stringify(v));

test("curl: bash / cmd / PowerShell continuation + quoting, flags, -G, -u, --json", () => {
  const b = CurlConv.parse("curl 'https://x.invalid/a?b=1' \\\n  -H 'Authorization: Bearer T' \\\n  --data-raw $'{\"n\":\"it\\'s\"}' -sSL --compressed");
  assert.equal(b.dialect, "bash"); assert.equal(b.method, "POST"); assert.equal(b.bodyKind, "json");
  assert.equal(JSON.parse(b.body).n, "it's");
  const c = CurlConv.parse('curl ^"https://x.invalid/a?b=1^" ^\n  -H ^"Accept: */*^" ^\n  -u demo:pass -X PUT -d ^"k=v^"');
  assert.equal(c.dialect, "cmd"); assert.equal(c.method, "PUT"); assert.equal(c.bodyKind, "form");
  assert.deepEqual(plain(c.headers[1]), ["Authorization", "Basic " + btoa("demo:pass")]);
  const p = CurlConv.parse('curl.exe -X POST `\n  "https://x.invalid/p" `\n  -H "X-Api-Key: abc" `\n  -F "file=@report.csv" -F "name=demo"');
  assert.equal(p.dialect, "powershell"); assert.deepEqual(plain(p.form), [["file", "report.csv", true], ["name", "demo", false]]);
  const g = CurlConv.parse("curl -G https://x.invalid/s -d q=acme -d page=2");
  assert.equal(g.method, "GET"); assert.equal(g.body, null); assert.equal(g.url, "https://x.invalid/s?q=acme&page=2");
  const j = CurlConv.parse("curl --json '{\"a\":1}' x.invalid/p");
  assert.equal(j.url, "http://x.invalid/p"); assert.ok(j.notes.some(n => n.code === "noScheme"));
  assert.equal(CurlConv.header(j.headers, "content-type")[1], "application/json");
  assert.throws(() => CurlConv.parse("wget x"), e => e.code === "noCurl");
  assert.throws(() => CurlConv.parse("curl -H 'a: b'"), e => e.code === "noUrl");
  assert.ok(CurlConv.SECRET.test("Authorization") && CurlConv.SECRET.test("X-Refresh-Token") && !CurlConv.SECRET.test("Accept"));
});

test("curl: every target generates; .http ⇄ curl round trip", () => {
  const r = CurlConv.parse(demoText("curl-convert"));
  for (const tg of CurlConv.TARGETS) { const out = CurlGen.gen(r, tg); assert.ok(out.length > 40, tg); assert.ok(out.includes("orders"), tg); }
  assert.match(CurlGen.gen(r, "python"), /json=\{\n\s+"account": "DEMO000123",/);
  assert.match(CurlGen.gen(r, "csharp"), /HttpMethod\.Post/);
  assert.match(CurlGen.gen(r, "go"), /http\.NewRequest\("POST"/);
  assert.match(CurlGen.gen(r, "powershell"), /-ContentType 'application\/json'/);
  const h = CurlConv.parseHttp(CurlGen.gen(r, "http"));
  assert.equal(h.method, "POST"); assert.equal(h.url, r.url); assert.deepEqual(JSON.parse(h.body), JSON.parse(r.body));
  const back = CurlConv.parse(CurlGen.gen(h, "curl"));
  assert.equal(back.url, r.url); assert.deepEqual(plain(back.headers), plain(r.headers)); assert.deepEqual(JSON.parse(back.body), JSON.parse(r.body));
  assert.ok(CurlConv.isHttp("# note\nGET https://x.invalid/a\nAccept: */*\n")); assert.ok(!CurlConv.isHttp("curl https://x.invalid"));
  assert.ok(CurlConv.parseHttp("POST /a\n\nx\n###\nGET /b").notes.some(n => n.code === "moreRequests"));
});

test("x509: demo chain matches node's X509Certificate; private key never decoded", () => {
  const text = demoText("x509-pem"), blocks = X509.blocks(text), now = Date.UTC(2026, 10, 25);
  assert.deepEqual(plain(blocks.map(b => b.type)), ["CERTIFICATE", "CERTIFICATE", "CERTIFICATE", "PRIVATE KEY"]);
  assert.equal(blocks[3].der, undefined); assert.equal(blocks[3].private, true);
  const pems = text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  blocks.slice(0, 3).forEach((b, i) => {
    const r = X509.decode(b.der, now), n = new X509Certificate(pems[i]);
    assert.equal(r.serial.replace(/:/g, ""), n.serialNumber.replace(/^0+/, "").padStart(r.serial.replace(/:/g, "").length, "0"));
    assert.equal(r.notAfter, Date.parse(n.validTo));
    assert.equal(X509.nameText(r.subject).replace(/, /g, "\n"), n.subject);
  });
  const leaf = X509.decode(blocks[0].der, now), old = X509.decode(blocks[2].der, now);
  assert.deepEqual(plain(leaf.key), { alg: "EC", bits: 256, curve: "P-256" });
  assert.deepEqual(plain(leaf.san), ["DNS:api.demo.example.invalid", "DNS:*.demo.example.invalid", "IP:192.0.2.10", "email:ops@demo.example.invalid"]);
  assert.deepEqual(plain(leaf.eku), ["serverAuth", "clientAuth"]); assert.deepEqual(plain(leaf.keyUsage), ["digitalSignature", "keyAgreement"]);
  assert.equal(leaf.daysLeft, 96); assert.ok(old.expired && old.daysLeft < 0); assert.equal(old.key.curve, "P-384");
  const ca = X509.decode(blocks[1].der, now);
  assert.equal(ca.key.bits, 2048); assert.equal(ca.basic.ca, true); assert.equal(ca.basic.pathLen, 0); assert.ok(ca.selfSigned && !leaf.selfSigned);
  assert.throws(() => X509.decode(Uint8Array.from([0x30, 0x05, 1, 2])), e => e.code === "truncated");
  assert.throws(() => X509.decode(Uint8Array.from([0x04, 0x01, 0])), e => e.code === "notCert");
});

test("protobuf: demo tree, wire types, zigzag, packed hint, junk rejected", () => {
  const r = ProtoWire.decode(demoText("protobuf-raw")), lines = ProtoWire.text(r.fields);
  assert.equal(r.kind, "hex");
  assert.deepEqual(plain(r.fields.map(f => f.no)), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(lines[0], "1 [varint] 150 · zigzag 75");
  assert.equal(lines[1], '2 [len 4] "ACME"');
  assert.ok(lines.some(l => /^ {2}2 \[varint\] 5 · zigzag -3$/.test(l)));
  assert.ok(lines.some(l => /packed varints\? 3, 270, 86942/.test(l)));
  assert.ok(lines.some(l => /float 1\.5/.test(l)));
  assert.equal(ProtoWire.decode(btoa("\x08\x96\x01")).kind, "base64");
  assert.throws(() => ProtoWire.decode("ff ff ff"), e => e.code === "notProto");
  assert.throws(() => ProtoWire.decode("not bytes!"), e => e.code === "notBytes");
  const deep = "0a".repeat(1) + "02" + "0a00";
  assert.ok(ProtoWire.decode(deep).fields.length === 1);
});

test("openapi: tags, params ($ref + path-level), allOf, cycles, external $ref, swagger 2, budget", () => {
  const doc = OpenApiDoc.build(jsyaml.load(demoText("openapi-petstore")));
  assert.equal(doc.kind, "openapi3"); assert.equal(doc.count, 5);
  assert.deepEqual(plain(doc.groups.map(g => g.tag + ":" + g.ops.length)), ["pet:4", "store:1"]);
  const list = doc.groups[0].ops[0];
  assert.deepEqual(plain(list.params.map(p => p.name)), ["limit", "status"]);
  const get1 = doc.groups[0].ops.find(e => e.method === "GET" && e.path === "/pets/{petId}");
  assert.equal(get1.params[0].name, "petId"); assert.equal(get1.params[0].required, true);
  const pet = get1.responses[0].content[0].tree;
  assert.deepEqual(plain(pet.kids.map(k => k.key)), ["name", "tag", "category", "id"]);
  const parent = pet.kids[2].kids.find(k => k.key === "parent");
  assert.equal(parent.circular, true);
  assert.ok(doc.notes.some(n => n.code === "external"));
  assert.ok(doc.groups[0].ops.find(e => e.method === "DELETE").deprecated);
  assert.deepEqual(plain(OpenApiDoc.filter(doc, "orders").map(g => g.tag)), ["store"]);
  assert.match(OpenApiDoc.markdown(doc), /- `POST \/store\/orders` — Place an order/);
  const s2 = OpenApiDoc.build({ swagger: "2.0", host: "x.invalid", paths: { "/a": { post: { parameters: [{ in: "body", name: "b", schema: { type: "object", properties: { q: { type: "string" } } } }], responses: { 200: { description: "ok", schema: { type: "array", items: { type: "integer" } } } } } } } });
  assert.equal(s2.groups[0].ops[0].body.content[0].tree.kids[0].key, "q"); assert.equal(s2.servers[0], "https://x.invalid");
  const schemas = {}; for (let i = 0; i < 8; i++) schemas["L" + i] = { type: "object", properties: Object.fromEntries(Array.from({ length: 10 }, (x, k) => ["p" + k, i < 7 ? { $ref: "#/components/schemas/L" + (i + 1) } : { type: "string" }])) };
  const t0 = Date.now(), bomb = OpenApiDoc.build({ openapi: "3.1.0", paths: { "/x": { get: { responses: { 200: { description: "", content: { "a/b": { schema: { $ref: "#/components/schemas/L0" } } } } } } } }, components: { schemas } });
  assert.ok(Date.now() - t0 < 2000, "fast");
  assert.ok(bomb.notes.some(n => n.code === "budget"), "node budget caps a wide spec");
  assert.throws(() => OpenApiDoc.build({ foo: 1 }), e => e.code === "notSpec");
});
