// Run: node --test src/one-editor/tests/editor-extras-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, TextEncoder, TextDecoder, atob, btoa, crypto: globalThis.crypto,
  CompressionStream, DecompressionStream, Blob, Response, Uint8Array });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/share-link-codec.js", "js/editor/goto-anything-parser.js", "js/core/encrypted-share-codec.js", "js/editor/snippets-completion.js", "js/editor/keymap-profiles.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { ShareCodec, GotoAnything, Crypt, Snippets, KeyProfiles });", ctx);
const { ShareCodec, GotoAnything, Crypt, Snippets, KeyProfiles } = ctx;

test("Goto Anything: file@symbol, file:line, #word, plain queries stay Quick Open", () => {
  eq(GotoAnything.parse("ord@with"), { file: "ord", sym: "with" });
  eq(GotoAnything.parse("orders.js:42"), { file: "orders.js", line: 42 });
  eq(GotoAnything.parse("app:"), { file: "app", line: 0 });
  eq(GotoAnything.parse("#fee"), { word: "fee" });
  eq(GotoAnything.parse("@x"), null, "a leading @ is the symbol mode of the box, not file@symbol");
  eq(GotoAnything.parse("orders"), null);
  eq(GotoAnything.occurrences("a Fee\nb\nfee c\nFEE", "fee").map(o => [o.line, o.col]), [[1, 3], [3, 1], [4, 1]]);
  eq(GotoAnything.occurrences("x", ""), []);
});

test("password link: round trip, wrong password and tampering give the same error, no plain text in the link", async () => {
  const obj = { v: 1, views: [[{ n: "secret.txt", l: "", t: "card 4111 1111 1111 1111" }], []] };
  const link = await Crypt.encodeLink(obj, "correct horse");
  assert.match(link, /^enc:[\w-]+$/);
  assert.ok(!link.includes("secret") && !link.includes("4111"));
  eq(await Crypt.decodeLink(link, "correct horse"), obj);
  await assert.rejects(Crypt.decodeLink(link, "wrong password"), /Sai mật khẩu/);
  const bad = link.slice(0, -4) + (link.endsWith("AAAA") ? "BBBB" : "AAAA");
  await assert.rejects(Crypt.decodeLink(bad, "correct horse"), /Sai mật khẩu/);
  await assert.rejects(Crypt.decodeLink("enc:abc", "x"), /Sai mật khẩu/);
  assert.notEqual(await Crypt.encodeLink(obj, "correct horse"), link, "fresh salt + iv every time");
});

test("locked note sealing: text ⇄ { iv, ct } with a PBKDF2 key; another password fails", async () => {
  const salt = Crypt.salt(), k = await Crypt.key("note pass 1", salt);
  const rec = await Crypt.seal("ghi chú bí mật ✓", k);
  assert.ok(!JSON.stringify(rec).includes("bí mật"));
  assert.equal(await Crypt.unseal(rec, await Crypt.key("note pass 1", Crypt.unb64u(Crypt.b64u(salt)))), "ghi chú bí mật ✓");
  await assert.rejects(Crypt.unseal(rec, await Crypt.key("other", salt)), /Sai mật khẩu/);
});

test("snippets + key profiles: built-in bodies are valid CM templates, profiles bind only Mod keys", () => {
  for (const s of Snippets.BUILT) {
    assert.ok(s.prefix && s.body && s.langs.length, s.prefix);
    assert.equal((s.body.match(/\$\{/g) || []).length, (s.body.match(/\}/g) || []).length - (s.body.match(/[^$]\{|^\{/g) || []).length, "balanced fields: " + s.prefix);
  }
  assert.ok(Snippets.BUILT.some(s => s.prefix === "log" && s.langs.includes("TypeScript")));
  for (const [name, list] of Object.entries(KeyProfiles.PROFILES)) for (const [key] of list) assert.match(key, /^Mod-/, name + " " + key);
  eq(Object.keys(KeyProfiles.PROFILES), ["vscode", "sublime", "notepadpp"]);
});
