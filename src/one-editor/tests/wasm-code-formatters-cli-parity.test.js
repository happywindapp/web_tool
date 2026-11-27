// Run: node --test src/one-editor/tests/wasm-code-formatters-cli-parity.test.js — phase 15b: the vendored gofmt / clang-format / ruff WASM, through the worker handlers, give byte-identical output
// to the CLI of the same version (fixtures/code-formatters, made by make-fixtures-from-cli.mjs) and the same error line:col.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const libs = path.join(root, "../../tools/" + "vendor");
const fx = path.join(__dirname, "fixtures/code-formatters");
const manifest = JSON.parse(fs.readFileSync(path.join(fx, "manifest.json"), "utf8"));
const ctx = vm.createContext({ atob, WebAssembly, TextDecoder, TextEncoder, console: { log() {}, warn() {}, error() {} } });
ctx.globalThis = ctx;
ctx.self = ctx;

const PATHS = { fmtGofmt: "code-formatter-gofmt-0.7.3/code-formatter-gofmt.js", fmtClang: "code-formatter-clang-23.1.1/code-formatter-clang.js", fmtRuff: "code-formatter-ruff-0.15.20/code-formatter-ruff.js" };
for (const [name, file] of Object.entries(PATHS)) {
  vm.runInContext(fs.readFileSync(path.join(libs, file), "utf8"), ctx);
  ctx[name] = ctx.OEWorkerLibs[name]();
}
// The handler factory runs as the worker would: "(" + fn + ")()" with the libraries on self.
const src = fs.readFileSync(path.join(root, "js/format/wasm-code-formatters.js"), "utf8");
const at = src.indexOf("function wasmFormatterWorkerHandlers"), end = src.indexOf("\n}\n", at);
const H = vm.runInContext("(" + src.slice(at, end + 2) + ")()", ctx);
const FILE = { cpp: "main.cpp", c: "main.c", java: "Main.java", cs: "main.cs", proto: "main.proto" };
const input = f => fs.readFileSync(path.join(fx, "input", f), "utf8");

function run(c) {
  const text = input(c.input);
  if (c.engine === "gofmt") return H.gofmt({ text });
  if (c.engine === "clang-format") return H["clang-format"]({ text, file: FILE[c.input.split(".").pop()], style: c.styleFile ? input(c.styleFile) : c.style });
  return H.ruff({ text, config: c.config });
}

test("fixtures were made by the CLI versions that match the vendored engines", () => {
  assert.match(manifest.versions.clang, /clang-format version 23\.1\.1\b/);
  assert.match(manifest.versions.ruff, /^ruff 0\.15\.20\b/);
  assert.match(manifest.versions.gofmt, /^go version go1\.\d+/);
  assert.equal(ctx.fmtClang.engineVersion().split(" (")[0], "clang-format version 23.1.1");
  assert.ok(manifest.cases.length >= 19);
});

for (const c of manifest.cases) {
  const label = `${c.engine} ${c.input} ${c.style || c.styleFile || JSON.stringify(c.config || {})}`;
  test("same as CLI: " + label, () => {
    const r = run(c);
    if (c.expected) {
      assert.equal(r.error, undefined, label + " → " + JSON.stringify(r.error));
      assert.equal(r.text, fs.readFileSync(path.join(fx, "expected", c.expected), "utf8"));
    } else {
      assert.ok(r.error, label + " should fail");
      assert.deepEqual([r.error.line, r.error.col], [c.error.line, c.error.col]);
      assert.ok(r.error.msg && !/byte range/.test(r.error.msg), r.error.msg);
    }
  });
}

// ruff 0.15.20 CLI: "Failed to parse x.py:1:19: Expected `:`, found newline".
test("ruff error column counts characters, not UTF-8 bytes", () => {
  const r = H.ruff({ text: 'if "Đặt lệnh" == x\n    pass\n', config: {} });
  assert.deepEqual([r.error.line, r.error.col], [1, 19]);
});

test("clang-format: a bad style throws (engine error → fallback), a syntax error does not", () => {
  assert.throws(() => H["clang-format"]({ text: "int x;", file: "main.cpp", style: "{BasedOnStyle: Nope}" }), /style/i);
  assert.equal(typeof H["clang-format"]({ text: "int main({ return 0;", file: "main.cpp", style: "LLVM" }).text, "string");
});

test("gofmt: unchanged input comes back as is", () => {
  const ok = "package main\n\nfunc main() {}\n";
  assert.equal(H.gofmt({ text: ok }).text, ok);
});
