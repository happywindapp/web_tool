// Run: node --test src/one-editor/tests/zip-archive-deflate-raw.test.js — ZIP write/read round trip, plus PowerShell Expand-Archive / Compress-Archive interop on Windows.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const T = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s;
const ctx = vm.createContext({ T, Blob, Response, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView, ArrayBuffer, Date, Error });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/core/zip-archive-deflate-raw.js"), "utf8") + "\n;globalThis.Zip = Zip;", ctx);
const { Zip } = ctx;
const enc = new TextEncoder();
const text = s => new TextDecoder().decode(s);
const onWindows = process.platform === "win32";

const SAMPLE = [
  { name: "docs/" },
  { name: "docs/ghi chú tiếng Việt.txt", data: enc.encode("Xin chào\n".repeat(200)) },
  { name: "docs/empty.txt", data: new Uint8Array(0) },
  { name: "bin.dat", data: Uint8Array.from({ length: 3000 }, (_, i) => (i * 37) & 255) },
];

test("crc32 matches the standard check value", () => {
  assert.equal(Zip.crc32(enc.encode("123456789")), 0xCBF43926);
});

test("create → read keeps names (UTF-8), folders, empty and binary files", async () => {
  const blob = await Zip.create(SAMPLE);
  const items = await Zip.read(blob);
  assert.deepEqual(JSON.parse(JSON.stringify(items.map(i => [i.name, i.dir]))), SAMPLE.map(s => [s.name, s.name.endsWith("/")]));
  assert.equal(text(await items[1].bytes()), "Xin chào\n".repeat(200));
  assert.equal((await items[2].bytes()).length, 0);
  assert.deepEqual([...await items[3].bytes()], [...SAMPLE[3].data]);
  assert.ok(blob.size < 3000 + 1800, "text is deflated");
});

test("a corrupted entry fails its CRC; garbage is not a ZIP", async () => {
  const buf = new Uint8Array(await (await Zip.create([{ name: "a.txt", data: enc.encode("hello") }])).arrayBuffer());
  buf[30 + 5] ^= 0xFF;
  const [item] = await Zip.read(new Blob([buf]));
  await assert.rejects(item.bytes(), /bị hỏng/);
  const stored = new Uint8Array(await (await Zip.create([{ name: "s/" }, { name: "b.txt", data: new Uint8Array(0) }])).arrayBuffer());
  assert.equal((await (await Zip.read(new Blob([stored])))[1].bytes()).length, 0);
  await assert.rejects(Zip.read(new Blob([enc.encode("not a zip at all, just text")])), /ZIP/);
});

test("PowerShell Expand-Archive extracts what we write (UTF-8 names)", { skip: !onWindows }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oe-zip-"));
  try {
    const file = path.join(dir, "out.zip");
    fs.writeFileSync(file, Buffer.from(await (await Zip.create(SAMPLE)).arrayBuffer()));
    execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${file}' -DestinationPath '${dir}'`]);
    assert.equal(fs.readFileSync(path.join(dir, "docs", "ghi chú tiếng Việt.txt"), "utf8"), "Xin chào\n".repeat(200));
    assert.deepEqual([...fs.readFileSync(path.join(dir, "bin.dat"))], [...SAMPLE[3].data]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("reads a ZIP made by PowerShell Compress-Archive", { skip: !onWindows }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oe-zip-"));
  try {
    fs.mkdirSync(path.join(dir, "src", "sub"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "a.txt"), "alpha ".repeat(500));
    fs.writeFileSync(path.join(dir, "src", "sub", "b.json"), '{"b":1}');
    const zip = path.join(dir, "ps.zip");
    execFileSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${path.join(dir, "src", "*")}' -DestinationPath '${zip}'`]);
    const items = await Zip.read(new Blob([fs.readFileSync(zip)]));
    const byName = Object.fromEntries(items.map(i => [i.name.replace(/\\/g, "/"), i]));
    assert.equal(text(await byName["a.txt"].bytes()), "alpha ".repeat(500));
    assert.equal(text(await byName["sub/b.json"].bytes()), '{"b":1}');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
